(function () {
  const mount = document.querySelector('[data-kraken-site-nav]');
  if (!mount) return;

  const fallbackCPD = ['Clinical Skills','Emergency Care','Trauma','First Aid','Professional Development'];
  const fallbackPhysical = ['Basic Life Support','First Aid','Clinical Skills','Bespoke Training'];
  const esc = s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const uniq = arr => [...new Set((arr || []).filter(Boolean).map(x => String(x).trim()).filter(Boolean))].sort();
  const active = mount.dataset.active || '';

  function link(cls, href, label) {
    return `<a class="ksn-link ${active === cls ? 'active' : ''}" href="${href}">${label}</a>`;
  }
  function categoryLinks(items, href) {
    return items.map(x => `<a href="${href}?category=${encodeURIComponent(x)}">${esc(x)}<span>→</span></a>`).join('');
  }
  function render(cpd, physical) {
    mount.innerHTML = `
      <header class="kraken-site-header">
        <div class="ksn-inner">
          <a class="ksn-brand" href="index.html" aria-label="Kraken Medical Training home">
            <img src="assets/kraken-medical-logo.png" alt="">
            <span><strong>KRAKEN</strong><small>MEDICAL TRAINING</small></span>
          </a>
          <button class="ksn-mobile-toggle" type="button" aria-label="Open menu" aria-expanded="false">☰</button>
          <nav class="ksn-nav" aria-label="Primary navigation">
            ${link('home','index.html','Home')}
            <div class="ksn-drop ${active === 'cpd' ? 'active' : ''}">
              <a class="ksn-link" href="courses.html">CPD Courses <span class="ksn-caret">⌄</span></a>
              <div class="kraken-site-mega">
                <div class="ksn-mega-main"><span class="ksn-label">ONLINE MEDICAL CPD</span><h3>CPD Courses</h3><div class="ksn-category-grid">${categoryLinks(cpd,'courses.html')}</div></div>
                <a class="ksn-mega-feature" href="courses.html"><span>EXPLORE</span><strong>All CPD Courses</strong><small>Self-paced learning, scenarios, assessments and certificates.</small><b>Browse courses →</b></a>
              </div>
            </div>
            <div class="ksn-drop ${active === 'inperson' ? 'active' : ''}">
              <a class="ksn-link" href="in-person-training.html">In-Person Training <span class="ksn-caret">⌄</span></a>
              <div class="kraken-site-mega">
                <div class="ksn-mega-main"><span class="ksn-label">INSTRUCTOR-LED TRAINING</span><h3>In-Person Training</h3><div class="ksn-category-grid">${categoryLinks(physical,'in-person-training.html')}</div></div>
                <a class="ksn-mega-feature" href="in-person-training.html"><span>TRAIN WITH KRAKEN</span><strong>Practical Training</strong><small>Hands-on medical courses delivered for teams and organisations.</small><b>Explore training →</b></a>
              </div>
            </div>
            ${link('instructor','instructor-tools.html','Instructor Tools')}
            ${link('library','library.html','Library')}
            ${link('journal','journal.html','Journal')}
            ${link('sim','games.html','Simulations')}
            ${link('mission','dashboard.html','My Mission')}
          </nav>
          <div class="ksn-actions"><a class="ksn-search" href="courses.html" aria-label="Search training">⌕</a><a class="ksn-profile" href="profile.html" aria-label="My profile">KM</a></div>
        </div>
      </header>`;
    const toggle = mount.querySelector('.ksn-mobile-toggle');
    const nav = mount.querySelector('.ksn-nav');
    toggle?.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? '×' : '☰';
    });
    mount.querySelectorAll('.ksn-drop > .ksn-link').forEach(a => a.addEventListener('click', e => {
      if (innerWidth <= 980) { e.preventDefault(); a.parentElement.classList.toggle('mobile-open'); }
    }));
  }

  render(fallbackCPD, fallbackPhysical);
  const db = window.supabaseClient || window.supabase;
  if (!db?.from) return;
  Promise.all([
    db.from('courses').select('category').eq('is_published', true),
    db.from('in_person_courses').select('category').eq('status', 'Published')
  ]).then(([a,b]) => render(uniq(a.data?.map(x=>x.category)).length ? uniq(a.data.map(x=>x.category)) : fallbackCPD,
                           uniq(b.data?.map(x=>x.category)).length ? uniq(b.data.map(x=>x.category)) : fallbackPhysical))
    .catch(()=>{});
})();
