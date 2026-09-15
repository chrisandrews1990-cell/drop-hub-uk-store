import { CATALOG } from "./catalog.mjs";
import { getCJVariantsByProductSku } from "./cj.mjs";

export default async (request) => {
  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    if (!process.env.CJ_API_KEY) {
      return Response.json({ configured: false, error: "CJ_API_KEY is not configured." }, { status: 503 });
    }

    const output = [];
    for (const [id, product] of Object.entries(CATALOG)) {
      if (product.supplier !== "CJ") continue;
      try {
        const variants = await getCJVariantsByProductSku(product.cjProductSku);
        output.push({
          id: Number(id),
          name: product.name,
          productSku: product.cjProductSku,
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
  } catch (error) {
    console.error(error);
    return Response.json({ configured: false, error: "CJ catalogue check failed." }, { status: 500 });
  }
};
