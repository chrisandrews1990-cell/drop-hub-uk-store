# DropHub UK — Cloudflare Pages setup

The repository is configured for Cloudflare Pages + Pages Functions.

## Create the Pages project

In Cloudflare, go to **Workers & Pages** and create/import a Pages project from GitHub.

Use:

- Repository: `chrisandrews1990-cell/drop-hub-uk-store`
- Production branch: `main`
- Framework preset: `None`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: leave blank / repository root

Cloudflare Pages will use the root `/functions` folder for the server-side API routes.

## Variables and secrets

In **Settings > Variables and Secrets**, add these for Production:

- `PAYPAL_ENV` = `sandbox` initially
- `PAYPAL_CLIENT_ID` = PayPal sandbox client ID
- `PAYPAL_CLIENT_SECRET` = PayPal sandbox client secret
- `CJ_API_KEY` = CJdropshipping API key

Keep real credentials out of GitHub.

## First check

After deployment, open:

`https://YOUR-PAGES-DOMAIN.pages.dev/api/health`

Expected shape:

```json
{
  "ok": true,
  "platform": "cloudflare-pages-functions",
  "catalogue": {
    "total": 58,
    "orderReady": 7
  }
}
```

## Sandbox test

1. Keep `PAYPAL_ENV=sandbox`.
2. Add one Ready to order product to the basket.
3. Confirm a UK shipping quote loads.
4. Continue to PayPal sandbox.
5. Complete the sandbox payment.
6. Confirm the return page shows the printable order confirmation.
7. Confirm the CJ order runs in sandbox mode.

## Go live

Only after the sandbox checkout succeeds:

1. Replace the PayPal sandbox credentials with live PayPal credentials.
2. Set `PAYPAL_ENV=live`.
3. Redeploy.
4. Place one small live test order before advertising the store.
