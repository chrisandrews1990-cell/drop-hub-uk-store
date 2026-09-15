import { CATALOG } from "./catalog.mjs";
import { getCJVariantsByProductSku, findCJProducts } from "./cj.mjs";

export default async (request) => {
  if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });

  if (!process.env.CJ_API_KEY) {
    return Response.json({ configured: false, error: "CJ_API_KEY is not configured." }, { status: 503 });
  }

  const output = [];

  for (const [id, product] of Object.entries(CATALOG)) {
    if (product.supplier !== "CJ") continue;

    try {
      let productSku = product.cjProductSku;
      let variants = [];

      try {
        variants = await getCJVariantsByProductSku(productSku);
      } catch (error) {
        const matches = await findCJProducts(product.name);
        const best = matches[0];
        if (!best?.productSku) throw error;
        productSku = best.productSku;
        variants = await getCJVariantsByProductSku(productSku);
      }

      output.push({
        id: Number(id),
        name: product.name,
        configuredProductSku: product.cjProductSku,
        resolvedProductSku: productSku,
        currentVariantSku: product.cjVariantSku,
        variants: variants.map(v => ({
          variantSku: v.variantSku,
          variantNameEn: v.variantNameEn,
          variantKey: v.variantKey,
          variantImage: v.variantImage || null,
          variantSellPrice: v.variantSellPrice,
          vid: v.vid
        }))
      });
    } catch (error) {
      output.push({ id: Number(id), name: product.name, error: error.message });
    }
  }

  return Response.json({ configured: true, products: output });
};
