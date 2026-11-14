(() => {
"use strict";
const $ = id => document.getElementById(id);
const msg = (text, error=false) => { $("message").textContent=text; $("message").className="status"+(error?" error":""); };
const escapeHTML = value => String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const client = typeof supabaseClient !== "undefined" ? supabaseClient : null;
let courses=[], collections=[], selected=new Set(), currentId=null, savedSlug=null;
const slugify = text => text.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
function drawCourses(){
 const query=$("courseSearch").value.trim().toLowerCase();
 const visible=courses.filter(c=>c.title.toLowerCase().includes(query));
 $("coursePicker").innerHTML=visible.map(c=>'<div class="course"><input type="checkbox" id="course-'+escapeHTML(c.id)+'" data-course="'+escapeHTML(c.id)+'" '+(selected.has(c.id)?"checked":"")+'><label for="course-'+escapeHTML(c.id)+'">'+escapeHTML(c.title)+'</label></div>').join("") || "<p>No matching courses.</p>";
 $("coursePicker").querySelectorAll("[data-course]").forEach(el=>el.addEventListener("change",()=>{if(el.checked)selected.add(el.dataset.course);else selected.delete(el.dataset.course);updateCount();}));
 updateCount();
}
function updateCount(){ $("selectedCount").textContent=selected.size+" courses selected"; }
function clearForm(){
 currentId=null;savedSlug=null;selected.clear();$("collectionForm").reset();$("price").value="9.99";$("formHeading").textContent="New collection";drawCourses();msg("Ready to create a draft collection.");
}
function drawCollections(){
 $("collectionList").innerHTML=collections.map(c=>'<button class="item" type="button" data-id="'+escapeHTML(c.id)+'"><strong>'+escapeHTML(c.title)+'</strong><small>'+escapeHTML(c.status)+' · £'+(c.price_pence/100).toFixed(2)+'</small></button>').join("") || "<p>No collections yet.</p>";
 $("collectionList").querySelectorAll("[data-id]").forEach(el=>el.addEventListener("click",()=>openCollection(el.dataset.id)));
}
async function openCollection(id){
 const c=collections.find(c=>c.id===id);if(!c)return;
 const {data,error}=await client.from("collection_courses").select("course_id").eq("collection_id",id);
 if(error){msg("Could not load included courses: "+error.message,true);return;}
 currentId=id;savedSlug=c.slug;selected=new Set((data||[]).map(x=>x.course_id));
 $("title").value=c.title;$("slug").value=c.slug;$("description").value=c.description||"";$("cover").value=c.cover_image_url||"";$("price").value=(c.price_pence/100).toFixed(2);
 $("formHeading").textContent="Edit: "+c.title;drawCourses();
 msg("Editing draft collection. Publishing is not enabled yet.");
}
async function reload(){
 const {data,error}=await client.from("course_collections").select("*").order("created_at",{ascending:false});
 if(error)throw error;collections=data||[];drawCollections();
}
async function start(){
 try{
 if(!client)throw Error("Supabase client unavailable. Check supabase-config.js.");
 const {data:{user},error:authError}=await client.auth.getUser();
 if(authError||!user)throw Error("Sign in to Kraken Admin first.");
 const {data:admin,error:adminError}=await client.from("admin_users").select("user_id").eq("user_id",user.id).maybeSingle();
 if(adminError||!admin)throw Error("Your account does not have Kraken administrator access.");
 const {data:courseRows,error:courseError}=await client.from("courses").select("id,title,status").order("title");
 if(courseError)throw courseError;
 courses=courseRows||[];await reload();$("workspace").hidden=false;drawCourses();msg("Administrator connected. Collections are draft-only.");
 }catch(error){msg(error.message||String(error),true);}
}
$("new").addEventListener("click",clearForm);
$("courseSearch").addEventListener("input",drawCourses);
$("title").addEventListener("input",()=>{if(!currentId&&!$("slug").dataset.edited)$("slug").value=slugify($("title").value);});
$("slug").addEventListener("input",()=>{$("slug").dataset.edited="1";});
$("collectionForm").addEventListener("submit",async e=>{
 e.preventDefault();const button=$("save");button.disabled=true;
 try{
 const amount=Math.round(Number($("price").value)*100);
 if(!Number.isSafeInteger(amount)||amount<50)throw Error("Enter a price of at least £0.50.");
 if(selected.size===0)throw Error("Select at least one course.");
 const slug=$("slug").value.trim();
 if(!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug))throw Error("Use lowercase letters, numbers and hyphens for the slug.");
 const payload={slug,title:$("title").value.trim(),description:$("description").value.trim(),cover_image_url:$("cover").value.trim()||null,price_pence:amount,currency:"gbp",status:"Draft",updated_at:new Date().toISOString()};
 if(!payload.title)throw Error("Enter a collection title.");
 if(currentId&&savedSlug!==slug)throw Error("Keep the original slug when editing an existing collection.");
 // Existing Stripe-linked collections must not be repriced by direct database editing.
 const existing=collections.find(c=>c.id===currentId);
 if(existing?.stripe_price_id&&existing.price_pence!==amount)throw Error("This collection already has a Stripe price. Price changes require a new Stripe price.");
 let id=currentId;
 if(id){
 const {error}=await client.from("course_collections").update(payload).eq("id",id);if(error)throw error;
 }else{
 const {data,error}=await client.from("course_collections").insert(payload).select("id").single();if(error)throw error;id=data.id;
 }
 // This editor is draft-only. It is safe to replace draft course mappings.
 const {error:deleteError}=await client.from("collection_courses").delete().eq("collection_id",id);
 if(deleteError)throw deleteError;
 const rows=[...selected].map((course_id,i)=>({collection_id:id,course_id,sort_order:i}));
 const {error:insertError}=await client.from("collection_courses").insert(rows);
 if(insertError)throw insertError;
 currentId=id;savedSlug=slug;await reload();msg("Draft collection saved with "+rows.length+" courses.");
 }catch(error){msg("Save failed: "+(error.message||error),true);}
 finally{button.disabled=false;}
});
start();
})();