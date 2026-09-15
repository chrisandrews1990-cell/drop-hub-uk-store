import { CATALOG, isFulfillmentReady } from "./catalog.mjs";
import { paypalRequest } from "./paypal.mjs";

export default async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const { items = [] } = await request.json();
    if (!Array.isArray(items) || items.length === 0) {
      return Response.json({ error: "Cart is empty." }, { status: 400 });
    }

    if (!process.env.CJ_API_KEY) {
      return Response.json({ error: "Supplier fulfilment is not connected yet." }, { status: 503 });
    }

    const orderItems = [];
    let total = 0;

    for (const line of items) {
      const product = CATALOG[Number(line.id)];
      const qty = Math.max(1, Math.min(20, Number(line.qty) || 1));
      if (!product) return Response.json({ error: "Unknown product in cart." }, { status: 400 });

      if (!isFulfillmentReady(product)) {
        return Response.json({
          error: `${product.name} is not available for automatic fulfilment yet.`
        }, { status: 409 });
      }

      total += product.price * qty;
      orderItems.push({
        name: product.name,
        sku: product.sku,
        quantity: String(qty),
        unit_amount: { currency_code: "GBP", value: product.price.toFixed(2) }
      });
    }

    const value = total.toFixed(2);
    const response = await paypalRequest("/v2/checkout/orders", {
      method: "POST",
      headers: { "PayPal-Request-Id": crypto.randomUUID() },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          amount: {
            currency_code: "GBP",
            value,
            breakdown: { item_total: { currency_code: "GBP", value } }
          },
          items: orderItems
        }]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("PayPal create order error", data);
      return Response.json({ error: "Unable to create PayPal order." }, { status: 502 });
    }

    return Response.json({ id: data.id });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Checkout could not be started." }, { status: 500 });
  }
};
