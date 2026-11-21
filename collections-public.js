"use strict";
(() => {
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const money = value => "£" + (Number(value || 0) / 100).toFixed(2);
async function loadCollections(targetId,limit=0){
 const mount=document.getElementById(targetId);if(!mount)return;
 if(typeof supabaseClient==="undefined"){mount.textContent="Collections are temporarily unavailable.";return;}
 try{
  const {data,error}=await supabaseClient.from("course_collections").select("id,title,description,price_pence,course_collection_items(course_id)").eq("status","Published").order("created_at",{ascending:false});
  if(error)throw error;
  const rows=limit?(data||[]).slice(0,limit):(data||[]);
  if(!rows.length){mount.innerHTML='<p class="kc-empty">No published collections yet. Check back soon for new training bundles.</p>';return;}
  mount.innerHTML=rows.map(item=>{
   const count=(item.course_collection_items||[]).length;
   return '<a class="kc-card" href="collection.html?id='+encodeURIComponent(item.id)+'"><span class="kc-kicker">TRAINING COLLECTION</span><h3>'+escapeHtml(item.title)+'</h3><p>'+escapeHtml(item.description||"A focused selection of Kraken medical training courses.")+'</p><div class="kc-meta"><span>'+count+' '+(count===1?'course':'courses')+'</span><strong>'+money(item.price_pence)+'</strong></div><span class="kc-open">Explore collection →</span></a>';
  }).join("");
 }catch(error){console.error("Collections:",error);mount.textContent="Unable to load collections at the moment.";}
}
window.krakenLoadCollections=loadCollections;
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{loadCollections("homeCollectionGrid",3);loadCollections("collectionCatalogue");});
else{loadCollections("homeCollectionGrid",3);loadCollections("collectionCatalogue");}
})();