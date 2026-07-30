"use strict";

const playerState = { bundle: null, activeIndex: 0, completed: new Set(), progress: null, session: null };
const playerRoot = document.querySelector("#coursePlayer");
const courseId = new URLSearchParams(location.search).get("id");

function safe(value) { return escapePlayerHtml(value); }
function minutesLabel(value) { const n = Number(value || 0); return n ? `${n} min` : "Self-paced"; }
function initials(value) { return String(value || "KM").trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0].toUpperCase()).join("") || "KM"; }
function videoEmbed(url) {
  const value = String(url || "").trim();
  if (!value) return "";
  let embed = value;
  if (/youtu\.be\//i.test(value)) embed = `https://www.youtube.com/embed/${value.split("youtu.be/")[1].split(/[?&]/)[0]}`;
  else if (/youtube\.com\/watch/i.test(value)) { try { embed = `https://www.youtube.com/embed/${new URL(value).searchParams.get("v")}`; } catch {} }
  else if (/vimeo\.com\/\d+/i.test(value)) embed = `https://player.vimeo.com/video/${value.match(/vimeo\.com\/(\d+)/)[1]}`;
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(value)) return `<video controls playsinline src="${safe(value)}"></video>`;
  return `<iframe src="${safe(embed)}" title="Lesson video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
}

async function initialisePlayer() {
  if (!courseId) return showError("Course not found", "No course ID was supplied.");
  try {
    playerState.session = await getCurrentSession();
    const bundle = await getCourseEngineBundle(courseId);
    if (!bundle) return showError("Course not found", "This course may have been removed or is not available.");
    const access = typeof canAccessCourse === "function" ? await canAccessCourse(bundle.course) : { ok: true };
    if (!access.ok) return showError("Course locked", access.reason || "You do not currently have access to this course.", "student-login.html", "Sign in");
    playerState.bundle = bundle;
    const progressRows = await getLessonProgressV12(courseId);
    progressRows.filter(x=>x.completed).forEach(x=>playerState.completed.add(String(x.lesson_id)));
    playerState.progress = await getCourseProgress(courseId);
    renderPlayer();
    await renderProfile();
  } catch (error) {
    console.error(error);
    showError("Course unavailable", error.message || "Kraken could not load this course.");
  }
}

function renderPlayer() {
  const { course, lessons, resources } = playerState.bundle;
  const totalMinutes = lessons.reduce((sum,l)=>sum+Number(l.estimated_minutes||0),0);
  const heroImage = course.banner_url || course.banner || course.thumbnail_url || course.thumbnail || "";
  const style = heroImage ? `style="--hero-image:linear-gradient(90deg,rgba(3,11,8,.97),rgba(3,11,8,.78) 50%,rgba(3,11,8,.25)),url('${safe(heroImage)}')"` : "";
  playerRoot.innerHTML = `
    <section class="course-hero" ${style}><div class="course-hero-copy">
      <div class="hero-tags"><span class="hero-tag">${safe(course.category || "Medical training")}</span><span class="hero-tag">${safe(course.difficulty || "All levels")}</span><span class="hero-tag">${safe(course.estimated_time || minutesLabel(totalMinutes))}</span></div>
      <h1>${safe(course.title || "Kraken course")}</h1>
      ${course.subtitle ? `<p class="course-subtitle">${safe(course.subtitle)}</p>` : ""}
      <p class="course-description">${safe(course.description || "Continue your Kraken medical training mission.")}</p>
      <div class="hero-actions"><button class="player-button" id="continueCourse">▶ ${playerState.completed.size ? "Continue course" : "Start course"}</button><a class="player-button secondary" href="courses.html">Browse courses</a></div>
    </div></section>
    <section class="player-progress-wrap"><div class="progress-row"><strong>Course progress</strong><span id="progressLabel">0%</span></div><div class="player-progress"><span id="progressBar"></span></div></section>
    <div class="player-layout">
      <aside class="lesson-sidebar" id="lessonSidebar"><div class="sidebar-head"><div><span class="lesson-kicker">Course pathway</span><h2>Lessons</h2></div><span>${lessons.length} total</span></div><div class="lesson-list" id="lessonList"></div></aside>
      <section class="player-main"><article class="lesson-view" id="lessonView"></article>${renderResources(resources)}${renderSimulationPanel()}${renderCertificatePanel()}</section>
    </div>
    <button class="mobile-lessons-button" id="mobileLessons" aria-label="Open lesson list">☰</button>`;
  document.querySelector("#continueCourse")?.addEventListener("click",()=>selectLesson(firstIncompleteIndex()));
  document.querySelector("#mobileLessons")?.addEventListener("click",()=>document.querySelector("#lessonSidebar")?.classList.toggle("open"));
  renderLessonList(); selectLesson(firstIncompleteIndex()); updateProgressDisplay();
}

function renderLessonList() {
  const list = document.querySelector("#lessonList");
  const lessons = playerState.bundle.lessons;
  list.innerHTML = lessons.map((lesson,index)=>{ const done=playerState.completed.has(String(lesson.id)); return `<button class="lesson-button ${done?"completed":""} ${index===playerState.activeIndex?"active":""}" data-index="${index}"><span class="lesson-number">${String(index+1).padStart(2,"0")}</span><span class="lesson-title-wrap"><strong>${safe(lesson.title || `Lesson ${index+1}`)}</strong><small>${safe(minutesLabel(lesson.estimated_minutes))}</small></span><span class="lesson-state">${done?"✓":"○"}</span></button>`; }).join("");
  list.querySelectorAll("[data-index]").forEach(button=>button.addEventListener("click",()=>{selectLesson(Number(button.dataset.index));document.querySelector("#lessonSidebar")?.classList.remove("open");}));
}

function selectLesson(index) {
  const lessons = playerState.bundle.lessons;
  if (!lessons.length) { document.querySelector("#lessonView").innerHTML='<div class="empty-inline">No lessons have been added to this course yet.</div>'; return; }
  playerState.activeIndex=Math.max(0,Math.min(index,lessons.length-1));
  const lesson=lessons[playerState.activeIndex]; const done=playerState.completed.has(String(lesson.id));
  document.querySelector("#lessonView").innerHTML=`<span class="lesson-kicker">Lesson ${playerState.activeIndex+1} of ${lessons.length}</span><h2>${safe(lesson.title || `Lesson ${playerState.activeIndex+1}`)}</h2>${lesson.summary?`<p class="lesson-summary">${safe(lesson.summary)}</p>`:""}${lesson.video_url?`<div class="lesson-media">${videoEmbed(lesson.video_url)}</div>`:""}<div class="lesson-content">${lesson.content || "<p>This lesson is ready for content.</p>"}</div>${lesson.simulation_url?`<p><a class="player-button secondary" href="${safe(lesson.simulation_url)}" target="_blank" rel="noopener">Launch lesson simulation ↗</a></p>`:""}<div class="lesson-actions"><button class="player-button secondary" id="previousLesson" ${playerState.activeIndex===0?"disabled":""}>← Previous</button><button class="player-button" id="completeLesson">${done?"Mark incomplete":"Complete lesson ✓"}</button><button class="player-button secondary" id="nextLesson" ${playerState.activeIndex===lessons.length-1?"disabled":""}>Next →</button></div>`;
  document.querySelector("#previousLesson")?.addEventListener("click",()=>selectLesson(playerState.activeIndex-1));
  document.querySelector("#nextLesson")?.addEventListener("click",()=>selectLesson(playerState.activeIndex+1));
  document.querySelector("#completeLesson")?.addEventListener("click",toggleCurrentLesson);
  renderLessonList();
}

async function toggleCurrentLesson() {
  if (!playerState.session) { localStorage.setItem("kmtReturnTo",location.pathname+location.search); location.href="student-login.html"; return; }
  const lesson=playerState.bundle.lessons[playerState.activeIndex]; const id=String(lesson.id); const next=!playerState.completed.has(id);
  next?playerState.completed.add(id):playerState.completed.delete(id);
  renderLessonList(); selectLesson(playerState.activeIndex); updateProgressDisplay();
  try { playerState.progress=await saveLessonProgressV12(playerState.bundle.course,id,next,playerState.bundle.lessons.length); updateProgressDisplay(); }
  catch(error){ console.error(error); alert("Progress could not be saved. Please try again."); }
}

function updateProgressDisplay() {
  const total=playerState.bundle.lessons.length; const percent=total?Math.round(playerState.completed.size/total*100):0;
  const bar=document.querySelector("#progressBar"),label=document.querySelector("#progressLabel"); if(bar)bar.style.width=`${percent}%`; if(label)label.textContent=`${percent}%`;
  const cert=document.querySelector("#certificatePanel"); if(cert)cert.classList.toggle("locked-panel",percent<100);
  const certButton=document.querySelector("#certificateAction"); if(certButton){certButton.textContent=percent===100?"View certificate":"Complete all lessons";certButton.href=percent===100?"certificate.html":"#";}
}

function firstIncompleteIndex(){const lessons=playerState.bundle.lessons;const index=lessons.findIndex(x=>!playerState.completed.has(String(x.id)));return index<0?Math.max(0,lessons.length-1):index;}
function renderResources(resources){return `<section class="player-panel"><div class="panel-heading"><div><span class="lesson-kicker">Field kit</span><h3>Downloads</h3></div><small>${resources.length} resources</small></div><div class="resource-grid">${resources.length?resources.map(r=>`<a class="resource-card" href="${safe(r.url)}" target="_blank" rel="noopener"><span class="resource-icon">⇩</span><span><strong>${safe(r.name||"Course resource")}</strong><small>${safe(r.resource_type||"Download")}</small></span></a>`).join(""):'<div class="empty-inline">No downloadable resources have been added yet.</div>'}</div></section>`;}
function renderSimulationPanel(){const course=playerState.bundle.course;const simulation=course.simulation_url || playerState.bundle.lessons.find(x=>x.simulation_url)?.simulation_url;return `<section class="player-panel"><div class="panel-heading"><div><span class="lesson-kicker">Applied learning</span><h3>Simulation</h3></div></div>${simulation?`<p class="panel-copy">Put the learning into practice in an interactive scenario.</p><a class="player-button" href="${safe(simulation)}" target="_blank" rel="noopener">Launch simulation ↗</a>`:'<div class="empty-inline">No simulation is attached to this course.</div>'}</section>`;}
function renderCertificatePanel(){const enabled=playerState.bundle.course.certificate_enabled!==false;return `<section class="player-panel locked-panel" id="certificatePanel"><div class="certificate-card"><div><span class="lesson-kicker">Mission reward</span><h3>${enabled?"Course certificate":"Completion record"}</h3><p class="panel-copy">${enabled?"Complete every lesson and meet the course requirements to unlock your certificate.":"Your course completion will be recorded in your learner profile."}</p><a class="player-button secondary" id="certificateAction" href="#">Complete all lessons</a></div><span class="certificate-seal">KMT</span></div></section>`;}

async function renderProfile(){if(!playerState.session)return;try{const profile=await ensureLearnerProfile();document.querySelector("#playerProfile").textContent=initials(profile?.display_name||playerState.session.user.email);document.querySelector("#playerProfile").href="dashboard.html";document.querySelector("#topXp").textContent=`${Number(profile?.xp||0).toLocaleString()} XP`;}catch(error){console.warn(error)}}
function showError(title,message,href="courses.html",label="Back to courses"){playerRoot.innerHTML=`<section class="player-error"><h1>${safe(title)}</h1><p>${safe(message)}</p><a class="player-button" href="${safe(href)}">${safe(label)}</a></section>`;}
document.addEventListener("DOMContentLoaded",initialisePlayer);
