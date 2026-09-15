const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";
const MIN_INTERVAL_MS = 1800;

let cachedAccessToken = null;
let tokenFetchedAt = 0;
let lastCJRequestAt = 0;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function throttle() {
  const elapsed = Date.now() - lastCJRequestAt;
  if (elapsed < MIN_INTERVAL_MS) await sleep(MIN_INTERVAL_MS - elapsed);
  lastCJRequestAt = Date.now();
}

async function rawCJFetch(path, options = {}) {
  await throttle();
  return fetch(`${CJ_BASE}${path}`, options);
}

export async function getCJAccessToken() {
  if (cachedAccessToken && Date.now() - tokenFetchedAt < 23 * 60 * 60 * 1000) return cachedAccessToken;

  const apiKey = process.env.CJ_API_KEY;
  if (!apiKey) throw new Error("CJ_API_KEY is not configured.");

  const response = await rawCJFetch("/authentication/getAccessToken", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey })
  });

  const data = await response.json();
  if (!response.ok || !data?.result || !data?.data?.accessToken) {
    throw new Error(`CJ authentication failed: ${data?.message || response.status}`);
  }

  cachedAccessToken = data.data.accessToken;
  tokenFetchedAt = Date.now();
  return cachedAccessToken;
}

export async function cjRequest(path, options = {}) {
  const token = await getCJAccessToken();
  const response = await rawCJFetch(path, {
    ...options,
    headers: {
      "CJ-Access-Token": token,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const data = await response.json();
  if (!response.ok || data?.result === false) {
    throw new Error(`CJ request failed: ${data?.message || response.status}`);
  }
  return data;
}

export async function getCJProductByVariantSku(variantSku) {
  const data = await cjRequest(`/product/query?variantSku=${encodeURIComponent(variantSku)}`);
  return data?.data || null;
}

export async function getCJVariantsByProductSku(productSku) {
  const data = await cjRequest(`/product/variant/query?productSku=${encodeURIComponent(productSku)}`);
  return Array.isArray(data.data) ? data.data : [];
}

export async function resolveCJVariant(variantSku) {
  const product = await getCJProductByVariantSku(variantSku);
  if (!product?.productSku) {
    throw new Error(`CJ product not found for variant SKU ${variantSku}`);
  }

  const variants = await getCJVariantsByProductSku(product.productSku);
  const variant = variants.find(v => v.variantSku === variantSku);
  if (!variant?.vid) {
    throw new Error(`CJ variant not found for SKU ${variantSku}`);
  }

  return {
    productSku: product.productSku,
    pid: product.pid,
    productNameEn: product.productNameEn,
    variant
  };
}

export async function getCheapestLogistics({ fromCountryCode = "CN", toCountryCode, zip, products }) {
  const data = await cjRequest("/logistic/freightCalculate", {
    method: "POST",
    body: JSON.stringify({
      startCountryCode: fromCountryCode,
      endCountryCode: toCountryCode,
      zip: zip || undefined,
      products
    })
  });

  const options = Array.isArray(data.data) ? data.data : [];
  if (!options.length) throw new Error("CJ returned no shipping methods for this order.");

  return options
    .filter(x => x?.logisticName && Number.isFinite(Number(x?.logisticPrice)))
    .sort((a,b) => Number(a.logisticPrice) - Number(b.logisticPrice))[0];
}

export async function createAndPayCJOrder(payload) {
  const data = await cjRequest("/shopping/order/createOrderV2", {
    method: "POST",
    headers: { platformToken: "" },
    body: JSON.stringify({ ...payload, payType: 2 })
  });
  return data.data;
}
