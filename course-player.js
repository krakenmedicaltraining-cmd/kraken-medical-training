"use strict";

const playerState = {
  bundle: null,
  activeIndex: 0,
  completed: new Set(),
  progress: null,
  session: null
};

const playerRoot = document.querySelector("#coursePlayer");
const courseId = new URLSearchParams(location.search).get("id");

window.playerState = playerState;
window.courseId = courseId;

function safe(value) {
  return escapePlayerHtml(value);
}

function minutesLabel(value) {
  const minutes = Number(value || 0);
  return minutes ? `${minutes} min` : "Self-paced";
}

function initials(value) {
  return String(value || "KM")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join("") || "KM";
}

function normaliseUrl(value) {
  return String(value || "").trim();
}

function videoEmbed(url, title = "Lesson video") {
  const value = normaliseUrl(url);

  if (!value) {
    return "";
  }

  let embed = value;

  if (/youtu\.be\//i.test(value)) {
    embed = `https://www.youtube.com/embed/${
      value.split("youtu.be/")[1].split(/[?&]/)[0]
    }`;
  } else if (/youtube\.com\/watch/i.test(value)) {
    try {
      const videoId = new URL(value).searchParams.get("v");

      if (videoId) {
        embed = `https://www.youtube.com/embed/${videoId}`;
      }
    } catch {}
  } else if (/youtube\.com\/shorts\//i.test(value)) {
    const videoId =
      value.split("/shorts/")[1]?.split(/[?&/]/)[0];

    if (videoId) {
      embed = `https://www.youtube.com/embed/${videoId}`;
    }
  } else if (/vimeo\.com\/\d+/i.test(value)) {
    embed =
      `https://player.vimeo.com/video/${
        value.match(/vimeo\.com\/(\d+)/)[1]
      }`;
  }

  if (/\.(mp4|webm|ogg)(\?|$)/i.test(value)) {
    return `
      <video
        controls
        playsinline
        preload="metadata"
        src="${safe(value)}"
      ></video>
    `;
  }

  return `
    <iframe
      src="${safe(embed)}"
      title="${safe(title)}"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
      loading="lazy"
    ></iframe>
  `;
}

function audioEmbed(url, title = "Lesson audio") {
  const value = normaliseUrl(url);

  if (!value) {
    return "";
  }

  if (/\.(mp3|wav|m4a|aac|ogg)(\?|$)/i.test(value)) {
    return `
      <audio controls preload="metadata" src="${safe(value)}"></audio>
    `;
  }

  return `
    <a
      class="player-button secondary"
      href="${safe(value)}"
      target="_blank"
      rel="noopener"
    >
      Open ${safe(title)} ↗
    </a>
  `;
}

function renderTextBlock(block) {
  const title = normaliseUrl(block.title);
  const content =
    block.content ||
    block.text ||
    "";

  return `
    <section class="lesson-block lesson-block-text">
      ${title ? `<h3>${safe(title)}</h3>` : ""}
      <div class="lesson-rich-text">
        ${safe(content).replace(/\n/g, "<br>")}
      </div>
    </section>
  `;
}

function renderReflectionBlock(block) {
  const title =
    normaliseUrl(block.title) ||
    "Reflection";

  const prompt =
    block.content ||
    block.text ||
    block.caption ||
    "";

  return `
    <section class="lesson-block lesson-block-reflection">
      <span class="lesson-block-label">Reflection</span>
      <h3>${safe(title)}</h3>
      <p>${safe(prompt).replace(/\n/g, "<br>")}</p>

      <textarea
        class="reflection-answer"
        rows="5"
        placeholder="Write your reflection here. This stays on this device."
        data-reflection-key="${safe(
          `${courseId}-${playerState.activeIndex}-${block.client_id || block.id || title}`
        )}"
      ></textarea>
    </section>
  `;
}

function renderImageBlock(block) {
  const url = normaliseUrl(
    block.url ||
    block.image_url
  );

  if (!url) {
    return "";
  }

  const title =
    normaliseUrl(block.title) ||
    "Course image";

  const caption =
    block.caption ||
    block.description ||
    "";

  return `
    <figure class="lesson-block lesson-block-image">
      <img
        src="${safe(url)}"
        alt="${safe(title)}"
        loading="lazy"
        referrerpolicy="no-referrer"
      >

      ${caption
        ? `<figcaption>${safe(caption)}</figcaption>`
        : ""}
    </figure>
  `;
}

