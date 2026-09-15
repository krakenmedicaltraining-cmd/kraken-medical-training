"use strict";

(() => {
  const mount =
    document.querySelector("[data-kraken-site-nav]") ||
    document.querySelector("[data-kraken-nav]");

  if (!mount) return;

  const esc = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);

  const currentPage =
    (location.pathname.split("/").pop() || "index.html").toLowerCase();

  async function getCategories(table) {
    try {
      if (typeof supabaseClient === "undefined") return [];

      let query = supabaseClient.from(table).select("category");

      if (table === "in_person_courses") {
        query = query.eq("status", "Published");
      } else {
        query = query.eq("is_published", true);
      }

      const { data, error } = await query;
      if (error) throw error;

      return [...new Set(
        (data || []).map(item => item.category).filter(Boolean)
      )].sort();
    } catch (error) {
      console.warn("Kraken navigation categories:", error);
      return [];
    }
  }

  function isActive(...pages) {
    return pages.map(page => page.toLowerCase()).includes(currentPage);
  }

  function buildMegaMenu(label, href, categories, physical = false) {
    const fallbackCategories = physical
      ? ["Basic Life Support", "First Aid", "Clinical Skills", "Bespoke Training"]
      : ["Clinical Skills", "Emergency Care", "Trauma", "First Aid", "Professional Development"];

    const rows = categories.length ? categories : fallbackCategories;

    const active = physical
      ? isActive("in-person-training.html", "in-person-course.html")
      : isActive("courses.html", "course.html");

    return `
      <div class="ksn-drop ${active ? "active" : ""}">
        <button class="ksn-link" type="button" aria-expanded="false">
          ${esc(label)} <span class="ksn-caret">⌄</span>
        </button>

        <div class="kraken-site-mega">
          <div class="ksn-mega-main">
            <span class="ksn-label">
              ${physical ? "IN-PERSON TRAINING" : "CPD COURSE CATEGORIES"}
            </span>

            <h3>${physical ? "Train with Kraken" : "Choose your training"}</h3>

            <div class="ksn-category-grid">
              ${rows.map(category => `
                <a href="${href}?category=${encodeURIComponent(category)}">
                  ${esc(category)} <span>→</span>
                </a>
              `).join("")}

              <a href="${href}">
                View all ${esc(label)} <span>→</span>
              </a>
            </div>
          </div>

          <a class="ksn-mega-feature" href="${href}">
            <span>KRAKEN MEDICAL</span>
            <strong>${physical ? "Practical training." : "Build your CPD."}</strong>
            <small>
              ${physical
                ? "Instructor-led medical training for teams, workplaces and professionals."
                : "Self-paced medical learning, simulations, certificates and field-ready resources."}
            </small>
            <b>${physical ? "Explore training →" : "Explore CPD →"}</b>
          </a>
        </div>
      </div>
    `;
  }

  async function buildNavigation() {
    const [cpdCategories, physicalCategories] = await Promise.all([
      getCategories("courses"),
      getCategories("in_person_courses")
    ]);

    mount.innerHTML = `
      <header class="kraken-site-header">
        <div class="ksn-inner">

          <a class="ksn-brand" href="index.html" aria-label="Kraken Medical Training home">
            <img src="assets/kraken-medical-logo.png" alt="">
            <span>
              <strong>KRAKEN</strong>
              <small>MEDICAL TRAINING</small>
            </span>
          </a>

          <nav class="ksn-nav" aria-label="Primary navigation">
            <a class="ksn-link ${isActive("index.html") ? "active" : ""}" href="index.html">Home</a>

            ${buildMegaMenu("CPD Courses", "courses.html", cpdCategories, false)}
            ${buildMegaMenu("In-Person Training", "in-person-training.html", physicalCategories, true)}

            <a class="ksn-link ${isActive("instructor-tools.html") ? "active" : ""}" href="instructor-tools.html">Instructor tools</a>
            <a class="ksn-link ${isActive("library.html") ? "active" : ""}" href="library.html">Library</a>
            <a class="ksn-link ${isActive("journal.html", "journal-item.html") ? "active" : ""}" href="journal.html">News</a>
            <a class="ksn-link ${isActive("games.html") ? "active" : ""}" href="games.html">Simulations</a>
            <a class="ksn-link ${isActive("dashboard.html") ? "active" : ""}" href="dashboard.html">My mission</a>
          </nav>

          <div class="ksn-actions">
            <a class="ksn-search" href="courses.html" aria-label="Search training" title="Search training">⌕</a>
            <a class="ksn-profile" href="profile.html" aria-label="My profile" title="My profile">CB</a>
          </div>

          <button class="ksn-mobile-toggle" type="button" aria-label="Open navigation" aria-expanded="false">☰</button>
        </div>
      </header>
    `;

    const nav = mount.querySelector(".ksn-nav");
    const mobileButton = mount.querySelector(".ksn-mobile-toggle");

    if (mobileButton && nav) {
      mobileButton.addEventListener("click", () => {
        const open = nav.classList.toggle("open");
        mobileButton.setAttribute("aria-expanded", String(open));
        mobileButton.textContent = open ? "×" : "☰";
      });
    }

    mount.querySelectorAll(".ksn-drop").forEach(drop => {
      const trigger = drop.querySelector(".ksn-link");
      if (!trigger) return;

      trigger.addEventListener("click", event => {
        if (window.innerWidth > 980) return;

        event.preventDefault();
        const open = drop.classList.toggle("mobile-open");
        trigger.setAttribute("aria-expanded", String(open));
      });
    });

    mount.querySelectorAll(".ksn-nav a").forEach(link => {
      link.addEventListener("click", () => {
        if (window.innerWidth > 980 || !nav || !mobileButton) return;
        nav.classList.remove("open");
        mobileButton.setAttribute("aria-expanded", "false");
        mobileButton.textContent = "☰";
      });
    });
  }

  buildNavigation();
})();
