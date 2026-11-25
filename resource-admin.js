let resources = [];
const form = $("#resourceForm");
const list = $("#resourceAdminList");

function resetResourceForm() {
  form.reset();
  $("#resourceId").value = "";
  $("#resourcePublic").checked = true;
  $("#resourceFormTitle").textContent = "Add resource";
  $("#saveResource").textContent = "Save resource";
  $("#cancelResource").hidden = true;
}

function formResource() {
  return {
    id: $("#resourceId").value || undefined,
    title: $("#resourceTitle").value.trim(),
    description: $("#resourceDescription").value.trim(),
    resource_type: $("#resourceType").value,
    category: $("#resourceCategory").value,
    provider: $("#resourceProvider").value,
    source_url: $("#resourceUrl").value.trim(),
    thumbnail_url: $("#resourceThumbnail").value.trim(),
    file_name: $("#resourceFileName").value.trim(),
    tags: $("#resourceTags").value.split(",").map(v => v.trim()).filter(Boolean),
    is_public: $("#resourcePublic").checked
  };
}

function editResource(id) {
  const r = resources.find(item => item.id === id);
  if (!r) return;
  $("#resourceId").value = r.id;
  $("#resourceTitle").value = r.title || "";
  $("#resourceDescription").value = r.description || "";
  $("#resourceType").value = r.resource_type || "PDF";
  $("#resourceCategory").value = r.category || "Clinical skills";
  $("#resourceProvider").value = r.provider || "Google Drive";
  $("#resourceUrl").value = r.source_url || "";
  $("#resourceThumbnail").value = r.thumbnail_url || "";
  $("#resourceFileName").value = r.file_name || "";
  $("#resourceTags").value = (r.tags || []).join(", ");
  $("#resourcePublic").checked = r.is_public !== false;
  $("#resourceFormTitle").textContent = `Edit ${r.title}`;
  $("#saveResource").textContent = "Update resource";
  $("#cancelResource").hidden = false;
  scrollTo({ top: 0, behavior: "smooth" });
}

async function removeResource(id) {
  const r = resources.find(item => item.id === id);
  if (!r || !confirm(`Delete "${r.title}" from the Kraken Library?`)) return;
  try {
    if(r.storage_path || r.access_type !== "free"){throw Error("Protected resources must be unpublished rather than deleted.");} await deleteResourceOnline(id);
    showToast("Resource deleted");
    await loadResources();
  } catch (error) {
    alert(error.message);
  }
}

function renderResources() {
  const q = $("#resourceSearch").value.trim().toLowerCase();
  const filtered = resources.filter(r =>
    [r.title, r.description, r.category, r.resource_type, ...(r.tags || [])]
      .join(" ").toLowerCase().includes(q)
  );

  if (!filtered.length) {
    list.innerHTML = `<div class="empty-panel">No matching resources found.</div>`;
    return;
  }

  list.innerHTML = filtered.map(r => `
    <article class="admin-course resource-admin-card">
      <div class="resource-type-icon">${escapeHtml((r.resource_type || "R").slice(0,3).toUpperCase())}</div>
      <div>
        <span class="tag">${escapeHtml(r.resource_type)} · ${escapeHtml(r.provider)}</span>
        <h3>${escapeHtml(r.title)}</h3>
        <p>${escapeHtml(r.description)}</p>
        <small>${escapeHtml(r.category)}${(r.publication_status || "draft") + " · " + (r.access_type || "free") + (r.access_type === "paid" ? " · £" + ((r.price_pence || 0)/100).toFixed(2) : "")}</small>
      </div>
      <div class="admin-actions">
        <a class="small-button" href="${escapeHtml(resourcePreviewUrl(r))}" target="_blank" rel="noopener">Preview</a>
        <button class="small-button" data-edit-resource="${r.id}">Edit</button>
        <button class="small-button danger" data-delete-resource="${r.id}">Delete</button>
      </div>
    </article>`).join("");

  $$("[data-edit-resource]").forEach(b => b.onclick = () => editResource(b.dataset.editResource));
  $$("[data-delete-resource]").forEach(b => b.onclick = () => removeResource(b.dataset.deleteResource));
}

async function loadResources() {
  resources = await getAllResources();
  renderResources();
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  $("#saveResource").disabled = true;
  $("#saveResource").textContent = "Saving…";
  try {
    await saveCommerceResource(formResource());
    showToast($("#resourceId").value ? "Resource updated" : "Resource added");
    resetResourceForm();
    await loadResources();
  } catch (error) {
    alert(`Could not save resource: ${error.message}`);
  } finally {
    $("#saveResource").disabled = false;
    $("#saveResource").textContent = $("#resourceId").value ? "Update resource" : "Save resource";
  }
});

$("#cancelResource").onclick = resetResourceForm;
$("#resourceSearch").addEventListener("input", renderResources);

(async function () {
  try {
    const session = await requireAdmin();
    if (!session) return;
    $("#resourceStatus").innerHTML = `<strong>Connected:</strong> Manage reusable resources for every course.`;
    await loadResources();
  } catch (error) {
    $("#resourceStatus").innerHTML = `<strong>Access denied:</strong> ${escapeHtml(error.message)}`;
    form.hidden = true;
  }
})();