function renderVideoBlock(block) {
  const url = normaliseUrl(
    block.url ||
    block.video_url
  );

  if (!url) {
    return "";
  }

  const title =
    normaliseUrl(block.title) ||
    "Lesson video";

  const caption =
    block.caption ||
    block.description ||
    "";

  return `
    <section class="lesson-block lesson-block-media">
      <span class="lesson-block-label">Video</span>
      <h3>${safe(title)}</h3>

      <div class="lesson-media">
        ${videoEmbed(url, title)}
      </div>

      ${caption ? `<p>${safe(caption)}</p>` : ""}
    </section>
  `;
}

function renderPodcastBlock(block) {
  const url = normaliseUrl(
    block.url ||
    block.podcast_url ||
    block.audio_url
  );

  if (!url) {
    return "";
  }

  const title =
    normaliseUrl(block.title) ||
    "Lesson podcast";

  const caption =
    block.caption ||
    block.description ||
    "";

  return `
    <section class="lesson-block lesson-block-podcast">
      <span class="lesson-block-label">Podcast</span>
      <h3>${safe(title)}</h3>
      ${audioEmbed(url, title)}
      ${caption ? `<p>${safe(caption)}</p>` : ""}
    </section>
  `;
}

function renderDownloadBlock(block) {
  const url = normaliseUrl(
    block.url ||
    block.file_url
  );

  if (!url) {
    return "";
  }

  const title =
    normaliseUrl(block.title) ||
    "Course download";

  const caption =
    block.caption ||
    block.description ||
    "";

  return `
    <section class="lesson-block lesson-block-download">
      <span class="lesson-block-label">Download</span>

      <div>
        <h3>${safe(title)}</h3>
        ${caption ? `<p>${safe(caption)}</p>` : ""}
      </div>

      <a
        class="player-button secondary"
        href="${safe(url)}"
        target="_blank"
        rel="noopener"
      >
        Open resource ↗
      </a>
    </section>
  `;
}

function renderSimulationBlock(block) {
  const url = normaliseUrl(
    block.url ||
    block.simulation_url ||
    block.game_url ||
    block.embed_url
  );

  if (!url) {
    return "";
  }

  const title =
    normaliseUrl(block.title) ||
    "Interactive simulation";

  const caption =
    block.caption ||
    block.description ||
    "";

  return `
    <section class="lesson-block lesson-block-simulation">
      <span class="lesson-block-label">Simulation</span>
      <h3>${safe(title)}</h3>
      ${caption ? `<p>${safe(caption)}</p>` : ""}

      <a
        class="player-button"
        href="${safe(url)}"
        target="_blank"
        rel="noopener"
      >
        Launch simulation ↗
      </a>
    </section>
  `;
}

function renderUnknownBlock(block) {
  const title = normaliseUrl(block.title);
  const content =
    block.content ||
    block.text ||
    block.caption ||
    "";

  if (!title && !content) {
    return "";
  }

  return `
    <section class="lesson-block">
      ${title ? `<h3>${safe(title)}</h3>` : ""}
      ${content ? `<p>${safe(content)}</p>` : ""}
    </section>
  `;
}

function renderLessonBlock(block) {
  const type =
    String(block?.type || "text")
      .toLowerCase()
      .trim();

  switch (type) {
    case "text":
      return renderTextBlock(block);

    case "reflection":
      return renderReflectionBlock(block);

    case "image":
      return renderImageBlock(block);

    case "video":
      return renderVideoBlock(block);

    case "podcast":
    case "audio":
      return renderPodcastBlock(block);

    case "download":
    case "resource":
      return renderDownloadBlock(block);

    case "simulation":
    case "unity":
    case "game":
    case "itch":
    case "itchio":
    case "webgl":
    case "scenario":
      return renderSimulationBlock(block);

    default:
      return renderUnknownBlock(block);
  }
}

function lessonBlocks(lesson) {
  if (Array.isArray(lesson.blocks) && lesson.blocks.length) {
    return lesson.blocks;
  }

  const blocks = [];

  if (lesson.content) {
    blocks.push({
      type: "text",
      title: "Learning content",
      content: lesson.content
    });
  }

  if (lesson.video_url) {
    blocks.push({
      type: "video",
      title: "Video",
      url: lesson.video_url
    });
  }

  if (lesson.podcast_url) {
    blocks.push({
      type: "podcast",
      title: "Podcast",
      url: lesson.podcast_url
    });
  }

  if (lesson.simulation_url) {
    blocks.push({
      type: "simulation",
      title: "Simulation",
      url: lesson.simulation_url
    });
  }

  return blocks;
}

