(() => {
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const form = $("#courseForm");
const list = $("#adminCourseList");
const editingId = $("#editingId");
const DRAFT_KEY = "kraken-v12-4-course-draft";
let courses = [];
let lessons = [];
let autoSaveTimer = null;

const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
}[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
const value = id => ($(id)?.value ?? "").trim();
const checked = id => Boolean($(id)?.checked);
const setField = (id, v) => {
  const el = $(id); if (!el) return;
  if (el.type === "checkbox") el.checked = Boolean(v);
  else el.value = v ?? "";
};

function activateTab(name) {
  $$("[data-tab]").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  $$("[data-panel]").forEach(p => p.classList.toggle("active", p.dataset.panel === name));
  if (name === "preview") renderPreview();
}
$$("[data-tab]").forEach(button => button.addEventListener("click", () => activateTab(button.dataset.tab)));

function blankBlock(type="text") {
  return {
    client_id: uid(), type,
    title: type === "text" ? "Learning content" : "",
    content: "", url: "", caption: "", button_text: "Open resource"
  };
}
function blankLesson() {
  return {
    client_id: uid(), title: "New lesson", summary: "", estimated_minutes: 5,
    is_preview: false, blocks: [blankBlock("text")]
  };
}
function addLesson() {
  lessons.push(blankLesson());
  renderLessons();
  scheduleDraft();
  requestAnimationFrame(() => {
    const cards = $$(".kb-lesson");
    cards[cards.length - 1]?.scrollIntoView({behavior:"smooth", block:"center"});
  });
}
function removeLesson(i) {
  if (!confirm("Remove this lesson and all of its blocks?")) return;
  lessons.splice(i, 1); renderLessons(); scheduleDraft();
}
function moveLesson(i, direction) {
  const next = i + direction;
  if (next < 0 || next >= lessons.length) return;
  [lessons[i], lessons[next]] = [lessons[next], lessons[i]];
  renderLessons(); scheduleDraft();
}
function duplicateLesson(i) {
  const copy = structuredClone(lessons[i]);
  copy.client_id = uid();
  copy.id = undefined;
  copy.title = `${copy.title} copy`;
  copy.blocks = (copy.blocks || []).map(b => ({...b, client_id:uid()}));
  lessons.splice(i + 1, 0, copy);
  renderLessons(); scheduleDraft();
}
function addBlock(lessonIndex, type) {
  lessons[lessonIndex].blocks ||= [];
  lessons[lessonIndex].blocks.push(blankBlock(type));
  renderLessons(); scheduleDraft();
}
function removeBlock(lessonIndex, blockIndex) {
  lessons[lessonIndex].blocks.splice(blockIndex, 1);
  renderLessons(); scheduleDraft();
}
function moveBlock(lessonIndex, blockIndex, direction) {
  const blocks = lessons[lessonIndex].blocks;
  const next = blockIndex + direction;
  if (next < 0 || next >= blocks.length) return;
  [blocks[blockIndex], blocks[next]] = [blocks[next], blocks[blockIndex]];
  renderLessons(); scheduleDraft();
}

function blockEditor(block, lessonIndex, blockIndex) {
  const labels = {
    text:"Text", video:"Video", image:"Image", download:"Download",
    podcast:"Podcast", simulation:"Simulation", reflection:"Reflection"
  };
  const type = block.type || "text";
  const commonTitle = `<input data-block-key="title" value="${esc(block.title)}" placeholder="${labels[type]} title">`;
  let body = "";
  if (type === "text" || type === "reflection") {
    body = `${commonTitle}<textarea data-block-key="content" placeholder="${type === "reflection" ? "Reflection prompt" : "Lesson text"}">${esc(block.content)}</textarea>`;
  } else {
    body = `${commonTitle}<input type="url" data-block-key="url" value="${esc(block.url)}" placeholder="https://...">
      <input data-block-key="caption" value="${esc(block.caption)}" placeholder="Caption or description">`;
  }
  return `<div class="kb-block" data-block="${blockIndex}">
    <div class="kb-block-head">
      <span class="kb-block-type">${labels[type]}</span><strong>${esc(block.title || labels[type])}</strong>
      <button type="button" data-block-up="${blockIndex}" title="Move up">↑</button>
      <button type="button" data-block-down="${blockIndex}" title="Move down">↓</button>
      <button type="button" data-block-remove="${blockIndex}" title="Remove">×</button>
    </div>${body}
  </div>`;
}

function lessonEditor(lesson, index) {
  const blocks = lesson.blocks || [];
  return `<article class="kb-lesson" data-lesson="${index}">
    <div class="kb-lesson-head">
      <span class="kb-order">${index + 1}</span>
      <strong>${esc(lesson.title || "Untitled lesson")}</strong>
      <div class="kb-mini-actions">
        <button type="button" data-up="${index}" title="Move up">↑</button>
        <button type="button" data-down="${index}" title="Move down">↓</button>
        <button type="button" data-copy="${index}" title="Duplicate">⧉</button>
        <button type="button" data-remove="${index}" title="Delete">×</button>
      </div>
    </div>
    <div class="kb-lesson-body">
      <div class="kb-grid-2">
        <label class="kb-field"><span>Lesson title</span><input data-lesson-key="title" value="${esc(lesson.title)}"></label>
        <label class="kb-field"><span>Estimated minutes</span><input type="number" min="1" data-lesson-key="estimated_minutes" value="${Number(lesson.estimated_minutes || 5)}"></label>
      </div>
      <label class="kb-field"><span>Lesson summary</span><textarea rows="2" data-lesson-key="summary">${esc(lesson.summary)}</textarea></label>
      <label style="display:flex;align-items:center;gap:10px;margin:4px 0 18px;font-weight:800">
        <input type="checkbox" data-lesson-key="is_preview" ${lesson.is_preview ? "checked" : ""}> Free preview lesson
      </label>
      <div class="kb-block-toolbar">
        <button type="button" data-add-block="text">+ Text</button>
        <button type="button" data-add-block="video">+ Video</button>
        <button type="button" data-add-block="image">+ Image</button>
        <button type="button" data-add-block="download">+ Download</button>
        <button type="button" data-add-block="podcast">+ Podcast</button>
        <button type="button" data-add-block="simulation">+ Simulation</button>
        <button type="button" data-add-block="reflection">+ Reflection</button>
      </div>
      <div class="kb-block-list">${blocks.map((b, bi) => blockEditor(b, index, bi)).join("") || '<div class="kb-empty">No blocks in this lesson.</div>'}</div>
    </div>
  </article>`;
}

function renderLessons() {
  $("#lessonList").innerHTML = lessons.map(lessonEditor).join("");
  $("#emptyLessons").hidden = lessons.length > 0;

  $$("[data-up]").forEach(b => b.onclick = () => moveLesson(+b.dataset.up, -1));
  $$("[data-down]").forEach(b => b.onclick = () => moveLesson(+b.dataset.down, 1));
  $$("[data-copy]").forEach(b => b.onclick = () => duplicateLesson(+b.dataset.copy));
  $$("[data-remove]").forEach(b => b.onclick = () => removeLesson(+b.dataset.remove));

  $$(".kb-lesson").forEach(card => {
    const li = +card.dataset.lesson;
    $$("[data-lesson-key]", card).forEach(input => input.oninput = () => {
      lessons[li][input.dataset.lessonKey] =
        input.type === "checkbox" ? input.checked :
        input.type === "number" ? Number(input.value) : input.value;
      if (input.dataset.lessonKey === "title") card.querySelector(".kb-lesson-head strong").textContent = input.value || "Untitled lesson";
      scheduleDraft();
    });
    $$("[data-add-block]", card).forEach(b => b.onclick = () => addBlock(li, b.dataset.addBlock));
    $$("[data-block]", card).forEach(blockEl => {
      const bi = +blockEl.dataset.block;
      $$("[data-block-key]", blockEl).forEach(input => input.oninput = () => {
        lessons[li].blocks[bi][input.dataset.blockKey] = input.value;
        scheduleDraft();
      });
      $("[data-block-up]", blockEl).onclick = () => moveBlock(li, bi, -1);
      $("[data-block-down]", blockEl).onclick = () => moveBlock(li, bi, 1);
      $("[data-block-remove]", blockEl).onclick = () => removeBlock(li, bi);
    });
  });
  renderPreview();
}

function flattenLesson(lesson) {
  const blocks = lesson.blocks || [];
  const text = blocks.filter(b => ["text","reflection"].includes(b.type))
    .map(b => [b.title, b.content].filter(Boolean).join("\n")).filter(Boolean).join("\n\n");
  const first = type => blocks.find(b => b.type === type && b.url)?.url || null;
  return {
    title: lesson.title,
    summary: lesson.summary,
    content: text,
    video_url: first("video"),
    podcast_url: first("podcast"),
    simulation_url: first("simulation"),
    estimated_minutes: Number(lesson.estimated_minutes || 5),
    is_preview: Boolean(lesson.is_preview),
    blocks
  };
}

function coursePayload() {
  const title = value("#courseTitle");
  return {
    id: editingId.value || createCourseId(title),
    icon: value("#courseIcon") || title.slice(0, 3).toUpperCase(),
    title, subtitle: value("#courseSubtitle"), description: value("#courseDescription"),
    category: value("#courseCategory"), difficulty: value("#courseDifficulty"),
    estimated_time: value("#courseEstimatedTime"), instructor: value("#courseInstructor"),
    thumbnail_url: value("#courseThumbnail"), banner_url: value("#courseBanner"),
    status: value("#courseStatus"), xp_reward: Number(value("#courseXp") || 200),
    featured: checked("#courseFeatured"), quiz_enabled: checked("#quizEnabled"),
    simulation_enabled: checked("#simulationEnabled"), podcast_enabled: checked("#podcastEnabled"),
    downloads_enabled: checked("#downloadsEnabled"), reflection_enabled: checked("#reflectionEnabled"),
    certificate_enabled: checked("#certificateEnabled"), require_all_blocks: checked("#requireAllBlocks"),
    simulation_url: value("#courseSimulationUrl"), pass_mark: Number(value("#coursePassMark") || 80),
    access_type: value("#courseAccess") || "public",
    prerequisite_course_id: value("#coursePrerequisite") || null,
    max_quiz_attempts: value("#maxQuizAttempts") ? Number(value("#maxQuizAttempts")) : null,
    quiz_time_limit: value("#quizTimeLimit") ? Number(value("#quizTimeLimit")) : null,
    lessons: lessons.map(l => l.title), content_blocks: [], resource_ids: []
  };
}

async function saveLessons(courseId) {
  const { error: deleteError } = await supabaseClient.from("course_lessons").delete().eq("course_id", courseId);
  if (deleteError) throw deleteError;
  if (!lessons.length) return;
  const rows = lessons.map((lesson, index) => ({
    course_id: courseId, position: index + 1, ...flattenLesson(lesson)
  }));
  const { error } = await supabaseClient.from("course_lessons").insert(rows);
  if (error) throw error;
}
async function loadLessons(courseId) {
  const { data, error } = await supabaseClient.from("course_lessons").select("*").eq("course_id", courseId).order("position");
  if (error) throw error;
  lessons = (data || []).map(row => ({
    ...row, client_id: uid(),
    blocks: Array.isArray(row.blocks) && row.blocks.length ? row.blocks.map(b => ({...b, client_id:uid()})) :
      [
        ...(row.content ? [{...blankBlock("text"), title:"Learning content", content:row.content}] : []),
        ...(row.video_url ? [{...blankBlock("video"), title:"Video", url:row.video_url}] : []),
        ...(row.podcast_url ? [{...blankBlock("podcast"), title:"Podcast", url:row.podcast_url}] : []),
        ...(row.simulation_url ? [{...blankBlock("simulation"), title:"Simulation", url:row.simulation_url}] : [])
      ]
  }));
  renderLessons();
}

async function editCourse(id) {
  const c = courses.find(x => x.id === id); if (!c) return;
  editingId.value = c.id;
  const map = {
    "#courseTitle":c.title,"#courseSubtitle":c.subtitle,"#courseDescription":c.description,
    "#courseCategory":c.category,"#courseDifficulty":c.difficulty || "All levels",
    "#courseEstimatedTime":c.estimated_time,"#courseInstructor":c.instructor,
    "#courseThumbnail":c.thumbnail_url,"#courseBanner":c.banner_url,"#courseIcon":c.icon,
    "#courseStatus":c.status || "Draft","#courseXp":c.xp_reward || 200,
    "#courseFeatured":c.featured,"#quizEnabled":c.quiz_enabled,
    "#simulationEnabled":c.simulation_enabled,"#podcastEnabled":c.podcast_enabled,
    "#downloadsEnabled":c.downloads_enabled !== false,"#reflectionEnabled":c.reflection_enabled,
    "#certificateEnabled":c.certificate_enabled !== false,"#requireAllBlocks":c.require_all_blocks !== false,
    "#courseSimulationUrl":c.simulation_url,"#coursePassMark":c.pass_mark || 80,
    "#courseAccess":c.access_type || "public","#coursePrerequisite":c.prerequisite_course_id,
    "#maxQuizAttempts":c.max_quiz_attempts,"#quizTimeLimit":c.quiz_time_limit
  };
  Object.entries(map).forEach(([id, v]) => setField(id, v));
  $("#formEyebrow").textContent = "Editing course";
  $("#formTitle").textContent = c.title;
  $("#cancelEdit").hidden = false; $("#duplicateButton").hidden = false; $("#deleteEditingButton").hidden = false;
  await loadLessons(id);
  activateTab("details");
  updateMobileBar();
  scrollTo({top:0,behavior:"smooth"});
}

function resetForm() {
  form.reset(); editingId.value = ""; lessons = [];
  setField("#courseXp", 200); setField("#coursePassMark", 80);
  setField("#downloadsEnabled", true); setField("#certificateEnabled", true); setField("#requireAllBlocks", true);
  $("#formEyebrow").textContent = "New course"; $("#formTitle").textContent = "Course details";
  $("#cancelEdit").hidden = true; $("#duplicateButton").hidden = true; $("#deleteEditingButton").hidden = true;
  localStorage.removeItem(DRAFT_KEY);
  renderLessons(); activateTab("details"); updateMobileBar();
}

function renderPreview() {
  const c = coursePayload();
  const image = c.banner_url || c.thumbnail_url;
  const minutes = lessons.reduce((sum, l) => sum + Number(l.estimated_minutes || 0), 0);
  $("#livePreview").innerHTML = `
    ${image ? `<img src="${esc(image)}" alt="">` : ""}
    <span class="kb-eyebrow" style="color:#bdf7eb">${esc(c.category || "Clinical learning")}</span>
    <h2>${esc(c.title || "Untitled course")}</h2>
    <p>${esc(c.subtitle || c.description || "Your course preview will appear here.")}</p>
    <div class="kb-preview-meta">
      <span>${esc(c.difficulty || "All levels")}</span><span>${esc(c.estimated_time || `${minutes} minutes`)}</span>
      <span>${lessons.length} lesson${lessons.length === 1 ? "" : "s"}</span><span>${c.xp_reward} XP</span>
    </div>
    <div class="kb-preview-lessons">${lessons.slice(0,6).map((l,i)=>`<div class="kb-preview-lesson">${i+1}. ${esc(l.title)} · ${(l.blocks||[]).length} block${(l.blocks||[]).length===1?"":"s"}</div>`).join("")}</div>`;
  const id = editingId.value || c.id;
  $("#openCoursePreview").href = `course.html?id=${encodeURIComponent(id)}`;
  updateMobileBar();
}

function renderCourses() {
  const q = value("#courseSearch").toLowerCase();
  const status = value("#statusFilter");
  const filtered = courses.filter(c =>
    `${c.title} ${c.category} ${c.status}`.toLowerCase().includes(q) &&
    (!status || c.status === status)
  );
  list.innerHTML = filtered.length ? filtered.map(c => `
    <article class="kb-course-card ${editingId.value === c.id ? "selected" : ""}">
      <span class="kb-eyebrow">${esc(c.status)} · ${esc(c.category)}</span>
      <h3>${esc(c.title)}</h3><p>${esc(c.description || "No description")}</p>
      <div class="kb-course-actions">
        <a href="course.html?id=${encodeURIComponent(c.id)}">Preview</a><a data-quiz-link href="quiz-admin.html?course=${encodeURIComponent(c.id)}">Quiz</a>
        <button type="button" data-edit="${esc(c.id)}">Edit</button>
        <button type="button" data-copy-course="${esc(c.id)}">Duplicate</button>
        <button type="button" data-delete="${esc(c.id)}">Delete</button>
      </div>
    </article>`).join("") : '<div class="kb-empty">No matching courses.</div>';
  $$("[data-edit]", list).forEach(b => b.onclick = () => editCourse(b.dataset.edit));
  $$("[data-copy-course]", list).forEach(b => b.onclick = () => duplicateCourse(b.dataset.copyCourse));
  $$("[data-delete]", list).forEach(b => b.onclick = () => removeCourse(b.dataset.delete));
}
async function loadCourses() {
  courses = await getAllCoursesOnline();
  $("#coursePrerequisite").innerHTML = '<option value="">None</option>' +
    courses.map(c => `<option value="${esc(c.id)}">${esc(c.title)}</option>`).join("");
  renderCourses();
}
async function removeCourse(id) {
  const c = courses.find(x => x.id === id);
  if (!c || !confirm(`Delete "${c.title}"? This cannot be undone.`)) return;
  await deleteCourseOnline(id);
  if (editingId.value === id) resetForm();
  showToast("Course deleted");
  await loadCourses();
}
async function duplicateCourse(id=editingId.value) {
  const c = courses.find(x => x.id === id); if (!c) return;
  await editCourse(id);
  editingId.value = "";
  setField("#courseTitle", `${c.title} copy`);
  setField("#courseStatus", "Draft");
  lessons = lessons.map(l => ({...structuredClone(l), id:undefined, client_id:uid(), blocks:(l.blocks||[]).map(b=>({...b,client_id:uid()}))}));
  $("#formEyebrow").textContent = "Duplicated course"; $("#formTitle").textContent = "Review and save the copy";
  $("#duplicateButton").hidden = true; $("#deleteEditingButton").hidden = true;
  renderLessons(); renderPreview(); scheduleDraft();
}

function scheduleDraft() {
  clearTimeout(autoSaveTimer);
  $("#draftState").textContent = "Saving draft…";
  $("#mobileSaveState").textContent = "Saving draft…";
  autoSaveTimer = setTimeout(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({course:coursePayload(), lessons}));
    $("#draftState").textContent = "Draft saved on this phone";
    $("#mobileSaveState").textContent = "Phone draft saved";
    renderPreview();
  }, 450);
}
function restoreDraft() {
  if (editingId.value) return;
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
    if (!draft?.course) return;
    const c = draft.course;
    const map = {
      "#courseTitle":c.title,"#courseSubtitle":c.subtitle,"#courseDescription":c.description,
      "#courseCategory":c.category,"#courseDifficulty":c.difficulty,"#courseEstimatedTime":c.estimated_time,
      "#courseInstructor":c.instructor,"#courseThumbnail":c.thumbnail_url,"#courseBanner":c.banner_url,
      "#courseIcon":c.icon,"#courseStatus":c.status,"#courseXp":c.xp_reward,
      "#courseFeatured":c.featured,"#quizEnabled":c.quiz_enabled,"#simulationEnabled":c.simulation_enabled,
      "#podcastEnabled":c.podcast_enabled,"#downloadsEnabled":c.downloads_enabled,
      "#reflectionEnabled":c.reflection_enabled,"#certificateEnabled":c.certificate_enabled,
      "#requireAllBlocks":c.require_all_blocks,"#courseSimulationUrl":c.simulation_url,
      "#coursePassMark":c.pass_mark,"#courseAccess":c.access_type,"#coursePrerequisite":c.prerequisite_course_id,
      "#maxQuizAttempts":c.max_quiz_attempts,"#quizTimeLimit":c.quiz_time_limit
    };
    Object.entries(map).forEach(([id,v]) => setField(id,v));
    lessons = draft.lessons || [];
    renderLessons();
    $("#draftState").textContent = "Phone draft restored";
    $("#mobileSaveState").textContent = "Phone draft restored";
  } catch {}
}
function updateMobileBar() {
  $("#mobileCourseName").textContent = value("#courseTitle") || "New course";
}

