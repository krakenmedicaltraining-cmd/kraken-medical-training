const form = $("#courseForm");
const list = $("#adminCourseList");
const editingId = $("#editingId");
const cancelEdit = $("#cancelEdit");
const adminStatus = $("#adminStatus");
let onlineCourses = [];

function setBusy(busy, message = "") {
  $("#saveButton").disabled = busy;
  $("#saveButton").textContent = busy ? (message || "Saving…") : (editingId.value ? "Update course" : "Save course");
}

function courseFromForm() {
  const title = $("#courseTitle").value.trim();
  return {
    id: editingId.value || createCourseId(title),
    icon: $("#courseIcon").value.trim() || title.slice(0, 3).toUpperCase(),
    title,
    status: $("#courseStatus").value,
    category: $("#courseCategory").value,
    description: $("#courseDescription").value.trim(),
    lessons: $("#courseLessons").value.split("\n").map(v => v.trim()).filter(Boolean),
    pdf_url: $("#coursePdf").value.trim(),
    video_url: $("#courseVideo").value.trim()
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
  const course = onlineCourses.find(item => item.id === id);
  if (!course) return;

  editingId.value = course.id;
  $("#courseIcon").value = course.icon || "";
  $("#courseStatus").value = course.status || "Draft";
  $("#courseTitle").value = course.title || "";
  $("#courseCategory").value = course.category || "Clinical skills";
  $("#courseDescription").value = course.description || "";
  $("#courseLessons").value = (course.lessons || []).join("\n");
  $("#coursePdf").value = course.pdf_url || "";
  $("#courseVideo").value = course.video_url || "";
  $("#formEyebrow").textContent = "Editing course";
  $("#formTitle").textContent = course.title;
  $("#saveButton").textContent = "Update course";
  cancelEdit.hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function removeCourse(id) {
  const course = onlineCourses.find(item => item.id === id);
  if (!course || !confirm(`Delete "${course.title}" from the live website?`)) return;

  try {
    await deleteCourseOnline(id);
    showToast("Course deleted");
    await loadCourses();
  } catch (error) {
    alert(`Could not delete course: ${error.message}`);
  }
}

function renderCourses() {
  list.innerHTML = "";

  if (!onlineCourses.length) {
    list.innerHTML = `<div class="empty-panel">No online courses yet. Add your first course using the form.</div>`;
    return;
  }

  onlineCourses.forEach(course => {
    const item = document.createElement("article");
    item.className = "admin-course";
    item.innerHTML = `
      <div class="admin-course-icon">${escapeHtml(course.icon || "K")}</div>
      <div>
        <span class="tag">${escapeHtml(course.status)} · ${escapeHtml(course.category)}</span>
        <h3>${escapeHtml(course.title)}</h3>
        <p>${escapeHtml(course.description)}</p>
      </div>
      <div class="admin-actions">
        <a class="small-button" href="course.html?id=${encodeURIComponent(course.id)}">Preview</a>
        <button class="small-button" data-edit="${escapeHtml(course.id)}">Edit</button>
        <button class="small-button danger" data-delete="${escapeHtml(course.id)}">Delete</button>
      </div>`;
    list.appendChild(item);
  });

  $$("[data-edit]", list).forEach(button =>
    button.addEventListener("click", () => editCourse(button.dataset.edit))
  );
  $$("[data-delete]", list).forEach(button =>
    button.addEventListener("click", () => removeCourse(button.dataset.delete))
  );
}

async function loadCourses() {
  list.innerHTML = `<div class="empty-panel">Loading live courses…</div>`;
  onlineCourses = await getAllCoursesOnline();
  renderCourses();
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  const course = courseFromForm();

  try {
    setBusy(true, "Uploading…");
    const file = $("#courseFile").files?.[0];

    if (file) {
      course.pdf_url = await uploadCourseFile(file, course.id);
      $("#coursePdf").value = course.pdf_url;
    }

    setBusy(true, "Saving…");
    await saveCourseOnline(course);
    showToast(editingId.value ? "Course updated online" : "Course published online");
    resetForm();
    await loadCourses();
  } catch (error) {
    alert(`Could not save the course: ${error.message}`);
  } finally {
    setBusy(false);
  }
});

cancelEdit.addEventListener("click", resetForm);

$("#exportCourses").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(onlineCourses, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "kraken-online-course-backup.json";
  link.click();
  URL.revokeObjectURL(url);
});

$("#migrateLocal").addEventListener("click", async () => {
  const localCourses = getCustomCourses();
  if (!localCourses.length) {
    alert("No V4 local courses were found in this browser.");
    return;
  }

  if (!confirm(`Import ${localCourses.length} local course(s) into the live database?`)) return;

  try {
    for (const local of localCourses) {
      await saveCourseOnline({
        ...local,
        pdf_url: local.pdf || local.pdf_url || "",
        video_url: local.video || local.video_url || ""
      });
    }
    showToast("Local courses imported online");
    await loadCourses();
  } catch (error) {
    alert(`Import stopped: ${error.message}`);
  }
});

$("#signOutButton").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  location.href = "login.html";
});

(async function initialiseAdmin() {
  try {
    const session = await requireAdmin();
    if (!session) return;
    adminStatus.innerHTML = `<strong>Connected:</strong> Signed in as ${escapeHtml(session.user.email || "administrator")}. Changes publish to the live website.`;
    await loadCourses();
  } catch (error) {
    adminStatus.innerHTML = `<strong>Access denied:</strong> ${escapeHtml(error.message)}`;
    form.hidden = true;
    list.innerHTML = `<div class="empty-panel"><a class="button" href="login.html">Return to login</a></div>`;
  }
})();
