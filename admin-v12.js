const form = $("#courseForm");
const list = $("#adminCourseList");
const editingId = $("#editingId");
let courses = [];
let lessons = [];
let autoSaveTimer;
const DRAFT_KEY = "kraken-v12-course-draft";

const esc = value => escapeHtml(String(value ?? ""));
const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

function activateTab(name){
  $$("[data-tab]").forEach(b=>b.classList.toggle("active",b.dataset.tab===name));
  $$("[data-panel]").forEach(p=>p.classList.toggle("active",p.dataset.panel===name));
  if(name==="preview") renderPreview();
}
$$("[data-tab]").forEach(button=>button.onclick=()=>activateTab(button.dataset.tab));

function blankLesson(){return {client_id:uid(),title:"New lesson",summary:"",content:"",video_url:"",podcast_url:"",simulation_url:"",estimated_minutes:5,is_preview:false}}
function addLesson(){lessons.push(blankLesson());renderLessons();scheduleDraft();}
function removeLesson(i){if(confirm("Remove this lesson?")){lessons.splice(i,1);renderLessons();scheduleDraft();}}
function moveLesson(i,d){const n=i+d;if(n<0||n>=lessons.length)return;[lessons[i],lessons[n]]=[lessons[n],lessons[i]];renderLessons();scheduleDraft();}
function duplicateLesson(i){lessons.splice(i+1,0,{...structuredClone(lessons[i]),id:undefined,client_id:uid(),title:`${lessons[i].title} copy`});renderLessons();scheduleDraft();}

function lessonEditor(l,i){return `<article class="v12-lesson" data-lesson="${i}"><div class="v12-lesson-head"><span class="v12-handle">☷</span><strong>${i+1}. ${esc(l.title||"Untitled lesson")}</strong><div class="v12-mini-actions"><button type="button" data-up="${i}" title="Move up">↑</button><button type="button" data-down="${i}" title="Move down">↓</button><button type="button" data-copy="${i}" title="Duplicate">⧉</button><button type="button" data-remove="${i}" title="Delete">×</button></div></div><div class="v12-lesson-body"><div class="v12-form-grid"><label>Lesson title<input data-key="title" value="${esc(l.title)}"></label><label>Estimated minutes<input type="number" min="1" data-key="estimated_minutes" value="${Number(l.estimated_minutes||5)}"></label></div><label>Summary<textarea rows="2" data-key="summary">${esc(l.summary)}</textarea></label><label>Lesson text<textarea rows="6" data-key="content">${esc(l.content)}</textarea></label><div class="v12-form-grid"><label>Video URL<input type="url" data-key="video_url" value="${esc(l.video_url)}"></label><label>Podcast URL<input type="url" data-key="podcast_url" value="${esc(l.podcast_url)}"></label></div><label>Simulation URL<input type="url" data-key="simulation_url" value="${esc(l.simulation_url)}"></label><label style="display:flex;align-items:center;gap:10px"><input type="checkbox" data-key="is_preview" ${l.is_preview?"checked":""} style="width:auto"> Free preview lesson</label></div></article>`}
function renderLessons(){
  $("#lessonList").innerHTML=lessons.map(lessonEditor).join("");
  $("#emptyLessons").hidden=lessons.length>0;
  $$("[data-up]").forEach(b=>b.onclick=()=>moveLesson(+b.dataset.up,-1));
  $$("[data-down]").forEach(b=>b.onclick=()=>moveLesson(+b.dataset.down,1));
  $$("[data-copy]").forEach(b=>b.onclick=()=>duplicateLesson(+b.dataset.copy));
  $$("[data-remove]").forEach(b=>b.onclick=()=>removeLesson(+b.dataset.remove));
  $$("[data-lesson]").forEach(el=>{const i=+el.dataset.lesson;$$('[data-key]',el).forEach(input=>input.oninput=()=>{lessons[i][input.dataset.key]=input.type==='checkbox'?input.checked:input.type==='number'?Number(input.value):input.value;const title=el.querySelector('strong');if(input.dataset.key==='title')title.textContent=`${i+1}. ${input.value||'Untitled lesson'}`;scheduleDraft();})});
  renderPreview();
}

