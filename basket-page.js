"use strict";
(async()=>{
  const $=id=>document.getElementById(id);
  const fmt=p=>"£"+(p/100).toFixed(2);
  const esc=v=>{const d=document.createElement("span");d.textContent=String(v??"");return d.innerHTML};
  const btn=$("basketCheckout"),msg=$("basketMessage");
  const query=new URLSearchParams(location.search);
  let available=[];
  async function render(){
    const ids=KrakenBasket.read().map(x=>x.id);
    available=[];btn.disabled=true;
    if(!ids.length){$("basketItems").innerHTML='<p class="basket-empty">Your basket is empty. Browse courses to add training.</p>';$("basketTotal").textContent="£0.00";return}
    const result=await supabaseClient.from("public_course_catalogue").select("id,title,price_pence,access_type,currency,status").in("id",ids);
    if(result.error){$("basketItems").textContent="Could not verify course prices. Please refresh.";msg.textContent=result.error.message;return}
    available=(result.data||[]).filter(c=>c.status==="Published"&&c.access_type==="paid"&&Number(c.price_pence)>0&&String(c.currency||"GBP").toUpperCase()==="GBP");
    const total=available.reduce((n,c)=>n+Number(c.price_pence),0);
    $("basketItems").innerHTML=available.map(c=>'<article class="basket-item"><div><h2>'+esc(c.title)+'</h2><small>One-off course access</small></div><strong>'+fmt(c.price_pence)+'</strong><button type="button" data-remove="'+esc(c.id)+'">Remove</button></article>').join("")+(available.length!==ids.length?'<p>Some courses are no longer available and were excluded from the total.</p>':"");
    $("basketTotal").textContent=fmt(total);
    $("basketItems").querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>KrakenBasket.remove(b.dataset.remove));
    btn.disabled=!available.length||available.length!==ids.length;
    btn.textContent="Secure checkout with Stripe";
    if(available.length!==ids.length)msg.textContent="Remove unavailable courses before checkout.";
  }
  btn.onclick=async()=>{
    btn.disabled=true;msg.textContent="Preparing secure Stripe checkout…";
    try{
      const auth=await supabaseClient.auth.getSession();
      if(!auth.data?.session?.access_token){location.href="student-login.html";return}
      const response=await fetch("https://kraken-payments.krakenmedicaltraining.workers.dev/api/create-basket-checkout-session",{
        method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+auth.data.session.access_token},
        body:JSON.stringify({course_ids:available.map(x=>x.id)})
      });
      const body=await response.json();
      if(!response.ok)throw Error(body.error||"Checkout unavailable");
      if(!/^https:\/\/checkout\.stripe\.com\//.test(body.checkout_url||""))throw Error("Unexpected Stripe checkout URL");
      location.assign(body.checkout_url);
    }catch(e){msg.textContent=e.message;btn.disabled=false}
  };
  if(query.get("checkout")==="cancelled")msg.textContent="Checkout cancelled. Your basket is still here.";
  if(query.get("checkout")==="success"){
    msg.textContent="Stripe checkout returned. Verifying payment and enrolment…";
    const sessionId=query.get("session_id");
    if(sessionId){
      for(let i=0;i<5;i++){
        const result=await supabaseClient.from("kraken_orders").select("id,status").eq("stripe_checkout_session_id",sessionId).eq("status","paid").maybeSingle();
        if(result.data){
          const items=await supabaseClient.from("kraken_order_items").select("item_reference").eq("order_id",result.data.id).eq("item_type","course");
          if(!items.error&&items.data?.length){
            const bought=new Set(items.data.map(x=>x.item_reference));
            const remaining=KrakenBasket.read().filter(x=>!bought.has(x.id));
            KrakenBasket.clear();remaining.forEach(x=>KrakenBasket.addCourse({id:x.id,access_type:"paid",price_pence:1}));
            msg.textContent="Payment confirmed! Your purchased courses are available in your dashboard.";
            break;
          }
        }
        if(i<4)await new Promise(resolve=>setTimeout(resolve,1500));
      }
      if(msg.textContent.includes("Verifying"))msg.textContent="Payment is processing. Please check your dashboard shortly. Your basket has been kept.";
    }
  }
  window.addEventListener("kraken:basket",()=>render().catch(console.error));
  await render();
})();
