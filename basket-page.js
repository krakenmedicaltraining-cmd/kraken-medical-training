"use strict";
(async()=>{
  const $=id=>document.getElementById(id);
  const fmt=p=>"£"+(p/100).toFixed(2);
  const esc=v=>{const d=document.createElement("span");d.textContent=String(v??"");return d.innerHTML};
  const btn=$("basketCheckout"),msg=$("basketMessage");
  const query=new URLSearchParams(location.search);
  let available=[];
  async function render(){
    const entries=KrakenBasket.read(), ids=entries.filter(x=>x.type==="course").map(x=>x.id), resourceIds=entries.filter(x=>x.type==="resource").map(x=>x.id);
    available=[];btn.disabled=true;
    if(!entries.length){$("basketItems").innerHTML='<p class="basket-empty">Your basket is empty. Browse courses or the library to add items.</p>';$("basketTotal").textContent="£0.00";return}
    const result=ids.length?await supabaseClient.from("public_course_catalogue").select("id,title,price_pence,access_type,currency,status").in("id",ids):{data:[]};
    if(result.error){$("basketItems").textContent="Could not verify course prices. Please refresh.";msg.textContent=result.error.message;return}
    available=(result.data||[]).filter(c=>c.status==="Published"&&c.access_type==="paid"&&Number(c.price_pence)>0&&String(c.currency||"GBP").toUpperCase()==="GBP");
    available=available.map(c=>({...c,type:"course"}));
    const resources=resourceIds.length?await supabaseClient.from("kraken_library_catalogue").select("*").in("id",resourceIds):{data:[]};
    if(resources.error){msg.textContent="Could not verify library prices.";return;}
    available.push(...(resources.data||[]).filter(r=>r.private_drive&&r.access_type==="paid"&&Number(r.price_pence)>=50).map(r=>({...r,type:"resource"})));
    const total=available.reduce((n,c)=>n+Number(c.price_pence),0);
    $("basketItems").innerHTML=available.map(c=>'<article class="basket-item"><div><h2>'+esc(c.title)+'</h2><small>'+(c.type==="resource"?"Library download":"One-off course access")+'</small></div><strong>'+fmt(c.price_pence)+'</strong><button type="button" data-remove="'+esc(c.id)+'" data-type="'+c.type+'">Remove</button></article>').join("")+(available.length!==entries.length?entries.filter(e=>!available.some(c=>c.id===e.id&&c.type===e.type)).map(e=>'<article class="basket-item"><div>Unavailable '+e.type+'</div><button data-remove="'+esc(e.id)+'" data-type="'+e.type+'">Remove</button></article>').join(''):"");
    $("basketTotal").textContent=fmt(total);
    $("basketItems").querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>KrakenBasket.remove(b.dataset.remove,b.dataset.type));
    btn.disabled=!available.length||available.length!==entries.length;
    btn.textContent="Secure checkout with Stripe";
    if(available.length!==entries.length)msg.textContent="Remove unavailable items before checkout.";
  }
  btn.onclick=async()=>{
    btn.disabled=true;msg.textContent="Preparing secure Stripe checkout…";
    try{
      const auth=await supabaseClient.auth.getSession();
      if(!auth.data?.session?.access_token){location.href="student-login.html";return}
      const response=await fetch("https://kraken-payments.krakenmedicaltraining.workers.dev/api/create-basket-checkout-session",{
        method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+auth.data.session.access_token},
        body:JSON.stringify({course_ids:available.filter(x=>x.type==="course").map(x=>x.id),resource_ids:available.filter(x=>x.type==="resource").map(x=>x.id)})
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
          const items=await supabaseClient.from("kraken_order_items").select("item_reference,item_type").eq("order_id",result.data.id);
          if(!items.error&&items.data?.length){
            items.data.forEach(x=>KrakenBasket.remove(x.item_reference,x.item_type));
            msg.textContent="Payment confirmed! Courses are in your dashboard and resources in the library.";
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
