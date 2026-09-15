import { CATALOG } from "./catalog.mjs";
import { paypalRequest } from "./paypal.mjs";
import { getCJVariantBySku, getCheapestLogistics, createAndPayCJOrder } from "./cj.mjs";

function countryName(code) {
  const names = new Intl.DisplayNames(["en"], { type: "region" });
  return names.of(code) || code;
}

export default async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const { orderID } = await request.json();
    if (!orderID || typeof orderID !== "string") {
      return Response.json({ error: "Missing order ID." }, { status: 400 });
    }

    const response = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(orderID)}/capture`, {
      method: "POST",
      headers: { "PayPal-Request-Id": crypto.randomUUID() }
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("PayPal capture error", data);
      return Response.json({ error: "Unable to capture PayPal order." }, { status: 502 });
    }

    if (data.status !== "COMPLETED") {
      return Response.json({ id: data.id, status: data.status, fulfillment: "NOT_STARTED" });
    }

    const unit = data.purchase_units?.[0];
    const shipping = unit?.shipping;
    const address = shipping?.address;
    const items = unit?.items || [];

    if (!shipping?.name?.full_name || !address?.country_code || !address?.address_line_1 || !address?.admin_area_2 || !address?.admin_area_1) {
      console.error("PayPal payment completed but shipping address was incomplete", { orderID: data.id, shipping });
      return Response.json({
        id: data.id,
        status: data.status,
        fulfillment: "MANUAL_REQUIRED",
        message: "Payment completed, but the shipping address needs manual review."
      });
    }

    const cjLines = [];
    for (const item of items) {
      const product = Object.values(CATALOG).find(p => p.sku === item.sku);
      if (!product || product.supplier !== "CJ" || !product.cjVariantSku) {
        console.error("Paid item is not ready for CJ fulfilment", item);
        return Response.json({
          id: data.id,
          status: data.status,
          fulfillment: "MANUAL_REQUIRED",
          message: "Payment completed, but one item needs manual supplier fulfilment."
        });
      }

      const variant = await getCJVariantBySku(product.cjVariantSku);
      if (!variant?.vid) throw new Error(`CJ variant not found for ${product.cjVariantSku}`);
      cjLines.push({ vid: variant.vid, quantity: Number(item.quantity) || 1 });
    }

    const logistics = await getCheapestLogistics({
      fromCountryCode: "CN",
      toCountryCode: address.country_code,
      zip: address.postal_code,
      products: cjLines
    });

    const cjOrder = await createAndPayCJOrder({
      orderNumber: `PP-${data.id}`,
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
      email: data.payer?.email_address || "",
      remark: `PayPal order ${data.id}`,
      logisticName: logistics.logisticName,
      fromCountryCode: "CN",
      platform: "shopify",
      orderFlow: 1,
      products: cjLines
    });

    return Response.json({
      id: data.id,
      status: data.status,
      fulfillment: "CJ_SUBMITTED",
      cjOrder,
      shippingMethod: logistics.logisticName
    });
  } catch (error) {
    console.error("Capture/fulfilment error", error);
    return Response.json({
      error: "Payment or supplier fulfilment could not be completed automatically. Please review the order before retrying."
    }, { status: 500 });
  }
};
