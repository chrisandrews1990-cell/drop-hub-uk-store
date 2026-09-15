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
const checkoutBtn=document.getElementById('checkoutBtn');
let cart=JSON.parse(localStorage.getItem('drophub_cart')||'[]');

function money(v){return new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(v)}
function save(){localStorage.setItem('drophub_cart',JSON.stringify(cart));renderCart()}
function renderProducts(){
  const q=search.value.toLowerCase().trim();
  const c=filter.value;
  const items=PRODUCTS.filter(p=>(c==='all'||p.category===c)&&(p.name.toLowerCase().includes(q)||p.description.toLowerCase().includes(q)));
  grid.innerHTML=items.map(p=>`<article class="product-card">
    <div class="product-image">${p.emoji}</div>
    <div class="product-body">
      <span class="category">${p.category}</span>
      <h3>${p.name}</h3>
      <p>${p.description}</p>
      <div class="price-row"><span class="price">${money(p.price)}</span><button class="add-btn" onclick="addToCart(${p.id})">Add</button></div>
    </div>
  </article>`).join('')||'<p>No products found.</p>';
}
function initCategories(){
  [...new Set(PRODUCTS.map(p=>p.category))].sort().forEach(c=>{
    const o=document.createElement('option');o.value=c;o.textContent=c;filter.appendChild(o)
  })
}
function addToCart(id){const p=PRODUCTS.find(x=>x.id===id);const found=cart.find(x=>x.id===id);if(found)found.qty++;else cart.push({...p,qty:1});save();openCart()}
function removeItem(id){cart=cart.filter(x=>x.id!==id);save()}
function renderCart(){
  cartCount.textContent=cart.reduce((a,b)=>a+b.qty,0);
  cartTotal.textContent=money(cart.reduce((a,b)=>a+b.price*b.qty,0));
  cartItems.innerHTML=cart.length?cart.map(i=>`<div class="cart-item"><div><strong>${i.name}</strong><br><small>${i.qty} × ${money(i.price)}</small></div><button class="remove-btn" onclick="removeItem(${i.id})">Remove</button></div>`).join(''):'<div class="empty">Your cart is empty.</div>'
}
function openCart(){drawer.classList.add('open');overlay.classList.add('show');drawer.setAttribute('aria-hidden','false')}
function shutCart(){drawer.classList.remove('open');overlay.classList.remove('show');drawer.setAttribute('aria-hidden','true')}
cartBtn.onclick=openCart;closeCart.onclick=shutCart;overlay.onclick=shutCart;
search.oninput=renderProducts;filter.onchange=renderProducts;
checkoutBtn.onclick=()=>alert('Online payment is being connected. Checkout will be activated once the store payment account has been authorised.');
document.getElementById('year').textContent=new Date().getFullYear();
initCategories();renderProducts();renderCart();