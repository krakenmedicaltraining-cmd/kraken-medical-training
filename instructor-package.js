"use strict";

(() => {
  const $ = selector => document.querySelector(selector);
  const esc = value =>
    String(value ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[c]));

  const id = new URLSearchParams(location.search).get("id");

  function resourceIcon(type) {
    const value = String(type || "").toLowerCase();
    if (value.includes("power")) return "P";
    if (value.includes("pdf")) return "PDF";
    if (value.includes("word")) return "DOC";
    if (value.includes("excel")) return "XLS";
    if (value.includes("video")) return "▶";
    if (value.includes("link")) return "↗";
    return "⇩";
  }

  async function load() {
    if (!id) throw new Error("No instructor package was selected.");

    const [packageResult, sectionResult, resourceResult] = await Promise.all([
      supabaseClient
        .from("instructor_packages")
        .select("*")
        .eq("id", id)
        .eq("status", "published")
        .single(),

      supabaseClient
        .from("instructor_package_sections")
        .select("*")
        .eq("package_id", id)
        .order("position"),

      supabaseClient
        .from("instructor_package_resources")
        .select("*")
        .eq("package_id", id)
        .order("position")
    ]);

    if (packageResult.error) throw packageResult.error;
    if (sectionResult.error) throw sectionResult.error;
    if (resourceResult.error) throw resourceResult.error;

    const item = packageResult.data;
    const sections = sectionResult.data || [];
    const resources = resourceResult.data || [];

    document.title = `${item.title} | Kraken Instructor Tools`;

    const artStyle = item.cover_image_url
      ? `style="background-image:linear-gradient(180deg,rgba(6,27,36,.03),rgba(6,27,36,.32)),url('${esc(item.cover_image_url)}')"`
      : "";

    $("#packageRoot").innerHTML = `
      <section class="it-product-hero">
        <div class="it-product-art" ${artStyle}></div>

        <div class="it-product-copy">
          <span class="it-eyebrow">${esc(item.category || "Instructor package")}</span>
          <h1>${esc(item.title)}</h1>
          <p>${esc(item.subtitle || item.description || "")}</p>

          <div class="it-meta">
            ${item.estimated_minutes ? `<span>${Number(item.estimated_minutes)} min</span>` : ""}
            ${item.target_audience ? `<span>${esc(item.target_audience)}</span>` : ""}
            ${item.instructor_level ? `<span>${esc(item.instructor_level)}</span>` : ""}
            <span>${resources.length} resources</span>
            ${item.version ? `<span>Version ${esc(item.version)}</span>` : ""}
          </div>

          ${resources.length
            ? `<a class="it-button" href="#resources">View downloads</a>`
            : ""}
        </div>
      </section>

      ${item.description
        ? `
          <section class="it-section">
            <span class="it-eyebrow">ABOUT THIS PACKAGE</span>
            <h2>Overview</h2>
            <div class="it-section-content">${esc(item.description)}</div>
          </section>
        `
        : ""}

      ${sections.map(section => `
        <section class="it-section">
          <span class="it-eyebrow">${esc(section.section_type || "Instructor notes")}</span>
          <h2>${esc(section.title)}</h2>
          <div class="it-section-content">${esc(section.content)}</div>
        </section>
      `).join("")}

      <section class="it-section" id="resources">
        <span class="it-eyebrow">INSTRUCTOR RESOURCES</span>
        <h2>Downloads and links</h2>

        <div class="it-resource-list">
          ${resources.length
            ? resources.map(resource => `
                <article class="it-resource">
                  <span class="it-resource-icon">${esc(resourceIcon(resource.resource_type))}</span>

                  <div>
                    <strong>${esc(resource.title)}</strong>
                    <p>${esc(resource.description || resource.resource_type || "")}</p>
                  </div>

                  <a
                    class="it-button"
                    href="${esc(resource.url)}"
                    target="_blank"
                    rel="noopener"
                  >
                    ${resource.button_text ? esc(resource.button_text) : "Open resource"} ↗
                  </a>
                </article>
              `).join("")
            : `<div class="it-empty">No downloadable resources have been added yet.</div>`
          }
        </div>
      </section>
    `;
  }

  load().catch(error => {
    console.error(error);
    $("#packageRoot").innerHTML = `<div class="it-empty">${esc(error.message)}</div>`;
  });
})();
