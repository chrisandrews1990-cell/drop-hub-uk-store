import { createHmac, timingSafeEqual } from "node:crypto";
import { CATALOG, isFulfillmentReady } from "./catalog.mjs";
import { resolveCJVariant, getCheapestLogistics, getCJBalance } from "./cj.mjs";

const BUFFERED_USD_TO_GBP = 0.80;
const QUOTE_TTL_MS = 10 * 60 * 1000;

function ceilMoney(value) {
  return Math.ceil(Number(value) * 100) / 100;
}

function secret() {
  const value = process.env.PAYPAL_CLIENT_SECRET;
  if (!value) throw new Error("Checkout signing secret is not configured.");
  return value;
}

function encodePayload(payload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function signature(encoded) {
  return createHmac("sha256", secret()).update(encoded).digest("base64url");
}

export function verifyCheckoutQuote(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [encoded, sig] = token.split(".");
  const expected = signature(encoded);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a,b)) return null;

  const payload = JSON.parse(Buffer.from(encoded,"base64url").toString("utf8"));
  if (!payload?.exp || Date.now() > payload.exp) return null;
  return payload;
}

function normalizeItems(items) {
  return items
    .map(line => ({ id:Number(line.id), qty:Math.max(1,Math.min(10,Number(line.qty)||1)) }))
    .sort((a,b)=>a.id-b.id);
}

export default async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed",{status:405});

  let stage="cart validation";
  try {
    const {items=[]}=await request.json();
    if(!Array.isArray(items)||!items.length){
      return Response.json({error:"Cart is empty."},{status:400});
    }
    if(!process.env.CJ_API_KEY){
      return Response.json({error:"Supplier connection is not configured."},{status:503});
    }

    const normalized=normalizeItems(items);
    const cjLines=[];
    let supplierProductCostUsd=0;
    let itemTotal=0;

    stage="CJ product check";
    for(const line of normalized){
      const product=CATALOG[line.id];
      if(!product) return Response.json({error:"Unknown product in cart."},{status:400});
      if(!isFulfillmentReady(product)||product.supplier!=="CJ"){
        return Response.json({error:`${product.name} is not available for automatic fulfilment yet.`},{status:409});
      }

      const resolved=await resolveCJVariant(product.cjVariantSku);
      const supplierUnit=Number(resolved.variant.variantSellPrice||0);
      if(!resolved.variant.vid||!Number.isFinite(supplierUnit)||supplierUnit<=0){
        throw new Error("CJ returned invalid product data.");
      }

      cjLines.push({vid:resolved.variant.vid,quantity:line.qty});
      supplierProductCostUsd+=supplierUnit*line.qty;
      itemTotal+=product.price*line.qty;
    }

    stage="CJ shipping quote";
    const logistics=await getCheapestLogistics({
      fromCountryCode:"CN",
      toCountryCode:"GB",
      products:cjLines
    });

    const freightUsd=Number(logistics.totalPostageFee ?? logistics.logisticPrice ?? 0);
    if(!Number.isFinite(freightUsd)||freightUsd<0){
      throw new Error("CJ returned an invalid UK delivery price.");
    }

    stage="CJ balance check";
    const balanceUsd=await getCJBalance();
    const estimatedSupplierUsd=supplierProductCostUsd+freightUsd;

    if(!Number.isFinite(balanceUsd)){
      throw new Error("CJ balance could not be read.");
    }

    if(balanceUsd<estimatedSupplierUsd+1){
      return Response.json({
        error:"CJ balance is too low for this order. Please top up your CJ wallet before taking live orders."
      },{status:503});
    }

    const shippingGbp=ceilMoney(freightUsd*BUFFERED_USD_TO_GBP);
    const payload={
      exp:Date.now()+QUOTE_TTL_MS,
      items:normalized,
      shipping:shippingGbp.toFixed(2),
      logisticsName:logistics.logisticName
    };
    const encoded=encodePayload(payload);
    const token=`${encoded}.${signature(encoded)}`;

    return Response.json({
      token,
      shipping:payload.shipping,
      subtotal:itemTotal.toFixed(2),
      total:(itemTotal+shippingGbp).toFixed(2),
      shippingMethod:logistics.logisticName
    });
  } catch(error) {
    console.error(`Checkout quote failed during ${stage}`,error);
    const detail=String(error?.message||"").replace(/^CJ request failed:\s*/,"").slice(0,180);
    return Response.json({
      error:detail ? `Checkout stopped during ${stage}: ${detail}` : `Checkout stopped during ${stage}.`
    },{status:500});
  }
};