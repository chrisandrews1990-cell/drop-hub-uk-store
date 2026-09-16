import { CATALOG, isFulfillmentReady } from "./catalog.mjs";
import { paypalRequest } from "./paypal.mjs";
import { resolveCJVariant, getCheapestLogistics, getCJBalance } from "./cj.mjs";

const STORE_LIVE = true;
const BUFFERED_USD_TO_GBP = 0.80;

function ceilMoney(value) {
  return Math.ceil(Number(value) * 100) / 100;
}

export default async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let stage = "checkout setup";

  try {
    stage = "cart validation";
    const { items = [] } = await request.json();
    if (!Array.isArray(items) || items.length === 0) {
      return Response.json({ error: "Cart is empty." }, { status: 400 });
    }

    if (!process.env.CJ_API_KEY) {
      return Response.json({ error: "Supplier connection is not configured." }, { status: 503 });
    }

    if (!STORE_LIVE) {
      return Response.json({ error: "Checkout is temporarily paused." }, { status: 503 });
    }

    const orderItems = [];
    const cjLines = [];
    let itemTotal = 0;
    let supplierProductCostUsd = 0;

    stage = "CJ product check";
    for (const line of items) {
      const product = CATALOG[Number(line.id)];
      const qty = Math.max(1, Math.min(10, Number(line.qty) || 1));

      if (!product) return Response.json({ error: "Unknown product in cart." }, { status: 400 });
      if (!isFulfillmentReady(product) || product.supplier !== "CJ") {
        return Response.json({ error: `${product.name} is not available for automatic fulfilment yet.` }, { status: 409 });
      }

      const resolved = await resolveCJVariant(product.cjVariantSku);
      const supplierUnit = Number(resolved.variant.variantSellPrice || 0);

      if (!resolved.variant.vid || !Number.isFinite(supplierUnit) || supplierUnit <= 0) {
        throw new Error("CJ returned invalid product data.");
      }

      cjLines.push({ vid: resolved.variant.vid, quantity: qty });
      supplierProductCostUsd += supplierUnit * qty;
      itemTotal += product.price * qty;

      orderItems.push({
        name: product.name,
        sku: product.sku,
        quantity: String(qty),
        unit_amount: { currency_code: "GBP", value: product.price.toFixed(2) }
      });
    }

    stage = "CJ shipping quote";
    const logistics = await getCheapestLogistics({
      fromCountryCode: "CN",
      toCountryCode: "GB",
      products: cjLines
    });

    const freightUsd = Number(logistics.totalPostageFee ?? logistics.logisticPrice ?? 0);
    if (!Number.isFinite(freightUsd) || freightUsd < 0) {
      throw new Error("CJ returned an invalid UK delivery price.");
    }

    stage = "CJ balance check";
    const estimatedSupplierUsd = supplierProductCostUsd + freightUsd;
    const balanceUsd = await getCJBalance();

    if (!Number.isFinite(balanceUsd)) {
      throw new Error("CJ balance could not be read.");
    }

    if (balanceUsd < estimatedSupplierUsd + 1) {
      return Response.json({
        error: `CJ balance is too low for this test order. Please top up your CJ wallet before taking live orders.`
      }, { status: 503 });
    }

    const shippingGbp = ceilMoney(freightUsd * BUFFERED_USD_TO_GBP);
    const itemValue = itemTotal.toFixed(2);
    const shippingValue = shippingGbp.toFixed(2);
    const totalValue = (itemTotal + shippingGbp).toFixed(2);

    stage = "PayPal order creation";
    const response = await paypalRequest("/v2/checkout/orders", {
      method: "POST",
      headers: { "PayPal-Request-Id": crypto.randomUUID() },
      body: JSON.stringify({
        intent: "CAPTURE",
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
          description: `DropHub UK order • UK delivery ${logistics.logisticName}`
        }],
        application_context: { shipping_preference: "GET_FROM_FILE" }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("PayPal create order error", data);
      return Response.json({ error: "PayPal could not create the order." }, { status: 502 });
    }

    return Response.json({ id: data.id, shipping: shippingValue, total: totalValue });
  } catch (error) {
    console.error(`Create order failed during ${stage}`, error);
    const detail = String(error?.message || "").replace(/^CJ request failed:s*/,"").slice(0,180);
    return Response.json({
      error: detail ? `Checkout stopped during ${stage}: ${detail}` : `Checkout stopped during ${stage}.`
    }, { status: 500 });
  }
};