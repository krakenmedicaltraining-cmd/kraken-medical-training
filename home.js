"use strict";

(() => {
  const $ = selector => document.querySelector(selector);

  function safeText(value, fallback = "") {
    const text = String(value ?? "").trim();
    return text || fallback;
  }

  function courseUrl(course) {
    return `course.html?id=${encodeURIComponent(course.id)}`;
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

  async function getFeaturedCourse() {
    const result = await supabaseClient
      .from("courses")
      .select("*")
      .eq("featured", true)
      .eq("status", "Published")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (result.error) throw result.error;
    return result.data;
  }

  async function getFeaturedProgress(course, session) {
    const lessonsResult = await supabaseClient
      .from("course_lessons")
      .select("id")
      .eq("course_id", course.id)
      .order("position");

    if (lessonsResult.error) throw lessonsResult.error;

    const lessons = lessonsResult.data || [];
    const lessonCount = lessons.length;

    if (!session || !lessonCount) {
      return {
        lessonCount,
        completedCount: 0,
        percent: 0
      };
    }

    const progressResult = await supabaseClient
      .from("course_lesson_progress")
      .select("lesson_id, completed")
      .eq("course_id", course.id)
      .eq("user_id", session.user.id);

    if (progressResult.error) throw progressResult.error;

    const validIds = new Set(lessons.map(lesson => String(lesson.id)));
    const completedIds = new Set(
      (progressResult.data || [])
        .filter(row => row.completed && validIds.has(String(row.lesson_id)))
        .map(row => String(row.lesson_id))
    );

    const completedCount = completedIds.size;
    const percent = Math.max(
      0,
      Math.min(100, Math.round((completedCount / lessonCount) * 100))
    );

    return {
      lessonCount,
      completedCount,
      percent
    };
  }

  function renderEmptyFeaturedCourse() {
    const title = $("#featuredCourseTitle");
    const description = $("#featuredCourseDescription");

    if (title) title.textContent = "No featured course selected";
    if (description) {
      description.textContent =
        "Open Course Builder, edit a published course and switch on Featured course.";
    }

    $("#featuredButton")?.setAttribute("href", "admin.html");
    if ($("#featuredButton")) $("#featuredButton").textContent = "Choose featured course";

    $("#heroFeaturedButton")?.setAttribute("href", "courses.html");
    $("#heroMissionButton")?.setAttribute("href", "courses.html");
  }

  function renderFeaturedCourse(course, progress) {
    const url = courseUrl(course);
    const category = safeText(course.category, "Kraken course");
    const title = safeText(course.title, "Untitled course");
    const description = safeText(
      course.description,
      "Open this featured course to begin learning."
    );
    const estimatedTime = safeText(course.estimated_time, "Self-paced");
    const xp = Number(course.xp_reward || 0);

    if ($("#featuredCourseCategory")) {
      $("#featuredCourseCategory").textContent = category.toUpperCase();
    }

    if ($("#featuredCourseArtTitle")) {
      $("#featuredCourseArtTitle").innerHTML = artTitle(title);
    }

    if ($("#featuredCourseStatus")) {
      $("#featuredCourseStatus").textContent =
        progress.percent > 0 && progress.percent < 100
          ? "In progress"
          : progress.percent === 100
            ? "Completed"
            : "Featured course";
    }

    if ($("#featuredCourseTitle")) {
      $("#featuredCourseTitle").textContent = title;
    }

    if ($("#featuredCourseDescription")) {
      $("#featuredCourseDescription").textContent = description;
    }

    if ($("#featuredProgress")) {
      $("#featuredProgress").style.width = `${progress.percent}%`;
    }

    if ($("#featuredProgressText")) {
      $("#featuredProgressText").textContent = progress.lessonCount
        ? `${progress.completedCount} of ${progress.lessonCount} lessons`
        : `${progress.percent}% complete`;
    }

    if ($("#featuredCourseXp")) {
      $("#featuredCourseXp").textContent = `${xp} XP`;
    }

    if ($("#featuredButton")) {
      $("#featuredButton").href = url;
      $("#featuredButton").textContent =
        progress.percent > 0 && progress.percent < 100
          ? "Continue course"
          : progress.percent === 100
            ? "Review course"
            : "Start course";
    }

    if ($("#heroFeaturedIcon")) {
      $("#heroFeaturedIcon").textContent =
        safeText(course.icon, title.slice(0, 1)).slice(0, 3).toUpperCase();
    }

    if ($("#heroFeaturedCategory")) {
      $("#heroFeaturedCategory").textContent = category;
    }

    if ($("#heroFeaturedTitle")) {
      $("#heroFeaturedTitle").textContent = title;
    }

    if ($("#heroFeaturedDescription")) {
      $("#heroFeaturedDescription").textContent = description;
    }

    if ($("#heroFeaturedTime")) {
      $("#heroFeaturedTime").textContent = estimatedTime;
    }

    if ($("#heroProgress")) {
      $("#heroProgress").style.width = `${progress.percent}%`;
    }

    if ($("#heroProgressText")) {
      $("#heroProgressText").textContent = progress.lessonCount
        ? `${progress.completedCount} of ${progress.lessonCount} lessons`
        : `${progress.percent}% complete`;
    }

    if ($("#heroFeaturedButton")) {
      $("#heroFeaturedButton").href = url;
      $("#heroFeaturedButton").textContent =
        progress.percent > 0 ? "▶ Continue training" : "▶ Start training";
    }

    if ($("#heroMissionButton")) {
      $("#heroMissionButton").href = url;
      $("#heroMissionButton").textContent =
        progress.percent > 0 ? "Resume mission" : "Start mission";
    }

    const art = $("#featuredCourseArt");
    const image = safeText(course.banner_url || course.thumbnail_url);

    if (art && image) {
      art.style.backgroundImage =
        `linear-gradient(180deg,rgba(2,16,12,.08),rgba(2,16,12,.72)),url("${image.replace(/"/g, "%22")}")`;
      art.style.backgroundSize = "cover";
      art.style.backgroundPosition = "center";
    }
  }

  async function renderFeatured() {
    try {
      const [course, session] = await Promise.all([
        getFeaturedCourse(),
        getSession()
      ]);

      if (!course) {
        renderEmptyFeaturedCourse();
        return;
      }

      const progress = await getFeaturedProgress(course, session);
      renderFeaturedCourse(course, progress);
    } catch (error) {
      console.error("Could not load featured course:", error);
      renderEmptyFeaturedCourse();
    }
  }

  async function renderOnlineCourses() {
    const customSection = $("#customCoursesSection");
    const customGrid = $("#customCourseGrid");

    if (!customSection || !customGrid) return;

    try {
      const courses = await getPublicCoursesOnline();

      if (!courses.length) {
        customSection.hidden = true;
        return;
      }

      customSection.hidden = false;
      customGrid.innerHTML = courses.map(course => `
        <a class="card" href="course.html?id=${encodeURIComponent(course.id)}">
          <span class="card-icon">${escapeHtml(course.icon || "K")}</span>
          <span class="tag">${escapeHtml(course.category || "Course")}</span>
          <h3>${escapeHtml(course.title)}</h3>
          <p>${escapeHtml(course.description || "")}</p>
          <span class="card-link">Open course →</span>
        </a>
      `).join("");
    } catch (error) {
      console.error("Could not load online courses:", error);
      customSection.hidden = true;
    }
  }

  renderFeatured();
  renderOnlineCourses();
})();
