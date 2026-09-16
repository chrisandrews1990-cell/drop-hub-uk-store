import { CATALOG } from "./catalog.mjs";
import { paypalRequest, PAYPAL_ENV } from "./paypal.mjs";
import { resolveCJVariant, getCheapestLogistics, createAndPayCJOrder } from "./cj.mjs";

const BUFFERED_USD_TO_GBP = 0.80;
const MIN_PRODUCT_PROFIT_GBP = 6;
const MIN_PRODUCT_MARGIN_RATE = 0.50;


function buildConfirmation(payment, approvedOrder) {
  const unit = payment.purchase_units?.[0] || approvedOrder.purchase_units?.[0] || {};
  const items = unit.items || approvedOrder.purchase_units?.[0]?.items || [];
  const capture = unit.payments?.captures?.[0];
  const amount = capture?.amount || unit.amount || approvedOrder.purchase_units?.[0]?.amount || null;
  return {
    orderId: payment.id || approvedOrder.id || "",
    items: items.map(item => ({
      name: item.name || item.sku || "Item",
      quantity: Number(item.quantity) || 1,
      unitAmount: item.unit_amount?.value || null,
      currency: item.unit_amount?.currency_code || amount?.currency_code || "GBP"
    })),
    total: amount?.value || null,
    currency: amount?.currency_code || "GBP"
  };
}

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

  // PayPal now has the customer's approved UK address. Before capturing money,
  // re-check the exact CJ variants and postcode-specific freight.
  const approvedUnit = approvedOrder.purchase_units?.[0];
  const approvedShipping = approvedUnit?.shipping;
  const approvedAddress = approvedShipping?.address;
  const approvedItems = approvedUnit?.items || [];
  const city = approvedAddress?.admin_area_2 || approvedAddress?.admin_area_1;
  const province = approvedAddress?.admin_area_1 || approvedAddress?.admin_area_2;

  if (!approvedShipping?.name?.full_name || !approvedAddress?.country_code || !approvedAddress?.address_line_1 || !city || !province) {
    return Response.json({ error: "The approved delivery address is incomplete. No payment has been captured." }, { status: 400 });
  }

  const cjLines = [];
  try {
    for (const item of approvedItems) {
      const product = Object.values(CATALOG).find(p => p.sku === item.sku);
      if (!product || product.supplier !== "CJ" || !product.cjVariantSku || !product.fulfillmentReady) {
        return Response.json({ error: "A product is no longer available. No payment has been captured." }, { status: 409 });
      }

      const resolved = await resolveCJVariant(product.cjVariantSku);
      const supplierUnitUsd = Number(resolved.variant.variantSellPrice || 0);
      if (!Number.isFinite(supplierUnitUsd) || supplierUnitUsd <= 0) {
        throw new Error("CJ returned invalid product pricing.");
      }

      const supplierUnitGbp = supplierUnitUsd * BUFFERED_USD_TO_GBP;
      const unitProfitGbp = product.price - supplierUnitGbp;
      const unitMargin = unitProfitGbp / product.price;
      if (unitProfitGbp < MIN_PRODUCT_PROFIT_GBP || unitMargin < MIN_PRODUCT_MARGIN_RATE) {
        return Response.json({
          error: `${product.name} changed supplier price and is temporarily unavailable. No payment has been captured.`
        }, { status: 409 });
      }

      cjLines.push({ vid: resolved.variant.vid, quantity: Number(item.quantity) || 1 });
    }

    const postcodeLogistics = await getCheapestLogistics({
      fromCountryCode: "CN",
      toCountryCode: "GB",
      zip: approvedAddress.postal_code,
      products: cjLines
    });

    const actualFreightUsd = Number(postcodeLogistics.totalPostageFee ?? postcodeLogistics.logisticPrice ?? 0);
    const actualFreightGbp = Math.ceil(actualFreightUsd * BUFFERED_USD_TO_GBP * 100) / 100;
    const approvedShippingGbp = Number(approvedUnit?.amount?.breakdown?.shipping?.value || 0);

    if (!Number.isFinite(actualFreightGbp) || actualFreightGbp < 0) {
      throw new Error("CJ returned an invalid postcode delivery price.");
    }
    if (actualFreightGbp > approvedShippingGbp + 0.01) {
      return Response.json({
        error: "The live delivery price changed after your address was confirmed. No payment has been captured. Please return to the shop and try checkout again."
      }, { status: 409 });
    }

    approvedOrder.__validatedLogistics = postcodeLogistics;
  } catch (error) {
    console.error("Pre-capture CJ validation failed", error);
    return Response.json({ error: "We could not safely validate fulfilment. No payment has been captured." }, { status: 502 });
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
    const unit = payment.purchase_units?.[0] || approvedUnit;
    const shipping = unit?.shipping || approvedShipping;
    const address = shipping?.address || approvedAddress;
    const logistics = approvedOrder.__validatedLogistics;

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
      isSandbox: PAYPAL_ENV === "sandbox" ? 1 : 0,
      products: cjLines
    });

    return Response.json({
      id: payment.id,
      status: "COMPLETED",
      fulfillment: "CJ_SUBMITTED",
      cjOrder,
      shippingMethod: logistics.logisticName,
      confirmation: buildConfirmation(payment, approvedOrder)
    });
  } catch (error) {
    console.error("Payment completed but CJ fulfilment requires review", error);
    return Response.json({
      id: payment.id,
      status: "COMPLETED",
      fulfillment: "MANUAL_REQUIRED",
      message: "Payment completed successfully. Supplier fulfilment requires review.",
      confirmation: buildConfirmation(payment, approvedOrder)
    });
  }
};