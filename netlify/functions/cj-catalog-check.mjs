import { CATALOG } from "./catalog.mjs";
import { getCJVariantBySku } from "./cj.mjs";

export default async (request) => {
  if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });
  if (!process.env.CJ_API_KEY) return Response.json({ configured:false,error:"CJ_API_KEY is not configured." },{status:503});

  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));
  const product = CATALOG[id];

  if (!id || !product || product.supplier !== "CJ") {
    return Response.json({configured:true,error:"Choose a CJ product id from 1 to 8."},{status:400});
  }

  try {
    const variant = await getCJVariantBySku(product.cjVariantSku);
    if (!variant?.vid) throw new Error("Variant not found.");

    return Response.json({
      configured:true,
      ok:true,
      id,
      name:product.name,
      variantSku:product.cjVariantSku,
      variantNameEn:variant.variantNameEn,
      variantKey:variant.variantKey,
      variantSellPrice:variant.variantSellPrice,
      vid:variant.vid
    });
  } catch(error) {
    return Response.json({configured:true,ok:false,id,name:product.name,variantSku:product.cjVariantSku,error:error.message},{status:404});
  }
};
