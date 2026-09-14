"use strict";

(() => {
  const esc = value =>
    String(value ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
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
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(course);
    });

    const categories = [...groups.keys()].sort((a,b)=>a.localeCompare(b));

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
        .find(a => a.closest("nav"));

    if (!trigger || !window.supabaseClient) return;

    const parent = trigger.parentElement;
    parent.classList.add("kraken-course-menu-wrap");

    const menu = document.createElement("div");
    menu.className = "kraken-course-mega";
    menu.hidden = true;
    menu.innerHTML = `<div style="color:#c8d9d3">Loading courses…</div>`;
    parent.appendChild(menu);

    let loaded = false;

    async function open() {
      menu.hidden = false;

      if (!loaded) {
        try {
          menu.innerHTML = buildMenu(await getCourses());
          loaded = true;
        } catch (error) {
          console.error(error);
          menu.innerHTML = `<div style="color:#c8d9d3">Courses could not be loaded.</div>`;
        }
      }
    }

    function close() { menu.hidden = true; }

    trigger.addEventListener("click", event => {
      if (window.matchMedia("(min-width: 851px)").matches) {
        event.preventDefault();
        menu.hidden ? open() : close();
      }
    });

    trigger.addEventListener("mouseenter", () => {
      if (window.matchMedia("(min-width: 851px)").matches) open();
    });

    parent.addEventListener("mouseleave", () => {
      if (window.matchMedia("(min-width: 851px)").matches) close();
    });

    document.addEventListener("click", event => {
      if (!parent.contains(event.target)) close();
    });
  }

  document.addEventListener("DOMContentLoaded", initCourseMenu);
})();
