"use strict";
(()=>{
  const grid=document.getElementById("homeNewsGrid"); if(!grid)return;
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const date=v=>v?new Date(v).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"";
  const card=(x,big=false)=>`<article class="v164-news-card ${big?"featured":""}">
    <a class="v164-news-image" href="journal-item.html?slug=${encodeURIComponent(x.slug)}" ${x.cover_image_url?`style="background-image:url('${esc(x.cover_image_url)}')"`:""}><span>${esc(x.category||"Kraken News")}</span></a>
    <div class="v164-news-copy"><small>${esc(x.category||"NEWS")} · ${date(x.published_at)}</small><h3><a href="journal-item.html?slug=${encodeURIComponent(x.slug)}">${esc(x.title)}</a></h3><p>${esc(x.excerpt||"")}</p><a class="v164-read" href="journal-item.html?slug=${encodeURIComponent(x.slug)}">Read story →</a></div>
  </article>`;
  async function init(){
    const {data,error}=await supabaseClient.from("journal_items").select("id,title,slug,excerpt,category,cover_image_url,published_at,featured").eq("status","published").or(`published_at.is.null,published_at.lte.${new Date().toISOString()}`).order("featured",{ascending:false}).order("published_at",{ascending:false}).limit(3);
    if(error)throw error;
    const rows=data||[];
    if(!rows.length){grid.innerHTML='<div class="v164-news-empty"><strong>No news published yet.</strong><span>Create your first story in News Admin and it will appear here automatically.</span></div>';return;}
    grid.innerHTML=rows.map((x,i)=>card(x,i===0)).join("");
  }
  init().catch(e=>{console.error(e);grid.innerHTML='<div class="v164-news-empty">Could not load news right now.</div>'});
})();