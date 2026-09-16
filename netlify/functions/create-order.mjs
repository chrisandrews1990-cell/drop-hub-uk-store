import { CATALOG, isFulfillmentReady } from "./catalog.mjs";
import { paypalRequest } from "./paypal.mjs";
import { verifyCheckoutQuote } from "./checkout-quote.mjs";

function normalizeItems(items){
  return items
    .map(line=>({id:Number(line.id),qty:Math.max(1,Math.min(10,Number(line.qty)||1))}))
    .sort((a,b)=>a.id-b.id);
}

function sameItems(a,b){
  return JSON.stringify(a)===JSON.stringify(b);
}

export default async(request)=>{
  if(request.method!=="POST") return new Response("Method not allowed",{status:405});

  try{
    const {items=[],quoteToken}=await request.json();
    if(!Array.isArray(items)||!items.length){
      return Response.json({error:"Cart is empty."},{status:400});
    }

    const quote=verifyCheckoutQuote(quoteToken);
    if(!quote){
      return Response.json({error:"Your delivery quote expired. Please let checkout refresh and try again."},{status:409});
    }

    const normalized=normalizeItems(items);
    if(!sameItems(normalized,quote.items)){
      return Response.json({error:"Your basket changed. Please let checkout refresh and try again."},{status:409});
    }

    const orderItems=[];
    let itemTotal=0;

    for(const line of normalized){
      const product=CATALOG[line.id];
      if(!product||!isFulfillmentReady(product)||product.supplier!=="CJ"){
        return Response.json({error:"A product in your basket is no longer available."},{status:409});
      }

      itemTotal+=product.price*line.qty;
      orderItems.push({
        name:product.name,
        sku:product.sku,
        quantity:String(line.qty),
        unit_amount:{currency_code:"GBP",value:product.price.toFixed(2)}
      });
    }

    const shippingValue=Number(quote.shipping).toFixed(2);
    const itemValue=itemTotal.toFixed(2);
    const totalValue=(itemTotal+Number(shippingValue)).toFixed(2);

    const response=await paypalRequest("/v2/checkout/orders",{
      method:"POST",
      headers:{"PayPal-Request-Id":crypto.randomUUID()},
      body:JSON.stringify({
        intent:"CAPTURE",
        purchase_units:[{
          amount:{
            currency_code:"GBP",
            value:totalValue,
            breakdown:{
              item_total:{currency_code:"GBP",value:itemValue},
              shipping:{currency_code:"GBP",value:shippingValue}
            }
          },
          items:orderItems,
          description:`DropHub UK order • UK delivery ${quote.logisticsName||""}`
        }]
      })
    });

    const data=await response.json();
    if(!response.ok){
      console.error("PayPal create order error",data);
      return Response.json({error:"PayPal could not create the order."},{status:502});
    }

    return Response.json({id:data.id});
  }catch(error){
    console.error("Create order error",error);
    return Response.json({error:"Checkout could not be started. Please try again."},{status:500});
  }
};