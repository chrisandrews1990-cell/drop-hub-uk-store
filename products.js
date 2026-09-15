const PRODUCTS = [
  {
    id:1,
    name:"Magnetic Vacuum Phone Holder",
    category:"Tech",
    price:24.99,
    image:"https://oss-cf.cjdropshipping.com/product/2025/01/14/05/c6457534-d5ea-475d-bd0a-fea5c611287b_trans.jpeg",
    description:"Adjustable magnetic car phone holder with a stable suction base and foldable design.",
    supplier:"CJdropshipping",
    supplierUrl:"https://cjdropshipping.com/product/magnetic-phone-holder-with-vacuum-suction-foldable-adjustable-car-mount-magnetic-bracket-suction-nonslip-for-busy-commuters-p-2501140539421621100.html",
    supplierSku:"CJYD227014202BY"
  },
  {
    id:2,
    name:"Portable Rechargeable Blender",
    category:"Kitchen",
    price:19.99,
    image:"https://cf.cjdropshipping.com/quick/product/bef87977-9a0d-4099-826a-75bdcae7a2f9.jpg",
    description:"Compact rechargeable blender for smoothies, juices and drinks at home, work or on the go.",
    supplier:"CJdropshipping",
    supplierUrl:"https://www.cjdropshipping.com/product/portable-rechargeable-juice-blender-compact-handheld-electric-smoothie-maker-for-travel-office-home-p-2603100340021608800.html",
    supplierSku:"CJYD278208001AZ"
  },
  {
    id:3,
    name:"Portable Travel Jewellery Box",
    category:"Accessories",
    price:19.99,
    image:"https://cf.cjdropshipping.com/quick/product/5aaf2512-caa6-48f1-9a77-b653f497fca3.jpg",
    description:"Travel-friendly jewellery organiser with multiple colour options and a soft-lined interior.",
    supplier:"CJdropshipping",
    supplierUrl:"https://cjdropshipping.com/product/travel-easy-to-carry-dustproof-portable-jewelry-box-p-2501290753441625000.html",
    supplierSku:"CJYD228090802BY"
  },
  {
    id:4,
    name:"Rechargeable Fabric Lint Remover",
    category:"Home",
    price:14.99,
    image:"https://oss-cf.cjdropshipping.com/product/2024/06/24/05/828407c7-959e-48b7-823f-914a45256f52.jpg",
    description:"Rechargeable fabric shaver with a digital battery display for clothing and soft furnishings.",
    supplier:"CJdropshipping",
    supplierUrl:"https://cjdropshipping.com/product/lint-remover-for-clothing-portable-electric-fuzz-pellet-remover-led-display-rechargeable-for-clothes-fabric-shaver-fluff-remover-p-1737785083941105664.html",
    supplierSku:"CJYD192666301AZ"
  },
  {
    id:5,
    name:"Travel Cable Organiser Bag",
    category:"Tech",
    price:14.99,
    image:"https://cc-west-usa.oss-accelerate.aliyuncs.com/1617858526212.jpg",
    description:"Water-resistant three-layer organiser for cables, chargers, power banks and small electronics.",
    supplier:"CJdropshipping",
    supplierUrl:"https://cjdropshipping.com/product/cable-organizer-bag-travel-electronic-accessories-carrying-case-for-digital-camera-usb-charger-power-bank-storage-bag-box-p-1380028552015122432.html",
    supplierSku:"CJJT107047201AZ"
  },
  {
    id:6,
    name:"Rechargeable Pet Nail Grinder",
    category:"Pets",
    price:17.99,
    image:"https://cf.cjdropshipping.com/2059/1220259747825.jpg",
    description:"USB rechargeable nail grinder designed for gentle pet nail care across different pet sizes.",
    supplier:"CJdropshipping",
    supplierUrl:"https://www.cjdropshipping.com/product/rechargeable-usb-pet-automatic-dog-nail-grinder-animal-clipper-p-C0175213-1A1D-4688-BC1D-179F5D5B1702.html",
    supplierSku:"CJJJCWGY03580-Black set-USB"
  },
  {
    id:7,
    name:"Foldable Clothes Storage Bag",
    category:"Home",
    price:16.99,
    image:"https://oss-cf.cjdropshipping.com/product/2026/09/01/07/2625f844-4a70-4142-b8fe-18b826aae414.jpg",
    description:"Large-capacity foldable storage bag with handles and a double-zip closure for clothes and bedding.",
    supplier:"CJdropshipping",
    supplierUrl:"https://cjdropshipping.com/product/foldable-clothes-storage-bag-large-capacity-organizer-with-handle-and-double-zipper-for-bedding-moving-travel-under-bed-storage-p-2505160457141629100.html",
    supplierSku:"CJYD237778201AZ"
  },
  {
    id:8,
    name:"Washable Pet Hair Remover",
    category:"Pets",
    price:12.99,
    image:"https://cf.cjdropshipping.com/9d4a3e49-2368-4a91-a510-ff2f25a0c8fc.jpg",
    description:"Reusable washable roller for lifting pet hair, lint and dust from clothes, sofas and car seats.",
    supplier:"CJdropshipping",
    supplierUrl:"https://cjdropshipping.com/product/portable-washable-hair-remover-with-adhesive-roller-p-1653949161269637120.html",
    supplierSku:"CJJT174982701AZ"
  },
  {
    id:9,
    name:"USB Motion Sensor Night Light",
    category:"Home",
    price:34.99,
    image:"https://d2nxps5jx3f309.cloudfront.net/listing_images/attachments/208/bdb/e4-/normal/data.png",
    description:"Rechargeable motion-sensor night light with magnetic mounting and detachable handheld use.",
    supplier:"Spocket",
    supplierUrl:"https://www.spocket.co/dropship/tech-accessories/portable-wireles-lamp-sensor-auto-motion-detector-lamp",
    supplierSku:"Spocket-Lilac-Milo"
  },
  {
    id:10,
    name:"Mini USB Rechargeable Keychain Torch",
    category:"Travel",
    price:9.99,
    image:"https://aliexpress-images.spocket.co/1005004987025492.jpg",
    description:"Pocket-size rechargeable LED torch for keys, travel, camping and everyday carry.",
    supplier:"Spocket",
    supplierUrl:"https://www.spocket.co/dropship/other/led-mini-torch-light-portable-usb-rechargeable-pocket-led-flashlight-k-22785686",
    supplierSku:"Spocket-1005004987025492"
  }
];

// Keep supplier data in the product records for fulfilment.
// Before enabling live payments, confirm final supplier shipping cost, delivery time and available variants.