function renderLessonBlocks(lesson) {
  const blocks = lessonBlocks(lesson);

  if (!blocks.length) {
    return `
      <div class="empty-inline">
        This lesson is ready for content.
      </div>
    `;
  }

  return blocks
    .map(renderLessonBlock)
    .filter(Boolean)
    .join("");
}

function restoreReflectionAnswers() {
  document
    .querySelectorAll("[data-reflection-key]")
    .forEach(field => {
      const key = `kraken-reflection-${field.dataset.reflectionKey}`;

      field.value =
        localStorage.getItem(key) || "";

      field.addEventListener("input", () => {
        localStorage.setItem(key, field.value);
      });
    });
}

async function initialisePlayer() {
  if (!courseId) {
    return showError(
      "Course not found",
      "No course ID was supplied."
    );
  }

  try {
    playerState.session =
      await getCurrentSession();

    const bundle =
      await getCourseEngineBundle(courseId);

    if (!bundle) {
      return showError(
        "Course not found",
        "This course may have been removed or is not available."
      );
    }

    const access =
      typeof canAccessCourse === "function"
        ? await canAccessCourse(bundle.course)
        : { ok: true };

    if (!access.ok) {
      return showError(
        "Course locked",
        access.reason ||
          "You do not currently have access to this course.",
        "student-login.html",
        "Sign in"
      );
    }

    playerState.bundle = bundle;

    const progressRows =
      await getLessonProgressV12(courseId);

    const currentLessonIds = new Set(
      (bundle.lessons || []).map(lesson =>
        String(lesson.id)
      )
    );

    progressRows
      .filter(
        row =>
          row.completed &&
          currentLessonIds.has(String(row.lesson_id))
      )
      .forEach(row =>
        playerState.completed.add(
          String(row.lesson_id)
        )
      );

    playerState.progress =
      await getCourseProgress(courseId);

    renderPlayer();
    await renderProfile();
  } catch (error) {
    console.error(error);

    showError(
      "Course unavailable",
      error.message ||
        "Kraken could not load this course."
    );
  }
}

function renderPlayer() {
  const {
    course,
    lessons,
    resources
  } = playerState.bundle;

  const totalMinutes = lessons.reduce(
    (sum, lesson) =>
      sum + Number(lesson.estimated_minutes || 0),
    0
  );

  const heroImage =
    course.banner_url ||
    course.banner ||
    course.thumbnail_url ||
    course.thumbnail ||
    "";

  const style = heroImage
    ? `style="--hero-image:linear-gradient(90deg,rgba(3,11,8,.97),rgba(3,11,8,.78) 50%,rgba(3,11,8,.25)),url('${safe(heroImage)}')"`
    : "";

  playerRoot.innerHTML = `
    <section class="course-hero" ${style}>
      <div class="course-hero-copy">
        <div class="hero-tags">
          <span class="hero-tag">
            ${safe(course.category || "Medical training")}
          </span>

          <span class="hero-tag">
            ${safe(course.difficulty || "All levels")}
          </span>

          <span class="hero-tag">
            ${safe(
              course.estimated_time ||
              minutesLabel(totalMinutes)
            )}
          </span>
        </div>

        <h1>${safe(course.title || "Kraken course")}</h1>

        ${course.subtitle
          ? `<p class="course-subtitle">${safe(course.subtitle)}</p>`
          : ""}

        <p class="course-description">
          ${safe(
            course.description ||
            "Continue your Kraken medical training mission."
          )}
        </p>

        <div class="hero-actions">
          <button class="player-button" id="continueCourse">
            ▶ ${
              playerState.completed.size
                ? "Continue course"
                : "Start course"
            }
          </button>

          <a
            class="player-button secondary"
            href="courses.html"
          >
            Browse courses
          </a>
        </div>
      </div>
    </section>

    <section class="player-progress-wrap">
      <div class="progress-row">
        <strong>Course progress</strong>
        <span id="progressLabel">0%</span>
      </div>

      <div class="player-progress">
        <span id="progressBar"></span>
      </div>
    </section>

    <div class="player-layout">
      <aside class="lesson-sidebar" id="lessonSidebar">
        <div class="sidebar-head">
          <div>
            <span class="lesson-kicker">Course pathway</span>
            <h2>Lessons</h2>
          </div>

          <span>${lessons.length} total</span>
        </div>

        <div class="lesson-list" id="lessonList"></div>
      </aside>

      <section class="player-main">
        <article class="lesson-view" id="lessonView"></article>
        ${renderResources(resources)}
        ${renderSimulationPanel()}
        ${renderCertificatePanel()}
      </section>
    </div>

    <button
      class="mobile-lessons-button"
      id="mobileLessons"
      aria-label="Open lesson list"
    >
      ☰
    </button>
  `;

  document
    .querySelector("#continueCourse")
    ?.addEventListener(
      "click",
      () => selectLesson(firstIncompleteIndex())
    );

  document
    .querySelector("#mobileLessons")
    ?.addEventListener("click", () => {
      document
        .querySelector("#lessonSidebar")
        ?.classList.toggle("open");
    });

  renderLessonList();
  selectLesson(firstIncompleteIndex());
  updateProgressDisplay();
}

