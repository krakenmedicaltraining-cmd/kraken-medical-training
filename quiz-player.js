(() => {
let krakenQuiz={quiz:null,questions:[],attempt:null,answers:{},startedAt:null,passed:false};

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const qsafe=v=>typeof escapePlayerHtml==="function"?escapePlayerHtml(v):String(v??"");
async function waitForPlayer(){for(let i=0;i<100;i++){if(window.playerState?.bundle)return true;await sleep(80)}return false}
function shuffled(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

async function loadQuizData(){
  const cid=window.courseId||new URLSearchParams(location.search).get("id");
  if(!cid)return;
  const {data:quiz,error}=await supabaseClient.from("course_quizzes").select("*").eq("course_id",cid).eq("is_published",true).maybeSingle();
  if(error)throw error;if(!quiz)return;
  krakenQuiz.quiz=quiz;
  const {data:questions,error:qerr}=await supabaseClient.from("quiz_questions").select("*").eq("quiz_id",quiz.id).order("position");
  if(qerr)throw qerr;
  let qs=questions||[];if(quiz.shuffle_questions)qs=shuffled(qs);
  if(quiz.question_limit)qs=qs.slice(0,Number(quiz.question_limit));
  krakenQuiz.questions=qs;
  if(playerState.session){
    const {data}=await supabaseClient.from("quiz_attempts").select("*").eq("quiz_id",quiz.id).eq("user_id",playerState.session.user.id).eq("passed",true).limit(1);
    krakenQuiz.passed=Boolean(data?.length);
  }
}
function quizPanelHtml(){
  const q=krakenQuiz.quiz;if(!q)return "";
  return `<section class="player-panel" id="quizPanel">
    <div class="panel-heading"><div><span class="lesson-kicker">Knowledge check</span><h3>${qsafe(q.title||"Course quiz")}</h3></div><small>${krakenQuiz.questions.length} questions</small></div>
    <p class="panel-copy">Pass mark: ${Number(q.pass_mark||80)}%${q.time_limit_minutes?` · ${q.time_limit_minutes} minute limit`:""}${q.max_attempts?` · ${q.max_attempts} attempts`:""}</p>
    <div id="quizBody">${krakenQuiz.passed?passedHtml():`<button class="player-button" id="startQuiz">Start quiz</button>`}</div>
  </section>`;
}
function passedHtml(){return `<div class="quiz-result passed"><strong>Quiz passed ✓</strong><p>You have met the assessment requirement for this course.</p><button class="player-button secondary" id="retakeQuiz">Retake for practice</button></div>`}
function renderQuestions(){
  const body=document.querySelector("#quizBody");if(!body)return;
  krakenQuiz.answers={};krakenQuiz.startedAt=Date.now();
  body.innerHTML=`<form id="learnerQuizForm" class="learner-quiz">
    <div class="quiz-timer" id="quizTimer"></div>
    ${krakenQuiz.questions.map((q,i)=>{
      let opts=(q.options||[]).map((text,index)=>({text,index}));
      if(krakenQuiz.quiz.shuffle_answers)opts=shuffled(opts);
      return `<fieldset class="quiz-question"><legend><span>${i+1}</span>${q.scenario?`<small>${qsafe(q.scenario)}</small>`:""}${qsafe(q.question)}</legend>
        <div class="quiz-options">${opts.map(o=>`<label><input type="radio" name="q-${q.id}" value="${o.index}" required><span>${qsafe(o.text)}</span></label>`).join("")}</div>
      </fieldset>`}).join("")}
    <button class="player-button" type="submit">Submit answers</button>
  </form>`;
  document.querySelector("#learnerQuizForm").onsubmit=e=>{e.preventDefault();submitAttempt()};
  startTimer();
}
let timerId=null;
function startTimer(){
  clearInterval(timerId);const limit=Number(krakenQuiz.quiz.time_limit_minutes||0)*60;if(!limit){document.querySelector("#quizTimer").textContent="Untimed assessment";return}
  const tick=()=>{const elapsed=Math.floor((Date.now()-krakenQuiz.startedAt)/1000),left=Math.max(0,limit-elapsed);document.querySelector("#quizTimer").textContent=`Time remaining ${Math.floor(left/60)}:${String(left%60).padStart(2,"0")}`;if(!left){clearInterval(timerId);submitAttempt(true)}};tick();timerId=setInterval(tick,1000);
}
async function submitAttempt(timedOut=false){
  clearInterval(timerId);
  if(!playerState.session){localStorage.setItem("kmtReturnTo",location.pathname+location.search);location.href="student-login.html";return}
  const form=document.querySelector("#learnerQuizForm");if(!form)return;
  let earned=0,total=0;const response={};
  for(const q of krakenQuiz.questions){
    total+=Number(q.points||1);
    const chosen=form.querySelector(`input[name="q-${CSS.escape(String(q.id))}"]:checked`);
    const answer=chosen?Number(chosen.value):null;response[q.id]=answer;
    if(answer===Number(q.correct_index))earned+=Number(q.points||1);
  }
  const score=total?Math.round(earned/total*100):0,passed=score>=Number(krakenQuiz.quiz.pass_mark||80);
  const {error}=await supabaseClient.from("quiz_attempts").insert({
    quiz_id:krakenQuiz.quiz.id,course_id:playerState.bundle.course.id,user_id:playerState.session.user.id,
    score,passed,answers:response,started_at:new Date(krakenQuiz.startedAt).toISOString(),completed_at:new Date().toISOString(),timed_out:timedOut
  });
  if(error){alert(`Result could not be saved: ${error.message}`);return}
  krakenQuiz.passed=passed;renderResult(score,passed,response);applyQuizGate();
}
function renderResult(score,passed,response){
  const body=document.querySelector("#quizBody");
  body.innerHTML=`<div class="quiz-result ${passed?"passed":"failed"}"><strong>${passed?"Quiz passed ✓":"Not passed yet"}</strong><span class="quiz-score">${score}%</span><p>${passed?"Assessment requirement complete.":"Review the feedback and try again when ready."}</p></div>
    <div class="quiz-review">${krakenQuiz.questions.map((q,i)=>{const correct=response[q.id]===Number(q.correct_index);return `<article class="${correct?"correct":"incorrect"}"><h4>${i+1}. ${qsafe(q.question)}</h4><p>${correct?"Correct":"Incorrect"} · Correct answer: ${qsafe((q.options||[])[q.correct_index]||"")}</p>${krakenQuiz.quiz.show_feedback&&q.explanation?`<small>${qsafe(q.explanation)}</small>`:""}</article>`}).join("")}</div>
    <button class="player-button secondary" id="retakeQuiz">${passed?"Retake for practice":"Try again"}</button>`;
  document.querySelector("#retakeQuiz").onclick=renderQuestions;
}
function applyQuizGate(){
  const cert=document.querySelector("#certificatePanel"),btn=document.querySelector("#certificateAction");
  const lessonPercent=playerState.bundle.lessons.length?Math.round(playerState.completed.size/playerState.bundle.lessons.length*100):0;
  const required=krakenQuiz.quiz?.required_for_completion!==false;
  const unlocked=lessonPercent===100&&(!required||krakenQuiz.passed);
  if(cert)cert.classList.toggle("locked-panel",!unlocked);
  if(btn){btn.textContent=unlocked?"View certificate":lessonPercent<100?"Complete all lessons":"Pass the course quiz";btn.href=unlocked?"certificate.html":"#"}
}
async function initQuiz(){
  if(!await waitForPlayer())return;
  try{
    await loadQuizData();if(!krakenQuiz.quiz)return;
    const cert=document.querySelector("#certificatePanel");
    cert?.insertAdjacentHTML("beforebegin",quizPanelHtml());
    document.querySelector("#startQuiz")?.addEventListener("click",renderQuestions);
    document.querySelector("#retakeQuiz")?.addEventListener("click",renderQuestions);
    applyQuizGate();
    const original=window.updateProgressDisplay;
    if(typeof original==="function")window.updateProgressDisplay=function(){original();applyQuizGate()}
  }catch(e){console.error("Quiz engine:",e)}
}
document.addEventListener("DOMContentLoaded",initQuiz);
})();