/* V23.3: resource commerce preparation. Paid files remain drafts until checkout is enabled. */
const commerceFields = document.createElement("div");
commerceFields.innerHTML = `<div class="field"><label for="resourceAccess">Access type</label><select id="resourceAccess"><option value="free">Free</option><option value="paid">Paid</option><option value="members_only">Members only</option></select></div>
<div class="field"><label for="resourcePrice">Price (£)</label><input id="resourcePrice" type="number" min="0" step="0.01" value="0"></div>
<div class="field"><label for="resourcePublication">Publication status</label><select id="resourcePublication"><option value="draft">Draft</option><option value="published">Published</option></select></div>
<div class="field"><label for="resourceUpload">Private file (up to 50 MB)</label><input id="resourceUpload" type="file"><span id="resourceStored"></span><p>Protected uploads and paid resources must remain drafts until learner access is enabled.</p></div>`;
$("#resourcePublic").closest("label").before(commerceFields);
$("#resourcePublic").closest("label").hidden=true;
$("#resourceUrl").required=false;
const originalEditResource=editResource;
editResource=function(id){originalEditResource(id);const r=resources.find(x=>x.id===id);if(!r)return;$("#resourceAccess").value=r.access_type||"free";$("#resourcePrice").value=(r.price_pence||0)/100;$("#resourcePublication").value=r.publication_status||"draft";$("#resourceUpload").value="";$("#resourceStored").textContent=r.storage_path?"Private file already stored":"";};
const originalResetResourceForm=resetResourceForm;
resetResourceForm=function(){originalResetResourceForm();$("#resourceStored").textContent="";};
async function saveCommerceResource(resource){
 const old=resources.find(r=>r.id===resource.id);
 const access=$("#resourceAccess").value;
 const price=Math.round(Number($("#resourcePrice").value)*100);
 const status=$("#resourcePublication").value;
 const file=$("#resourceUpload").files[0];
 let path=old?.storage_path||null;
 if(!Number.isSafeInteger(price)||price<0||(access==="paid"&&price<1))throw Error("Enter a valid price.");
 if(status==="published"&&(access!=="free"||file||path))throw Error("Protected resource publishing is not enabled yet. Save as draft.");
 if(access!=="free"&&!file&&!path)throw Error("Paid and members-only resources require a private file.");
 if(!file&&!path&&!resource.source_url)throw Error("Add a share link or upload a file.");
 if(file&&file.size>52428800)throw Error("File exceeds 50 MB.");
 const id=resource.id||crypto.randomUUID();
 if(file){const name=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");path=id+"/"+crypto.randomUUID()+"-"+name;const {error}=await supabaseClient.storage.from("protected-library-files").upload(path,file,{upsert:false});if(error)throw error;}
 const payload={...resource,id,access_type:access,price_pence:access==="paid"?price:0,publication_status:status,storage_path:path,is_public:status==="published"&&access==="free"&&!path,source_url:path?"":resource.source_url,provider:path?"Kraken Storage":resource.provider,file_name:file?file.name:resource.file_name,updated_at:new Date().toISOString()};
 const {error}=await supabaseClient.from("resources").upsert(payload);
 if(error){if(file)await supabaseClient.storage.from("protected-library-files").remove([path]);throw error;}
}


/* V23.4: administrator-only Google Drive metadata test. */
const driveTestPanel=document.createElement("div");
driveTestPanel.className="field";
driveTestPanel.innerHTML='<p>For private Drive files, share with the Kraken service account only. Do not enable public link sharing.</p><button type="button" class="button secondary" id="testDriveConnection">Test Google Drive connection</button><p id="driveTestResult" role="status" aria-live="polite" style="white-space:pre-wrap;overflow-wrap:anywhere"></p>';
$("#resourceUrl").closest(".field").after(driveTestPanel);
const oldDriveHelp=$("#resourceUrl").closest(".field").querySelector(".help-text");
if(oldDriveHelp)oldDriveHelp.textContent="Public links are only for free resources. Private Drive files can be tested below; protected publishing is not enabled yet.";
$("#testDriveConnection").onclick=async()=>{
 const button=$("#testDriveConnection"),result=$("#driveTestResult"),url=$("#resourceUrl").value.trim();
 if(!url){result.textContent="Paste a Google Drive file link first.";return;}
 button.disabled=true;result.textContent="Testing private file access…";
 try{
 const {data,error}=await supabaseClient.auth.getSession();
 if(error||!data.session)throw Error("Sign in as an administrator first.");
 const response=await fetch("https://kraken-payments.krakenmedicaltraining.workers.dev/api/admin/test-drive-file",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+data.session.access_token},body:JSON.stringify({url})});
 const payload=await response.json();
 if(!response.ok)throw Error(payload.error||"Connection failed");
 result.textContent="Google Drive connection successful.\n"+JSON.stringify(payload,null,2);
 }catch(error){result.textContent="Test failed: "+error.message;}
 finally{button.disabled=false;}
};