async function submitCourse() {
  const button = $("#saveButton"), mobile = $("#mobileSaveButton");
  button.disabled = mobile.disabled = true; button.textContent = "Saving…"; mobile.textContent = "Saving…";
  try {
    const payload = coursePayload();
    if (!payload.title) throw new Error("Add a course title.");
    if (!payload.description) throw new Error("Add a course description.");
    if (!lessons.length && payload.status === "Published" && !confirm("Publish this course without any lessons?")) return;
    const saved = await saveCourseOnline(payload);
    await saveLessons(saved.id);
    localStorage.removeItem(DRAFT_KEY);
    showToast("Course and lessons saved");
    resetForm();
    await loadCourses();
  } catch (error) {
    alert(`Could not save: ${error.message}`);
  } finally {
    button.disabled = mobile.disabled = false; button.textContent = "Save course"; mobile.textContent = "Save";
  }
}

form.addEventListener("input", scheduleDraft);
form.addEventListener("submit", e => { e.preventDefault(); submitCourse(); });
$("#mobileSaveButton").onclick = submitCourse;
$("#addLesson").onclick = addLesson;
$("#newCourseButton").onclick = resetForm;
$("#cancelEdit").onclick = resetForm;
$("#duplicateButton").onclick = () => duplicateCourse();
$("#deleteEditingButton").onclick = () => editingId.value && removeCourse(editingId.value);
$("#courseSearch").oninput = renderCourses;
$("#statusFilter").onchange = renderCourses;
$("#courseTitle").addEventListener("input", updateMobileBar);
$("#exportCourses").onclick = () => {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([JSON.stringify(courses, null, 2)], {type:"application/json"}));
  link.download = "kraken-course-backup.json"; link.click(); URL.revokeObjectURL(link.href);
};
$("#signOutButton").onclick = async () => { await supabaseClient.auth.signOut(); location.href = "login.html"; };

(async () => {
  try {
    const session = await requireAdmin(); if (!session) return;
    $("#adminStatus").textContent = `Connected as ${session.user.email}`;
    renderLessons(); await loadCourses(); restoreDraft(); renderPreview();
  } catch (error) {
    $("#adminStatus").textContent = `Access denied: ${error.message}`;
    form.hidden = true;
  }
})();
})();