const params = new URLSearchParams(location.search);
const courseId = params.get("id");
const page = $("#coursePage");

function notFound(message = "This course could not be found.") {
  page.innerHTML = `
    <section class="page-hero">
      <span class="eyebrow">Course unavailable</span>
      <h1>${escapeHtml(message)}</h1>
      <div class="actions"><a class="button" href="index.html">Return home</a></div>
    </section>`;
}

(async function renderCourse() {
  if (!courseId) {
    notFound("No course was selected.");
    return;
  }

  page.innerHTML = `<section class="page-hero"><span class="eyebrow">Loading</span><h1>Opening course…</h1></section>`;

  try {
    const course = await getCourseOnline(courseId);
    if (!course) {
      notFound();
      return;
    }

    document.title = `${course.title} | Kraken Medical Training`;
    const lessons = course.lessons?.length ? course.lessons : ["Introduction"];

    const lessonsHtml = lessons.map((lesson, index) => `
      <article class="lesson-block">
        <span class="eyebrow">Lesson ${index + 1}</span>
        <h2>${escapeHtml(lesson)}</h2>
        <p>Lesson content, media and knowledge checks can be expanded in the next course-editor stage.</p>
      </article>`).join("");

    const video = course.video_url
      ? `<div class="panel"><h3>Course video</h3><iframe src="${escapeHtml(course.video_url)}" title="${escapeHtml(course.title)} video" style="width:100%;aspect-ratio:16/9;border:0;border-radius:16px" allowfullscreen></iframe></div>`
      : "";

    const resource = course.pdf_url
      ? `<a class="button" href="${escapeHtml(course.pdf_url)}" target="_blank" rel="noopener">Open course resource</a>`
      : `<span class="help-text">No downloadable resource has been added yet.</span>`;

    page.innerHTML = `
      <section class="page-hero">
        <span class="eyebrow">${escapeHtml(course.category)}</span>
        <h1>${escapeHtml(course.title)}</h1>
        <p>${escapeHtml(course.description)}</p>
        <div class="course-meta-row"><span class="tag">${lessons.length} lessons</span></div>
      </section>
      <section class="section course-page-layout">
        <div>${video}${lessonsHtml}</div>
        <aside class="course-sidebar">
          <div class="panel">
            <span class="card-icon">${escapeHtml(course.icon || "K")}</span>
            <h3>Course resources</h3>
            <p>${escapeHtml(course.description)}</p>
            ${resource}
          </div>
        </aside>
      </section>`;
  } catch (error) {
    console.error(error);
    notFound("The course database could not be reached.");
  }
})();
