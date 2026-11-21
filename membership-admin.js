(async()=>{
const $=id=>document.getElementById(id),esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let current=null,plans=[];
const status=msg=>{$("mmStatus").textContent=msg;};
const auth=await supabaseClient.auth.getUser();
if(!auth.data?.user){location.href="student-login.html";return;}
const admin=await supabaseClient.from("admin_users").select("user_id").eq("user_id",auth.data.user.id).maybeSingle();
if(admin.error||!admin.data){status("Administrator access required.");return;}
$("mmContent").hidden=false;
function reset(){current=null;$("mmHeading").textContent="New membership plan";$("mmForm").reset();$("mmPrice").value="9.99";$("mmSave").disabled=false;}
async function refresh(){
const result=await supabaseClient.from("membership_plans").select("id,name,description,monthly_price_pence,status").order("created_at",{ascending:false});
if(result.error){status("Run v21-1-membership-foundation.sql first: "+result.error.message);return;}
plans=result.data||[];
if(plans.length && !current) current=plans[0].id;
$("mmList").innerHTML=plans.map(p=>'<button class="plan" type="button" data-id="'+esc(p.id)+'">'+esc(p.name)+' · £'+(p.monthly_price_pence/100).toFixed(2)+'/month · '+esc(p.status)+'</button>').join("")||"<p>No plans yet.</p>";
}

$("mmList").onclick=async e=>{
const button=e.target.closest("[data-id]");if(!button)return;
const p=plans.find(x=>x.id===button.dataset.id);if(!p)return;
current=p.id;$("mmHeading").textContent="Edit "+p.name;$("mmName").value=p.name;$("mmPrice").value=(p.monthly_price_pence/100).toFixed(2);$("mmDescription").value=p.description||"";
$("mmSave").disabled=false;
$("mmPrice").disabled=p.status!=="draft";
const r=await supabaseClient.from("membership_plan_courses").select("course_id").eq("plan_id",p.id);
if(r.error){status(r.error.message);return;}

status(p.status==="draft"?"Editing draft plan.":"Active plan: name and description can be edited. Price changes require a new Stripe price.");
};
$("mmForm").onsubmit=async e=>{
e.preventDefault();$("mmSave").disabled=true;status("Saving draft…");
try{
const pounds=Number($("mmPrice").value),pence=Math.round(pounds*100);
if(!Number.isFinite(pounds)||Math.abs(pounds*100-pence)>0.00001||pence<50||pence>10000000)throw Error("Enter a valid monthly price.");
const payload={name:$("mmName").value.trim(),description:$("mmDescription").value.trim(),monthly_price_pence:pence,currency:"gbp",status:"draft"};
let planId=current;
if(planId && plans.find(p=>p.id===planId)?.status==="active"){
const r=await supabaseClient.rpc("kraken_rename_active_membership",{p_plan_id:planId,p_name:payload.name,p_description:payload.description});
if(r.error)throw r.error;
}else if(planId){
const r=await supabaseClient.from("membership_plans").update(payload).eq("id",planId).eq("status","draft").select("id").single();
if(r.error)throw r.error;
}else{
if(plans.length) throw Error("Only one membership plan is supported. Edit the existing plan.");
const r=await supabaseClient.from("membership_plans").insert(payload).select("id").single();
if(r.error)throw r.error;planId=r.data.id;
}
current=planId;await refresh();status("Membership details saved.");
}catch(err){status("Could not save: "+err.message);}finally{$("mmSave").disabled=false;}
};
$("mmActivate").onclick=async()=>{
if(!current){status("Save your membership draft first.");return;}
if(!confirm("Create a monthly recurring Stripe TEST price and activate this membership?"))return;
$("mmActivate").disabled=true;status("Connecting Stripe test price…");
try{
const auth=await supabaseClient.auth.getSession();
const response=await fetch("https://kraken-payments.krakenmedicaltraining.workers.dev/api/admin/configure-membership",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+auth.data.session.access_token},body:"{}"});
const body=await response.json();if(!response.ok)throw Error(body.error||"Unable to activate");
await refresh();status("Stripe test membership activated.");
}catch(e){status(e.message);}finally{$("mmActivate").disabled=false;}
};
await refresh();if(plans.length){$("mmList").querySelector("[data-id]")?.click();}else{reset();}status("Membership manager ready.");
})();