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
const paypalContainer=document.getElementById('paypal-button-container');

let cart=JSON.parse(localStorage.getItem('drophub_cart')||'[]')
  .filter(item=>PRODUCTS.find(p=>p.id===item.id)?.fulfillmentReady===true);

let checkoutQuote=null;
let quoteGeneration=0;

function money(v){
  return new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(v);
}

function cartForServer(){
  return cart.map(item=>({id:item.id,qty:item.qty}));
}

function showCheckoutMessage(message,isError=false){
  checkoutMessage.textContent=message;
  checkoutMessage.className='checkout-message '+(isError?'error':'success');
}

function renderPayPalRedirectButton(){
  paypalContainer.innerHTML='';
  if(!checkoutQuote||!cart.length) return;

  const button=document.createElement('button');
  button.type='button';
  button.className='paypal-redirect-btn';
  button.textContent='Continue to PayPal';
  button.onclick=startPayPalCheckout;
  paypalContainer.appendChild(button);
}

async function startPayPalCheckout(){
  const button=paypalContainer.querySelector('button');
  if(button){
    button.disabled=true;
    button.textContent='Opening PayPal…';
  }

  try{
    const response=await fetch('/api/create-order',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        items:cartForServer(),
        quoteToken:checkoutQuote?.token
      })
    });

    const data=await response.json();
    if(!response.ok||!data.approveUrl){
      showCheckoutMessage(data.error||'Unable to start PayPal checkout.',true);
      if(button){
        button.disabled=false;
        button.textContent='Continue to PayPal';
      }
      return;
    }

    window.location.assign(data.approveUrl);
  }catch(error){
    console.error(error);
    showCheckoutMessage('Unable to open PayPal. Please try again.',true);
    if(button){
      button.disabled=false;
      button.textContent='Continue to PayPal';
    }
  }
}

async function prepareCheckout(){
  const generation=++quoteGeneration;
  checkoutQuote=null;
  paypalContainer.innerHTML='';

  if(!cart.length){
    showCheckoutMessage('');
    return;
  }

  showCheckoutMessage('Preparing secure checkout and live UK delivery…');

  try{
    const response=await fetch('/api/checkout-quote',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({items:cartForServer()})
    });
    const data=await response.json();

    if(generation!==quoteGeneration) return;

    if(!response.ok||!data.token){
      showCheckoutMessage(data.error||'Unable to prepare checkout.',true);
      return;
    }

    checkoutQuote=data;
    showCheckoutMessage(`UK delivery ${money(Number(data.shipping))} • Order total ${money(Number(data.total))}`);
    renderPayPalRedirectButton();
  }catch(error){
    if(generation!==quoteGeneration) return;
    console.error(error);
    showCheckoutMessage('Unable to prepare checkout. Please try again shortly.',true);
  }
}

function save(){
  localStorage.setItem('drophub_cart',JSON.stringify(cart));
  renderCart();
  prepareCheckout();
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
        <span class="source-badge">Ready to order</span>
      </div>
      <h3>${p.name}</h3>
      <p>${p.description}</p>
      <div class="price-row">
        <span class="price">${money(p.price)}</span>
        <button class="add-btn" onclick="addToCart(${p.id})">Add to cart</button>
      </div>
    </div>
  </article>`).join('')||'<p>No products found.</p>';
}

function initCategories(){
  [...new Set(PRODUCTS.map(p=>p.category))].sort().forEach(c=>{
    const o=document.createElement('option');
    o.value=c;o.textContent=c;filter.appendChild(o);
  });
}

function addToCart(id){
  const p=PRODUCTS.find(x=>x.id===id);
  if(!p?.fulfillmentReady)return;
  const found=cart.find(x=>x.id===id);
  if(found)found.qty++;else cart.push({...p,qty:1});
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

cartBtn.onclick=openCart;
closeCart.onclick=shutCart;
overlay.onclick=shutCart;
search.oninput=renderProducts;
filter.onchange=renderProducts;
document.getElementById('year').textContent=new Date().getFullYear();

const urlParams=new URLSearchParams(window.location.search);
if(urlParams.get('checkout')==='cancelled'){
  setTimeout(()=>{
    openCart();
    showCheckoutMessage('PayPal checkout was cancelled. No payment was taken.');
  },50);
  history.replaceState({},'',window.location.pathname);
}

renderCart();
initCategories();
renderProducts();
prepareCheckout();