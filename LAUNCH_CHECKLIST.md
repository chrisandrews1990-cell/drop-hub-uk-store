# DropHub UK Launch Checklist

The website code is already stored in GitHub.

## Current catalogue
- 58 visible products
- 7 products are currently marked Ready to order
- All 58 products now have a supplier-cost path and customer-facing image
- 14 draft listings have priced CJ replacements saved and remain Coming soon until their public title/image is switched
- Product-cost pricing review is complete; all 58 pass the current conservative product-cost guardrail
- See PRODUCT_SOURCING.md for the product-by-product sourcing record
- See PRICING_AUDIT.md for the current price/profit review

## When Netlify credits are available
1. Deploy the latest main branch from GitHub.
2. Add these Netlify environment variables:
   - PAYPAL_ENV=sandbox
   - PAYPAL_CLIENT_ID
   - PAYPAL_CLIENT_SECRET
   - CJ_API_KEY
3. Trigger a fresh Netlify deploy.
4. Open /api/health on the Netlify site.
   - ok should be true.
   - catalogue.total should be 58.
   - catalogue.orderReady should be 7 or more.
5. Run a sandbox checkout using one Ready to order product.
6. Confirm:
   - UK shipping quote loads.
   - PayPal approval page opens.
   - Return page captures the sandbox order.
   - CJ fulfilment either submits successfully or reports MANUAL_REQUIRED for review.
7. When the sandbox test is successful:
   - replace PayPal sandbox credentials with LIVE credentials.
   - set PAYPAL_ENV=live.
   - redeploy.
8. Place one low-value live test order before advertising the store.

## Important
Do not paste PayPal client secrets or CJ API keys into chat, GitHub files, or public pages. Store them only as secure Netlify environment variables.


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

## Remaining before launch
- Restore Netlify deployment when credits return.
- Add PayPal and CJ credentials as Netlify environment variables.
- Run live UK freight checks through the CJ API.
- Keep only products with acceptable landed margin as Ready to order.
- Complete PayPal sandbox checkout and CJ fulfilment test.
- Switch PayPal to live credentials and place one low-value live test order.