function renderLessonList() {
  const list =
    document.querySelector("#lessonList");

  const lessons =
    playerState.bundle.lessons;

  list.innerHTML = lessons.map((lesson, index) => {
    const done =
      playerState.completed.has(String(lesson.id));

    return `
      <button
        class="lesson-button
          ${done ? "completed" : ""}
          ${index === playerState.activeIndex ? "active" : ""}
        "
        data-index="${index}"
      >
        <span class="lesson-number">
          ${String(index + 1).padStart(2, "0")}
        </span>

        <span class="lesson-title-wrap">
          <strong>
            ${safe(lesson.title || `Lesson ${index + 1}`)}
          </strong>

          <small>
            ${safe(minutesLabel(lesson.estimated_minutes))}
          </small>
        </span>

        <span class="lesson-state">
          ${done ? "✓" : "○"}
        </span>
      </button>
    `;
  }).join("");

  list
    .querySelectorAll("[data-index]")
    .forEach(button => {
      button.addEventListener("click", () => {
        selectLesson(Number(button.dataset.index));

        document
          .querySelector("#lessonSidebar")
          ?.classList.remove("open");
      });
    });
}

function selectLesson(index) {
  const lessons =
    playerState.bundle.lessons;

  if (!lessons.length) {
    document.querySelector("#lessonView").innerHTML = `
      <div class="empty-inline">
        No lessons have been added to this course yet.
      </div>
    `;

    return;
  }

  playerState.activeIndex = Math.max(
    0,
    Math.min(index, lessons.length - 1)
  );

  const lesson =
    lessons[playerState.activeIndex];

  const done =
    playerState.completed.has(String(lesson.id));

  document.querySelector("#lessonView").innerHTML = `
    <span class="lesson-kicker">
      Lesson ${playerState.activeIndex + 1}
      of ${lessons.length}
    </span>

    <h2>
      ${safe(
        lesson.title ||
        `Lesson ${playerState.activeIndex + 1}`
      )}
    </h2>

    ${lesson.summary
      ? `<p class="lesson-summary">${safe(lesson.summary)}</p>`
      : ""}

    <div class="lesson-block-stack">
      ${renderLessonBlocks(lesson)}
    </div>

    <div class="lesson-actions">
      <button
        class="player-button secondary"
        id="previousLesson"
        ${playerState.activeIndex === 0 ? "disabled" : ""}
      >
        ← Previous
      </button>

      <button
        class="player-button"
        id="completeLesson"
      >
        ${done ? "Mark incomplete" : "Complete lesson ✓"}
      </button>

      <button
        class="player-button secondary"
        id="nextLesson"
        ${
          playerState.activeIndex === lessons.length - 1
            ? "disabled"
            : ""
        }
      >
        Next →
      </button>
    </div>
  `;

  restoreReflectionAnswers();

  document
    .querySelector("#previousLesson")
    ?.addEventListener(
      "click",
      () => selectLesson(playerState.activeIndex - 1)
    );

  document
    .querySelector("#nextLesson")
    ?.addEventListener(
      "click",
      () => selectLesson(playerState.activeIndex + 1)
    );

  document
    .querySelector("#completeLesson")
    ?.addEventListener(
      "click",
      toggleCurrentLesson
    );

  renderLessonList();
}

