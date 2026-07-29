let publicResources = [];

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
        <a class="small-button" href="${escapeHtml(resourcePreviewUrl(r))}" target="_blank" rel="noopener">Preview</a>
        <a class="button" href="${escapeHtml(resourceDownloadUrl(r))}" target="_blank" rel="noopener">Open / download</a>
      </div>
    </article>`).join("");
}

(async function () {
  try {
    publicResources = await getPublicResources();
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
