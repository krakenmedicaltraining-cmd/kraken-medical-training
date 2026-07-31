"use strict";
(() => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = v => String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  let items = [], blocks = [];

  const slugify = v => String(v||"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,100);
  const state = t => { $("#state").textContent=t; $("#mobileState").textContent=t; };

  function blank(type){ return {client_id:uid(),type,heading:"",text:"",url:"",caption:"",button_text:"Open",items:""}; }
  function add(type){ blocks.push(blank(type)); renderBlocks(); state("Unsaved changes"); }
  function move(i,d){ const n=i+d;if(n<0||n>=blocks.length)return;[blocks[i],blocks[n]]=[blocks[n],blocks[i]];renderBlocks(); }
  function remove(i){ if(confirm("Remove this block?")){blocks.splice(i,1);renderBlocks();} }

  function blockHtml(b,i){
    let body="";
    if(b.type==="heading")body=`<input data-k="heading" value="${esc(b.heading)}" placeholder="Heading">`;
    else if(["paragraph","quote","callout"].includes(b.type))body=`<textarea data-k="text">${esc(b.text)}</textarea>`;
    else if(b.type==="list")body=`<textarea data-k="items" placeholder="One item per line">${esc(b.items)}</textarea>`;
    else body=`<input data-k="url" value="${esc(b.url)}" placeholder="URL"><input data-k="caption" value="${esc(b.caption)}" placeholder="Caption">`;
    return `<article class="block" data-i="${i}"><div class="blockhead"><b>${esc(b.type)}</b><button type="button" data-up="${i}">↑</button><button type="button" data-down="${i}">↓</button><button type="button" data-remove="${i}">×</button></div>${body}</article>`;
  }
  function renderBlocks(){
    $("#blocks").innerHTML=blocks.map(blockHtml).join("");$("#empty").hidden=blocks.length>0;
    $$(".block").forEach(card=>{const i=+card.dataset.i;card.querySelectorAll("[data-k]").forEach(el=>el.oninput=()=>{blocks[i][el.dataset.k]=el.value;state("Unsaved changes")})});
    $$("[data-up]").forEach(b=>b.onclick=()=>move(+b.dataset.up,-1));$$("[data-down]").forEach(b=>b.onclick=()=>move(+b.dataset.down,1));$$("[data-remove]").forEach(b=>b.onclick=()=>remove(+b.dataset.remove));
  }

  function payload(){
    const title=$("#title").value.trim();
    return {title,slug:$("#slug").value.trim()||slugify(title),excerpt:$("#excerpt").value.trim(),content_type:$("#type").value,category:$("#category").value.trim(),author:$("#author").value.trim(),cover_image_url:$("#cover").value.trim()||null,media_url:$("#media").value.trim()||null,event_date:$("#eventDate").value?new Date($("#eventDate").value).toISOString():null,status:$("#status").value,featured:$("#featured").checked,allow_sharing:$("#sharing").checked,published_at:$("#publishedAt").value?new Date($("#publishedAt").value).toISOString():($("#status").value==="published"?new Date().toISOString():null),reading_time_minutes:Number($("#readingTime").value||5),updated_at:new Date().toISOString()};
  }
  async function loadItems(){const r=await supabaseClient.from("journal_items").select("*").order("updated_at",{ascending:false});if(r.error)throw r.error;items=r.data||[];renderItems()}
  function renderItems(){const q=$("#search").value.toLowerCase(),f=$("#filter").value;const filtered=items.filter(x=>`${x.title} ${x.category} ${x.content_type}`.toLowerCase().includes(q)&&(!f||x.content_type===f));$("#itemList").innerHTML=filtered.length?filtered.map(x=>`<article class="item"><small>${esc(x.status)} · ${esc(x.content_type)}</small><h3>${esc(x.title)}</h3><p>${esc(x.excerpt)}</p><button type="button" data-edit="${x.id}">Edit</button></article>`).join(""):'<div class="empty">No matching content.</div>';document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>edit(b.dataset.edit))}
  async function edit(id){const x=items.find(v=>v.id===id);if(!x)return;const br=await supabaseClient.from("journal_blocks").select("*").eq("item_id",id).order("position");if(br.error)throw br.error;$("#itemId").value=x.id;for(const [id2,key] of Object.entries({title:"title",excerpt:"excerpt",type:"content_type",category:"category",author:"author",cover:"cover_image_url",media:"media_url",slug:"slug",status:"status",readingTime:"reading_time_minutes"}))$("#"+id2).value=x[key]??"";$("#eventDate").value=x.event_date?x.event_date.slice(0,16):"";$("#publishedAt").value=x.published_at?x.published_at.slice(0,16):"";$("#featured").checked=x.featured;$("#sharing").checked=x.allow_sharing!==false;blocks=(br.data||[]).map(b=>({...b,client_id:uid()}));$("#heading").textContent=x.title;renderBlocks();state("Loaded")}
  function reset(){ $("#itemForm").reset();$("#itemId").value="";$("#author").value="Kraken Medical Training";$("#category").value="Kraken news";$("#readingTime").value=5;$("#sharing").checked=true;blocks=[];renderBlocks();$("#heading").textContent="New item";state("Not saved") }
  async function save(){const p=payload();if(!p.title||!p.excerpt)return alert("Add a title and excerpt.");state("Saving…");let r=$("#itemId").value?await supabaseClient.from("journal_items").update(p).eq("id",$("#itemId").value).select().single():await supabaseClient.from("journal_items").insert(p).select().single();if(r.error)throw r.error;const id=r.data.id;let d=await supabaseClient.from("journal_blocks").delete().eq("item_id",id);if(d.error)throw d.error;if(blocks.length){const rows=blocks.map((b,i)=>({item_id:id,position:i+1,type:b.type,heading:b.heading||null,text:b.text||null,url:b.url||null,caption:b.caption||null,button_text:b.button_text||null,items:b.items||null}));const ins=await supabaseClient.from("journal_blocks").insert(rows);if(ins.error)throw ins.error}showToast("Journal item saved");reset();await loadItems()}
  async function del(){const id=$("#itemId").value;if(!id||!confirm("Delete this item?"))return;const r=await supabaseClient.from("journal_items").delete().eq("id",id);if(r.error)throw r.error;reset();await loadItems()}
  document.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>add(b.dataset.add));$("#newItem").onclick=reset;$("#search").oninput=renderItems;$("#filter").onchange=renderItems;$("#title").oninput=()=>{if(!$("#slug").value)$("#slug").value=slugify($("#title").value);state("Unsaved changes")};$("#itemForm").onsubmit=e=>{e.preventDefault();save().catch(x=>alert(x.message))};$("#deleteItem").onclick=()=>del().catch(x=>alert(x.message));$("#mobileSave").onclick=()=>$("#itemForm").requestSubmit();$("#signOut").onclick=async()=>{await supabaseClient.auth.signOut();location.href="index.html"};
  (async()=>{const s=await requireAdmin();if(!s)return;reset();await loadItems()})();
})();