async function toggleCurrentLesson() {
  if (!playerState.session) {
    localStorage.setItem(
      "kmtReturnTo",
      location.pathname + location.search
    );

    location.href = "student-login.html";
    return;
  }

  const lesson =
    playerState.bundle.lessons[playerState.activeIndex];

  const id =
    String(lesson.id);

  const next =
    !playerState.completed.has(id);

  if (next) {
    playerState.completed.add(id);
  } else {
    playerState.completed.delete(id);
  }

  renderLessonList();
  selectLesson(playerState.activeIndex);
  updateProgressDisplay();

  try {
    playerState.progress =
      await saveLessonProgressV12(
        playerState.bundle.course,
        id,
        next,
        playerState.bundle.lessons.length
      );

    updateProgressDisplay();
  } catch (error) {
    console.error(error);

    alert(
      "Progress could not be saved. Please try again."
    );
  }
}

function updateProgressDisplay() {
  const lessons =
    playerState.bundle.lessons || [];

  const validLessonIds = new Set(
    lessons.map(lesson => String(lesson.id))
  );

  const completedCount =
    [...playerState.completed]
      .filter(id =>
        validLessonIds.has(String(id))
      )
      .length;

  const total =
    lessons.length;

  const percent = Math.max(
    0,
    Math.min(
      100,
      total
        ? Math.round(
            (completedCount / total) * 100
          )
        : 0
    )
  );

  const bar =
    document.querySelector("#progressBar");

  const label =
    document.querySelector("#progressLabel");

  if (bar) {
    bar.style.width = `${percent}%`;
  }

  if (label) {
    label.textContent = `${percent}%`;
  }

  window.krakenLessonPercent = percent;

  document.dispatchEvent(
    new CustomEvent(
      "kraken:progress-updated",
      { detail: { percent } }
    )
  );

  const certificate =
    document.querySelector("#certificatePanel");

  const certificateButton =
    document.querySelector("#certificateAction");

  if (!window.krakenQuizLoaded) {
    const unlocked =
      percent === 100;

    if (certificate) {
      certificate.classList.toggle(
        "locked-panel",
        !unlocked
      );
    }

    if (certificateButton) {
      certificateButton.textContent =
        unlocked
          ? "View certificate"
          : "Complete all lessons";

      certificateButton.href =
        unlocked
          ? `certificate.html?course=${encodeURIComponent(courseId)}`
          : "#";
    }
  }
}

window.updateProgressDisplay =
  updateProgressDisplay;

function firstIncompleteIndex() {
  const lessons =
    playerState.bundle.lessons;

  const index = lessons.findIndex(
    lesson =>
      !playerState.completed.has(
        String(lesson.id)
      )
  );

  return index < 0
    ? Math.max(0, lessons.length - 1)
    : index;
}

function renderResources(resources) {
  const lessonResources =
    (playerState.bundle.lessons || [])
      .flatMap(lesson =>
        lessonBlocks(lesson)
          .filter(block =>
            ["download", "resource"]
              .includes(
                String(block.type || "")
                  .toLowerCase()
              )
          )
          .map((block, index) => ({
            id:
              block.id ||
              `${lesson.id}-resource-${index}`,
            name:
              block.title ||
              "Course resource",
            resource_type:
              block.caption ||
              "Download",
            url:
              block.url ||
              block.file_url
          }))
      )
      .filter(resource => resource.url);

  const combined = [
    ...(resources || []),
    ...lessonResources
  ];

  const unique = [];
  const seen = new Set();

  combined.forEach(resource => {
    const key =
      String(resource.url || "");

    if (!key || seen.has(key)) {
      return;
    }

    seen.add(key);
    unique.push(resource);
  });

  return `
    <section class="player-panel">
      <div class="panel-heading">
        <div>
          <span class="lesson-kicker">Field kit</span>
          <h3>Downloads</h3>
        </div>

        <small>
          ${unique.length}
          resource${unique.length === 1 ? "" : "s"}
        </small>
      </div>

      <div class="resource-grid">
        ${unique.length
          ? unique.map(resource => `
              <a
                class="resource-card"
                href="${safe(resource.url)}"
                target="_blank"
                rel="noopener"
              >
                <span class="resource-icon">⇩</span>

                <span>
                  <strong>
                    ${safe(
                      resource.name ||
                      "Course resource"
                    )}
                  </strong>

                  <small>
                    ${safe(
                      resource.resource_type ||
                      "Download"
                    )}
                  </small>
                </span>
              </a>
            `).join("")
          : `
            <div class="empty-inline">
              No downloadable resources have been added yet.
            </div>
          `}
      </div>
    </section>
  `;
}

