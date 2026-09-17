# DropHub UK Store

DropHub UK is a static storefront with Cloudflare Pages Functions handling secure checkout, PayPal order creation/capture, live CJdropshipping product checks, UK freight quotes and CJ fulfilment.

## Production

- Hosting: Cloudflare Pages
- Backend: Cloudflare Pages Functions
- Payments: PayPal
- Fulfilment: CJdropshipping
- Source: GitHub `main`

## Cloudflare build

- Build command: `npm run build`
- Output directory: `dist`
- Functions directory: `functions`

See [CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md) for deployment and [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) for launch testing.
