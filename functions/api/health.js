import { CATALOG } from "../_lib/catalog.js";

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });

  const checks = {
    paypalClientId: Boolean(env?.PAYPAL_CLIENT_ID),
    paypalClientSecret: Boolean(env?.PAYPAL_CLIENT_SECRET),
    cjApiKey: Boolean(env?.CJ_API_KEY),
    paypalEnvironment: env?.PAYPAL_ENV === "live" ? "live" : "sandbox",
    paypalEnvironmentExplicit: ["sandbox", "live"].includes(env?.PAYPAL_ENV || "")
  };

  const products = Object.values(CATALOG);
  const orderReady = products.filter(p => p.fulfillmentReady).length;

  return Response.json({
    ok: checks.paypalClientId && checks.paypalClientSecret && checks.cjApiKey && checks.paypalEnvironmentExplicit,
    platform: "cloudflare-pages-functions",
    checks,
    catalogue: {
      total: products.length,
      orderReady
    }
  }, {
    headers: { "Cache-Control": "no-store" }
  });
}
