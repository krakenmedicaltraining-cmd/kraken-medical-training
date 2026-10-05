(() => {
  const $ = (s,r=document)=>r.querySelector(s);
  const esc = v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random();
  let parsed=null;

  function csv(text){
    const rows=[]; let row=[],cell="",q=false;
    for(let i=0;i<text.length;i++){const ch=text[i],n=text[i+1];
      if(ch==='"'&&q&&n==='"'){cell+='"';i++}
      else if(ch==='"'){q=!q}
      else if(ch===","&&!q){row.push(cell);cell=""}
      else if((ch==="\n"||ch==="\r")&&!q){if(ch==="\r"&&n==="\n")i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell=""}
      else cell+=ch;
    }
    row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
    const headers=(rows.shift()||[]).map(x=>x.trim().toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,""));
    return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,(r[i]||"").trim()])));
  }
  const bool=v=>/^(1|true|yes|y)$/i.test(v||"");
  const list=v=>String(v||"").split("|").map(x=>x.trim()).filter(Boolean);
  function build(rows){
    if(!rows.length)throw new Error("The CSV has no course rows.");
    const first=rows[0], lessonsMap=new Map(), warnings=[];
    rows.forEach((r,i)=>{
      const title=r.lesson_title||r.lesson;
      if(!title){warnings.push("Row "+(i+2)+": no lesson title, row skipped.");return}
      if(!lessonsMap.has(title))lessonsMap.set(title,{client_id:uid(),title,summary:r.lesson_summary||"",estimated_minutes:Number(r.lesson_minutes||5),is_preview:bool(r.free_preview),blocks:[]});
      const lesson=lessonsMap.get(title),type=(r.block_type||"text").toLowerCase();
      if(!r.block_content&&!r.content&&!r.block_url&&!r.url&&!r.question)return;
      const b={client_id:uid(),type,title:r.block_title||r.question_title||"",content:r.block_content||r.content||"",url:r.block_url||r.url||"",caption:r.caption||"",button_text:r.button_text||"Open resource"};
      if(type==="question"){b.title=b.title||"Knowledge check";b.question_type=r.question_type||"multiple_choice";b.question=r.question||r.block_content||"";b.options=list(r.answers||r.options);b.explanation=r.explanation||"";const correct=list(r.correct_answer||r.correct_answers);b.correct_values=correct.map(x=>{const idx=b.options.findIndex(o=>o.toLowerCase()===x.toLowerCase());return String(idx>=0?idx:Math.max(0,Number(x)-1))});b.accepted_answers=correct;b.correct_order=list(r.correct_order)}
      lesson.blocks.push(b);
    });
    const course={title:first.course_title||first.course||"",subtitle:first.course_subtitle||"",description:first.course_description||first.description||"",category:first.category||"Clinical skills",difficulty:first.difficulty||"All levels",estimated_time:first.estimated_time||"",instructor:first.instructor||"Kraken Medical Training",thumbnail_url:first.thumbnail_url||"",banner_url:first.banner_url||"",icon:first.icon||"",status:first.status||"Draft",xp_reward:Number(first.xp_reward||200),pass_mark:Number(first.pass_mark||80)};
    if(!course.title)warnings.push("Course title is missing.");
    if(!course.description)warnings.push("Course description is missing.");
    return {course,lessons:[...lessonsMap.values()],warnings};
  }
  function set(id,v){const e=$(id);if(e)e.value=v??""}
  function apply(){
    if(!parsed)return; const c=parsed.course;
    set("#courseTitle",c.title);set("#courseSubtitle",c.subtitle);set("#courseDescription",c.description);set("#courseCategory",c.category);set("#courseDifficulty",c.difficulty);set("#courseEstimatedTime",c.estimated_time);set("#courseInstructor",c.instructor);set("#courseThumbnail",c.thumbnail_url);set("#courseBanner",c.banner_url);set("#courseIcon",c.icon);set("#courseStatus",c.status);set("#courseXp",c.xp_reward);set("#coursePassMark",c.pass_mark);
    window.krakenImportLessons?.(parsed.lessons);
    $("#csvImportDialog").close();
    document.querySelector('[data-tab="details"]')?.click();
  }
  function preview(){
    const p=$("#csvImportPreview"); if(!parsed){p.innerHTML="";return}
    const blocks=parsed.lessons.reduce((n,l)=>n+l.blocks.length,0),checks=parsed.lessons.reduce((n,l)=>n+l.blocks.filter(b=>b.type==="question").length,0);
    p.innerHTML='<div class="csv-summary"><strong>'+esc(parsed.course.title||"Untitled course")+'</strong><span>'+parsed.lessons.length+' lessons</span><span>'+blocks+' blocks</span><span>'+checks+' knowledge checks</span></div>'+(parsed.warnings.length?'<div class="csv-warnings"><strong>Check before importing:</strong><ul>'+parsed.warnings.map(w=>'<li>'+esc(w)+'</li>').join("")+'</ul></div>':'<div class="csv-ok">✓ CSV looks ready to import.</div>');
    $("#confirmCsvImport").disabled=!parsed.course.title||!parsed.lessons.length;
  }
  function template(){
    const content='course_title,course_subtitle,course_description,category,difficulty,estimated_time,instructor,status,xp_reward,pass_mark,lesson_title,lesson_summary,lesson_minutes,free_preview,block_type,block_title,block_content,block_url,question_type,question,answers,correct_answer,explanation\nAdult Basic Life Support,BLS Essentials,Learn the core adult BLS sequence,Resuscitation,Beginner,45 minutes,Kraken Medical Training,Draft,200,80,Introduction,Welcome to BLS,5,true,text,What is BLS?,Basic Life Support covers recognition CPR and AED use,,,,,\nAdult Basic Life Support,BLS Essentials,Learn the core adult BLS sequence,Resuscitation,Beginner,45 minutes,Kraken Medical Training,Draft,200,80,DR ABC,Initial assessment,8,false,question,Quick check,,,multiple_choice,What should you check first?,Danger|Response|Airway|Breathing,Danger,Always make sure the scene is safe first.';
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([content],{type:"text/csv"}));a.download="kraken-course-import-template.csv";a.click();URL.revokeObjectURL(a.href);
  }
  document.addEventListener("DOMContentLoaded",()=>{
    $("#importCsvButton")?.addEventListener("click",()=>$("#csvImportDialog").showModal());
    $("#closeCsvImport")?.addEventListener("click",()=>$("#csvImportDialog").close());
    $("#downloadCsvTemplate")?.addEventListener("click",template);
    $("#confirmCsvImport")?.addEventListener("click",apply);
    $("#csvCourseFile")?.addEventListener("change",async e=>{try{parsed=build(csv(await e.target.files[0].text()));preview()}catch(err){parsed=null;$("#csvImportPreview").innerHTML='<div class="csv-warnings">'+esc(err.message)+'</div>'}});
  });
})();