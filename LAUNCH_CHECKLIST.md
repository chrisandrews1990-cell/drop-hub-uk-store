# DropHub UK Launch Checklist

The website code is stored in GitHub and the production runtime has been migrated from Netlify to Cloudflare Pages + Pages Functions.

## Current catalogue
- 58 visible products
- 7 products are currently marked Ready to order
- All 58 products have a supplier-cost path and customer-facing image
- 14 former placeholder listings have already been switched to matched CJ replacement titles, descriptions and images
- Product-cost pricing review is complete; all 58 pass the current conservative product-cost guardrail
- See PRODUCT_SOURCING.md for the sourcing record
- See PRICING_AUDIT.md for the price/profit review

## Cloudflare deployment settings
1. Create a Cloudflare Pages project from the GitHub repository `chrisandrews1990-cell/drop-hub-uk-store`.
2. Production branch: `main`.
3. Framework preset: None.
4. Build command: `npm run build`.
5. Build output directory: `dist`.
6. Add these Cloudflare Pages variables/secrets:
   - `PAYPAL_ENV=sandbox`
   - `PAYPAL_CLIENT_ID`
   - `PAYPAL_CLIENT_SECRET`
   - `CJ_API_KEY`
7. Deploy the latest `main` branch.
8. Open `/api/health` on the Cloudflare Pages site.
   - `ok` should be `true`.
   - `platform` should be `cloudflare-pages-functions`.
   - `catalogue.total` should be `58`.
   - `catalogue.orderReady` should be `7` or more.
9. Run a sandbox checkout using one Ready to order product.
10. Confirm:
   - UK shipping quote loads.
   - PayPal approval page opens.
   - Return page captures the sandbox order.
   - CJ sandbox fulfilment submits successfully or reports `MANUAL_REQUIRED` for review.
11. When the sandbox test is successful:
   - replace PayPal sandbox credentials with LIVE credentials.
   - set `PAYPAL_ENV=live`.
   - redeploy.
12. Place one low-value live test order before advertising the store.

## Important
Do not paste PayPal client secrets or CJ API keys into chat, GitHub files, or public pages. Store them only as Cloudflare Pages Secrets / Variables.

## Customer-facing launch checks completed
- Homepage wording and catalogue filters polished.
- Coming-soon prices labelled as planned prices.
- Product image fallback added.
- Full supplier sourcing report completed.
- Full pricing/profit audit completed.
- All 58 products have a supplier-cost path.
- 14 former placeholder listings switched to matched CJ replacement products.
- Returns page includes a printable cancellation form.
- Terms clarify the payment obligation and saveable order confirmation.
- Privacy notice explains browser cart storage and third-party checkout/fulfilment services.
- PayPal return page produces a printable/saveable order confirmation after successful capture.

## Cloudflare migration completed in code
- Same `/api/checkout-quote`, `/api/create-order`, `/api/capture-order` and `/api/health` URLs retained.
- Runtime environment access converted from Netlify `process.env` to Cloudflare `context.env` bindings.
- Checkout quote signing converted to Cloudflare Web Crypto.
- Static shop builds into `dist`.
- Cloudflare Functions live in the root `functions` directory.
- Function routing is restricted to `/api/*`, keeping ordinary pages static.
- PayPal defaults safely to sandbox unless `PAYPAL_ENV=live` is explicitly configured.
- CJ orders use sandbox mode whenever PayPal is in sandbox.
- Checkout rechecks live CJ product cost and postcode freight before PayPal capture.
- Old Netlify config and Netlify Functions have been removed from `main`.
- GitHub Actions syntax-checks every Cloudflare Function before preview deployment.
- Cloudflare migration build validation passed successfully on 17 September 2026.

## Remaining before public launch
- Connect the GitHub repository to the Cloudflare Pages project.
- Add the four Cloudflare variables/secrets.
- Complete the sandbox checkout test.
- Run live UK freight checks through the CJ API.
- Keep only products with acceptable landed margin as Ready to order.
- Switch PayPal to live credentials and place one low-value live test order.
