import { paypalRequest } from "./paypal.mjs";

export default async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { orderID } = await request.json();
    if (!orderID || typeof orderID !== "string") {
      return Response.json({ error: "Missing order ID." }, { status: 400 });
    }

    const response = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(orderID)}/capture`, {
      method: "POST",
      headers: {
        "PayPal-Request-Id": crypto.randomUUID()
      }
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("PayPal capture error", data);
      return Response.json({ error: "Unable to capture PayPal order." }, { status: 502 });
    }

    return Response.json({
      id: data.id,
      status: data.status,
      payer: data.payer,
      purchase_units: data.purchase_units
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Payment could not be completed." }, { status: 500 });
  }
};
