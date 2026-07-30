(() => {
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const uid=()=>crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`;
let courses=[], quiz=null, questions=[], activeCourseId=new URLSearchParams(location.search).get("course")||"";

function blankQuestion(type="multiple_choice"){return {client_id:uid(),type,question:"",scenario:"",options:["","","",""],correct_index:0,explanation:"",points:1};}
function setState(text){$("#saveState").textContent=text;$("#mobileState").textContent=text}
function currentCourse(){return courses.find(c=>c.id===activeCourseId)}
function renderCourseSelect(){
  $("#courseSelect").innerHTML='<option value="">Choose a course</option>'+courses.map(c=>`<option value="${esc(c.id)}" ${c.id===activeCourseId?"selected":""}>${esc(c.title)}</option>`).join("");
}
function renderSummary(){
  const c=currentCourse();
  $("#quizHeading").textContent=c?`${c.title} quiz`:"Course quiz";
  $("#quizSummary").innerHTML=c?`<strong>${esc(c.title)}</strong><br>${questions.length} question${questions.length===1?"":"s"} · Pass mark ${$("#passMark").value||80}%`:"Choose a course to begin.";
  $("#previewCourse").href=c?`course.html?id=${encodeURIComponent(c.id)}`:"courses.html";
}
function questionHtml(q,i){
  const tf=q.type==="true_false";
  const options=tf?["True","False"]:q.options||["","","",""];
  return `<article class="qa-question" data-i="${i}">
    <div class="qa-question-top"><span class="qa-num">${i+1}</span><strong>${esc(q.question||"Untitled question")}</strong>
      <div class="qa-mini"><button type="button" data-up="${i}">↑</button><button type="button" data-down="${i}">↓</button><button type="button" data-copy="${i}">⧉</button><button type="button" data-remove="${i}">×</button></div>
    </div>
    <div class="qa-question-body">
      <div class="qa-grid-2">
        <label class="qa-field"><span>Question type</span><select data-key="type">
          <option value="multiple_choice" ${q.type==="multiple_choice"?"selected":""}>Multiple choice</option>
          <option value="true_false" ${q.type==="true_false"?"selected":""}>True / false</option>
          <option value="scenario" ${q.type==="scenario"?"selected":""}>Scenario question</option>
        </select></label>
        <label class="qa-field"><span>Points</span><input data-key="points" type="number" min="1" value="${Number(q.points||1)}"></label>
      </div>
      ${q.type==="scenario"?`<label class="qa-field"><span>Scenario</span><textarea data-key="scenario" placeholder="Describe the clinical situation">${esc(q.scenario)}</textarea></label>`:""}
      <label class="qa-field"><span>Question</span><textarea data-key="question" required placeholder="What should the learner decide?">${esc(q.question)}</textarea></label>
      <div class="qa-option-grid">${options.map((o,oi)=>`<label class="qa-option"><input type="radio" name="correct-${i}" data-correct="${oi}" ${Number(q.correct_index)===oi?"checked":""}><input type="text" data-option="${oi}" value="${esc(o)}" ${tf?"readonly":""} placeholder="Answer ${oi+1}"></label>`).join("")}</div>
      <label class="qa-field" style="margin-top:14px"><span>Explanation and teaching feedback</span><textarea data-key="explanation" placeholder="Explain why the answer is correct">${esc(q.explanation)}</textarea></label>
    </div>
  </article>`;
}
function renderQuestions(){
  $("#questionList").innerHTML=questions.map(questionHtml).join("");
  $("#emptyQuestions").hidden=questions.length>0;
  $$(".qa-question").forEach(card=>{
    const i=+card.dataset.i;
    $$("[data-key]",card).forEach(el=>el.oninput=()=>{
      questions[i][el.dataset.key]=el.type==="number"?Number(el.value):el.value;
      if(el.dataset.key==="type"){
        if(el.value==="true_false"){questions[i].options=["True","False"];questions[i].correct_index=0}
        else if(questions[i].options.length<4)questions[i].options=["","","",""];
        renderQuestions();
      } else {
        card.querySelector(".qa-question-top strong").textContent=questions[i].question||"Untitled question";
      }
      setState("Unsaved changes");
    });
    $$("[data-option]",card).forEach(el=>el.oninput=()=>{questions[i].options[+el.dataset.option]=el.value;setState("Unsaved changes")});
    $$("[data-correct]",card).forEach(el=>el.onchange=()=>{if(el.checked)questions[i].correct_index=+el.dataset.correct;setState("Unsaved changes")});
  });
  $$("[data-up]").forEach(b=>b.onclick=()=>move(+b.dataset.up,-1));
  $$("[data-down]").forEach(b=>b.onclick=()=>move(+b.dataset.down,1));
  $$("[data-copy]").forEach(b=>b.onclick=()=>{const q=structuredClone(questions[+b.dataset.copy]);q.client_id=uid();q.id=undefined;questions.splice(+b.dataset.copy+1,0,q);renderQuestions();setState("Unsaved changes")});
  $$("[data-remove]").forEach(b=>b.onclick=()=>{if(confirm("Delete this question?")){questions.splice(+b.dataset.remove,1);renderQuestions();setState("Unsaved changes")}});
  renderSummary();
}
function move(i,d){const n=i+d;if(n<0||n>=questions.length)return;[questions[i],questions[n]]=[questions[n],questions[i]];renderQuestions();setState("Unsaved changes")}
function resetQuiz(){
  quiz=null;questions=[];$("#quizForm").reset();$("#passMark").value=80;$("#shuffleQuestions").checked=true;$("#shuffleAnswers").checked=true;$("#showFeedback").checked=true;$("#requireQuiz").checked=true;renderQuestions();setState("Not saved");
}
async function loadQuiz(){
  resetQuiz();if(!activeCourseId)return;
  const {data,error}=await supabaseClient.from("course_quizzes").select("*").eq("course_id",activeCourseId).maybeSingle();
  if(error)throw error;
  quiz=data;
  if(quiz){
    $("#quizTitle").value=quiz.title||"Course assessment";$("#passMark").value=quiz.pass_mark??80;
    $("#maxAttempts").value=quiz.max_attempts??"";$("#timeLimit").value=quiz.time_limit_minutes??"";$("#questionLimit").value=quiz.question_limit??"";
    $("#shuffleQuestions").checked=quiz.shuffle_questions!==false;$("#shuffleAnswers").checked=quiz.shuffle_answers!==false;
    $("#showFeedback").checked=quiz.show_feedback!==false;$("#requireQuiz").checked=quiz.required_for_completion!==false;
    const qres=await supabaseClient.from("quiz_questions").select("*").eq("quiz_id",quiz.id).order("position");
    if(qres.error)throw qres.error;
    questions=(qres.data||[]).map(q=>({...q,client_id:uid(),options:Array.isArray(q.options)?q.options:[]}));
  }
  renderQuestions();setState(quiz?"Quiz loaded":"New quiz");
}
function payload(){return {course_id:activeCourseId,title:$("#quizTitle").value.trim()||"Course assessment",pass_mark:Number($("#passMark").value||80),max_attempts:$("#maxAttempts").value?Number($("#maxAttempts").value):null,time_limit_minutes:$("#timeLimit").value?Number($("#timeLimit").value):null,question_limit:$("#questionLimit").value?Number($("#questionLimit").value):null,shuffle_questions:$("#shuffleQuestions").checked,shuffle_answers:$("#shuffleAnswers").checked,show_feedback:$("#showFeedback").checked,required_for_completion:$("#requireQuiz").checked,is_published:true}}
async function saveQuiz(){
  if(!activeCourseId)return alert("Choose a course first.");
  if(!questions.length)return alert("Add at least one question.");
  if(questions.some(q=>!q.question.trim()))return alert("Every question needs question text.");
  setState("Saving…");
  const p=payload();let saved;
  if(quiz?.id){const r=await supabaseClient.from("course_quizzes").update(p).eq("id",quiz.id).select().single();if(r.error)throw r.error;saved=r.data}
  else{const r=await supabaseClient.from("course_quizzes").insert(p).select().single();if(r.error)throw r.error;saved=r.data}
  quiz=saved;
  const del=await supabaseClient.from("quiz_questions").delete().eq("quiz_id",quiz.id);if(del.error)throw del.error;
  const rows=questions.map((q,i)=>({quiz_id:quiz.id,position:i+1,type:q.type,scenario:q.scenario||null,question:q.question,options:q.type==="true_false"?["True","False"]:q.options,correct_index:Number(q.correct_index||0),explanation:q.explanation||null,points:Number(q.points||1)}));
  const ins=await supabaseClient.from("quiz_questions").insert(rows).select();if(ins.error)throw ins.error;
  questions=ins.data.map(q=>({...q,client_id:uid()}));
  await supabaseClient.from("courses").update({quiz_enabled:true,pass_mark:p.pass_mark,max_quiz_attempts:p.max_attempts,quiz_time_limit:p.time_limit_minutes}).eq("id",activeCourseId);
  renderQuestions();setState("Quiz saved");showToast("Quiz saved");
}
async function deleteQuiz(){
  if(!quiz?.id)return;if(!confirm("Delete this entire quiz and its questions?"))return;
  const r=await supabaseClient.from("course_quizzes").delete().eq("id",quiz.id);if(r.error)throw r.error;
  await supabaseClient.from("courses").update({quiz_enabled:false}).eq("id",activeCourseId);
  resetQuiz();showToast("Quiz deleted");
}
async function duplicateQuiz(){
  if(!quiz)return alert("Save the quiz first.");
  const title=prompt("Name for the duplicated quiz",`${$("#quizTitle").value} copy`);if(!title)return;
  quiz=null;$("#quizTitle").value=title;questions=questions.map(q=>({...structuredClone(q),id:undefined,client_id:uid()}));setState("Duplicated, not saved");
}
$("#addQuestion").onclick=()=>{questions.push(blankQuestion());renderQuestions();setState("Unsaved changes")};
$("#courseSelect").onchange=async e=>{activeCourseId=e.target.value;history.replaceState(null,"",activeCourseId?`?course=${encodeURIComponent(activeCourseId)}`:"quiz-admin.html");await loadQuiz()};
$("#quizForm").onsubmit=e=>{e.preventDefault();saveQuiz().catch(err=>{console.error(err);alert(`Could not save quiz: ${err.message}`);setState("Save failed")})};
$("#mobileSave").onclick=()=>$("#quizForm").requestSubmit();
$("#deleteQuiz").onclick=()=>deleteQuiz().catch(err=>alert(err.message));
$("#duplicateQuiz").onclick=duplicateQuiz;
$("#signOut").onclick=async()=>{await supabaseClient.auth.signOut();location.href="login.html"};
$("#quizForm").addEventListener("input",()=>setState("Unsaved changes"));
(async()=>{try{const session=await requireAdmin();if(!session)return;courses=await getAllCoursesOnline();renderCourseSelect();if(activeCourseId&&!courses.some(c=>c.id===activeCourseId))activeCourseId="";await loadQuiz()}catch(e){console.error(e);alert(`Quiz builder could not start: ${e.message}`)}})();
})();