import { CATALOG } from "./catalog.mjs";

export default async () => {
  const checks = {
    paypalClientId: Boolean(process.env.PAYPAL_CLIENT_ID),
    paypalClientSecret: Boolean(process.env.PAYPAL_CLIENT_SECRET),
    cjApiKey: Boolean(process.env.CJ_API_KEY),
    paypalEnvironment: process.env.PAYPAL_ENV === "sandbox" ? "sandbox" : "live"
  };

  const products = Object.values(CATALOG);
  const orderReady = products.filter(p => p.fulfillmentReady).length;

  return Response.json({
    ok: checks.paypalClientId && checks.paypalClientSecret && checks.cjApiKey,
    checks,
    catalogue: {
      total: products.length,
      orderReady
    }
  });
};
