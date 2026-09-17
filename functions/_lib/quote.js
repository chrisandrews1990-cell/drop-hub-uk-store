const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, ch => ch.charCodeAt(0));
}

function encodePayload(payload) {
  return bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
}

function decodePayload(encoded) {
  return JSON.parse(decoder.decode(base64UrlToBytes(encoded)));
}

async function signature(env, encoded) {
  const secret = env?.PAYPAL_CLIENT_SECRET;
  if (!secret) throw new Error("Checkout signing secret is not configured.");

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(encoded));
  return bytesToBase64Url(new Uint8Array(signed));
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export async function createCheckoutQuoteToken(env, payload) {
  const encoded = encodePayload(payload);
  return `${encoded}.${await signature(env, encoded)}`;
}

export async function verifyCheckoutQuote(env, token) {
  try {
    if (!token || typeof token !== "string" || !token.includes(".")) return null;
    const [encoded, sig] = token.split(".");
    const expected = await signature(env, encoded);
    if (!safeEqual(sig, expected)) return null;
    const payload = decodePayload(encoded);
    if (!payload?.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function normalizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map(line => ({ id: Number(line.id), qty: Math.max(1, Math.min(10, Number(line.qty) || 1)) }))
    .filter(line => Number.isInteger(line.id) && line.id > 0)
    .sort((a, b) => a.id - b.id);
}
