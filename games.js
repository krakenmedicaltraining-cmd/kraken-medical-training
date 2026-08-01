"use strict";

(() => {
  const $ = selector => document.querySelector(selector);
  const escape = value => escapeHtml(String(value ?? ""));

  let simulations = [];
  let activeCategory = "";

  function normaliseUrl(url) {
    return String(url || "").trim();
  }

  function lessonArray(course) {
    return Array.isArray(course.lessons) ? course.lessons : [];
  }

  function blockArray(course) {
    return Array.isArray(course.content_blocks)
      ? course.content_blocks
      : [];
  }

  function simulationFromCourse(course) {
    if (!course.simulation_enabled || !normaliseUrl(course.simulation_url)) {
      return [];
    }

    return [{
      key: `course-${course.id}`,
      course_id: course.id,
      course_title: course.title,
      category: course.category || "Simulation",
      title: `${course.title} simulation`,
      description: course.description || "Interactive course simulation.",
      url: normaliseUrl(course.simulation_url),
      thumbnail: course.thumbnail_url || course.cover_image_url || course.banner_url || "",
      difficulty: course.difficulty || "All levels",
      minutes: Number(course.estimated_minutes || 10),
      source: "Course simulation"
    }];
  }

  function simulationsFromLessons(course) {
    return lessonArray(course).flatMap((lesson, index) => {
      const url = normaliseUrl(
        lesson.simulation_url ||
        lesson.unity_url ||
        lesson.game_url
      );

      if (!url) return [];

      return [{
        key: `lesson-${course.id}-${lesson.id || index}`,
        course_id: course.id,
        course_title: course.title,
        category: course.category || "Simulation",
        title: lesson.title
          ? `${lesson.title} simulation`
          : `${course.title} lesson simulation`,
        description: lesson.summary || lesson.description || course.description || "",
        url,
        thumbnail: lesson.thumbnail_url || course.thumbnail_url || course.cover_image_url || "",
        difficulty: lesson.difficulty || course.difficulty || "All levels",
        minutes: Number(lesson.estimated_minutes || course.estimated_minutes || 10),
        source: "Lesson simulation"
      }];
    });
  }

  function simulationsFromBlocks(course) {
    return blockArray(course).flatMap((block, index) => {
      const type = String(block.type || "").toLowerCase();
      const isSimulation = [
        "unity",
        "simulation",
        "game",
        "itch",
        "itchio",
        "webgl"
      ].includes(type);

      const url = normaliseUrl(
        block.url ||
        block.simulation_url ||
        block.embed_url
      );

      if (!isSimulation || !url) return [];

      return [{
        key: `block-${course.id}-${block.id || index}`,
        course_id: course.id,
        course_title: course.title,
        category: course.category || "Simulation",
        title: block.title || `${course.title} simulation`,
        description: block.description || block.text || course.description || "",
        url,
        thumbnail: block.thumbnail || block.thumbnail_url || course.thumbnail_url || course.cover_image_url || "",
        difficulty: block.difficulty || course.difficulty || "All levels",
        minutes: Number(block.minutes || course.estimated_minutes || 10),
        source: "Interactive block"
      }];
    });
  }

  async function simulationsFromLessonTable(courses) {
    const courseIds = courses.map(course => course.id);
    if (!courseIds.length) return [];

    const result = await supabaseClient
      .from("course_lessons")
      .select("*")
      .in("course_id", courseIds);

    if (result.error) {
      console.warn("course_lessons could not be read:", result.error);
      return [];
    }

    const courseMap = new Map(courses.map(course => [String(course.id), course]));

    return (result.data || []).flatMap((lesson, index) => {
      const url = normaliseUrl(
        lesson.simulation_url ||
        lesson.unity_url ||
        lesson.game_url
      );

      if (!url) return [];

      const course = courseMap.get(String(lesson.course_id));
      if (!course) return [];

      return [{
        key: `table-lesson-${lesson.id || index}`,
        course_id: course.id,
        course_title: course.title,
        category: course.category || "Simulation",
        title: lesson.title
          ? `${lesson.title} simulation`
          : `${course.title} simulation`,
        description: lesson.summary || lesson.description || course.description || "",
        url,
        thumbnail: lesson.thumbnail_url || course.thumbnail_url || course.cover_image_url || "",
        difficulty: lesson.difficulty || course.difficulty || "All levels",
        minutes: Number(lesson.estimated_minutes || course.estimated_minutes || 10),
        source: "Lesson simulation"
      }];
    });
  }

  function deduplicate(items) {
    const seen = new Set();

    return items.filter(item => {
      const key = `${item.course_id}|${item.url}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function buildFilters() {
    const categories = [...new Set(
      simulations.map(item => item.category).filter(Boolean)
    )].sort();

    $("#simulationFilters").innerHTML = [
      `<button class="simulation-filter active" data-category="">All</button>`,
      ...categories.map(category => `
        <button
          class="simulation-filter"
          data-category="${escape(category)}"
        >
          ${escape(category)}
        </button>
      `)
    ].join("");

    document.querySelectorAll(".simulation-filter").forEach(button => {
      button.onclick = () => {
        activeCategory = button.dataset.category || "";

        document.querySelectorAll(".simulation-filter").forEach(item => {
          item.classList.toggle("active", item === button);
        });

        render();
      };
    });
  }

  function render() {
    const search = $("#simulationSearch").value.trim().toLowerCase();

    const filtered = simulations.filter(item => {
      const haystack = [
        item.title,
        item.course_title,
        item.category,
        item.description,
        item.source
      ].join(" ").toLowerCase();

      return (
        (!activeCategory || item.category === activeCategory) &&
        haystack.includes(search)
      );
    });

    $("#games").innerHTML = filtered.length
      ? filtered.map(item => `
          <article class="card simulation-card">
            <div
              class="simulation-art"
              ${item.thumbnail
                ? `style="background-image:linear-gradient(180deg,rgba(4,20,16,.08),rgba(4,20,16,.88)),url('${escape(item.thumbnail)}')"`
                : ""}
            >
              <span class="simulation-source">${escape(item.source)}</span>
              <span class="simulation-controller">◆</span>
              <h3>${escape(item.title)}</h3>
            </div>

            <div class="simulation-copy">
              <span class="tag">
                ${escape(item.category)}
                ·
                ${escape(item.difficulty)}
                ·
                ${Number(item.minutes || 10)} min
              </span>

              <p>${escape(item.description || item.course_title)}</p>

              <div class="simulation-actions">
                <a
                  class="button"
                  href="${escape(item.url)}"
                  target="_blank"
                  rel="noopener"
                  data-launch-simulation="${escape(item.key)}"
                >
                  Launch simulation ↗
                </a>

                <a
                  class="small-button"
                  href="course.html?id=${encodeURIComponent(item.course_id)}"
                >
                  Open course
                </a>
              </div>
            </div>
          </article>
        `).join("")
      : `
        <div class="empty-panel">
          No simulations match this search.
        </div>
      `;

    document.querySelectorAll("[data-launch-simulation]").forEach(link => {
      link.addEventListener("click", () => {
        if (window.KrakenAchievements) {
          window.KrakenAchievements.recordSimulationLaunch(
            link.dataset.launchSimulation
          );
        }
      });
    });
  }

  async function load() {
    const courses = await getPublicCoursesOnline();

    const embedded = courses.flatMap(course => [
      ...simulationFromCourse(course),
      ...simulationsFromLessons(course),
      ...simulationsFromBlocks(course)
    ]);

    const lessonTableItems =
      await simulationsFromLessonTable(courses);

    simulations = deduplicate([
      ...embedded,
      ...lessonTableItems
    ]);

    buildFilters();
    render();
  }

  $("#simulationSearch").addEventListener("input", render);

  load().catch(error => {
    console.error(error);
    $("#games").innerHTML = `
      <div class="empty-panel">
        ${escape(error.message)}
      </div>
    `;
  });
})();
