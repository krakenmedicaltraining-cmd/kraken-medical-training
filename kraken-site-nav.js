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
        query = query.eq("status", "Published");
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
            <a class="ksn-link ${isActive("collections.html", "collection.html") ? "active" : ""}" href="collections.html">Collections</a>
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

;(() => {
 if(!document.querySelector("[data-kraken-site-nav],[data-kraken-nav]") || /admin|command-centre/i.test(location.pathname))return;
 const start=async()=>{
 if(!window.KrakenBasket)await new Promise((resolve,reject)=>{const s=document.createElement("script");s.src="/basket.js?v=20261126-drawer";s.onload=resolve;s.onerror=reject;document.head.append(s)});
 const root=document.createElement("aside");root.setAttribute("aria-label","Shopping basket");root.style.cssText="position:fixed;right:16px;bottom:16px;z-index:9999;width:min(360px,calc(100vw - 32px));font:15px Inter,Arial,sans-serif;color:white;background:#102e2c;border:1px solid #42645f;border-radius:16px;box-shadow:0 12px 36px #0004;overflow:hidden";
 root.innerHTML='<button type="button" aria-expanded="false" style="width:100%;padding:15px;background:#087f71;color:white;border:0;font:inherit;font-weight:700;cursor:pointer">Basket (0) ▴</button><div hidden style="padding:16px"><div data-items style="max-height:45vh;overflow:auto"></div><p data-total style="color:white"></p><a href="/basket.html" style="display:block;text-align:center;background:#087f71;color:white;padding:12px;border-radius:8px;text-decoration:none;font-weight:700">View basket / checkout</a></div>';
 document.body.append(root);const toggle=root.firstElementChild,panel=toggle.nextElementSibling,items=root.querySelector("[data-items]"),total=root.querySelector("[data-total]");
 let expanded=false,seq=0;const money=n=>"£"+(n/100).toFixed(2);
 const open=v=>{expanded=v;panel.hidden=!v;toggle.setAttribute("aria-expanded",String(v));toggle.textContent="Basket ("+KrakenBasket.read().length+") "+(v?"▾":"▴");};
 toggle.onclick=()=>open(!expanded);
 async function render(){const n=++seq,entries=KrakenBasket.read();open(expanded);items.textContent=entries.length?"Loading items…":"Your basket is empty.";total.textContent="";
 if(!entries.length)return;
 try{const rows=await Promise.all(["course","resource"].map(async type=>{const ids=entries.filter(e=>e.type===type).map(e=>e.id);if(!ids.length)return [];const q=await supabaseClient.from(type==="course"?"public_course_catalogue":"kraken_library_catalogue").select("id,title,price_pence,access_type").in("id",ids);if(q.error)throw q.error;return (q.data||[]).map(x=>({...x,type}));}));if(n!==seq)return;items.replaceChildren();let sum=0;for(const e of entries){const x=rows.flat().find(x=>x.id===e.id&&x.type===e.type&&x.access_type==="paid");const line=document.createElement("div");line.style.cssText="padding:12px 0;border-bottom:1px solid #42645f;display:flex;gap:10px;align-items:center";const label=document.createElement("span");label.style.cssText="flex:1;color:white";label.textContent=x?x.title+" · "+money(Number(x.price_pence)):"Unavailable item";if(x)sum+=Number(x.price_pence);const b=document.createElement("button");b.type="button";b.textContent="Remove";b.style.cssText="background:transparent;color:white;border:1px solid #77968f;border-radius:6px;padding:6px;cursor:pointer";b.onclick=()=>KrakenBasket.remove(e.id,e.type);line.append(label,b);items.append(line);}total.textContent="Estimated subtotal: "+money(sum);}catch(e){if(n===seq)items.textContent="Open basket to verify items.";}}
 window.addEventListener("kraken:basket",render);window.addEventListener("kraken:basket-added",()=>{open(true);render()});window.addEventListener("storage",render);render();
 };if(document.readyState==="complete")start().catch(console.error);else window.addEventListener("load",()=>start().catch(console.error),{once:true});
})();
