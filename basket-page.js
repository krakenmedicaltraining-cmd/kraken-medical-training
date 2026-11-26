"use strict";
(async()=>{
  const $=id=>document.getElementById(id);
  const fmt=p=>"£"+(p/100).toFixed(2);
  const esc=v=>{const d=document.createElement("span");d.textContent=String(v??"");return d.innerHTML};
  const btn=$("basketCheckout"),msg=$("basketMessage");
  const query=new URLSearchParams(location.search);
  let available=[];
  let signedIn=false;
  const loginUrl="student-login.html?return=basket";
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
    const auth=await supabaseClient.auth.getSession();signedIn=!!auth.data?.session?.access_token;btn.textContent=signedIn?"Secure checkout with Stripe":"Sign in to checkout";
    if(available.length!==entries.length)msg.textContent="Remove unavailable items before checkout.";
  }
  btn.onclick=async()=>{
    btn.disabled=true;msg.textContent="Preparing secure Stripe checkout…";
    try{
      const auth=await supabaseClient.auth.getSession();
      if(!auth.data?.session?.access_token){location.href=loginUrl;return}
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
  async function downloadResource(id){
    const auth=await supabaseClient.auth.getSession();
    if(!auth.data?.session)throw Error("Sign in to download.");
    const response=await fetch("https://kraken-payments.krakenmedicaltraining.workers.dev/api/resource/download",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+auth.data.session.access_token},body:JSON.stringify({resource_id:id})});
    if(!response.ok)throw Error("Download unavailable. Try again from the library.");
    const blob=await response.blob(),url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1]||"resource-download";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  async function showDownloads(items,sessionId){
    const resources=items.filter(x=>x.item_type==="resource");if(!resources.length)return;
    const panel=document.createElement("section");panel.className="basket-summary";panel.style.marginBottom="20px";
    const title=document.createElement("h2");title.textContent="Your purchased downloads";title.style.color="white";panel.append(title);
    const note=document.createElement("p");note.textContent="Payment confirmed. Use these buttons if your browser blocks automatic downloads.";panel.append(note);
    for(const item of resources){const b=document.createElement("button");b.type="button";b.textContent="Download "+(item.title_snapshot||"resource");b.style.marginBottom="8px";b.onclick=async()=>{b.disabled=true;try{await downloadResource(item.item_reference)}catch(e){note.textContent=e.message}finally{b.disabled=false}};panel.append(b);}
    $("basketItems").before(panel);
    const key="kraken_auto_download_"+sessionId;
    if(!sessionStorage.getItem(key)){sessionStorage.setItem(key,"1");for(const item of resources){try{await downloadResource(item.item_reference)}catch(e){note.textContent=e.message;}}}
  }
  if(query.get("checkout")==="cancelled")msg.textContent="Checkout cancelled. Your basket is still here.";
  if(query.get("checkout")==="success"){
    msg.textContent="Stripe checkout returned. Verifying payment and enrolment…";
    const sessionId=query.get("session_id");
    if(sessionId){
      const auth=await supabaseClient.auth.getSession();
      if(!auth.data?.session){msg.textContent="Sign in to verify your purchase, then reopen this confirmation URL.";return;}
      for(let i=0;i<5;i++){
        const result=await supabaseClient.from("kraken_orders").select("id,status").eq("learner_id",auth.data.session.user.id).eq("stripe_checkout_session_id",sessionId).eq("status","paid").maybeSingle();
        if(result.data){
          const items=await supabaseClient.from("kraken_order_items").select("item_reference,item_type,title_snapshot").eq("order_id",result.data.id);
          if(!items.error&&items.data?.length){
            items.data.forEach(x=>KrakenBasket.remove(x.item_reference,x.item_type));
            msg.textContent="Payment confirmed! Courses are in your dashboard and resources in the library.";
            await showDownloads(items.data,sessionId);
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
