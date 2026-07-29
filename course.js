
const params = new URLSearchParams(location.search);
const courseId = params.get("id");
const course = getCustomCourses().find(item => item.id === courseId);
const page = $("#coursePage");

if (!course) {
  page.innerHTML = `
    <section class="page-hero"><span class="eyebrow">Course not found</span><h1>This course is not on this device.</h1>
    <p>Custom courses currently live in the browser where they were created.</p>
    <div class="actions"><a class="button" href="admin.html">Open course admin</a><a class="button secondary" href="index.html">Return home</a></div></section>`;
} else {
  document.title = `${course.title} | Kraken Medical Training`;
  const lessons = course.lessons?.length ? course.lessons : ["Introduction"];
  const lessonsHtml = lessons.map((lesson, index) => `
    <article class="lesson-block">
      <span class="eyebrow">Lesson ${index + 1}</span>
      <h2>${escapeHtml(lesson)}</h2>
      <p>Add the full written lesson, media and knowledge checks here when the shared database is connected.</p>
    </article>
  `).join("");

  const video = course.video
    ? `<div class="panel"><h3>Course video</h3><iframe src="${escapeHtml(course.video)}" title="${escapeHtml(course.title)} video" style="width:100%;aspect-ratio:16/9;border:0;border-radius:16px" allowfullscreen></iframe></div>`
    : "";

  const pdf = course.pdf
    ? `<a class="button" href="${escapeHtml(course.pdf)}" download>Download course PDF</a>`
    : `<span class="help-text">No PDF has been linked yet.</span>`;

  page.innerHTML = `
    <section class="page-hero">
      <span class="eyebrow">${escapeHtml(course.category)}</span>
      <h1>${escapeHtml(course.title)}</h1>
      <p>${escapeHtml(course.description)}</p>
      <div class="course-meta-row"><span class="tag">${escapeHtml(course.status)}</span><span class="tag">${lessons.length} lessons</span></div>
    </section>
    <section class="section course-page-layout">
      <div>${video}${lessonsHtml}</div>
      <aside class="course-sidebar">
        <div class="panel"><span class="card-icon">${escapeHtml(course.icon)}</span><h3>Course resources</h3><p>${escapeHtml(course.description)}</p>${pdf}<div class="actions"><a class="button secondary" href="admin.html">Edit in admin</a></div></div>
      </aside>
    </section>`;
}
