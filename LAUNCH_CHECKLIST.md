# DropHub UK Launch Checklist

The website code is already stored in GitHub.

## Current catalogue
- 58 visible products
- 7 products are currently marked Ready to order
- 31 additional products have clean CJ matches and are waiting for live UK shipping validation
- 1 additional product is matched but still needs exact variant-cost confirmation
- 6 products have plausible CJ candidates that need a final title/variant review
- 13 products need a cleaner supplier match or replacement before they can be sold
- See PRODUCT_SOURCING.md for the product-by-product record

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
