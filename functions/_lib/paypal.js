export function getPayPalEnvironment(env) {
  return env?.PAYPAL_ENV === "live" ? "live" : "sandbox";
}

function getPayPalBase(env) {
  return getPayPalEnvironment(env) === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

export async function getPayPalAccessToken(env) {
  const clientId = env?.PAYPAL_CLIENT_ID;
  const clientSecret = env?.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("PayPal environment variables are not configured.");
  }

  const auth = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch(`${getPayPalBase(env)}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!response.ok) {
    throw new Error(`PayPal OAuth failed: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

export async function paypalRequest(env, path, options = {}) {
  const token = await getPayPalAccessToken(env);
  return fetch(`${getPayPalBase(env)}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
}
