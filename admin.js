
const form = $("#courseForm");
const list = $("#adminCourseList");
const editingId = $("#editingId");
const cancelEdit = $("#cancelEdit");

function readForm() {
  const title = $("#courseTitle").value.trim();
  return {
    id: editingId.value || createCourseId(title),
    icon: $("#courseIcon").value.trim() || title.slice(0, 3).toUpperCase(),
    title,
    status: $("#courseStatus").value,
    category: $("#courseCategory").value,
    description: $("#courseDescription").value.trim(),
    lessons: $("#courseLessons").value
      .split("\n")
      .map(item => item.trim())
      .filter(Boolean),
    pdf: $("#coursePdf").value.trim(),
    video: $("#courseVideo").value.trim(),
    updatedAt: new Date().toISOString()
  };
}

function resetForm() {
  form.reset();
  editingId.value = "";
  $("#formEyebrow").textContent = "New course";
  $("#formTitle").textContent = "Add a course";
  $("#saveButton").textContent = "Save course";
  cancelEdit.hidden = true;
}

function editCourse(id) {
  const course = getCustomCourses().find(item => item.id === id);
  if (!course) return;

  editingId.value = course.id;
  $("#courseIcon").value = course.icon || "";
  $("#courseStatus").value = course.status || "Draft";
  $("#courseTitle").value = course.title || "";
  $("#courseCategory").value = course.category || "Clinical skills";
  $("#courseDescription").value = course.description || "";
  $("#courseLessons").value = (course.lessons || []).join("\n");
  $("#coursePdf").value = course.pdf || "";
  $("#courseVideo").value = course.video || "";
  $("#formEyebrow").textContent = "Editing course";
  $("#formTitle").textContent = course.title;
  $("#saveButton").textContent = "Update course";
  cancelEdit.hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteCourse(id) {
  const courses = getCustomCourses();
  const course = courses.find(item => item.id === id);
  if (!course || !confirm(`Delete "${course.title}"?`)) return;
  saveCustomCourses(courses.filter(item => item.id !== id));
  showToast("Course deleted");
  renderCourses();
}

function renderCourses() {
  const courses = getCustomCourses();
  list.innerHTML = "";

  if (!courses.length) {
    list.innerHTML = `<div class="empty-panel">No custom courses yet. Add your first course using the form.</div>`;
    return;
  }

  courses
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .forEach(course => {
      const item = document.createElement("article");
      item.className = "admin-course";
      item.innerHTML = `
        <div class="admin-course-icon">${escapeHtml(course.icon)}</div>
        <div>
          <span class="tag">${escapeHtml(course.status)} · ${escapeHtml(course.category)}</span>
          <h3>${escapeHtml(course.title)}</h3>
          <p>${escapeHtml(course.description)}</p>
        </div>
        <div class="admin-actions">
          <a class="small-button" href="course.html?id=${encodeURIComponent(course.id)}">Preview</a>
          <button class="small-button" data-edit="${escapeHtml(course.id)}">Edit</button>
          <button class="small-button danger" data-delete="${escapeHtml(course.id)}">Delete</button>
        </div>
      `;
      list.appendChild(item);
    });

  $$("[data-edit]", list).forEach(button =>
    button.addEventListener("click", () => editCourse(button.dataset.edit))
  );

  $$("[data-delete]", list).forEach(button =>
    button.addEventListener("click", () => deleteCourse(button.dataset.delete))
  );
}

form.addEventListener("submit", event => {
  event.preventDefault();
  const course = readForm();
  const courses = getCustomCourses();
  const index = courses.findIndex(item => item.id === course.id);

  if (index >= 0) courses[index] = course;
  else courses.push(course);

  saveCustomCourses(courses);
  showToast(index >= 0 ? "Course updated" : "Course created");
  resetForm();
  renderCourses();
});

cancelEdit.addEventListener("click", resetForm);

$("#exportCourses").addEventListener("click", () => {
  const data = JSON.stringify(getCustomCourses(), null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "kraken-course-backup.json";
  link.click();
  URL.revokeObjectURL(url);
});

$("#importCourses").addEventListener("change", async event => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data)) throw new Error("Backup must contain a course list.");
    saveCustomCourses(data);
    showToast("Course backup imported");
    renderCourses();
  } catch (error) {
    alert(`Could not import this backup: ${error.message}`);
  } finally {
    event.target.value = "";
  }
});

$("#clearCourses").addEventListener("click", () => {
  if (!getCustomCourses().length) return;
  if (!confirm("Delete every custom course from this browser?")) return;
  saveCustomCourses([]);
  resetForm();
  renderCourses();
  showToast("All custom courses deleted");
});

renderCourses();
