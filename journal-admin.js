"use strict";
(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = v => String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

  let items = [];
  let blocks = [];
  let currentId = null;

  const slugify = v => String(v||"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,100);

  function setState(text){ $("#state").textContent=text; $("#mobileState").textContent=text; }
  function toast(text){ const el=$("#toast"); el.textContent=text; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),2200); }
  function blank(type){ return {client_id:uid(),type,heading:"",text:"",url:"",caption:"",button_text:"Open",items:""}; }

  function add(type){ blocks.push(blank(type)); renderBlocks(); setState("Unsaved changes"); }
  function move(i,d){ const n=i+d; if(n<0||n>=blocks.length)return; [blocks[i],blocks[n]]=[blocks[n],blocks[i]]; renderBlocks(); setState("Unsaved changes"); }
  function remove(i){ if(!confirm("Remove this block?"))return; blocks.splice(i,1); renderBlocks(); setState("Unsaved changes"); }
  function duplicateBlock(i){ const copy=structuredClone(blocks[i]); copy.id=undefined; copy.client_id=uid(); blocks.splice(i+1,0,copy); renderBlocks(); setState("Unsaved changes"); }

  function blockHtml(b,i){
    let body="";
    if(b.type==="heading") body=`<input data-k="heading" value="${esc(b.heading)}" placeholder="Heading">`;
    else if(["paragraph","quote","callout"].includes(b.type)) body=`<textarea data-k="text">${esc(b.text)}</textarea>`;
    else if(b.type==="list") body=`<textarea data-k="items" placeholder="One item per line">${esc(b.items)}</textarea>`;
    else body=`<input data-k="url" value="${esc(b.url)}" placeholder="URL"><input data-k="caption" value="${esc(b.caption)}" placeholder="Caption">`;
    return `<article class="block" data-i="${i}"><div class="blockhead"><b>${esc(b.type)}</b><button type="button" data-up="${i}">↑</button><button type="button" data-down="${i}">↓</button><button type="button" data-copy="${i}">⧉</button><button type="button" data-remove="${i}">×</button></div>${body}</article>`;
  }

  function renderBlocks(){
    $("#blocks").innerHTML=blocks.map(blockHtml).join("");
    $("#empty").hidden=blocks.length>0;
    $$(".block").forEach(card=>{const i=+card.dataset.i; card.querySelectorAll("[data-k]").forEach(el=>el.oninput=()=>{blocks[i][el.dataset.k]=el.value;setState("Unsaved changes")})});
    $$("[data-up]").forEach(b=>b.onclick=()=>move(+b.dataset.up,-1));
    $$("[data-down]").forEach(b=>b.onclick=()=>move(+b.dataset.down,1));
    $$("[data-copy]").forEach(b=>b.onclick=()=>duplicateBlock(+b.dataset.copy));
    $$("[data-remove]").forEach(b=>b.onclick=()=>remove(+b.dataset.remove));
  }

  function payload(){
    const title=$("#title").value.trim();
    return {
      title,
      slug:$("#slug").value.trim()||slugify(title),
      excerpt:$("#excerpt").value.trim(),
      content_type:$("#type").value,
      category:$("#category").value.trim()||"Kraken news",
      author:$("#author").value.trim()||"Kraken Medical Training",
      cover_image_url:$("#cover").value.trim()||null,
      media_url:$("#media").value.trim()||null,
      event_date:$("#eventDate").value?new Date($("#eventDate").value).toISOString():null,
      status:$("#status").value,
      featured:$("#featured").checked,
      allow_sharing:$("#sharing").checked,
      published_at:$("#publishedAt").value?new Date($("#publishedAt").value).toISOString():($("#status").value==="published"?new Date().toISOString():null),
      reading_time_minutes:Number($("#readingTime").value||5),
      updated_at:new Date().toISOString()
    };
  }

  async function loadItems(){
    const r=await supabaseClient.from("journal_items").select("*").order("updated_at",{ascending:false});
    if(r.error)throw r.error;
    items=r.data||[];
    renderItems();
  }

  function renderItems(){
    const q=$("#search").value.toLowerCase(), f=$("#filter").value;
    const filtered=items.filter(x=>`${x.title} ${x.category} ${x.content_type} ${x.status}`.toLowerCase().includes(q)&&(!f||x.content_type===f));
    $("#itemList").innerHTML=filtered.length?filtered.map(x=>`
      <article class="item ${currentId===x.id?"selected":""}">
        <small>${esc(x.status)} · ${esc(x.content_type)}</small>
        <h3>${esc(x.title)}</h3>
        <p>${esc(x.excerpt||"")}</p>
        <div class="item-actions">
          <a href="journal-item.html?slug=${encodeURIComponent(x.slug)}" target="_blank">Preview</a>
          <button type="button" data-edit="${x.id}">Edit</button>
          <button type="button" data-dup="${x.id}">Duplicate</button>
          <button type="button" class="item-delete" data-del="${x.id}">Delete</button>
        </div>
      </article>`).join(""):'<div class="empty">No matching content.</div>';

    $$("[data-edit]").forEach(b=>b.onclick=()=>edit(b.dataset.edit).catch(e=>alert(e.message)));
    $$("[data-dup]").forEach(b=>b.onclick=()=>duplicateExisting(b.dataset.dup).catch(e=>alert(e.message)));
    $$("[data-del]").forEach(b=>b.onclick=()=>deleteItem(b.dataset.del).catch(e=>alert(e.message)));
  }

  async function edit(id){
    const x=items.find(v=>v.id===id); if(!x)return;
    const br=await supabaseClient.from("journal_blocks").select("*").eq("item_id",id).order("position");
    if(br.error)throw br.error;
    currentId=x.id; $("#itemId").value=x.id;
    $("#title").value=x.title||""; $("#excerpt").value=x.excerpt||""; $("#type").value=x.content_type||"article";
    $("#category").value=x.category||""; $("#author").value=x.author||""; $("#cover").value=x.cover_image_url||"";
    $("#media").value=x.media_url||""; $("#slug").value=x.slug||""; $("#status").value=x.status||"draft";
    $("#readingTime").value=x.reading_time_minutes||5; $("#eventDate").value=x.event_date?x.event_date.slice(0,16):"";
    $("#publishedAt").value=x.published_at?x.published_at.slice(0,16):""; $("#featured").checked=!!x.featured;
    $("#sharing").checked=x.allow_sharing!==false; blocks=(br.data||[]).map(b=>({...b,client_id:uid()}));
    $("#heading").textContent=`Editing: ${x.title}`; $("#deleteItem").hidden=false; renderBlocks(); renderItems(); setState("Loaded");
    scrollTo({top:0,behavior:"smooth"});
  }

  function reset(){
    $("#itemForm").reset(); currentId=null; $("#itemId").value=""; $("#author").value="Kraken Medical Training";
    $("#category").value="Kraken news"; $("#readingTime").value=5; $("#sharing").checked=true; $("#status").value="draft";
    $("#heading").textContent="New item"; $("#deleteItem").hidden=true; blocks=[]; renderBlocks(); renderItems(); setState("Not saved");
  }

  async function save(){
    const p=payload(); if(!p.title||!p.excerpt){alert("Add a title and excerpt.");return;}
    setState("Saving…");
    const r=currentId
      ? await supabaseClient.from("journal_items").update(p).eq("id",currentId).select().single()
      : await supabaseClient.from("journal_items").insert(p).select().single();
    if(r.error)throw r.error;
    const id=r.data.id;
    const d=await supabaseClient.from("journal_blocks").delete().eq("item_id",id); if(d.error)throw d.error;
    if(blocks.length){
      const rows=blocks.map((b,i)=>({item_id:id,position:i+1,type:b.type,heading:b.heading||null,text:b.text||null,url:b.url||null,caption:b.caption||null,button_text:b.button_text||null,items:b.items||null}));
      const ins=await supabaseClient.from("journal_blocks").insert(rows); if(ins.error)throw ins.error;
    }
    toast(currentId?"Journal item updated":"Journal item created");
    reset(); await loadItems();
  }

  async function duplicateExisting(id){
    const x=items.find(v=>v.id===id); if(!x)return;
    await edit(id); currentId=null; $("#itemId").value=""; $("#title").value=`${x.title} copy`; $("#slug").value="";
    $("#status").value="draft"; $("#featured").checked=false; $("#heading").textContent="Duplicated item"; $("#deleteItem").hidden=true;
    blocks=blocks.map(b=>({...structuredClone(b),id:undefined,client_id:uid()})); renderBlocks(); setState("Duplicated, not saved");
  }

  async function deleteItem(id=currentId){
    if(!id)return;
    const x=items.find(v=>v.id===id);
    if(!confirm(`Permanently delete "${x?.title||"this item"}"?`))return;
    if(prompt("Type DELETE to confirm.")!=="DELETE")return;
    const r=await supabaseClient.from("journal_items").delete().eq("id",id); if(r.error)throw r.error;
    toast("Journal item deleted"); if(currentId===id)reset(); await loadItems();
  }

  $$("[data-add]").forEach(b=>b.onclick=()=>add(b.dataset.add));
  $("#newItem").onclick=reset; $("#search").oninput=renderItems; $("#filter").onchange=renderItems;
  $("#title").oninput=()=>{if(!$("#slug").value.trim())$("#slug").value=slugify($("#title").value);setState("Unsaved changes")};
  $("#itemForm").addEventListener("input",e=>{if(e.target.id!=="title")setState("Unsaved changes")});
  $("#itemForm").onsubmit=e=>{e.preventDefault();save().catch(err=>{console.error(err);alert(err.message);setState("Save failed")})};
  $("#deleteItem").onclick=()=>deleteItem().catch(e=>alert(e.message));
  $("#mobileSave").onclick=()=>$("#itemForm").requestSubmit();
  $("#signOut").onclick=async()=>{await supabaseClient.auth.signOut();location.href="index.html"};

  (async()=>{const session=await requireAdmin();if(!session)return;reset();await loadItems()})().catch(e=>alert(`Journal builder could not start: ${e.message}`));
})();
