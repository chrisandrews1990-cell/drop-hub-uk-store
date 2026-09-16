const grid=document.getElementById('productGrid');
const search=document.getElementById('searchBox');
const filter=document.getElementById('categoryFilter');
const cartBtn=document.getElementById('cartBtn');
const closeCart=document.getElementById('closeCart');
const drawer=document.getElementById('cartDrawer');
const overlay=document.getElementById('overlay');
const cartItems=document.getElementById('cartItems');
const cartCount=document.getElementById('cartCount');
const cartTotal=document.getElementById('cartTotal');
const checkoutMessage=document.getElementById('checkoutMessage');

let cart=JSON.parse(localStorage.getItem('drophub_cart')||'[]')
  .filter(item=>PRODUCTS.find(p=>p.id===item.id)?.fulfillmentReady===true);

function money(v){
  return new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(v);
}

function save(){
  localStorage.setItem('drophub_cart',JSON.stringify(cart));
  renderCart();
}

function renderProducts(){
  const q=search.value.toLowerCase().trim();
  const c=filter.value;
  const items=PRODUCTS.filter(p=>{
    const haystack=(p.name+' '+p.description+' '+p.category).toLowerCase();
    return (c==='all'||p.category===c)&&haystack.includes(q);
  });

  grid.innerHTML=items.map(p=>`<article class="product-card">
    <div class="product-image">
      <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.style.display='none';this.parentElement.innerHTML='<div style=&quot;display:grid;place-items:center;height:100%;font-size:44px&quot;>🛍️</div>';">
    </div>
    <div class="product-body">
      <div class="product-top">
        <span class="category">${p.category}</span>
        <span class="source-badge">${p.fulfillmentReady ? 'Ready to order' : 'Coming soon'}</span>
      </div>
      <h3>${p.name}</h3>
      <p>${p.description}</p>
      <div class="price-row">
        <span class="price">${money(p.price)}</span>
        ${p.fulfillmentReady
          ? `<button class="add-btn" onclick="addToCart(${p.id})">Add to cart</button>`
          : `<button class="add-btn" disabled style="opacity:.45;cursor:not-allowed">Coming soon</button>`}
      </div>
    </div>
  </article>`).join('')||'<p>No products found.</p>';
}

function initCategories(){
  [...new Set(PRODUCTS.map(p=>p.category))].sort().forEach(c=>{
    const o=document.createElement('option');
    o.value=c;
    o.textContent=c;
    filter.appendChild(o);
  });
}

function addToCart(id){
  const p=PRODUCTS.find(x=>x.id===id);
  if(!p?.fulfillmentReady) return;
  const found=cart.find(x=>x.id===id);
  if(found) found.qty++;
  else cart.push({...p,qty:1});
  save();
  openCart();
}

function removeItem(id){
  cart=cart.filter(x=>x.id!==id);
  save();
}

function renderCart(){
  cartCount.textContent=cart.reduce((a,b)=>a+b.qty,0);
  cartTotal.textContent=money(cart.reduce((a,b)=>a+b.price*b.qty,0));
  cartItems.innerHTML=cart.length
    ?cart.map(i=>`<div class="cart-item"><div><strong>${i.name}</strong><br><small>${i.qty} × ${money(i.price)}</small></div><button class="remove-btn" onclick="removeItem(${i.id})">Remove</button></div>`).join('')
    :'<div class="empty">Your cart is empty.</div>';
}

function openCart(){
  drawer.classList.add('open');
  overlay.classList.add('show');
  drawer.setAttribute('aria-hidden','false');
}

function shutCart(){
  drawer.classList.remove('open');
  overlay.classList.remove('show');
  drawer.setAttribute('aria-hidden','true');
}

function cartForServer(){
  return cart.map(item=>({id:item.id,qty:item.qty}));
}

function showCheckoutMessage(message,isError=false){
  checkoutMessage.textContent=message;
  checkoutMessage.className='checkout-message '+(isError?'error':'success');
}

cartBtn.onclick=openCart;
closeCart.onclick=shutCart;
overlay.onclick=shutCart;
search.oninput=renderProducts;
filter.onchange=renderProducts;
document.getElementById('year').textContent=new Date().getFullYear();

save();
initCategories();
renderProducts();

if(window.paypal){
  paypal.Buttons({
    style:{layout:'vertical',shape:'rect',label:'paypal'},
    async createOrder(){
      if(!cart.length){
        showCheckoutMessage('Your cart is empty.',true);
        throw new Error('Cart is empty');
      }

      const response=await fetch('/api/create-order',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({items:cartForServer()})
      });

      const data=await response.json();
      if(!response.ok||!data.id){
        showCheckoutMessage(data.error||'Unable to start checkout.',true);
        throw new Error(data.error||'Unable to create PayPal order');
      }
      return data.id;
    },
    async onApprove(data){
      showCheckoutMessage('Payment approved. Verifying UK delivery and sending your order for fulfilment…');
      const response=await fetch('/api/capture-order',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({orderID:data.orderID})
      });

      const result=await response.json();
      if(!response.ok||result.status!=='COMPLETED'){
        showCheckoutMessage(result.error||'Payment could not be completed.',true);
        return;
      }

      cart=[];
      save();
      if(result.fulfillment==='CJ_SUBMITTED'){
        showCheckoutMessage('Payment completed and your order has been sent for fulfilment.');
      }else{
        showCheckoutMessage('Payment completed successfully. Your order is being reviewed for fulfilment.');
      }
    },
    onCancel(){showCheckoutMessage('Checkout was cancelled.');},
    onError(err){
      console.error(err);
      showCheckoutMessage('Checkout could not be started. Check the message above or try again shortly.',true);
    }
  }).render('#paypal-button-container');
}