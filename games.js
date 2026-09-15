"use strict";

(() => {
  const $ = selector => document.querySelector(selector);
  const escape = value => escapeHtml(String(value ?? ""));
  let simulations = [];
  let activeCategory = "";

  const normaliseUrl = url => String(url || "").trim();
  const lessonArray = c => Array.isArray(c.lessons) ? c.lessons : [];
  const blockArray = c => Array.isArray(c.content_blocks) ? c.content_blocks : [];

  function mins(value, fallback=10) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  function isSim(block) {
    return ["unity","simulation","game","itch","itchio","webgl"]
      .includes(String(block?.type || "").toLowerCase());
  }

  function simUrl(block) {
    return normaliseUrl(block?.url || block?.simulation_url || block?.game_url || block?.embed_url);
  }

  function fromBlock(block, course, key) {
    const url = simUrl(block);
    if (!isSim(block) || !url) return null;
    if (block.show_in_sim_library === false || block.show_in_library === false) return null;

    return {
      key,
      course_id: course.id,
      course_title: course.title,
      category: block.simulation_category || block.game_category || block.category || course.category || "Clinical",
      title: block.simulation_title || block.game_title || block.title || `${course.title} simulation`,
      description: block.simulation_description || block.game_description || block.description || block.caption || "",
      url,
      thumbnail: normaliseUrl(
        block.simulation_thumbnail_url || block.game_thumbnail_url || block.thumbnail_url || block.thumbnail || ""
      ),
      difficulty: block.simulation_difficulty || block.difficulty || course.difficulty || "All levels",
      minutes: mins(block.simulation_minutes || block.minutes || block.estimated_minutes, 10),
      quality: 3
    };
  }

  function legacyCourse(course) {
    if (!course.simulation_enabled || !normaliseUrl(course.simulation_url)) return [];
    return [{
      key:`course-${course.id}`,
      course_id:course.id,
      course_title:course.title,
      category:course.simulation_category || course.category || "Clinical",
      title:course.simulation_title || `${course.title} simulation`,
      description:course.simulation_description || "",
      url:normaliseUrl(course.simulation_url),
      thumbnail:normaliseUrl(course.simulation_thumbnail_url || ""),
      difficulty:course.simulation_difficulty || course.difficulty || "All levels",
      minutes:mins(course.simulation_minutes,10),
      quality:1
    }];
  }

  function embedded(course) {
    const output = [];

    lessonArray(course).forEach((lesson, li) => {
      (Array.isArray(lesson.blocks) ? lesson.blocks : []).forEach((block, bi) => {
        const item = fromBlock(block, course, `embedded-${course.id}-${li}-${bi}`);
        if (item) output.push(item);
      });
    });

    blockArray(course).forEach((block, bi) => {
      const item = fromBlock(block, course, `course-block-${course.id}-${bi}`);
      if (item) output.push(item);
    });

    return output;
  }

  async function lessonTable(courses) {
    const ids = courses.map(c => c.id);
    if (!ids.length) return [];

    const result = await supabaseClient.from("course_lessons").select("*").in("course_id", ids);
    if (result.error) {
      console.warn("course_lessons could not be read:", result.error);
      return [];
    }

    const map = new Map(courses.map(c => [String(c.id), c]));
    const output = [];

    (result.data || []).forEach((lesson, li) => {
      const course = map.get(String(lesson.course_id));
      if (!course) return;

      const blocks = Array.isArray(lesson.blocks) ? lesson.blocks : [];

      blocks.forEach((block, bi) => {
        const item = fromBlock(block, course, `lesson-block-${lesson.id || li}-${bi}`);
        if (item) output.push(item);
      });

      /* Old courses remain compatible. The richer block wins during deduplication. */
      const url = normaliseUrl(lesson.simulation_url || lesson.unity_url || lesson.game_url);
      if (url) {
        output.push({
          key:`legacy-${lesson.id || li}`,
          course_id:course.id,
          course_title:course.title,
          category:course.category || "Clinical",
          title:lesson.title ? `${lesson.title} simulation` : `${course.title} simulation`,
          description:"",
          url,
          thumbnail:"",
          difficulty:course.difficulty || "All levels",
          minutes:mins(lesson.estimated_minutes,10),
          quality:1
        });
      }
    });

    return output;
  }

  function deduplicate(items) {
    const map = new Map();

    items.forEach(item => {
      const key = `${item.course_id}|${normaliseUrl(item.url)}`;
      const current = map.get(key);
      if (!current || Number(item.quality || 0) > Number(current.quality || 0)) {
        map.set(key, item);
      }
    });

    return [...map.values()];
  }

  function buildFilters() {
    const categories = [...new Set(simulations.map(i => i.category).filter(Boolean))].sort();

    $("#simulationFilters").innerHTML = [
      `<button class="simulation-filter active" data-category="">All</button>`,
      ...categories.map(category =>
        `<button class="simulation-filter" data-category="${escape(category)}">${escape(category)}</button>`
      )
    ].join("");

    document.querySelectorAll(".simulation-filter").forEach(button => {
      button.onclick = () => {
        activeCategory = button.dataset.category || "";
        document.querySelectorAll(".simulation-filter").forEach(item =>
          item.classList.toggle("active", item === button)
        );
        render();
      };
    });
  }

  function card(item) {
    const description = String(item.description || "").trim() ||
      "Enter this interactive scenario and put your clinical decision-making to the test.";

    const art = item.thumbnail
      ? `style="background-image:linear-gradient(180deg,rgba(4,20,16,.02),rgba(4,20,16,.56)),url('${escape(item.thumbnail)}')"`
      : "";

    return `
      <article class="card simulation-card">
        <div class="simulation-art" ${art}>
          <span class="simulation-source">KRAKEN SIM</span>
          <span class="simulation-controller">◆</span>
          <div class="simulation-art-title">
            <small>INTERACTIVE SCENARIO</small>
            <h3>${escape(item.title)}</h3>
          </div>
        </div>

        <div class="simulation-copy">
          <div class="simulation-meta">
            <span>${escape(item.category)}</span>
            <span>${escape(item.difficulty)}</span>
            <span>${Number(item.minutes || 10)} min</span>
          </div>

          <p class="simulation-description">${escape(description)}</p>

          <a class="button simulation-launch"
             href="${escape(item.url)}"
             target="_blank"
             rel="noopener"
             data-launch-simulation="${escape(item.key)}">
            ▶ Launch simulation
          </a>

          <div class="simulation-course-link">
            <span>PART OF</span>
            <a href="course.html?id=${encodeURIComponent(item.course_id)}">
              ${escape(item.course_title)} →
            </a>
          </div>
        </div>
      </article>`;
  }

  function render() {
    const search = $("#simulationSearch").value.trim().toLowerCase();

    const filtered = simulations.filter(item => {
      const haystack = [item.title,item.course_title,item.category,item.description,item.difficulty]
        .join(" ").toLowerCase();

      return (!activeCategory || item.category === activeCategory) && haystack.includes(search);
    });

    $("#games").innerHTML = filtered.length
      ? filtered.map(card).join("")
      : `<div class="empty-panel">No simulations match this search.</div>`;

    document.querySelectorAll("[data-launch-simulation]").forEach(link => {
      link.addEventListener("click", () => {
        if (window.KrakenAchievements) {
          window.KrakenAchievements.recordSimulationLaunch(link.dataset.launchSimulation);
        }
      });
    });
  }

  async function load() {
    const courses = await getPublicCoursesOnline();
    const lessonItems = await lessonTable(courses);

    simulations = deduplicate([
      ...courses.flatMap(course => [...legacyCourse(course), ...embedded(course)]),
      ...lessonItems
    ]);

    buildFilters();
    render();
  }

  $("#simulationSearch").addEventListener("input", render);

  load().catch(error => {
    console.error(error);
    $("#games").innerHTML = `<div class="empty-panel">${escape(error.message)}</div>`;
  });
})();