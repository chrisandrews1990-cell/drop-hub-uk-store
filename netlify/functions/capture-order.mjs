import { CATALOG } from "./catalog.mjs";
import { paypalRequest } from "./paypal.mjs";
import { resolveCJVariant, getCheapestLogistics, createAndPayCJOrder } from "./cj.mjs";

function countryName(code) {
  const names = new Intl.DisplayNames(["en"], { type: "region" });
  return names.of(code) || code;
}

export default async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { orderID } = await request.json().catch(() => ({}));
  if (!orderID || typeof orderID !== "string") {
    return Response.json({ error: "Missing order ID." }, { status: 400 });
  }

  let payment;

  try {
    const response = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(orderID)}/capture`, {
      method: "POST",
      headers: { "PayPal-Request-Id": crypto.randomUUID() }
    });

    payment = await response.json();
    if (!response.ok) {
      console.error("PayPal capture error", payment);
      return Response.json({ error: "Unable to capture PayPal order." }, { status: 502 });
    }
  } catch (error) {
    console.error("PayPal capture exception", error);
    return Response.json({ error: "Unable to capture PayPal order." }, { status: 502 });
  }

  if (payment.status !== "COMPLETED") {
    return Response.json({ id: payment.id, status: payment.status, fulfillment: "NOT_STARTED" });
  }

  try {
    const unit = payment.purchase_units?.[0];
    const shipping = unit?.shipping;
    const address = shipping?.address;
    const items = unit?.items || [];

    if (!shipping?.name?.full_name || !address?.country_code || !address?.address_line_1 || !address?.admin_area_2 || !address?.admin_area_1) {
      throw new Error("Shipping address was incomplete.");
    }

    const cjLines = [];
    for (const item of items) {
      const product = Object.values(CATALOG).find(p => p.sku === item.sku);
      if (!product || product.supplier !== "CJ" || !product.cjVariantSku || !product.fulfillmentReady) {
        throw new Error(`Item is not ready for CJ fulfilment: ${item.sku}`);
      }

      const resolved = await resolveCJVariant(product.cjVariantSku);
      cjLines.push({ vid: resolved.variant.vid, quantity: Number(item.quantity) || 1 });
    }

    const logistics = await getCheapestLogistics({
      fromCountryCode: "CN",
      toCountryCode: address.country_code,
      zip: address.postal_code,
      products: cjLines
    });

    const cjOrder = await createAndPayCJOrder({
      orderNumber: `PP-${payment.id}`,
      shippingZip: address.postal_code || "",
      shippingCountryCode: address.country_code,
      shippingCountry: countryName(address.country_code),
      shippingProvince: address.admin_area_1,
      shippingCity: address.admin_area_2,
      shippingCounty: "",
      shippingPhone: "",
      shippingCustomerName: shipping.name.full_name,
      shippingAddress: address.address_line_1,
      shippingAddress2: address.address_line_2 || "",
      email: payment.payer?.email_address || "",
      remark: `PayPal order ${payment.id}`,
      logisticName: logistics.logisticName,
      fromCountryCode: "CN",
      orderFlow: 1,
      products: cjLines
    });

    return Response.json({
      id: payment.id,
      status: "COMPLETED",
      fulfillment: "CJ_SUBMITTED",
      cjOrder,
      shippingMethod: logistics.logisticName
    });
  } catch (error) {
    console.error("Payment completed but CJ fulfilment requires review", error);
    return Response.json({
      id: payment.id,
      status: "COMPLETED",
      fulfillment: "MANUAL_REQUIRED",
      message: "Payment completed successfully. Supplier fulfilment requires review."
    });
  }
};