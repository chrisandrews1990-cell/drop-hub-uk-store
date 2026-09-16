import { CATALOG } from "./catalog.mjs";
import { paypalRequest } from "./paypal.mjs";
import { resolveCJVariant, getCheapestLogistics, createAndPayCJOrder } from "./cj.mjs";

function countryName(code) {
  try {
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    return names.of(code) || code;
  } catch {
    return code;
  }
}

export default async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { orderID } = await request.json().catch(() => ({}));
  if (!orderID || typeof orderID !== "string") {
    return Response.json({ error: "Missing order ID." }, { status: 400 });
  }

  let approvedOrder;
  try {
    const checkResponse = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(orderID)}`);
    approvedOrder = await checkResponse.json();

    if (!checkResponse.ok) {
      console.error("PayPal order lookup error", approvedOrder);
      return Response.json({ error: "Unable to verify PayPal order." }, { status: 502 });
    }

    const country = approvedOrder.purchase_units?.[0]?.shipping?.address?.country_code;
    if (country !== "GB") {
      return Response.json({
        error: "DropHub UK currently delivers to UK addresses only. No payment has been captured."
      }, { status: 400 });
    }
  } catch (error) {
    console.error("PayPal pre-capture verification exception", error);
    return Response.json({ error: "Unable to verify delivery address." }, { status: 502 });
  }

  let payment;
  try {
    const response = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(orderID)}/capture`, {
      method: "POST",
      headers: { "PayPal-Request-Id": `drophub-capture-${orderID}` }
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
    const unit = payment.purchase_units?.[0] || approvedOrder.purchase_units?.[0];
    const shipping = unit?.shipping || approvedOrder.purchase_units?.[0]?.shipping;
    const address = shipping?.address;
    const items = unit?.items || approvedOrder.purchase_units?.[0]?.items || [];

    const city = address?.admin_area_2 || address?.admin_area_1;
    const province = address?.admin_area_1 || address?.admin_area_2;

    if (!shipping?.name?.full_name || !address?.country_code || !address?.address_line_1 || !city || !province) {
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
      toCountryCode: "GB",
      zip: address.postal_code,
      products: cjLines
    });

    const cjOrder = await createAndPayCJOrder({
      orderNumber: `PP-${payment.id}`,
      shippingZip: address.postal_code || "",
      shippingCountryCode: "GB",
      shippingCountry: countryName("GB"),
      shippingProvince: province,
      shippingCity: city,
      shippingCounty: "",
      shippingPhone: "",
      shippingCustomerName: shipping.name.full_name,
      shippingAddress: address.address_line_1,
      shippingAddress2: address.address_line_2 || "",
      email: payment.payer?.email_address || approvedOrder.payer?.email_address || "",
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