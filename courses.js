"use strict";
const state={courses:[],query:"",category:""};
const esc=v=>{const d=document.createElement("div");d.textContent=String(v??"");return d.innerHTML};
const norm=v=>String(v??"").trim();

async function loadCourses(){
  const grid=document.querySelector("#courseGrid");
  try{
    let courses=[];
    if(typeof getPublicCoursesOnline==="function") courses=await getPublicCoursesOnline();
    else if(window.supabaseClient){
      const {data,error}=await supabaseClient.from("courses").select("*").or("status.eq.published,published.eq.true").order("created_at",{ascending:false});
      if(error) throw error; courses=data||[];
    }
    state.courses=Array.isArray(courses)?courses:[];
    buildCategories(); applyUrlFilter(); render(); renderAccount();
  }catch(error){console.error(error);grid.innerHTML=`<div class="catalogue-empty"><strong>Courses could not be loaded.</strong><br>${esc(error.message||"Please try again shortly.")}</div>`;}
}
function buildCategories(){const select=document.querySelector("#categoryFilter");const values=[...new Set(state.courses.map(c=>norm(c.category)).filter(Boolean))].sort((a,b)=>a.localeCompare(b));select.insertAdjacentHTML("beforeend",values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join(""));}
function applyUrlFilter(){const p=new URLSearchParams(location.search);const category=norm(p.get("category"));if(category){state.category=category;document.querySelector("#categoryFilter").value=category;}}
function render(){const grid=document.querySelector("#courseGrid");const filtered=state.courses.filter(c=>{const hay=[c.title,c.subtitle,c.description,c.category,c.difficulty].map(norm).join(" ").toLowerCase();return(!state.query||hay.includes(state.query.toLowerCase()))&&(!state.category||norm(c.category).toLowerCase()===state.category.toLowerCase());});document.querySelector("#courseCount").textContent=`${filtered.length} course${filtered.length===1?"":"s"}`;document.querySelector("#catalogueTitle").textContent=state.category||"All courses";if(!filtered.length){grid.innerHTML='<div class="catalogue-empty">No courses match those filters.</div>';return;}grid.innerHTML=filtered.map(card).join("");}
function card(c){const id=encodeURIComponent(c.id);const image=norm(c.thumbnail_url||c.thumbnail||c.banner_url||c.banner);const icon=norm(c.icon||c.initials||c.title?.slice(0,3)||"K").toUpperCase();const art=image?`style="background-image:linear-gradient(180deg,rgba(3,22,17,.06),rgba(3,22,17,.75)),url('${esc(image)}')"`:"";return `<article class="catalogue-card"><div class="catalogue-art" ${art}><span class="catalogue-icon">${esc(icon)}</span></div><div class="catalogue-card-body"><div class="catalogue-meta"><span class="catalogue-pill">${esc(c.category||"Medical")}</span><span class="catalogue-pill">${esc(c.difficulty||"All levels")}</span></div><h3>${esc(c.title||"Untitled course")}</h3><p>${esc(c.subtitle||c.description||"Open this course to begin learning.")}</p><a class="catalogue-open" href="course.html?id=${id}"><span>Open course</span><span>→</span></a></div></article>`;}
async function renderAccount(){try{if(typeof getCurrentSession!=="function")return;const s=await getCurrentSession();const a=document.querySelector("#accountLink");if(s){a.textContent="Dashboard";a.href="dashboard.html";}}catch(_){}}
document.addEventListener("DOMContentLoaded",()=>{document.querySelector("#courseSearch").addEventListener("input",e=>{state.query=e.target.value;render()});document.querySelector("#categoryFilter").addEventListener("change",e=>{state.category=e.target.value;const u=new URL(location.href);state.category?u.searchParams.set("category",state.category):u.searchParams.delete("category");history.replaceState({},"",u);render()});loadCourses();});
