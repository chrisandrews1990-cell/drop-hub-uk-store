const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";

export async function getCJAccessToken() {
  const apiKey = process.env.CJ_API_KEY;
  if (!apiKey) throw new Error("CJ_API_KEY is not configured.");

  const response = await fetch(`${CJ_BASE}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey })
  });
  const data = await response.json();
  if (!response.ok || !data?.result || !data?.data?.accessToken) {
    throw new Error(`CJ authentication failed: ${data?.message || response.status}`);
  }
  return data.data.accessToken;
}

export async function cjRequest(path, options = {}) {
  const token = await getCJAccessToken();
  const response = await fetch(`${CJ_BASE}${path}`, {
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

export async function getCJProductBySku(productSku) {
  return cjRequest(`/product/query?productSku=${encodeURIComponent(productSku)}`);
}

export async function getCJVariantBySku(variantSku) {
  const data = await cjRequest(`/product/variant/query?variantSku=${encodeURIComponent(variantSku)}`);
  return Array.isArray(data.data) ? data.data[0] : data.data;
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
