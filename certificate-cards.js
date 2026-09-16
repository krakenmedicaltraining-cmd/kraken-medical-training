"use strict";
(()=>{
 const list=document.querySelector("#certificateList"); if(!list)return;
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
 let rows=[],session=null,search="",sort="newest";
 const dt=v=>{const d=v?new Date(v):null;return d&&!isNaN(d)?d:null};
 const fd=v=>dt(v)?.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})||"Date unavailable";
 function shell(){
  if(document.querySelector(".kmt-cert-toolbar"))return;
  const bar=document.createElement("div");bar.className="kmt-cert-toolbar";
  bar.innerHTML=`<div class="kmt-cert-tabs"><button class="kmt-cert-tab" type="button">All Certificates <span id="kmtCertCount">0</span></button></div><div class="kmt-cert-tools"><input id="kmtCertSearch" class="kmt-cert-search" type="search" placeholder="Search certificates…"><select id="kmtCertSort" class="kmt-cert-sort"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="az">A–Z</option></select></div>`;
  list.parentNode.insertBefore(bar,list);list.classList.add("kmt-certificate-grid");
  bar.querySelector("#kmtCertSearch").oninput=e=>{search=e.target.value.toLowerCase().trim();render()};
  bar.querySelector("#kmtCertSort").onchange=e=>{sort=e.target.value;render()};
 }
 function card(c){
  const title=c.course_title||c.course_id||"Completed course",name=c.learner_name||session?.user?.email||"Learner",score=c.final_score??100,code=c.certificate_code||c.id;
  const href=`certificate.html?course=${encodeURIComponent(c.course_id)}`;
  return `<article class="kmt-certificate-card"><div class="kmt-cert-preview"><span class="kmt-cert-complete">✓ Completed</span><div class="kmt-cert-mini-brand"><img src="assets/kraken-medical-logo.png" alt=""><span><strong>KRAKEN</strong><small>MEDICAL TRAINING</small></span></div><div class="kmt-cert-preview-content"><span>CERTIFICATE OF COMPLETION</span><b>${esc(name)}</b><span>has successfully completed</span><h4>${esc(title)}</h4></div><div class="kmt-cert-preview-footer"><span>${esc(fd(c.issued_at))}</span><span class="kmt-cert-seal">KMT</span><span>Kraken Medical Training</span></div></div><div class="kmt-cert-body"><h3>${esc(title)}</h3><div class="kmt-cert-meta"><span>▣ ${esc(fd(c.issued_at))}</span><span>☆ ${esc(score)}%</span></div><div class="kmt-cert-code"><span>▤ ${esc(code)}</span><button class="kmt-copy-code" data-code="${esc(code)}" type="button">⧉</button></div><div class="kmt-cert-actions"><a class="kmt-cert-view" href="${href}">▣ View Certificate</a><a class="kmt-cert-pdf" href="${href}">↓ PDF</a></div></div></article>`;
 }
 function render(){
  let shown=[...rows].filter(c=>!search||`${c.course_title||""} ${c.course_id||""} ${c.certificate_code||""}`.toLowerCase().includes(search));
  shown.sort((a,b)=>sort==="az"?String(a.course_title||"").localeCompare(String(b.course_title||"")):sort==="oldest"?(dt(a.issued_at)?.getTime()||0)-(dt(b.issued_at)?.getTime()||0):(dt(b.issued_at)?.getTime()||0)-(dt(a.issued_at)?.getTime()||0));
  document.querySelector("#kmtCertCount").textContent=rows.length;
  list.innerHTML=shown.length?shown.map(card).join(""):`<div class="kmt-cert-empty">${search?"No certificates match your search.":"Complete a course to earn your first certificate."}</div>`;
  list.querySelectorAll(".kmt-copy-code").forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(b.dataset.code);b.textContent="✓";setTimeout(()=>b.textContent="⧉",1000)}catch{}});
 }
 async function load(){
  shell();
  const s=await supabaseClient.auth.getSession();session=s.data.session;if(!session)return;
  const r=await supabaseClient.from("certificates").select("id,certificate_code,user_id,course_id,learner_name,course_title,final_score,issued_at").eq("user_id",session.user.id).order("issued_at",{ascending:false});
  if(r.error){console.error(r.error);list.innerHTML='<div class="kmt-cert-empty">Certificates could not be loaded.</div>';return}
  rows=r.data||[];render();
 }
 window.addEventListener("load",()=>setTimeout(load,150));
})();