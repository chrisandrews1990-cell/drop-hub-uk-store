DROPHUB UK — CLOUDFLARE STOREFRONT
==================================

Production platform: Cloudflare Pages + Pages Functions
Source control: GitHub
Supplier integration: CJdropshipping
Payments: PayPal

Build settings:
- Framework preset: None
- Build command: npm run build
- Build output directory: dist
- Production branch: main

Cloudflare Functions:
- /api/health
- /api/checkout-quote
- /api/create-order
- /api/capture-order

Required Cloudflare variables/secrets:
- PAYPAL_ENV=sandbox initially
- PAYPAL_CLIENT_ID
- PAYPAL_CLIENT_SECRET
- CJ_API_KEY

Do not commit real secrets to GitHub.

See CLOUDFLARE_SETUP.md and LAUNCH_CHECKLIST.md for deployment/testing steps.
