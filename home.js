"use strict";

(() => {
  const $ = selector => document.querySelector(selector);

  const escapeHtml = value =>
    String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[character]));

  const categoryThemes = {
    "trauma care": {
      className: "cat-trauma",
      icon: "✚",
      label: "Trauma"
    },
    "resuscitation": {
      className: "cat-resus",
      icon: "♥",
      label: "Resuscitation"
    },
    "communication": {
      className: "cat-comms",
      icon: "◫",
      label: "Communication"
    },
    "clinical communication": {
      className: "cat-comms",
      icon: "◫",
      label: "Communication"
    },
    "primary healthcare": {
      className: "cat-primary",
      icon: "⌁",
      label: "Primary care"
    },
    "clinical skills": {
      className: "cat-clinical",
      icon: "✦",
      label: "Clinical skills"
    },
    "professional development": {
      className: "cat-development",
      icon: "↑",
      label: "Development"
    },
    "military medicine": {
      className: "cat-military",
      icon: "⬡",
      label: "Military medicine"
    },
    "mental health": {
      className: "cat-mental",
      icon: "◎",
      label: "Mental health"
    },
    "games and simulations": {
      className: "cat-sim",
      icon: "◆",
      label: "Simulations"
    }
  };

  function safeText(value, fallback = "") {
    const text = String(value ?? "").trim();
    return text || fallback;
  }

  function normaliseCategory(value) {
    return safeText(value, "Other").toLowerCase();
  }

  function categoryTheme(category) {
    return categoryThemes[normaliseCategory(category)] || {
      className: "cat-default",
      icon: "K",
      label: category
    };
  }

  function courseUrl(course) {
    return `course.html?id=${encodeURIComponent(course.id)}`;
  }

  function categoryUrl(category) {
    return `courses.html?category=${encodeURIComponent(category)}`;
  }

  function artTitle(title) {
    const words = safeText(title, "Kraken Training")
      .toUpperCase()
      .split(/\s+/)
      .filter(Boolean);

    if (words.length <= 2) {
      return words.join("<br>");
    }

    const midpoint = Math.ceil(words.length / 2);

    return `${words.slice(0, midpoint).join(" ")}<br>${words.slice(midpoint).join(" ")}`;
  }

  async function getSession() {
    try {
      return (await supabaseClient.auth.getSession()).data.session;
    } catch {
      return null;
    }
  }

  async function getPublishedCourses() {
    const result = await supabaseClient
      .from("courses")
      .select("*")
      .eq("status", "Published")
      .order("updated_at", { ascending: false });

    if (result.error) {
      throw result.error;
    }

    return result.data || [];
  }

  async function getFeaturedCourse() {
    const result = await supabaseClient
      .from("courses")
      .select("*")
      .eq("featured", true)
      .eq("status", "Published")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (result.error) {
      throw result.error;
    }

    return result.data;
  }

  async function getCourseLessonCounts(courseIds) {
    if (!courseIds.length) {
      return {};
    }

    const result = await supabaseClient
      .from("course_lessons")
      .select("course_id")
      .in("course_id", courseIds);

    if (result.error) {
      console.warn("Could not load lesson counts:", result.error);
      return {};
    }

    return (result.data || []).reduce((counts, row) => {
      const key = String(row.course_id);
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});
  }

  async function getUserProgress(courseIds, session) {
    if (!session || !courseIds.length) {
      return {};
    }

    const result = await supabaseClient
      .from("course_progress")
      .select("course_id, percent, completed")
      .eq("user_id", session.user.id)
      .in("course_id", courseIds);

    if (result.error) {
      console.warn("Could not load course progress:", result.error);
      return {};
    }

    return (result.data || []).reduce((progress, row) => {
      progress[String(row.course_id)] = {
        percent: Math.max(0, Math.min(100, Number(row.percent || 0))),
        completed: Boolean(row.completed)
      };
      return progress;
    }, {});
  }

  async function getFeaturedProgress(course, session) {
    const lessonResult = await supabaseClient
      .from("course_lessons")
      .select("id")
      .eq("course_id", course.id)
      .order("position");

    const lessonCount =
      lessonResult.error
        ? 0
        : (lessonResult.data || []).length;

    if (!session) {
      return { lessonCount, completedCount: 0, percent: 0 };
    }

    const progressResult = await supabaseClient
      .from("course_progress")
      .select("percent, completed")
      .eq("course_id", course.id)
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (progressResult.error) {
      return { lessonCount, completedCount: 0, percent: 0 };
    }

    const percent = Math.max(
      0,
      Math.min(100, Number(progressResult.data?.percent || 0))
    );

    const completedCount = lessonCount
      ? Math.round((percent / 100) * lessonCount)
      : 0;

    return { lessonCount, completedCount, percent };
  }

  function renderEmptyFeaturedCourse() {
    if ($("#featuredCourseTitle")) {
      $("#featuredCourseTitle").textContent =
        "No featured course selected";
    }

    if ($("#featuredCourseDescription")) {
      $("#featuredCourseDescription").textContent =
        "Open Course Builder and mark one published course as Featured.";
    }
  }

  function renderFeaturedCourse(course, progress) {
    const url = courseUrl(course);
    const category = safeText(course.category, "Kraken course");
    const title = safeText(course.title, "Untitled course");
    const description = safeText(
      course.description,
      "Open this featured course to begin learning."
    );

    const estimatedMinutes =
      Number(course.estimated_minutes || 0);

    const estimatedTime = estimatedMinutes
      ? `${estimatedMinutes} min`
      : safeText(course.estimated_time, "Self-paced");

    const xp = Number(course.xp_reward || 0);

    $("#featuredCourseCategory").textContent =
      category.toUpperCase();

    $("#featuredCourseArtTitle").innerHTML =
      artTitle(title);

    $("#featuredCourseStatus").textContent =
      progress.percent >= 100
        ? "Completed"
        : progress.percent > 0
          ? "In progress"
          : "Featured course";

    $("#featuredCourseTitle").textContent = title;
    $("#featuredCourseDescription").textContent = description;
    $("#featuredProgress").style.width = `${progress.percent}%`;

    $("#featuredProgressText").textContent =
      progress.lessonCount
        ? `${progress.completedCount} of ${progress.lessonCount} lessons`
        : `${progress.percent}% complete`;

    $("#featuredCourseXp").textContent = `${xp} XP`;

    $("#featuredButton").href = url;
    $("#featuredButton").textContent =
      progress.percent >= 100
        ? "Review course"
        : progress.percent > 0
          ? "Continue course"
          : "Start course";

    $("#heroFeaturedIcon").textContent =
      safeText(course.icon, title.slice(0, 1))
        .slice(0, 3)
        .toUpperCase();

    $("#heroFeaturedCategory").textContent = category;
    $("#heroFeaturedTitle").textContent = title;
    $("#heroFeaturedDescription").textContent = description;
    $("#heroFeaturedTime").textContent = estimatedTime;
    $("#heroProgress").style.width = `${progress.percent}%`;

    $("#heroProgressText").textContent =
      progress.lessonCount
        ? `${progress.completedCount} of ${progress.lessonCount} lessons`
        : `${progress.percent}% complete`;

    $("#heroFeaturedButton").href = url;
    $("#heroMissionButton").href = url;

    const coverImage =
      safeText(
        course.cover_image_url ||
        course.banner_url ||
        course.thumbnail_url
      );

    if (coverImage) {
      $("#featuredCourseArt").style.backgroundImage =
        `linear-gradient(180deg,rgba(2,16,12,.08),rgba(2,16,12,.76)),url("${coverImage.replace(/"/g, "%22")}")`;

      $("#featuredCourseArt").style.backgroundSize = "cover";
      $("#featuredCourseArt").style.backgroundPosition = "center";
    }
  }

  function renderCategories(courses, lessonCounts) {
    const shelf = $("#dynamicCategoryShelf");

    if (!shelf) {
      return;
    }

    const categoryMap = new Map();

    courses.forEach(course => {
      const category = safeText(course.category, "Other");
      const existing = categoryMap.get(category) || {
        category,
        count: 0,
        lessons: 0,
        minutes: 0
      };

      existing.count += 1;
      existing.lessons +=
        lessonCounts[String(course.id)] || 0;

      existing.minutes +=
        Number(course.estimated_minutes || 0);

      categoryMap.set(category, existing);
    });

    const categories = [...categoryMap.values()]
      .sort((a, b) =>
        b.count - a.count ||
        a.category.localeCompare(b.category)
      );

    if (!categories.length) {
      shelf.innerHTML = `
        <div class="dynamic-loading-card">
          No published course categories yet.
        </div>
      `;
      return;
    }

    shelf.innerHTML = categories.map((item, index) => {
      const theme = categoryTheme(item.category);
      const hours =
        item.minutes > 0
          ? `${Math.max(1, Math.round(item.minutes / 60))} hr`
          : `${item.lessons} lesson${item.lessons === 1 ? "" : "s"}`;

      return `
        <a
          class="dynamic-category-card ${theme.className}"
          href="${categoryUrl(item.category)}"
        >
          <span class="dynamic-category-number">
            ${String(index + 1).padStart(2, "0")}
          </span>

          <span class="dynamic-category-icon">
            ${escapeHtml(theme.icon)}
          </span>

          <div class="dynamic-category-copy">
            <small>TRAINING CATEGORY</small>

            <h3>${escapeHtml(item.category)}</h3>

            <p>
              ${item.count} course${item.count === 1 ? "" : "s"}
              ·
              ${escapeHtml(hours)}
            </p>

            <span>Browse category →</span>
          </div>
        </a>
      `;
    }).join("");
  }

  function renderLatestCourses(
    courses,
    lessonCounts,
    progressMap
  ) {
    const grid = $("#customCourseGrid");

    if (!grid) {
      return;
    }

    const latest = courses.slice(0, 8);

    if (!latest.length) {
      grid.innerHTML = `
        <div class="dynamic-loading-card">
          No published courses yet.
        </div>
      `;
      return;
    }

    grid.innerHTML = latest.map(course => {
      const category =
        safeText(course.category, "Kraken course");

      const title =
        safeText(course.title, "Untitled course");

      const description =
        safeText(
          course.description,
          "Open the course to begin training."
        );

      const lessons =
        lessonCounts[String(course.id)] || 0;

      const progress =
        progressMap[String(course.id)] || {
          percent: 0,
          completed: false
        };

      const minutes =
        Number(course.estimated_minutes || 0);

      const xp =
        Number(course.xp_reward || 0);

      const difficulty =
        safeText(course.difficulty, "All levels");

      const coverImage =
        safeText(
          course.cover_image_url ||
          course.banner_url ||
          course.thumbnail_url
        );

      const style = coverImage
        ? `style="background-image:linear-gradient(180deg,rgba(3,17,13,.05),rgba(3,17,13,.92)),url('${escapeHtml(coverImage)}')"`
        : "";

      const actionText =
        progress.completed
          ? "Review course"
          : progress.percent > 0
            ? "Continue course"
            : "Start course";

      return `
        <article class="premium-course-card">
          <a
            class="premium-course-cover"
            href="${courseUrl(course)}"
            ${style}
          >
            <span class="premium-course-category">
              ${escapeHtml(category)}
            </span>

            <span class="premium-course-icon">
              ${escapeHtml(
                safeText(course.icon, title.slice(0, 3))
                  .slice(0, 3)
                  .toUpperCase()
              )}
            </span>

            <div class="premium-course-cover-copy">
              <small>KRAKEN COURSE</small>
              <h3>${escapeHtml(title)}</h3>
            </div>
          </a>

          <div class="premium-course-body">
            <p>${escapeHtml(description)}</p>

            <div class="premium-course-meta">
              <span>${escapeHtml(difficulty)}</span>
              ${minutes ? `<span>${minutes} min</span>` : ""}
              ${lessons ? `<span>${lessons} lesson${lessons === 1 ? "" : "s"}</span>` : ""}
              ${xp ? `<span>${xp} XP</span>` : ""}
            </div>

            ${progress.percent > 0
              ? `
                <div class="premium-course-progress">
                  <span style="width:${progress.percent}%"></span>
                </div>

                <small class="premium-progress-label">
                  ${progress.percent}% complete
                </small>
              `
              : ""
            }

            <a
              class="premium-course-action"
              href="${courseUrl(course)}"
            >
              ▶ ${actionText}
            </a>
          </div>
        </article>
      `;
    }).join("");
  }

  async function initialiseHome() {
    try {
      const [courses, featuredCourse, session] =
        await Promise.all([
          getPublishedCourses(),
          getFeaturedCourse(),
          getSession()
        ]);

      const courseIds = courses.map(course => course.id);

      const [lessonCounts, progressMap] =
        await Promise.all([
          getCourseLessonCounts(courseIds),
          getUserProgress(courseIds, session)
        ]);

      renderCategories(courses, lessonCounts);
      renderLatestCourses(courses, lessonCounts, progressMap);

      if (featuredCourse) {
        const featuredProgress =
          await getFeaturedProgress(featuredCourse, session);

        renderFeaturedCourse(
          featuredCourse,
          featuredProgress
        );
      } else {
        renderEmptyFeaturedCourse();
      }
    } catch (error) {
      console.error("Homepage could not load:", error);

      if ($("#dynamicCategoryShelf")) {
        $("#dynamicCategoryShelf").innerHTML = `
          <div class="dynamic-loading-card">
            Categories could not be loaded.
          </div>
        `;
      }

      if ($("#customCourseGrid")) {
        $("#customCourseGrid").innerHTML = `
          <div class="dynamic-loading-card">
            Courses could not be loaded.
          </div>
        `;
      }
    }
  }

  initialiseHome();
})();