function collectSimulations() {
  const course =
    playerState.bundle.course;

  const items = [];

  if (normaliseUrl(course.simulation_url)) {
    items.push({
      title:
        `${course.title || "Course"} simulation`,
      url: course.simulation_url
    });
  }

  (playerState.bundle.lessons || [])
    .forEach(lesson => {
      if (normaliseUrl(lesson.simulation_url)) {
        items.push({
          title:
            `${lesson.title || "Lesson"} simulation`,
          url: lesson.simulation_url
        });
      }

      lessonBlocks(lesson)
        .filter(block =>
          [
            "simulation",
            "unity",
            "game",
            "itch",
            "itchio",
            "webgl",
            "scenario"
          ].includes(
            String(block.type || "")
              .toLowerCase()
          )
        )
        .forEach(block => {
          const url = normaliseUrl(
            block.url ||
            block.simulation_url ||
            block.game_url ||
            block.embed_url
          );

          if (url) {
            items.push({
              title:
                block.title ||
                `${lesson.title || "Lesson"} simulation`,
              url
            });
          }
        });
    });

  const seen = new Set();

  return items.filter(item => {
    if (seen.has(item.url)) {
      return false;
    }

    seen.add(item.url);
    return true;
  });
}

function renderSimulationPanel() {
  const simulations =
    collectSimulations();

  return `
    <section class="player-panel">
      <div class="panel-heading">
        <div>
          <span class="lesson-kicker">Applied learning</span>
          <h3>Simulation</h3>
        </div>
      </div>

      ${simulations.length
        ? `
          <p class="panel-copy">
            Put the learning into practice in an interactive scenario.
          </p>

          <div class="course-simulation-list">
            ${simulations.map(simulation => `
              <a
                class="player-button"
                href="${safe(simulation.url)}"
                target="_blank"
                rel="noopener"
              >
                ${safe(simulation.title)} ↗
              </a>
            `).join("")}
          </div>
        `
        : `
          <div class="empty-inline">
            No simulation is attached to this course.
          </div>
        `}
    </section>
  `;
}

function renderCertificatePanel() {
  const enabled =
    playerState.bundle.course
      .certificate_enabled !== false;

  return `
    <section
      class="player-panel locked-panel"
      id="certificatePanel"
    >
      <div class="certificate-card">
        <div>
          <span class="lesson-kicker">
            Mission reward
          </span>

          <h3>
            ${
              enabled
                ? "Course certificate"
                : "Completion record"
            }
          </h3>

          <p class="panel-copy">
            ${
              enabled
                ? "Complete every lesson and meet the course requirements to unlock your certificate."
                : "Your course completion will be recorded in your learner profile."
            }
          </p>

          <a
            class="player-button secondary"
            id="certificateAction"
            href="#"
          >
            Complete all lessons
          </a>
        </div>

        <span class="certificate-seal">KMT</span>
      </div>
    </section>
  `;
}

async function renderProfile() {
  if (!playerState.session) {
    return;
  }

  try {
    const profile =
      await ensureLearnerProfile();

    document.querySelector("#playerProfile").textContent =
      initials(
        profile?.display_name ||
        playerState.session.user.email
      );

    document.querySelector("#playerProfile").href =
      "dashboard.html";

    document.querySelector("#topXp").textContent =
      `${Number(profile?.xp || 0).toLocaleString()} XP`;
  } catch (error) {
    console.warn(error);
  }
}

function showError(
  title,
  message,
  href = "courses.html",
  label = "Back to courses"
) {
  playerRoot.innerHTML = `
    <section class="player-error">
      <h1>${safe(title)}</h1>
      <p>${safe(message)}</p>
      <a class="player-button" href="${safe(href)}">
        ${safe(label)}
      </a>
    </section>
  `;
}

document.addEventListener(
  "DOMContentLoaded",
  initialisePlayer
);
