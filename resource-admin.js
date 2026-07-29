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
    await deleteResourceOnline(id);
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
        <small>${escapeHtml(r.category)}${r.is_public ? " · Public" : " · Private"}</small>
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
    await saveResourceOnline(formResource());
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
