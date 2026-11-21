(async()=>{
const $=id=>document.getElementById(id),esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let current=null,plans=[],courses=[];
const status=msg=>{$("mmStatus").textContent=msg;};
const auth=await supabaseClient.auth.getUser();
if(!auth.data?.user){location.href="student-login.html";return;}
const admin=await supabaseClient.from("admin_users").select("user_id").eq("user_id",auth.data.user.id).maybeSingle();
if(admin.error||!admin.data){status("Administrator access required.");return;}
$("mmContent").hidden=false;
const catalogue=await supabaseClient.from("public_course_catalogue").select("id,title").eq("status","Published").order("title");
if(catalogue.error){status("Cannot load course catalogue: "+catalogue.error.message);return;}
courses=catalogue.data||[];
$("mmCourses").innerHTML=courses.map(c=>'<label class="course-option"><input type="checkbox" value="'+esc(c.id)+'">'+esc(c.title)+'</label>').join("")||"No published courses.";
function reset(){current=null;$("mmHeading").textContent="New membership plan";$("mmForm").reset();$("mmPrice").value="9.99";$("mmCourses").querySelectorAll("input").forEach(x=>x.checked=false);$("mmSave").disabled=false;}
async function refresh(){
const result=await supabaseClient.from("membership_plans").select("id,name,description,monthly_price_pence,status").order("created_at",{ascending:false});
if(result.error){status("Run v21-1-membership-foundation.sql first: "+result.error.message);return;}
plans=result.data||[];
$("mmList").innerHTML=plans.map(p=>'<button class="plan" type="button" data-id="'+esc(p.id)+'">'+esc(p.name)+' · £'+(p.monthly_price_pence/100).toFixed(2)+'/month · '+esc(p.status)+'</button>').join("")||"<p>No plans yet.</p>";
}
$("mmNew").onclick=reset;
$("mmList").onclick=async e=>{
const button=e.target.closest("[data-id]");if(!button)return;
const p=plans.find(x=>x.id===button.dataset.id);if(!p)return;
current=p.id;$("mmHeading").textContent="Edit "+p.name;$("mmName").value=p.name;$("mmPrice").value=(p.monthly_price_pence/100).toFixed(2);$("mmDescription").value=p.description||"";
$("mmSave").disabled=p.status!=="draft";
const r=await supabaseClient.from("membership_plan_courses").select("course_id").eq("plan_id",p.id);
if(r.error){status(r.error.message);return;}
const included=new Set((r.data||[]).map(x=>x.course_id));
$("mmCourses").querySelectorAll("input").forEach(x=>x.checked=included.has(x.value));
status(p.status==="draft"?"Editing draft plan.":"Published plans are locked.");
};
$("mmForm").onsubmit=async e=>{
e.preventDefault();$("mmSave").disabled=true;status("Saving draft…");
try{
const pounds=Number($("mmPrice").value),pence=Math.round(pounds*100);
if(!Number.isFinite(pounds)||Math.abs(pounds*100-pence)>0.00001||pence<50||pence>10000000)throw Error("Enter a valid monthly price.");
const payload={name:$("mmName").value.trim(),description:$("mmDescription").value.trim(),monthly_price_pence:pence,currency:"gbp",status:"draft"};
let planId=current;
if(planId){
const r=await supabaseClient.from("membership_plans").update(payload).eq("id",planId).eq("status","draft").select("id").single();
if(r.error)throw r.error;
}else{
const r=await supabaseClient.from("membership_plans").insert(payload).select("id").single();
if(r.error)throw r.error;planId=r.data.id;
}
const existing=await supabaseClient.from("membership_plan_courses").select("course_id").eq("plan_id",planId);
if(existing.error)throw existing.error;
const selected=new Set([...$("mmCourses").querySelectorAll("input:checked")].map(x=>x.value));
const old=new Set((existing.data||[]).map(x=>x.course_id));
const removed=[...old].filter(id=>!selected.has(id));
const added=[...selected].filter(id=>!old.has(id));
if(removed.length){const r=await supabaseClient.from("membership_plan_courses").delete().eq("plan_id",planId).in("course_id",removed);if(r.error)throw r.error;}
if(added.length){const r=await supabaseClient.from("membership_plan_courses").insert(added.map(course_id=>({plan_id:planId,course_id})));if(r.error)throw r.error;}
current=planId;await refresh();status("Draft membership saved.");
}catch(err){status("Could not save: "+err.message);}finally{$("mmSave").disabled=false;}
};
reset();await refresh();status("Membership manager ready. Draft plans only.");
})();