"use strict";

(() => {
  const esc = value =>
    String(value ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[c]));

  async function getCourses() {
    const result = await supabaseClient
      .from("courses")
      .select("id,title,category,status")
      .eq("status","Published")
      .order("category")
      .order("title");

    if (result.error) throw result.error;
    return result.data || [];
  }

  function buildMenu(courses) {
    const groups = new Map();

    courses.forEach(course => {
      const category = String(course.category || "Other").trim() || "Other";

      if (!groups.has(category)) {
        groups.set(category, []);
      }

      groups.get(category).push(course);
    });

    const categories = [...groups.keys()]
      .sort((a,b) => a.localeCompare(b));

    return `
      <div class="kraken-course-mega-grid">
        ${categories.map(category => `
          <section class="kraken-menu-category">
            <h4>${esc(category)}</h4>

            ${groups.get(category).map(course => `
              <a href="course.html?id=${encodeURIComponent(course.id)}">
                ${esc(course.title)}
              </a>
            `).join("")}
          </section>
        `).join("")}
      </div>

      <div class="kraken-menu-footer">
        <a href="courses.html">Browse all courses →</a>
      </div>
    `;
  }

  async function initCourseMenu() {
    const trigger =
      document.querySelector("[data-course-menu-trigger]") ||
      [...document.querySelectorAll('a[href="courses.html"]')]
        .find(link => link.closest("nav"));

    if (!trigger || !window.supabaseClient) {
      return;
    }

    // Build a dedicated wrapper around ONLY the Courses link.
    // This keeps the dropdown open while the cursor travels from
    // the Courses link down into the dropdown.
    const wrapper = document.createElement("div");
    wrapper.className = "kraken-course-menu-wrap";

    trigger.parentNode.insertBefore(wrapper, trigger);
    wrapper.appendChild(trigger);

    const menu = document.createElement("div");
    menu.className = "kraken-course-mega";
    menu.setAttribute("aria-hidden", "true");
    menu.innerHTML = `
      <div class="kraken-menu-loading">
        Loading courses…
      </div>
    `;

    wrapper.appendChild(menu);

    let loaded = false;
    let closeTimer = null;

    async function ensureLoaded() {
      if (loaded) return;

      try {
        const courses = await getCourses();
        menu.innerHTML = buildMenu(courses);
        loaded = true;
      } catch (error) {
        console.error(error);
        menu.innerHTML = `
          <div class="kraken-menu-loading">
            Courses could not be loaded.
          </div>
        `;
      }
    }

    async function openMenu() {
      clearTimeout(closeTimer);

      await ensureLoaded();

      wrapper.classList.add("menu-open");
      menu.setAttribute("aria-hidden", "false");
      trigger.setAttribute("aria-expanded", "true");
    }

    function closeMenu(delay = 0) {
      clearTimeout(closeTimer);

      closeTimer = setTimeout(() => {
        wrapper.classList.remove("menu-open");
        menu.setAttribute("aria-hidden", "true");
        trigger.setAttribute("aria-expanded", "false");
      }, delay);
    }

    trigger.setAttribute("aria-haspopup", "true");
    trigger.setAttribute("aria-expanded", "false");

    // DESKTOP: hover opens.
    wrapper.addEventListener("mouseenter", () => {
      if (window.matchMedia("(min-width: 851px)").matches) {
        openMenu();
      }
    });

    // Small close delay stops the menu "flickering" shut while
    // the cursor moves from the link into the dropdown.
    wrapper.addEventListener("mouseleave", () => {
      if (window.matchMedia("(min-width: 851px)").matches) {
        closeMenu(180);
      }
    });

    menu.addEventListener("mouseenter", () => {
      clearTimeout(closeTimer);
    });

    menu.addEventListener("mouseleave", () => {
      if (window.matchMedia("(min-width: 851px)").matches) {
        closeMenu(180);
      }
    });

    // Keyboard accessibility.
    wrapper.addEventListener("focusin", openMenu);

    wrapper.addEventListener("focusout", event => {
      if (!wrapper.contains(event.relatedTarget)) {
        closeMenu(80);
      }
    });

    // MOBILE / TOUCH: tap toggles dropdown.
    trigger.addEventListener("click", event => {
      if (window.matchMedia("(max-width: 850px)").matches) {
        event.preventDefault();

        if (wrapper.classList.contains("menu-open")) {
          closeMenu();
        } else {
          openMenu();
        }
      }
    });

    // Close when clicking elsewhere.
    document.addEventListener("click", event => {
      if (!wrapper.contains(event.target)) {
        closeMenu();
      }
    });

    // Escape key closes it.
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        closeMenu();
        trigger.focus();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", initCourseMenu);
})();
