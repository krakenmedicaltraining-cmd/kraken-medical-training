"use strict";

(() => {
  const $ = selector => document.querySelector(selector);

  const escapeHtml = value =>
    String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[character]));

  let items = [];

  const typeLabels = {
    article: "Article",
    video: "Video",
    podcast: "Podcast",
    download: "Download",
    news: "News",
    event: "Event",
    case_study: "Case study"
  };

  function itemUrl(item) {
    return `journal-item.html?slug=${encodeURIComponent(item.slug)}`;
  }

  function itemCard(item) {
    return `
      <article class="journal-card">
        ${item.cover_image_url
          ? `<img src="${escapeHtml(item.cover_image_url)}" alt="">`
          : ""}

        <div class="journal-copy">
          <span class="type-badge">
            ${escapeHtml(
              typeLabels[item.content_type] || item.content_type
            )}
          </span>

          <span
            class="j-eyebrow"
            style="display:block;margin-top:10px"
          >
            ${escapeHtml(item.category)}
          </span>

          <h3>${escapeHtml(item.title)}</h3>

          <p>${escapeHtml(item.excerpt || "")}</p>

          <div class="journal-meta">
            <span>${escapeHtml(item.author)}</span>
            <span>·</span>
            <span>
              ${Number(item.reading_time_minutes || 5)} min
            </span>
          </div>

          <p>
            <a class="read-link" href="${itemUrl(item)}">
              Open
            </a>
          </p>
        </div>
      </article>
    `;
  }

  function renderFeaturedItem() {
    const item = items.find(entry => entry.featured);

    if (!item) {
      $("#featuredSection").hidden = true;
      return;
    }

    $("#featuredSection").hidden = false;

    $("#featuredItem").innerHTML = `
      ${item.cover_image_url
        ? `<img src="${escapeHtml(item.cover_image_url)}" alt="">`
        : ""}

      <div class="featured-copy">
        <span class="type-badge">
          ${escapeHtml(
            typeLabels[item.content_type] || item.content_type
          )}
        </span>

        <span
          class="j-eyebrow"
          style="display:block;margin-top:12px"
        >
          Featured · ${escapeHtml(item.category)}
        </span>

        <h2>${escapeHtml(item.title)}</h2>

        <p>${escapeHtml(item.excerpt || "")}</p>

        <p>
          <a class="read-link" href="${itemUrl(item)}">
            Open featured content
          </a>
        </p>
      </div>
    `;
  }

  function renderItems() {
    const searchText =
      $("#journalSearch").value.trim().toLowerCase();

    const selectedType = $("#journalType").value;
    const selectedCategory = $("#journalCategory").value;

    const filteredItems = items.filter(item => {
      const searchableText =
        `${item.title} ${item.excerpt} ${item.category}`
          .toLowerCase();

      const matchesSearch =
        searchableText.includes(searchText);

      const matchesType =
        !selectedType ||
        item.content_type === selectedType;

      const matchesCategory =
        !selectedCategory ||
        item.category === selectedCategory;

      return (
        matchesSearch &&
        matchesType &&
        matchesCategory
      );
    });

    $("#journalGrid").innerHTML = filteredItems.length
      ? filteredItems.map(itemCard).join("")
      : `<div class="j-empty">No matching content.</div>`;
  }

  async function loadJournalItems() {
    const result = await supabaseClient
      .from("journal_items")
      .select("*")
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false });

    if (result.error) {
      throw result.error;
    }

    items = result.data || [];

    const categories = [
      ...new Set(
        items
          .map(item => item.category)
          .filter(Boolean)
      )
    ];

    $("#journalCategory").innerHTML =
      `<option value="">All categories</option>` +
      categories
        .map(category => `
          <option value="${escapeHtml(category)}">
            ${escapeHtml(category)}
          </option>
        `)
        .join("");

    renderFeaturedItem();
    renderItems();
  }

  async function showJournalAdminButton() {
    const button = $("#journalAdminButton");

    if (!button) {
      return;
    }

    button.hidden = true;

    try {
      const sessionResult =
        await supabaseClient.auth.getSession();

      if (sessionResult.error) {
        console.error(
          "Could not read the Journal session:",
          sessionResult.error
        );
        return;
      }

      const session = sessionResult.data.session;

      if (!session) {
        return;
      }

      const adminResult = await supabaseClient
        .from("admin_users")
        .select("user_id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (adminResult.error) {
        console.error(
          "Could not check Journal administrator access:",
          adminResult.error
        );
        return;
      }

      button.hidden = !adminResult.data;
    } catch (error) {
      console.error(
        "Journal administrator button failed:",
        error
      );

      button.hidden = true;
    }
  }

  $("#journalSearch")
    .addEventListener("input", renderItems);

  $("#journalType")
    .addEventListener("change", renderItems);

  $("#journalCategory")
    .addEventListener("change", renderItems);

  Promise.all([
    loadJournalItems(),
    showJournalAdminButton()
  ]).catch(error => {
    console.error(error);

    $("#journalGrid").innerHTML = `
      <div class="j-empty">
        ${escapeHtml(error.message)}
      </div>
    `;
  });
})();
