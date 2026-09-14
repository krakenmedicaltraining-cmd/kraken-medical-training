"use strict";

(() => {
  const $ = selector => document.querySelector(selector);
  const esc = value =>
    String(value ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[c]));

  let items = [];

  function packageUrl(item) {
    return `instructor-package.html?id=${encodeURIComponent(item.id)}`;
  }

  function render() {
    const q = $("#packageSearch").value.trim().toLowerCase();
    const category = $("#packageCategory").value;

    const filtered = items.filter(item => {
      const text = `${item.title} ${item.subtitle} ${item.description} ${item.category} ${item.target_audience}`.toLowerCase();
      return text.includes(q) && (!category || item.category === category);
    });

    $("#packageGrid").innerHTML = filtered.length
      ? filtered.map(item => {
          const image = String(item.cover_image_url || "").trim();
          const style = image
            ? `style="background-image:linear-gradient(180deg,rgba(6,27,36,.05),rgba(6,27,36,.82)),url('${esc(image)}')"`
            : "";

          return `
            <article class="it-package">
              <a class="it-package-art" href="${packageUrl(item)}" ${style}>
                <div>
                  <small>${esc(item.category || "Instructor package")}</small>
                  <h3>${esc(item.title)}</h3>
                </div>
              </a>

              <div class="it-package-body">
                <p>${esc(item.subtitle || item.description || "Instructor package")}</p>

                <div class="it-meta">
                  ${item.estimated_minutes ? `<span>${Number(item.estimated_minutes)} min</span>` : ""}
                  ${item.target_audience ? `<span>${esc(item.target_audience)}</span>` : ""}
                  <span>${Number(item.resource_count || 0)} resources</span>
                </div>

                <a class="it-button" href="${packageUrl(item)}">View package</a>
              </div>
            </article>
          `;
        }).join("")
      : `<div class="it-empty">No packages match this search.</div>`;
  }

  async function load() {
    const result = await supabaseClient
      .from("instructor_packages")
      .select("*")
      .eq("status", "published")
      .order("sort_order")
      .order("updated_at", { ascending:false });

    if (result.error) throw result.error;

    items = result.data || [];

    const categories = [...new Set(items.map(x => x.category).filter(Boolean))].sort();

    $("#packageCategory").innerHTML =
      `<option value="">All categories</option>` +
      categories.map(category =>
        `<option value="${esc(category)}">${esc(category)}</option>`
      ).join("");

    render();
  }

  $("#packageSearch").addEventListener("input", render);
  $("#packageCategory").addEventListener("change", render);

  load().catch(error => {
    console.error(error);
    $("#packageGrid").innerHTML = `<div class="it-empty">${esc(error.message)}</div>`;
  });
})();
