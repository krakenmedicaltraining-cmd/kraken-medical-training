"use strict";
(()=>{
  const mount=document.querySelector("[data-kraken-site-nav]")||document.querySelector("[data-kraken-nav]");
  if(!mount)return;
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const path=(location.pathname.split("/").pop()||"index.html").toLowerCase();
  async function getCats(table){
    try{
      let q=supabaseClient.from(table).select("category");
      if(table==="in_person_courses") q=q.eq("status","Published");
      else q=q.eq("is_published",true);
      const {data,error}=await q;if(error)throw error;
      return [...new Set((data||[]).map(x=>x.category).filter(Boolean))].sort();
    }catch(e){console.warn("Kraken nav categories:",e);return[]}
  }
  function mega(label,href,cats,physical){
    const fallback=physical?["Basic Life Support","First Aid","Clinical Skills","Bespoke Training"]:["Clinical Skills","Emergency Care","Trauma","First Aid","Professional Development"];
    const rows=cats.length?cats:fallback;
    return `<div class="kraken-site-menu">
      <button class="kraken-site-menu-trigger" type="button">${label}⌄</button>
      <div class="kraken-site-mega"><div class="kraken-site-mega-grid">
        <div><div class="kraken-site-mega-title">${physical?"IN-PERSON TRAINING":"CPD COURSE CATEGORIES"}</div>
          <div class="kraken-site-category-grid">
            ${rows.map(c=>`<a class="kraken-site-category" href="${href}?category=${encodeURIComponent(c)}">${esc(c)}<small>View courses →</small></a>`).join("")}
            <a class="kraken-site-category" href="${href}">View all ${label}<small>Browse everything →</small></a>
          </div>
        </div>
        <aside class="kraken-site-feature"><small>KRAKEN MEDICAL</small><h3>${physical?"Bring Kraken to your team.":"Learn online. Build CPD."}</h3><p>${physical?"Practical instructor-led medical training for teams, workplaces and professionals.":"Self-paced medical learning, simulations, certificates and field-ready resources."}</p><a href="${href}">Explore ${label} →</a></aside>
      </div></div></div>`;
  }
  async function build(){
    const [cpd,physical]=await Promise.all([getCats("courses"),getCats("in_person_courses")]);
    mount.innerHTML=`<header class="kraken-site-header"><div class="kraken-site-nav-inner">
      <a class="kraken-site-brand" href="index.html"><img src="assets/kraken-medical-logo.png" alt=""><span class="kraken-site-brand-copy"><strong>KRAKEN</strong><small>MEDICAL TRAINING</small></span></a>
      <button class="kraken-site-mobile-toggle" type="button" aria-label="Open menu">☰</button>
      <nav class="kraken-site-links">
        <a class="kraken-site-link" href="index.html">Home</a>
        ${mega("CPD Courses","courses.html",cpd,false)}
        ${mega("In-Person Training","in-person-training.html",physical,true)}
        <a class="kraken-site-link" href="instructor-tools.html">Instructor tools</a>
        <a class="kraken-site-link" href="library.html">Library</a>
        <a class="kraken-site-link" href="journal.html">News</a>
        <a class="kraken-site-link" href="games.html">Simulations</a>
        <a class="kraken-site-link" href="dashboard.html">My mission</a>
      </nav>
      <div class="kraken-site-actions"><a class="kraken-site-circle" href="courses.html" aria-label="Search">⌕</a><a class="kraken-site-circle kraken-site-profile" href="profile.html">CB</a></div>
    </div></header>`;
    const links=mount.querySelector(".kraken-site-links");
    mount.querySelector(".kraken-site-mobile-toggle").onclick=()=>links.classList.toggle("mobile-open");
    mount.querySelectorAll(".kraken-site-menu-trigger").forEach(b=>b.onclick=()=>{if(innerWidth<=900)b.parentElement.classList.toggle("open")});
  }
  build();
})();
