"use strict";

let snapshot = {
  profiles: [],
  progress: [],
  certificates: [],
  courses: []
};

let achievements = [];

const e = escapeHtml;
const fmt = date =>
  date ? new Date(date).toLocaleDateString() : "Never";

function render() {
  const completed =
    snapshot.progress.filter(item => item.completed);

  const scores = snapshot.progress
    .map(item => Number(item.final_score))
    .filter(Number.isFinite);

  $("#learnerCount").textContent =
    snapshot.profiles.length;

  $("#completionCount").textContent =
    completed.length;

  $("#averageScore").textContent =
    `${scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0}%`;

  $("#certificateCount").textContent =
    snapshot.certificates.filter(item => !item.revoked).length;

  renderLearners();
  renderCourses();
  renderCertificates();
}

function renderLearners() {
  const term = $("#learnerSearch").value.toLowerCase();

  $("#learnerRows").innerHTML =
    snapshot.profiles.map(profile => {
      const rows = snapshot.progress.filter(
        item => item.user_id === profile.user_id
      );

      const searchText = (
        profile.display_name +
        " " +
        rows.map(item => item.courses?.title || "").join(" ")
      ).toLowerCase();

      if (term && !searchText.includes(term)) return "";

      const scores = rows
        .map(item => Number(item.final_score))
        .filter(Number.isFinite);

      const average = scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;

      const last = rows
        .map(item => item.last_opened_at)
        .filter(Boolean)
        .sort()
        .at(-1);

      return `
        <tr>
          <td><strong>${e(profile.display_name)}</strong></td>
          <td>${profile.xp || 0}</td>
          <td>${rows.filter(item => item.completed).length}/${rows.length}</td>
          <td>${average}%</td>
          <td>
            ${fmt(last)}
            <br>
            <button
              class="small-button"
              data-enrol="${profile.user_id}"
            >
              Grant course
            </button>
          </td>
        </tr>
      `;
    }).join("") ||
    '<tr><td colspan="5">No matching learners.</td></tr>';

  $$("[data-enrol]").forEach(button => {
    button.onclick = async () => {
      const courseId = prompt(
        "Enter the course ID to grant access to:"
      );

      if (!courseId) return;

      await grantCourseAccess(
        button.dataset.enrol,
        courseId.trim()
      );

      showToast("Course access granted");
    };
  });
}

function renderCourses() {
  $("#courseAnalytics").innerHTML =
    snapshot.courses.map(course => {
      const rows = snapshot.progress.filter(
        item => item.course_id === course.id
      );

      const completed =
        rows.filter(item => item.completed).length;

      const rate = rows.length
        ? Math.round((completed / rows.length) * 100)
        : 0;

      const scores = rows
        .map(item => Number(item.final_score))
        .filter(Number.isFinite);

      const average = scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;

      return `
        <article class="panel analytics-card">
          <span class="tag">${e(course.status)}</span>
          <h3>${e(course.title)}</h3>

          <div class="metric-row">
            <span>Started <strong>${rows.length}</strong></span>
            <span>Completed <strong>${completed}</strong></span>
            <span>Average <strong>${average}%</strong></span>
          </div>

          <div class="progress-track">
            <span style="width:${rate}%"></span>
          </div>

          <small>${rate}% completion rate</small>
        </article>
      `;
    }).join("");
}

function renderCertificates() {
  $("#certificateAdmin").innerHTML =
    snapshot.certificates.map(certificate => `
      <article class="admin-course">
        <div class="admin-course-icon">📜</div>

        <div>
          <h3>${e(certificate.learner_name)}</h3>
          <p>
            ${e(certificate.course_title)}
            ·
            ${certificate.final_score ?? 100}%
            ·
            ${e(certificate.certificate_code)}
          </p>

          <span class="tag">
            ${certificate.revoked ? "Revoked" : "Active"}
          </span>
        </div>

        <button
          class="small-button ${certificate.revoked ? "" : "danger"}"
          data-cert="${certificate.id}"
          data-state="${certificate.revoked ? "restore" : "revoke"}"
        >
          ${certificate.revoked ? "Restore" : "Revoke"}
        </button>
      </article>
    `).join("") ||
    '<div class="empty-panel">No certificates issued yet.</div>';

  $$("[data-cert]").forEach(button => {
    button.onclick = async () => {
      const revoke =
        button.dataset.state === "revoke";

      const reason = revoke
        ? prompt("Reason for revocation (optional)") || ""
        : "";

      await setCertificateRevoked(
        button.dataset.cert,
        revoke,
        reason
      );

      await load();
    };
  });
}

async function renderAnnouncements() {
  const items = await getAllAnnouncements();

  $("#announcementList").innerHTML =
    items.map(item => `
      <article class="admin-course">
        <div class="admin-course-icon">📣</div>

        <div>
          <h3>${e(item.title)}</h3>
          <p>${e(item.message)}</p>
          <small>
            ${fmt(item.created_at)}
            ${item.expires_at
              ? ` · expires ${fmt(item.expires_at)}`
              : ""}
          </small>
        </div>

        <button
          class="small-button danger"
          data-ann="${item.id}"
        >
          Delete
        </button>
      </article>
    `).join("") ||
    '<div class="empty-panel">No announcements.</div>';

  $$("[data-ann]").forEach(button => {
    button.onclick = async () => {
      if (!confirm("Delete this announcement?")) return;

      await deleteAnnouncementOnline(button.dataset.ann);
      renderAnnouncements();
    };
  });
}

