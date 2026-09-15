export const CATALOG = {
  1: { name: "Magnetic Vacuum Phone Holder", sku: "CJYD227014202BY", price: 24.99, supplier: "CJ", cjVariantSku: "CJYD227014202BY", fulfillmentReady: false },
  2: { name: "Portable Rechargeable Blender", sku: "CJYD278208001AZ", price: 19.99, supplier: "CJ", cjVariantSku: "CJYD278208001AZ", fulfillmentReady: false },
  3: { name: "Portable Travel Jewellery Box", sku: "CJYD228090802BY", price: 19.99, supplier: "CJ", cjVariantSku: "CJYD228090802BY", fulfillmentReady: false },
  4: { name: "Rechargeable Fabric Lint Remover", sku: "CJYD192666301AZ", price: 14.99, supplier: "CJ", cjVariantSku: "CJYD192666301AZ", fulfillmentReady: false },
  5: { name: "Travel Cable Organiser Bag", sku: "CJJT107047201AZ", price: 14.99, supplier: "CJ", cjVariantSku: "CJJT107047201AZ", fulfillmentReady: false },
  6: { name: "Rechargeable Pet Nail Grinder", sku: "CJJJCWGY03580-Black set-USB", price: 17.99, supplier: "CJ", cjVariantSku: "CJJJCWGY03580-Black set-USB", fulfillmentReady: true },
  7: { name: "Foldable Clothes Storage Bag", sku: "CJYD237778201AZ", price: 16.99, supplier: "CJ", cjVariantSku: "CJYD237778201AZ", fulfillmentReady: false },
  8: { name: "Washable Pet Hair Remover", sku: "CJJT174982701AZ", price: 12.99, supplier: "CJ", cjVariantSku: "CJJT174982701AZ", fulfillmentReady: true },
  9: { name: "USB Motion Sensor Night Light", sku: "Spocket-Lilac-Milo", price: 34.99, supplier: "SPOCKET", fulfillmentReady: false },
  10: { name: "Mini USB Rechargeable Keychain Torch", sku: "Spocket-1005004987025492", price: 9.99, supplier: "SPOCKET", fulfillmentReady: false }
};

export function isFulfillmentReady(product) {
  return Boolean(product?.fulfillmentReady);
}
