const lessons = [
  {
    title: "Introduction",
    time: "3 min",
    html: `
      <span class="eyebrow">Lesson 1</span>
      <h2>Why use MARCH PAWS?</h2>
      <p>
        MARCH PAWS provides a repeatable sequence for identifying and treating
        immediate threats before moving to broader casualty care.
      </p>
      <div class="callout warning">
        <strong>Training note:</strong>
        This demonstration is not a substitute for current authorised clinical
        guidance or practical training.
      </div>
      <h3>Learning aim</h3>
      <p>
        By the end of this module, you should be able to recall the sequence and
        explain what each stage prompts you to assess.
      </p>
    `
  },
  {
    title: "M · Massive haemorrhage",
    time: "4 min",
    html: `
      <span class="eyebrow">Lesson 2</span>
      <h2>Massive haemorrhage</h2>
      <p>
        Look first for immediately life-threatening external bleeding and act
        according to your training and local guidance.
      </p>
      <ul>
        <li>Expose enough to identify the source.</li>
        <li>Use the appropriate haemorrhage-control method.</li>
        <li>Reassess after intervention.</li>
      </ul>
      <div class="callout">
        <strong>Recall prompt:</strong> Find it, control it, check it again.
      </div>
    `
  },
  {
    title: "A · Airway",
    time: "4 min",
    html: `
      <span class="eyebrow">Lesson 3</span>
      <h2>Airway</h2>
      <p>
        Assess whether the airway is open and whether it is likely to remain open.
      </p>
      <ul>
        <li>Look, listen and feel for airway problems.</li>
        <li>Consider positioning and basic manoeuvres.</li>
        <li>Escalate airway support when indicated and authorised.</li>
      </ul>
    `
  },
  {
    title: "R/C/H · Breathing, circulation, head",
    time: "6 min",
    html: `
      <span class="eyebrow">Lesson 4</span>
      <h2>Breathing, circulation and head injury</h2>
      <p>
        Continue through the sequence methodically. Treat urgent findings, then
        reassess the casualty rather than treating the acronym as a one-way process.
      </p>
      <div class="callout">
        <strong>Key behaviour:</strong> Reassessment is woven through the entire process.
      </div>
    `
  },
  {
    title: "PAWS · Extended care",
    time: "5 min",
    html: `
      <span class="eyebrow">Lesson 5</span>
      <h2>Pain, antibiotics, wounds and splinting</h2>
      <p>
        Once immediate threats have been addressed, PAWS prompts further care.
        Exact interventions depend on current protocols and scope of practice.
      </p>
      <ul>
        <li><strong>P:</strong> Pain management</li>
        <li><strong>A:</strong> Antibiotics where indicated</li>
        <li><strong>W:</strong> Wounds</li>
        <li><strong>S:</strong> Splinting</li>
      </ul>
    `
  },
  {
    title: "Knowledge check",
    time: "3 min",
    quiz: true,
    html: `
      <span class="eyebrow">Lesson 6</span>
      <h2>Knowledge check</h2>
      <p>Which statement best describes how MARCH PAWS should be used?</p>
      <div id="quizOptions">
        <button class="quiz-option" data-correct="false">
          Complete each letter once and never return to it.
        </button>
        <button class="quiz-option" data-correct="true">
          Use it as a structured sequence while continually reassessing the casualty.
        </button>
        <button class="quiz-option" data-correct="false">
          Delay massive-haemorrhage treatment until the full assessment is complete.
        </button>
      </div>
      <p class="feedback" id="quizFeedback" aria-live="polite"></p>
    `
  }
];

let currentLesson = 0;
let allProgress = getProgress();
allProgress.marchPaws ||= {};

function renderLessonList() {
  const list = $("#lessonList");
  if (!list) return;

  list.innerHTML = "";

  lessons.forEach((lesson, index) => {
    const button = document.createElement("button");
    const completed = Boolean(allProgress.marchPaws[index]);

    button.className =
      `lesson-button ${index === currentLesson ? "active" : ""}`;

    button.innerHTML = `
      <span class="lesson-number">${index + 1}</span>
      <span class="lesson-main">
        <strong>${lesson.title}</strong>
        <small>${lesson.time}</small>
      </span>
      <span class="lesson-status">${completed ? "✓" : ""}</span>
    `;

    button.addEventListener("click", () => {
      currentLesson = index;
      renderLesson();
    });

    list.appendChild(button);
  });
}

function updateModuleProgress() {
  const completed =
    Object.values(allProgress.marchPaws).filter(Boolean).length;

  const percentage = Math.round((completed / lessons.length) * 100);

  const progressBar = $("#moduleProgress");
  const percentageText = $("#modulePercent");

  if (progressBar) progressBar.style.width = `${percentage}%`;
  if (percentageText) percentageText.textContent = `${percentage}%`;
}

function renderLesson() {
  const content = $("#lessonContent");
  if (!content) return;

  const lesson = lessons[currentLesson];

  content.innerHTML = `
    ${lesson.html}
    <div class="hero-actions actions">
      <button
        class="button button-ghost secondary"
        id="previousLesson"
        ${currentLesson === 0 ? "disabled" : ""}
      >
        ← Previous
      </button>

      <button class="button" id="completeLesson">
        ${allProgress.marchPaws[currentLesson] ? "Completed ✓" : "Mark complete"}
      </button>

      <button
        class="button button-ghost secondary"
        id="nextLesson"
        ${currentLesson === lessons.length - 1 ? "disabled" : ""}
      >
        Next →
      </button>
    </div>
  `;

  $("#previousLesson")?.addEventListener("click", () => {
    if (currentLesson > 0) {
      currentLesson -= 1;
      renderLesson();
    }
  });

  $("#nextLesson")?.addEventListener("click", () => {
    if (currentLesson < lessons.length - 1) {
      currentLesson += 1;
      renderLesson();
    }
  });

  $("#completeLesson")?.addEventListener("click", () => {
    allProgress.marchPaws[currentLesson] = true;
    setProgress(allProgress);
    showToast("Lesson marked complete");
    renderLesson();
  });

  if (lesson.quiz) {
    $$(".quiz-option").forEach(option => {
      option.addEventListener("click", () => {
        $$(".quiz-option").forEach(item => {
          item.classList.remove("correct", "incorrect");
        });

        const correct = option.dataset.correct === "true";
        option.classList.add(correct ? "correct" : "incorrect");

        const feedback = $("#quizFeedback");
        if (feedback) {
          feedback.textContent = correct
            ? "Correct. Structured assessment and reassessment work together."
            : "Not quite. Reassessment remains essential throughout.";
        }

        if (correct) {
          allProgress.marchPaws[currentLesson] = true;
          setProgress(allProgress);
          updateModuleProgress();
          renderLessonList();
        }
      });
    });
  }

  renderLessonList();
  updateModuleProgress();
}

$("#resetProgress")?.addEventListener("click", () => {
  allProgress.marchPaws = {};
  setProgress(allProgress);
  showToast("Module progress reset");
  renderLesson();
});

renderLesson();
