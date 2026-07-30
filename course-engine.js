"use strict";

async function getCourseEngineBundle(courseId) {
  const course = await getCourseOnline(courseId);
  if (!course) return null;

  const [lessonsResult, downloadsResult, certificateResult] = await Promise.allSettled([
    supabaseClient.from("course_lessons").select("*").eq("course_id", courseId).order("position", { ascending: true }),
    supabaseClient.from("course_downloads").select("*").eq("course_id", courseId).order("position", { ascending: true }),
    supabaseClient.from("course_certificates").select("*").eq("course_id", courseId).maybeSingle()
  ]);

  const lessonsOnline = lessonsResult.status === "fulfilled" && !lessonsResult.value.error
    ? lessonsResult.value.data || []
    : [];
  const downloadsOnline = downloadsResult.status === "fulfilled" && !downloadsResult.value.error
    ? downloadsResult.value.data || []
    : [];
  const certificate = certificateResult.status === "fulfilled" && !certificateResult.value.error
    ? certificateResult.value.data
    : null;

  const lessons = lessonsOnline.length ? lessonsOnline : legacyBlocksToLessons(course);
  const resources = downloadsOnline.length ? downloadsOnline : legacyBlocksToDownloads(course);

  return { course, lessons, resources, certificate };
}

function legacyBlocksToLessons(course) {
  const blocks = Array.isArray(course.content_blocks) ? course.content_blocks : [];
  if (!blocks.length && Array.isArray(course.lessons)) {
    return course.lessons.map((lesson, index) => ({
      id: `legacy-lesson-${index}`,
      course_id: course.id,
      position: index + 1,
      title: typeof lesson === "string" ? lesson : lesson.title || `Lesson ${index + 1}`,
      summary: typeof lesson === "object" ? lesson.summary || "" : "",
      content: typeof lesson === "object" ? lesson.content || "" : "",
      video_url: typeof lesson === "object" ? lesson.video_url || null : null,
      estimated_minutes: typeof lesson === "object" ? lesson.estimated_minutes || 5 : 5
    }));
  }

  const lessons = [];
  let current = null;
  blocks.forEach((block, index) => {
    const type = String(block.type || "").toLowerCase();
    if (type === "heading" || !current) {
      current = {
        id: block.id || `legacy-${index}`,
        course_id: course.id,
        position: lessons.length + 1,
        title: type === "heading" ? (block.title || block.text || `Lesson ${lessons.length + 1}`) : `Lesson ${lessons.length + 1}`,
        summary: block.summary || "",
        content: "",
        video_url: null,
        simulation_url: null,
        estimated_minutes: 5
      };
      lessons.push(current);
      if (type === "heading") return;
    }
    if (type === "text") current.content += `${block.content || block.text || ""}\n`;
    if (type === "image" && block.url) current.content += `<p><img src="${escapePlayerHtml(block.url)}" alt="${escapePlayerHtml(block.alt || "Course image")}"></p>`;
    if (type === "video") current.video_url = block.url || block.video_url || null;
    if (type === "unity" || type === "scenario") current.simulation_url = block.url || null;
    if (type === "quiz") current.quiz = block;
  });
  return lessons;
}

function legacyBlocksToDownloads(course) {
  const blocks = Array.isArray(course.content_blocks) ? course.content_blocks : [];
  const items = blocks.filter(block => block.type === "download" && (block.url || block.file_url)).map((block, index) => ({
    id: block.id || `legacy-download-${index}`,
    course_id: course.id,
    position: index + 1,
    name: block.title || block.name || "Course resource",
    resource_type: block.resource_type || block.file_type || "Download",
    url: block.url || block.file_url
  }));
  if (course.pdf_url) items.push({ id: "legacy-pdf", name: "Course PDF", resource_type: "PDF", url: course.pdf_url });
  return items;
}

async function getLessonProgressV12(courseId) {
  const session = await getCurrentSession();
  if (!session) return [];
  const { data, error } = await supabaseClient.from("lesson_progress").select("*").eq("user_id", session.user.id).eq("course_id", courseId);
  if (error) {
    console.warn("Lesson progress table unavailable; using course progress fallback.", error.message);
    const legacy = await getCourseProgress(courseId);
    return (legacy?.completed_blocks || []).map(id => ({ lesson_id: id, completed: true }));
  }
  return data || [];
}

async function saveLessonProgressV12(course, lessonId, completed, lessonCount) {
  const session = await getCurrentSession();
  if (!session) return null;
  const now = new Date().toISOString();
  const { error } = await supabaseClient.from("lesson_progress").upsert({
    user_id: session.user.id,
    course_id: course.id,
    lesson_id: lessonId,
    completed,
    completed_at: completed ? now : null,
    last_opened_at: now
  }, { onConflict: "user_id,lesson_id" });

  if (error) {
    const existing = await getCourseProgress(course.id);
    const done = new Set(existing?.completed_blocks || []);
    completed ? done.add(lessonId) : done.delete(lessonId);
    return saveCourseProgress(course.id, [...done], lessonCount);
  }

  const progress = await getLessonProgressV12(course.id);
  const doneIds = progress.filter(item => item.completed).map(item => item.lesson_id);
  return saveCourseProgress(course.id, doneIds, lessonCount);
}

function escapePlayerHtml(value) {
  const element = document.createElement("div");
  element.textContent = String(value ?? "");
  return element.innerHTML;
}
