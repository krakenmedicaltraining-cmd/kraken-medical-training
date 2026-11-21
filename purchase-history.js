// Kraken purchase history: legacy purchases plus new commerce orders.
// Read-only; payment records and entitlements remain server-managed.
async function renderKrakenPurchaseHistory(userId) {
  const mount = document.getElementById("purchaseHistory");
  if (!mount) return;
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char =>
    ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const date = value => value ? new Date(value).toLocaleDateString("en-GB") : "Date unavailable";
  const money = (pence, currency="GBP") =>
    new Intl.NumberFormat("en-GB",{style:"currency",currency:String(currency||"GBP").toUpperCase()})
      .format(Number(pence||0)/100);
  try {
    const queries = await Promise.allSettled([
      supabaseClient.from("kraken_orders")
        .select("id,status,total_pence,currency,created_at,kraken_order_items(title_snapshot,quantity)")
        .eq("learner_id",userId).order("created_at",{ascending:false}),
      supabaseClient.from("collection_purchases")
        .select("id,collection_id,status,paid_at")
        .eq("learner_id",userId).order("paid_at",{ascending:false}),
      supabaseClient.from("course_purchases")
        .select("*").eq("learner_id",userId)
    ]);
    const rows=[];
    const errors=[];
    const result = i => {
      if(queries[i].status!=="fulfilled"){errors.push(queries[i].reason);return [];}
      if(queries[i].value.error){errors.push(queries[i].value.error);return [];}
      return queries[i].value.data||[];
    };
    const modern=result(0),collections=result(1),courses=result(2);
    for(const o of modern) rows.push({
      id:o.id,title:(o.kraken_order_items||[]).map(i=>i.title_snapshot+(i.quantity>1?" ×"+i.quantity:"")).join(", ")||"Kraken order",
      status:o.status,when:o.created_at,amount:money(o.total_pence,o.currency),source:"order"
    });
    const collectionIds=[...new Set(collections.map(x=>x.collection_id).filter(Boolean))];
    let names=new Map();
    if(collectionIds.length){
      const lookup=await supabaseClient.from("course_collections").select("id,title").in("id",collectionIds);
      if(!lookup.error)names=new Map((lookup.data||[]).map(x=>[x.id,x.title]));
    }
    for(const o of collections)rows.push({
      id:o.id,title:names.get(o.collection_id)||"Course collection",status:o.status,
      when:o.paid_at,amount:"See Stripe receipt",source:"legacy"
    });
    for(const o of courses)rows.push({
      id:o.id,title:"Individual course purchase",status:o.status||"Recorded",
      when:o.paid_at||o.created_at,amount:"See Stripe receipt",source:"legacy"
    });
    rows.sort((a,b)=>new Date(b.when||0)-new Date(a.when||0));
    if(!rows.length){
      mount.textContent=errors.length?"Purchase history is temporarily unavailable. Please try again.":"No purchases recorded yet.";
      return;
    }
    mount.innerHTML='<div style="display:grid;gap:12px">'+rows.map(o=>
      '<div style="border:1px solid rgba(128,145,145,.3);border-radius:12px;padding:14px;display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px">'+
      '<div><strong>'+esc(o.title)+'</strong><div style="opacity:.75;margin-top:5px">'+esc(date(o.when))+' · '+esc(o.status)+'</div></div>'+
      '<div style="font-weight:700">'+esc(o.amount)+'</div></div>'
    ).join("")+'</div>'+
    (errors.length?'<p style="margin-top:12px">Some older purchase records could not be loaded.</p>':"");
  }catch(error){
    console.warn("Purchase history",error);
    mount.textContent="Unable to load purchase history right now.";
  }
}
