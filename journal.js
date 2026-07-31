"use strict";
(() => {
  const $ = s => document.querySelector(s);
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
  let items = [];

  const labels = {
    article:"Article", video:"Video", podcast:"Podcast", download:"Download",
    news:"News", event:"Event", case_study:"Case study"
  };

  function itemUrl(item) {
    return `journal-item.html?slug=${encodeURIComponent(item.slug)}`;
  }

  function card(item) {
    return `<article class="journal-card">
      ${item.cover_image_url ? `<img src="${esc(item.cover_image_url)}" alt="">` : ""}
      <div class="journal-copy">
        <span class="type-badge">${esc(labels[item.content_type] || item.content_type)}</span>
        <span class="j-eyebrow" style="display:block;margin-top:10px">${esc(item.category)}</span>
        <h3>${esc(item.title)}</h3>
        <p>${esc(item.excerpt || "")}</p>
        <div class="journal-meta"><span>${esc(item.author)}</span><span>·</span><span>${item.reading_time_minutes || 5} min</span></div>
        <p><a class="read-link" href="${itemUrl(item)}">Open</a></p>
      </div>
    </article>`;
  }

  function renderFeatured() {
    const item = items.find(x => x.featured);
    if (!item) { $("#featuredSection").hidden = true; return; }
    $("#featuredSection").hidden = false;
    $("#featuredItem").innerHTML = `
      ${item.cover_image_url ? `<img src="${esc(item.cover_image_url)}" alt="">` : ""}
      <div class="featured-copy">
        <span class="type-badge">${esc(labels[item.content_type] || item.content_type)}</span>
        <span class="j-eyebrow" style="display:block;margin-top:12px">Featured · ${esc(item.category)}</span>
        <h2>${esc(item.title)}</h2>
        <p>${esc(item.excerpt || "")}</p>
        <p><a class="read-link" href="${itemUrl(item)}">Open featured content</a></p>
      </div>`;
  }

  function render() {
    const q = $("#journalSearch").value.toLowerCase();
    const type = $("#journalType").value;
    const category = $("#journalCategory").value;
    const filtered = items.filter(item =>
      `${item.title} ${item.excerpt} ${item.category}`.toLowerCase().includes(q) &&
      (!type || item.content_type === type) &&
      (!category || item.category === category)
    );
    $("#journalGrid").innerHTML = filtered.length ? filtered.map(card).join("") : '<div class="j-empty">No matching content.</div>';
  }

  async function init() {
    const result = await supabaseClient
      .from("journal_items")
      .select("*")
      .eq("status","published")
      .lte("published_at", new Date().toISOString())
      .order("published_at",{ascending:false});
    if (result.error) throw result.error;
    items = result.data || [];
    const categories = [...new Set(items.map(x => x.category).filter(Boolean))];
    $("#journalCategory").innerHTML = '<option value="">All categories</option>' +
      categories.map(x => `<option>${esc(x)}</option>`).join("");
    renderFeatured(); render();
  }

  $("#journalSearch").oninput = render;
  $("#journalType").onchange = render;
  $("#journalCategory").onchange = render;
  init().catch(error => $("#journalGrid").innerHTML = `<div class="j-empty">${esc(error.message)}</div>`);
})();
