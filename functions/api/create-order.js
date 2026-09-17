import { CATALOG, isFulfillmentReady } from "../_lib/catalog.js";
import { paypalRequest } from "../_lib/paypal.js";
import { normalizeItems, verifyCheckoutQuote } from "../_lib/quote.js";

function json(data, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function sameItems(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const siteOrigin = new URL(request.url).origin;
    const { items = [], quoteToken } = await request.json();
    if (!Array.isArray(items) || !items.length) return json({ error: "Cart is empty." }, 400);

    const quote = await verifyCheckoutQuote(env, quoteToken);
    if (!quote) return json({ error: "Your delivery quote expired. Please refresh checkout and try again." }, 409);

    const normalized = normalizeItems(items);
    if (!sameItems(normalized, quote.items)) {
      return json({ error: "Your basket changed. Please refresh checkout and try again." }, 409);
    }

    const orderItems = [];
    let itemTotal = 0;

    for (const line of normalized) {
      const product = CATALOG[line.id];
      if (!product || !isFulfillmentReady(product) || product.supplier !== "CJ") {
        return json({ error: "A product in your basket is no longer available." }, 409);
      }

      itemTotal += product.price * line.qty;
      orderItems.push({
        name: product.name,
        sku: product.sku,
        quantity: String(line.qty),
        unit_amount: { currency_code: "GBP", value: product.price.toFixed(2) }
      });
    }

    const shippingValue = Number(quote.shipping).toFixed(2);
    const itemValue = itemTotal.toFixed(2);
    const totalValue = (itemTotal + Number(shippingValue)).toFixed(2);

    const response = await paypalRequest(env, "/v2/checkout/orders", {
      method: "POST",
      headers: { "PayPal-Request-Id": crypto.randomUUID() },
      body: JSON.stringify({
        intent: "CAPTURE",
        payment_source: {
          paypal: {
            experience_context: {
              payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
              brand_name: "DropHub UK",
              locale: "en-GB",
              landing_page: "NO_PREFERENCE",
              shipping_preference: "GET_FROM_FILE",
              user_action: "PAY_NOW",
              return_url: `${siteOrigin}/paypal-return.html`,
              cancel_url: `${siteOrigin}/?checkout=cancelled`
            }
          }
        },
        purchase_units: [{
          amount: {
            currency_code: "GBP",
            value: totalValue,
            breakdown: {
              item_total: { currency_code: "GBP", value: itemValue },
              shipping: { currency_code: "GBP", value: shippingValue }
            }
          },
          items: orderItems,
          description: `DropHub UK order • UK delivery ${quote.logisticsName || ""}`
        }]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("PayPal create order error", data);
      return json({ error: "PayPal could not create the order." }, 502);
    }

    const approveUrl = (data.links || []).find(link => link.rel === "payer-action" || link.rel === "approve")?.href;
    if (!approveUrl) {
      console.error("PayPal order missing approval link", data);
      return json({ error: "PayPal did not return an approval page." }, 502);
    }

    return json({ id: data.id, approveUrl });
  } catch (error) {
    console.error("Create order error", error);
    return json({ error: "Checkout could not be started. Please try again." }, 500);
  }
}