function resetAchievementForm() {
  $("#achievementForm").reset();
  $("#achievementId").value = "";
  $("#achievementIcon").value = "🏅";
  $("#achievementTarget").value = 1;
  $("#achievementSort").value = 0;
  $("#achievementActive").checked = true;
}

function achievementPayload() {
  return {
    id: $("#achievementId").value || undefined,
    name: $("#achievementName").value.trim(),
    icon: $("#achievementIcon").value.trim() || "🏅",
    description: $("#achievementDescription").value.trim(),
    unlock_text: $("#achievementUnlockText").value.trim(),
    rule_type: $("#achievementRuleType").value,
    target_value: Number($("#achievementTarget").value || 1),
    required_course_id: $("#achievementCourse").value || null,
    required_category: $("#achievementCategory").value.trim() || null,
    sort_order: Number($("#achievementSort").value || 0),
    is_active: $("#achievementActive").checked
  };
}

async function loadAchievements() {
  const result = await supabaseClient
    .from("achievement_definitions")
    .select("*")
    .order("sort_order")
    .order("created_at");

  if (result.error) throw result.error;

  achievements = result.data || [];
  renderAchievementAdmin();
}

function renderAchievementAdmin() {
  $("#achievementAdminList").innerHTML = achievements.length
    ? achievements.map(item => `
        <article class="achievement-admin-item">
          <span class="achievement-icon">${e(item.icon || "🏅")}</span>

          <div>
            <strong>${e(item.name)}</strong>
            <p>${e(item.unlock_text)}</p>
            <small>
              ${e(item.rule_type)}
              · target ${Number(item.target_value || 1)}
              · ${item.is_active ? "Active" : "Disabled"}
            </small>
          </div>

          <div>
            <button class="small-button" data-ach-edit="${item.id}">
              Edit
            </button>
            <button class="small-button danger" data-ach-delete="${item.id}">
              Delete
            </button>
          </div>
        </article>
      `).join("")
    : `<div class="empty-panel">No achievement badges created yet.</div>`;

  $$("[data-ach-edit]").forEach(button => {
    button.onclick = () => {
      const item = achievements.find(
        achievement => achievement.id === button.dataset.achEdit
      );

      if (!item) return;

      $("#achievementId").value = item.id;
      $("#achievementName").value = item.name || "";
      $("#achievementIcon").value = item.icon || "🏅";
      $("#achievementDescription").value = item.description || "";
      $("#achievementUnlockText").value = item.unlock_text || "";
      $("#achievementRuleType").value = item.rule_type || "course_count";
      $("#achievementTarget").value = item.target_value || 1;
      $("#achievementCourse").value = item.required_course_id || "";
      $("#achievementCategory").value = item.required_category || "";
      $("#achievementSort").value = item.sort_order || 0;
      $("#achievementActive").checked = item.is_active !== false;

      location.hash = "achievementManager";
    };
  });

  $$("[data-ach-delete]").forEach(button => {
    button.onclick = async () => {
      if (!confirm("Delete this badge definition?")) return;

      const result = await supabaseClient
        .from("achievement_definitions")
        .delete()
        .eq("id", button.dataset.achDelete);

      if (result.error) throw result.error;

      await loadAchievements();
    };
  });
}

function loadAchievementCourseOptions() {
  $("#achievementCourse").innerHTML = `
    <option value="">None</option>
    ${snapshot.courses.map(course => `
      <option value="${e(course.id)}">${e(course.title)}</option>
    `).join("")}
  `;
}

async function load() {
  snapshot = await getInstructorSnapshot();

  render();
  loadAchievementCourseOptions();

  await Promise.all([
    renderAnnouncements(),
    loadAchievements()
  ]);
}

$("#learnerSearch").oninput = renderLearners;

$("#achievementForm").onsubmit = async event => {
  event.preventDefault();

  const payload = achievementPayload();

  if (!payload.id) delete payload.id;

  const query = payload.id
    ? supabaseClient
        .from("achievement_definitions")
        .update(payload)
        .eq("id", payload.id)
    : supabaseClient
        .from("achievement_definitions")
        .insert(payload);

  const result = await query.select().single();

  if (result.error) {
    alert(result.error.message);
    return;
  }

  resetAchievementForm();
  showToast("Achievement saved");
  await loadAchievements();
};

$("#cancelAchievementEdit").onclick =
  resetAchievementForm;

$("#announcementForm").onsubmit = async event => {
  event.preventDefault();

  await saveAnnouncementOnline({
    title: $("#announcementTitle").value.trim(),
    message: $("#announcementMessage").value.trim(),
    expires_at: $("#announcementExpiry").value
      ? new Date($("#announcementExpiry").value).toISOString()
      : null
  });

  event.target.reset();
  showToast("Announcement published");
  renderAnnouncements();
};

$("#logout").onclick = async () => {
  await supabaseClient.auth.signOut();
  location.href = "index.html";
};

(async () => {
  try {
    await requireAdmin();
    resetAchievementForm();
    await load();
  } catch (error) {
    document.querySelector("main").innerHTML = `
      <section class="page-hero">
        <h1>Access denied</h1>
        <p>${e(error.message)}</p>
      </section>
    `;
  }
})();
