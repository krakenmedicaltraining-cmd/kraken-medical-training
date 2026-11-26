let publicResources = [];
let ownedResources = new Set();

function renderLibrary() {
  const search = $("#librarySearch").value.trim().toLowerCase();
  const category = $("#libraryCategory").value;
  const type = $("#libraryType").value;
  const items = publicResources.filter(r => {
    const haystack = [r.title, r.description, r.category, ...(r.tags || [])].join(" ").toLowerCase();
    return (!search || haystack.includes(search)) && (!category || r.category === category) && (!type || r.resource_type === type);
  });

  const grid = $("#libraryGrid");
  if (!items.length) {
    grid.innerHTML = `<div class="empty-panel">No matching resources found.</div>`;
    return;
  }

  grid.innerHTML = items.map(r => `
    <article class="card resource-card">
      ${r.thumbnail_url ? `<img class="library-thumbnail" src="${escapeHtml(r.thumbnail_url)}" alt="${escapeHtml(r.title)}">` : `<span class="resource-type-icon">${escapeHtml((r.resource_type || "R").slice(0,3).toUpperCase())}</span>`}
      <span class="tag">${escapeHtml(r.resource_type)} · ${escapeHtml(r.category)}</span>
      <h3>${escapeHtml(r.title)}</h3>
      <p>${escapeHtml(r.description)}</p>
      <div class="resource-card-actions">
        ${r.private_drive ? `<span class="tag">${r.access_type==="free"?"Free · sign in":r.access_type==="paid"?"£"+(Number(r.price_pence)/100).toFixed(2)+" · included with membership":"Members only"}</span>${r.access_type==="paid"&&!ownedResources.has(r.id)?`<button class="button" data-add-resource="${escapeHtml(r.id)}">+ Add to basket</button>`:""}<button class="button" data-drive-download="${escapeHtml(r.id)}">Secure download</button>` : `<a class="small-button" href="${escapeHtml(resourcePreviewUrl(r))}" target="_blank" rel="noopener">Preview</a><a class="button" href="${escapeHtml(resourceDownloadUrl(r))}" target="_blank" rel="noopener">Open / download</a>`}
      </div>
    </article>`).join("");
}

(async function () {
  try {
    const {data,error}=await supabaseClient.from("kraken_library_catalogue").select("*");if(error)throw error;publicResources=data||[];
    const auth=await supabaseClient.auth.getSession();
    if(auth.data?.session){const orders=await supabaseClient.from("kraken_orders").select("kraken_order_items(item_type,item_reference)").in("status",["paid","partially_refunded"]); if(!orders.error)ownedResources=new Set((orders.data||[]).flatMap(o=>o.kraken_order_items||[]).filter(i=>i.item_type==="resource").map(i=>i.item_reference));}
    const categories = [...new Set(publicResources.map(r => r.category).filter(Boolean))].sort();
    const types = [...new Set(publicResources.map(r => r.resource_type).filter(Boolean))].sort();
    $("#libraryCategory").innerHTML += categories.map(c => `<option>${escapeHtml(c)}</option>`).join("");
    $("#libraryType").innerHTML += types.map(t => `<option>${escapeHtml(t)}</option>`).join("");
    renderLibrary();
  } catch (error) {
    $("#libraryGrid").innerHTML = `<div class="empty-panel">Could not load resources: ${escapeHtml(error.message)}</div>`;
  }
})();
$("#librarySearch").addEventListener("input", renderLibrary);
$("#libraryCategory").addEventListener("change", renderLibrary);
$("#libraryType").addEventListener("change", renderLibrary);

$("#libraryGrid").addEventListener("click",async event=>{
 const add=event.target.closest("[data-add-resource]");if(add){const r=publicResources.find(r=>r.id===add.dataset.addResource);if(KrakenBasket.addResource(r)){add.textContent="Added to basket";add.disabled=true;}else{add.textContent="Could not add";}return;}
 const b=event.target.closest("[data-drive-download]");if(!b)return;
 b.disabled=true;
 try{
 const {data,error}=await supabaseClient.auth.getSession();
 if(error||!data.session)throw Error("Please sign in to download this resource.");
 const response=await fetch("https://kraken-payments.krakenmedicaltraining.workers.dev/api/resource/download",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+data.session.access_token},body:JSON.stringify({resource_id:b.dataset.driveDownload})});
 if(!response.ok){const result=await response.json();throw Error(result.error||"Download failed.");}
 const blob=await response.blob(),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1]||"resource-download";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
 }catch(error){alert(error.message);}finally{b.disabled=false;}
});
