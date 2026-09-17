import { CATALOG, isFulfillmentReady } from "../_lib/catalog.js";
import { resolveCJVariant, getCheapestLogistics, getCJBalance } from "../_lib/cj.js";
import { createCheckoutQuoteToken, normalizeItems } from "../_lib/quote.js";

const BUFFERED_USD_TO_GBP = 0.80;
const MIN_PRODUCT_PROFIT_GBP = 6;
const MIN_PRODUCT_MARGIN_RATE = 0.50;
const QUOTE_TTL_MS = 10 * 60 * 1000;

function json(data, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function ceilMoney(value) {
  return Math.ceil(Number(value) * 100) / 100;
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let stage = "cart validation";
  try {
    const { items = [] } = await request.json();
    if (!Array.isArray(items) || !items.length) return json({ error: "Cart is empty." }, 400);
    if (!env?.CJ_API_KEY) return json({ error: "Supplier connection is not configured." }, 503);
    if (!env?.PAYPAL_CLIENT_SECRET) return json({ error: "Secure checkout is not configured." }, 503);

    const normalized = normalizeItems(items);
    if (!normalized.length) return json({ error: "Cart is empty." }, 400);

    const cjLines = [];
    let supplierProductCostUsd = 0;
    let itemTotal = 0;

    stage = "CJ product check";
    for (const line of normalized) {
      const product = CATALOG[line.id];
      if (!product) return json({ error: "Unknown product in cart." }, 400);
      if (!isFulfillmentReady(product) || product.supplier !== "CJ") {
        return json({ error: `${product.name} is not available for automatic fulfilment yet.` }, 409);
      }

      const resolved = await resolveCJVariant(env, product.cjVariantSku);
      const supplierUnit = Number(resolved.variant.variantSellPrice || 0);
      if (!resolved.variant.vid || !Number.isFinite(supplierUnit) || supplierUnit <= 0) {
        throw new Error("CJ returned invalid product data.");
      }

      const supplierUnitGbp = supplierUnit * BUFFERED_USD_TO_GBP;
      const unitProfitGbp = product.price - supplierUnitGbp;
      const unitMargin = unitProfitGbp / product.price;
      if (unitProfitGbp < MIN_PRODUCT_PROFIT_GBP || unitMargin < MIN_PRODUCT_MARGIN_RATE) {
        return json({ error: `${product.name} is temporarily unavailable while its supplier cost is reviewed.` }, 409);
      }

      cjLines.push({ vid: resolved.variant.vid, quantity: line.qty });
      supplierProductCostUsd += supplierUnit * line.qty;
      itemTotal += product.price * line.qty;
    }

    stage = "CJ shipping quote";
    const logistics = await getCheapestLogistics(env, {
      fromCountryCode: "CN",
      toCountryCode: "GB",
      products: cjLines
    });

    const freightUsd = Number(logistics.totalPostageFee ?? logistics.logisticPrice ?? 0);
    if (!Number.isFinite(freightUsd) || freightUsd < 0) throw new Error("CJ returned an invalid UK delivery price.");

    stage = "CJ balance check";
    const balanceUsd = await getCJBalance(env);
    const estimatedSupplierUsd = supplierProductCostUsd + freightUsd;
    if (!Number.isFinite(balanceUsd)) throw new Error("CJ balance could not be read.");
    if (balanceUsd < estimatedSupplierUsd + 1) {
      return json({ error: "CJ balance is too low for this order. Please top up your CJ wallet before taking live orders." }, 503);
    }

    const shippingGbp = ceilMoney(freightUsd * BUFFERED_USD_TO_GBP);
    const payload = {
      exp: Date.now() + QUOTE_TTL_MS,
      items: normalized,
      shipping: shippingGbp.toFixed(2),
      logisticsName: logistics.logisticName
    };
    const token = await createCheckoutQuoteToken(env, payload);

    return json({
      token,
      shipping: payload.shipping,
      subtotal: itemTotal.toFixed(2),
      total: (itemTotal + shippingGbp).toFixed(2),
      shippingMethod: logistics.logisticName
    });
  } catch (error) {
    console.error(`Checkout quote failed during ${stage}`, error);
    const detail = String(error?.message || "").replace(/^CJ request failed:\s*/, "").slice(0, 180);
    return json({ error: detail ? `Checkout stopped during ${stage}: ${detail}` : `Checkout stopped during ${stage}.` }, 500);
  }
}