function value(id){return $(id)?.value?.trim?.() ?? ""}
function checked(id){return Boolean($(id)?.checked)}
function coursePayload(){
 const title=value("#courseTitle");
 return {id:editingId.value||createCourseId(title),icon:value("#courseIcon")||title.slice(0,3).toUpperCase(),title,subtitle:value("#courseSubtitle"),description:value("#courseDescription"),category:value("#courseCategory"),difficulty:value("#courseDifficulty"),estimated_time:value("#courseEstimatedTime"),instructor:value("#courseInstructor"),thumbnail_url:value("#courseThumbnail"),banner_url:value("#courseBanner"),status:value("#courseStatus"),xp_reward:Number(value("#courseXp")||200),featured:checked("#courseFeatured"),quiz_enabled:checked("#quizEnabled"),simulation_enabled:checked("#simulationEnabled"),podcast_enabled:checked("#podcastEnabled"),downloads_enabled:checked("#downloadsEnabled"),reflection_enabled:checked("#reflectionEnabled"),certificate_enabled:checked("#certificateEnabled"),require_all_blocks:checked("#requireAllBlocks"),simulation_url:value("#courseSimulationUrl"),pass_mark:Number(value("#coursePassMark")||80),access_type:value("#courseAccess")||"public",prerequisite_course_id:value("#coursePrerequisite")||null,max_quiz_attempts:value("#maxQuizAttempts")?Number(value("#maxQuizAttempts")):null,quiz_time_limit:value("#quizTimeLimit")?Number(value("#quizTimeLimit")):null,lessons:lessons.map(x=>x.title),content_blocks:[],resource_ids:[]}
}

async function saveLessons(courseId){
 const {error:deleteError}=await supabaseClient.from("course_lessons").delete().eq("course_id",courseId);if(deleteError)throw deleteError;
 if(!lessons.length)return;
 const rows=lessons.map((l,i)=>({course_id:courseId,position:i+1,title:l.title||`Lesson ${i+1}`,summary:l.summary||"",content:l.content||"",video_url:l.video_url||null,podcast_url:l.podcast_url||null,simulation_url:l.simulation_url||null,estimated_minutes:Number(l.estimated_minutes||5),is_preview:Boolean(l.is_preview)}));
 const {error}=await supabaseClient.from("course_lessons").insert(rows);if(error)throw error;
}
async function loadLessons(courseId){const {data,error}=await supabaseClient.from("course_lessons").select("*").eq("course_id",courseId).order("position");if(error)throw error;lessons=(data||[]).map(x=>({...x,client_id:uid()}));renderLessons();}

function setField(id,v){const el=$(id);if(!el)return;if(el.type==='checkbox')el.checked=Boolean(v);else el.value=v??""}
async function editCourse(id){
 const c=courses.find(x=>x.id===id);if(!c)return;editingId.value=c.id;
 const map={"#courseTitle":c.title,"#courseSubtitle":c.subtitle,"#courseDescription":c.description,"#courseCategory":c.category,"#courseDifficulty":c.difficulty||"All levels","#courseEstimatedTime":c.estimated_time,"#courseInstructor":c.instructor,"#courseThumbnail":c.thumbnail_url,"#courseBanner":c.banner_url,"#courseIcon":c.icon,"#courseStatus":c.status||"Draft","#courseXp":c.xp_reward||200,"#courseFeatured":c.featured,"#quizEnabled":c.quiz_enabled,"#simulationEnabled":c.simulation_enabled,"#podcastEnabled":c.podcast_enabled,"#downloadsEnabled":c.downloads_enabled!==false,"#reflectionEnabled":c.reflection_enabled,"#certificateEnabled":c.certificate_enabled!==false,"#requireAllBlocks":c.require_all_blocks!==false,"#courseSimulationUrl":c.simulation_url,"#coursePassMark":c.pass_mark||80,"#courseAccess":c.access_type||"public","#coursePrerequisite":c.prerequisite_course_id,"#maxQuizAttempts":c.max_quiz_attempts,"#quizTimeLimit":c.quiz_time_limit};Object.entries(map).forEach(([id,v])=>setField(id,v));
 $("#formEyebrow").textContent="Editing course";$("#formTitle").textContent=c.title;$("#cancelEdit").hidden=false;$("#duplicateButton").hidden=false;await loadLessons(id);activateTab("details");scrollTo({top:0,behavior:"smooth"});
}
function resetForm(){form.reset();editingId.value="";lessons=[];renderLessons();setField("#courseXp",200);setField("#coursePassMark",80);setField("#downloadsEnabled",true);setField("#certificateEnabled",true);setField("#requireAllBlocks",true);$("#formEyebrow").textContent="New course";$("#formTitle").textContent="Course details";$("#cancelEdit").hidden=true;$("#duplicateButton").hidden=true;localStorage.removeItem(DRAFT_KEY);activateTab("details");}

