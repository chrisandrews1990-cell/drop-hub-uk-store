import { CATALOG } from "./catalog.mjs";
import { getCJProductByPid, getCJProductBySku, getCJVariantsByProductSku } from "./cj.mjs";

export default async (request) => {
  if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });
  if (!process.env.CJ_API_KEY) return Response.json({ configured:false,error:"CJ_API_KEY is not configured." },{status:503});

  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));

  if (!id || !CATALOG[id] || CATALOG[id].supplier !== "CJ") {
    return Response.json({
      configured:true,
      usage:"Call this endpoint with ?id=1 through ?id=8 to inspect one CJ product at a time."
    });
  }

  const product = CATALOG[id];

  try {
    const details = product.cjPid
      ? await getCJProductByPid(product.cjPid)
      : await getCJProductBySku(product.cjProductSku);

    if (!details?.productSku) throw new Error("CJ product details did not include a product SKU.");

    const variants = await getCJVariantsByProductSku(details.productSku);

    return Response.json({
      configured:true,
      id,
      name:product.name,
      pid:details.pid || product.cjPid,
      productSku:details.productSku,
      productNameEn:details.productNameEn,
      bigImage:details.bigImage,
      sellPrice:details.sellPrice,
      variants:variants.map(v=>({
        variantSku:v.variantSku,
        variantNameEn:v.variantNameEn,
        variantKey:v.variantKey,
        variantImage:v.variantImage || null,
        variantSellPrice:v.variantSellPrice,
        vid:v.vid
      }))
    });
  } catch(error) {
    return Response.json({configured:true,id,name:product.name,error:error.message},{status:404});
  }
};
