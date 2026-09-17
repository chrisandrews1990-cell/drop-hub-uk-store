import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";

const staticFiles = [
  "index.html",
  "styles.css",
  "products.js",
  "app.js",
  "paypal-return.html",
  "privacy.html",
  "returns.html",
  "terms.html",
  "supplier-guide.html"
];

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });

for (const file of staticFiles) {
  await copyFile(file, `dist/${file}`);
}

await writeFile("dist/_routes.json", JSON.stringify({
  version: 1,
  include: ["/api/*"],
  exclude: []
}, null, 2) + "\n");

await writeFile("dist/_headers", `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/api/*
  Cache-Control: no-store
`);

console.log(`Built ${staticFiles.length} static files for Cloudflare Pages.`);