function renderPreview(){const c=coursePayload();const image=c.banner_url||c.thumbnail_url;$("#livePreview").innerHTML=`${image?`<img src="${esc(image)}" alt="">`:''}<span class="v12-eyebrow" style="color:#bdf7eb">${esc(c.category||'Clinical learning')}</span><h2>${esc(c.title||'Untitled course')}</h2><p>${esc(c.subtitle||c.description||'Your course preview will appear here.')}</p><div class="v12-preview-meta"><span>${esc(c.difficulty||'All levels')}</span><span>${esc(c.estimated_time||`${lessons.reduce((n,l)=>n+Number(l.estimated_minutes||0),0)} minutes`)}</span><span>${lessons.length} lesson${lessons.length===1?'':'s'}</span><span>${c.xp_reward} XP</span></div>`}
function renderCourses(){const q=value("#courseSearch").toLowerCase();const filtered=courses.filter(c=>`${c.title} ${c.category} ${c.status}`.toLowerCase().includes(q));list.innerHTML=filtered.length?filtered.map(c=>`<article class="v12-course"><span class="v12-eyebrow">${esc(c.status)} · ${esc(c.category)}</span><h3>${esc(c.title)}</h3><p>${esc(c.description||'No description')}</p><div class="v12-course-actions"><a href="course.html?id=${encodeURIComponent(c.id)}">Preview</a><button data-edit="${esc(c.id)}">Edit</button><button data-copy-course="${esc(c.id)}">Duplicate</button><button class="danger" data-delete="${esc(c.id)}">Delete</button></div></article>`).join(''):'<div class="v12-empty">No matching courses.</div>';$$('[data-edit]',list).forEach(b=>b.onclick=()=>editCourse(b.dataset.edit));$$('[data-copy-course]',list).forEach(b=>b.onclick=()=>duplicateCourse(b.dataset.copyCourse));$$('[data-delete]',list).forEach(b=>b.onclick=()=>removeCourse(b.dataset.delete));}
async function loadCourses(){courses=await getAllCoursesOnline();const sel=$("#coursePrerequisite");sel.innerHTML='<option value="">None</option>'+courses.map(c=>`<option value="${esc(c.id)}">${esc(c.title)}</option>`).join('');renderCourses();}
async function removeCourse(id){const c=courses.find(x=>x.id===id);if(c&&confirm(`Delete "${c.title}"?`)){await deleteCourseOnline(id);showToast("Course deleted");await loadCourses();}}
async function duplicateCourse(id=editingId.value){const c=courses.find(x=>x.id===id);if(!c)return;await editCourse(id);editingId.value="";setField("#courseTitle",`${c.title} copy`);setField("#courseStatus","Draft");$("#formEyebrow").textContent="Duplicated course";$("#formTitle").textContent="Review and save the copy";$("#duplicateButton").hidden=true;renderPreview();}

function scheduleDraft(){clearTimeout(autoSaveTimer);$("#draftState").textContent="Saving draft…";autoSaveTimer=setTimeout(()=>{localStorage.setItem(DRAFT_KEY,JSON.stringify({course:coursePayload(),lessons}));$("#draftState").textContent="Draft saved on this phone";renderPreview();},450)}
function restoreDraft(){if(editingId.value)return;try{const d=JSON.parse(localStorage.getItem(DRAFT_KEY)||"null");if(!d?.course)return;const c=d.course;Object.entries({"#courseTitle":c.title,"#courseSubtitle":c.subtitle,"#courseDescription":c.description,"#courseCategory":c.category,"#courseDifficulty":c.difficulty,"#courseEstimatedTime":c.estimated_time,"#courseInstructor":c.instructor,"#courseThumbnail":c.thumbnail_url,"#courseBanner":c.banner_url,"#courseIcon":c.icon,"#courseStatus":c.status,"#courseXp":c.xp_reward,"#courseFeatured":c.featured,"#quizEnabled":c.quiz_enabled,"#simulationEnabled":c.simulation_enabled,"#podcastEnabled":c.podcast_enabled,"#downloadsEnabled":c.downloads_enabled,"#reflectionEnabled":c.reflection_enabled,"#certificateEnabled":c.certificate_enabled,"#requireAllBlocks":c.require_all_blocks,"#courseSimulationUrl":c.simulation_url,"#coursePassMark":c.pass_mark}).forEach(([id,v])=>setField(id,v));lessons=d.lessons||[];renderLessons();$("#draftState").textContent="Phone draft restored";}catch{}}

form.oninput=scheduleDraft;$("#addLesson").onclick=addLesson;$("#cancelEdit").onclick=resetForm;$("#duplicateButton").onclick=()=>duplicateCourse();$("#courseSearch").oninput=renderCourses;
form.onsubmit=async e=>{e.preventDefault();const button=$("#saveButton");button.disabled=true;button.textContent="Saving…";try{const payload=coursePayload();if(!payload.title)throw new Error("Add a course title.");const saved=await saveCourseOnline(payload);await saveLessons(saved.id);localStorage.removeItem(DRAFT_KEY);showToast("Course and lessons saved");resetForm();await loadCourses();}catch(error){alert(`Could not save: ${error.message}`)}finally{button.disabled=false;button.textContent="Save course"}};
$("#exportCourses").onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(courses,null,2)],{type:'application/json'}));a.download='kraken-course-backup.json';a.click()};
$("#signOutButton").onclick=async()=>{await supabaseClient.auth.signOut();location.href='login.html'};
(async()=>{try{const session=await requireAdmin();if(!session)return;$("#adminStatus").textContent=`Connected as ${session.user.email}`;renderLessons();await loadCourses();restoreDraft();renderPreview();}catch(error){$("#adminStatus").textContent=`Access denied: ${error.message}`;form.hidden=true}})();
