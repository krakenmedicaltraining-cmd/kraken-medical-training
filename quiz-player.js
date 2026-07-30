"use strict";

(() => {
  const quizState = {
    quiz: null,
    questions: [],
    startedAt: null,
    passed: false,
    bestScore: null,
    attemptCount: 0,
    timerId: null
  };

  const sleep = milliseconds =>
    new Promise(resolve => setTimeout(resolve, milliseconds));

  const safe = value =>
    typeof escapePlayerHtml === "function"
      ? escapePlayerHtml(value)
      : String(value ?? "");

  function getPlayerState() {
    return window.playerState || null;
  }

  function getCourseId() {
    return window.courseId ||
      new URLSearchParams(window.location.search).get("id");
  }

  async function waitForCoursePlayer() {
    for (let attempt = 0; attempt < 150; attempt += 1) {
      const state = getPlayerState();

      if (state?.bundle) {
        return state;
      }

      await sleep(100);
    }

    console.error("Quiz engine timed out while waiting for the course player.");
    return null;
  }

  function shuffled(items) {
    const copy = [...items];

    for (let index = copy.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[randomIndex]] =
        [copy[randomIndex], copy[index]];
    }

    return copy;
  }

  function currentLessonPercent() {
    const state = getPlayerState();
    const lessons = state?.bundle?.lessons || [];

    if (!lessons.length) return 100;

    const validIds = new Set(lessons.map(lesson => String(lesson.id)));
    const completed = [...state.completed]
      .filter(id => validIds.has(String(id))).length;

    return Math.max(
      0,
      Math.min(100, Math.round((completed / lessons.length) * 100))
    );
  }

  async function loadQuiz() {
    const courseId = getCourseId();
    const state = getPlayerState();

    if (!courseId || !state) return;

    const quizResult = await supabaseClient
      .from("course_quizzes")
      .select("*")
      .eq("course_id", courseId)
      .eq("is_published", true)
      .maybeSingle();

    if (quizResult.error) throw quizResult.error;
    if (!quizResult.data) return;

    quizState.quiz = quizResult.data;

    const questionResult = await supabaseClient
      .from("quiz_questions")
      .select("*")
      .eq("quiz_id", quizState.quiz.id)
      .order("position");

    if (questionResult.error) throw questionResult.error;

    let questions = questionResult.data || [];

    if (quizState.quiz.shuffle_questions) {
      questions = shuffled(questions);
    }

    if (quizState.quiz.question_limit) {
      questions = questions.slice(
        0,
        Number(quizState.quiz.question_limit)
      );
    }

    quizState.questions = questions;

    if (state.session) {
      const attemptResult = await supabaseClient
        .from("quiz_attempts")
        .select("score, passed, completed_at")
        .eq("quiz_id", quizState.quiz.id)
        .eq("user_id", state.session.user.id)
        .order("completed_at", { ascending: false });

      if (attemptResult.error) throw attemptResult.error;

      const attempts = attemptResult.data || [];
      quizState.attemptCount = attempts.length;
      quizState.passed = attempts.some(attempt => attempt.passed);
      quizState.bestScore = attempts.length
        ? Math.max(...attempts.map(attempt => Number(attempt.score || 0)))
        : null;
    }
  }

  function quizPanelHtml() {
    const quiz = quizState.quiz;

    if (!quiz) return "";

    const attemptsText = quiz.max_attempts
      ? `${quizState.attemptCount}/${quiz.max_attempts} attempts used`
      : `${quizState.attemptCount} attempts`;

    return `
      <section class="player-panel" id="quizPanel">
        <div class="panel-heading">
          <div>
            <span class="lesson-kicker">Final assessment</span>
            <h3>${safe(quiz.title || "End-of-course quiz")}</h3>
          </div>
          <small>${quizState.questions.length} questions</small>
        </div>

        <p class="panel-copy">
          Pass mark: ${Number(quiz.pass_mark || 80)}%
          ${quiz.time_limit_minutes
            ? ` · ${Number(quiz.time_limit_minutes)} minute limit`
            : " · Untimed"}
          · ${attemptsText}
        </p>

        <div id="quizBody">
          ${initialQuizBody()}
        </div>
      </section>
    `;
  }

  function initialQuizBody() {
    if (quizState.passed) {
      return passedHtml();
    }

    if (!quizState.questions.length) {
      return `
        <div class="empty-inline">
          This quiz has no questions yet.
        </div>
      `;
    }

    if (attemptLimitReached()) {
      return `
        <div class="quiz-result failed">
          <strong>No attempts remaining</strong>
          <p>Please contact an instructor to reset your quiz attempts.</p>
        </div>
      `;
    }

    const lessonPercent = currentLessonPercent();

    if (lessonPercent < 100) {
      return `
        <div class="quiz-result failed">
          <strong>Complete the course first</strong>
          <p>Finish every lesson to unlock the final quiz.</p>
        </div>
      `;
    }

    return `
      <button class="player-button" id="startQuiz">
        Start final quiz
      </button>
    `;
  }

  function passedHtml() {
    return `
      <div class="quiz-result passed">
        <strong>Quiz passed ✓</strong>
        ${quizState.bestScore !== null
          ? `<span class="quiz-score">${quizState.bestScore}%</span>`
          : ""}
        <p>
          Your course is complete and your certificate has been issued.
        </p>
        <div class="quiz-result-actions">
          <a class="player-button"
             href="certificate.html?course=${encodeURIComponent(getCourseId())}">
            View certificate
          </a>
          <button class="player-button secondary"
                  id="retakeQuiz"
                  type="button">
            Retake for practice
          </button>
        </div>
      </div>
    `;
  }

  function attemptLimitReached() {
    const limit = Number(quizState.quiz?.max_attempts || 0);
    return limit > 0 && quizState.attemptCount >= limit && !quizState.passed;
  }

  function bindQuizButtons() {
    document.querySelector("#startQuiz")
      ?.addEventListener("click", renderQuestions);

    document.querySelector("#retakeQuiz")
      ?.addEventListener("click", renderQuestions);
  }

  function renderQuestions() {
    if (attemptLimitReached()) {
      refreshQuizBody();
      return;
    }

    const body = document.querySelector("#quizBody");
    if (!body) return;

    quizState.startedAt = Date.now();

    body.innerHTML = `
      <form id="learnerQuizForm" class="learner-quiz">
        <div class="quiz-timer" id="quizTimer"></div>

        ${quizState.questions.map((question, index) => {
          let options = (question.options || []).map(
            (text, originalIndex) => ({
              text,
              originalIndex
            })
          );

          if (quizState.quiz.shuffle_answers) {
            options = shuffled(options);
          }

          return `
            <fieldset class="quiz-question">
              <legend>
                <span>${index + 1}</span>
                ${question.scenario
                  ? `<small>${safe(question.scenario)}</small>`
                  : ""}
                ${safe(question.question)}
              </legend>

              <div class="quiz-options">
                ${options.map(option => `
                  <label>
                    <input
                      type="radio"
                      name="q-${safe(question.id)}"
                      value="${option.originalIndex}"
                      required
                    >
                    <span>${safe(option.text)}</span>
                  </label>
                `).join("")}
              </div>
            </fieldset>
          `;
        }).join("")}

        <button class="player-button" type="submit">
          Submit answers
        </button>
      </form>
    `;

    document.querySelector("#learnerQuizForm")
      ?.addEventListener("submit", event => {
        event.preventDefault();
        submitAttempt(false);
      });

    startTimer();
  }

  function startTimer() {
    clearInterval(quizState.timerId);

    const timer = document.querySelector("#quizTimer");
    const limitSeconds =
      Number(quizState.quiz.time_limit_minutes || 0) * 60;

    if (!limitSeconds) {
      if (timer) timer.textContent = "Untimed assessment";
      return;
    }

    const tick = () => {
      const elapsed = Math.floor(
        (Date.now() - quizState.startedAt) / 1000
      );

      const remaining = Math.max(0, limitSeconds - elapsed);

      if (timer) {
        timer.textContent =
          `Time remaining ${Math.floor(remaining / 60)}:` +
          `${String(remaining % 60).padStart(2, "0")}`;
      }

      if (remaining === 0) {
        clearInterval(quizState.timerId);
        submitAttempt(true);
      }
    };

    tick();
    quizState.timerId = setInterval(tick, 1000);
  }

  async function submitAttempt(timedOut = false) {
    clearInterval(quizState.timerId);

    const state = getPlayerState();

    if (!state?.session) {
      localStorage.setItem(
        "kmtReturnTo",
        window.location.pathname + window.location.search
      );
      window.location.href = "student-login.html";
      return;
    }

    const form = document.querySelector("#learnerQuizForm");
    if (!form) return;

    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Saving result…";
    }

    let earnedPoints = 0;
    let totalPoints = 0;
    const answers = {};

    for (const question of quizState.questions) {
      const points = Number(question.points || 1);
      totalPoints += points;

      const selector =
        `input[name="q-${CSS.escape(String(question.id))}"]:checked`;

      const selected = form.querySelector(selector);
      const answer = selected ? Number(selected.value) : null;

      answers[question.id] = answer;

      if (answer === Number(question.correct_index)) {
        earnedPoints += points;
      }
    }

    const score = totalPoints
      ? Math.round((earnedPoints / totalPoints) * 100)
      : 0;

    const passed =
      score >= Number(quizState.quiz.pass_mark || 80);

    const attemptResult = await supabaseClient
      .from("quiz_attempts")
      .insert({
        quiz_id: quizState.quiz.id,
        course_id: state.bundle.course.id,
        user_id: state.session.user.id,
        score,
        passed,
        answers,
        started_at: new Date(quizState.startedAt).toISOString(),
        completed_at: new Date().toISOString(),
        timed_out: timedOut
      });

    if (attemptResult.error) {
      console.error(attemptResult.error);
      alert(`Result could not be saved: ${attemptResult.error.message}`);

      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Submit answers";
      }
      return;
    }

    quizState.attemptCount += 1;
    quizState.passed = passed;
    quizState.bestScore = quizState.bestScore === null
      ? score
      : Math.max(quizState.bestScore, score);

    if (passed) {
      await completeCourseAndIssueCertificate(score);
    }

    renderResult(score, passed, answers);
    applyCertificateGate();
  }

  async function completeCourseAndIssueCertificate(score) {
    const state = getPlayerState();
    const course = state.bundle.course;
    const user = state.session.user;

    // Update the existing course_progress row.
    const progressResult = await supabaseClient
      .from("course_progress")
      .upsert({
        user_id: user.id,
        course_id: course.id,
        percent: 100,
        completed: true,
        score,
        final_score: score,
        completed_at: new Date().toISOString(),
        last_opened_at: new Date().toISOString()
      }, {
        onConflict: "user_id,course_id"
      });

    if (progressResult.error) {
      console.warn("Course completion could not be updated:",
        progressResult.error);
    }

    // Do not create duplicate certificates.
    const existingResult = await supabaseClient
      .from("certificates")
      .select("id, certificate_code")
      .eq("user_id", user.id)
      .eq("course_id", course.id)
      .maybeSingle();

    if (existingResult.error) {
      console.warn("Certificate lookup failed:", existingResult.error);
      return;
    }

    if (existingResult.data) return;

    let learnerName =
      user.user_metadata?.full_name ||
      user.user_metadata?.display_name ||
      user.email ||
      "Kraken Learner";

    const profileResult = await supabaseClient
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileResult.data?.display_name) {
      learnerName = profileResult.data.display_name;
    }

    const certificateCode = makeCertificateCode(
      user.id,
      course.id
    );

    const certificateResult = await supabaseClient
      .from("certificates")
      .insert({
        certificate_code: certificateCode,
        user_id: user.id,
        course_id: course.id,
        learner_name: learnerName,
        course_title: course.title,
        final_score: score,
        issued_at: new Date().toISOString()
      });

    if (certificateResult.error) {
      console.warn("Certificate could not be issued:",
        certificateResult.error);
    }
  }

  function makeCertificateCode(userId, courseId) {
    const source =
      `${userId}-${courseId}-${Date.now()}`.replace(/[^a-z0-9]/gi, "");

    return `KMT-${source.slice(0, 6).toUpperCase()}-` +
      `${source.slice(-8).toUpperCase()}`;
  }

  function renderResult(score, passed, answers) {
    const body = document.querySelector("#quizBody");
    if (!body) return;

    body.innerHTML = `
      <div class="quiz-result ${passed ? "passed" : "failed"}">
        <strong>
          ${passed ? "Quiz passed ✓" : "Not passed yet"}
        </strong>

        <span class="quiz-score">${score}%</span>

        <p>
          ${passed
            ? "Course complete. Your certificate has been issued."
            : "Review the feedback and try again when ready."}
        </p>

        ${passed ? `
          <a class="player-button"
             href="certificate.html?course=${encodeURIComponent(getCourseId())}">
            View certificate
          </a>
        ` : ""}
      </div>

      <div class="quiz-review">
        ${quizState.questions.map((question, index) => {
          const correct =
            answers[question.id] === Number(question.correct_index);

          const correctAnswer =
            (question.options || [])[question.correct_index] || "";

          return `
            <article class="${correct ? "correct" : "incorrect"}">
              <h4>${index + 1}. ${safe(question.question)}</h4>
              <p>
                ${correct ? "Correct" : "Incorrect"}
                · Correct answer: ${safe(correctAnswer)}
              </p>

              ${quizState.quiz.show_feedback && question.explanation
                ? `<small>${safe(question.explanation)}</small>`
                : ""}
            </article>
          `;
        }).join("")}
      </div>

      ${!attemptLimitReached() ? `
        <button class="player-button secondary"
                id="retakeQuiz"
                type="button">
          ${passed ? "Retake for practice" : "Try again"}
        </button>
      ` : ""}
    `;

    bindQuizButtons();
  }

  function applyCertificateGate() {
    const certificatePanel =
      document.querySelector("#certificatePanel");

    const certificateButton =
      document.querySelector("#certificateAction");

    const lessonPercent = currentLessonPercent();
    const quizRequired =
      quizState.quiz?.required_for_completion !== false;

    const unlocked =
      lessonPercent === 100 &&
      (!quizRequired || quizState.passed);

    if (certificatePanel) {
      certificatePanel.classList.toggle(
        "locked-panel",
        !unlocked
      );
    }

    if (!certificateButton) return;

    if (unlocked) {
      certificateButton.textContent = "View certificate";
      certificateButton.href =
        `certificate.html?course=${encodeURIComponent(getCourseId())}`;
      return;
    }

    certificateButton.href = "#";

    if (lessonPercent < 100) {
      certificateButton.textContent = "Complete all lessons";
    } else {
      certificateButton.textContent = "Pass the final quiz";
    }
  }

  function refreshQuizBody() {
    const body = document.querySelector("#quizBody");
    if (!body) return;

    body.innerHTML = initialQuizBody();
    bindQuizButtons();
    applyCertificateGate();
  }

  async function initialiseQuiz() {
    const state = await waitForCoursePlayer();
    if (!state) return;

    try {
      await loadQuiz();

      if (!quizState.quiz) {
        window.krakenQuizLoaded = false;
        window.updateProgressDisplay?.();
        return;
      }

      window.krakenQuizLoaded = true;

      const certificatePanel =
        document.querySelector("#certificatePanel");

      if (certificatePanel &&
          !document.querySelector("#quizPanel")) {
        certificatePanel.insertAdjacentHTML(
          "beforebegin",
          quizPanelHtml()
        );
      }

      bindQuizButtons();
      applyCertificateGate();

      document.addEventListener(
        "kraken:progress-updated",
        refreshQuizBody
      );
    } catch (error) {
      console.error("Quiz engine:", error);

      const certificatePanel =
        document.querySelector("#certificatePanel");

      certificatePanel?.insertAdjacentHTML(
        "beforebegin",
        `<section class="player-panel">
          <div class="empty-inline">
            The final quiz could not be loaded:
            ${safe(error.message)}
          </div>
        </section>`
      );
    }
  }

  document.addEventListener("DOMContentLoaded", initialiseQuiz);
})();
