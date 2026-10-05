const code=new URLSearchParams(location.search).get("code");
(async()=>{
 const h=$("#verifyHost");
 if(!code)return h.innerHTML="<h1>No certificate code supplied</h1>";
 try{
   let c=await verifyCertificate(code);
   if(!c){
     const r=await supabaseClient.from("manual_certificates").select("*").eq("certificate_code",code).maybeSingle();
     if(r.error)throw r.error;
     c=r.data;
   }
   if(c?.revoked||c?.status==="revoked"){
     h.innerHTML='<div class="notice"><strong>Certificate revoked</strong><p>'+escapeHtml(c.revoked_reason||"This credential is no longer valid.")+"</p></div>";
     return;
   }
   if(!c)return h.innerHTML="<h1>Certificate not found</h1>";
   const completed=c.training_date||c.issued_at;
   const d=new Date(completed).toLocaleDateString("en-GB");
   const expired=c.expires_at&&new Date(c.expires_at+"T23:59:59")<new Date();
   const expiry=c.expires_at?new Date(c.expires_at+"T12:00:00").toLocaleDateString("en-GB"):null;
   h.innerHTML='<span class="eyebrow">'+(expired?"Certificate expired":"Certificate valid")+'</span><h1>'+(expired?"Expired":"Verified ✓")+'</h1><div class="verify-grid"><p><strong>Learner</strong><br>'+escapeHtml(c.learner_name)+'</p><p><strong>Course</strong><br>'+escapeHtml(c.course_title)+'</p><p><strong>Completed</strong><br>'+d+'</p>'+(c.instructor_name?'<p><strong>Instructor</strong><br>'+escapeHtml(c.instructor_name)+'</p>':"")+(expiry?'<p><strong>Expiry</strong><br>'+expiry+'</p>':"")+(c.final_score!==null&&c.final_score!==undefined?'<p><strong>Score</strong><br>'+c.final_score+'%</p>':"")+'<p><strong>Number</strong><br>'+escapeHtml(c.certificate_code)+'</p></div>';
 }catch(e){h.innerHTML='<h1>Verification error</h1><p>'+escapeHtml(e.message)+"</p>"}
})();