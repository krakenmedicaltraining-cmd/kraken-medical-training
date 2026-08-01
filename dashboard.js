"use strict";

(() => {
  const $ = selector => document.querySelector(selector);
  const escape = value => escapeHtml(String(value ?? ""));

  function renderStudyCalendar(items) {
    const dates = new Set();

    items.forEach(item => {
      if (item.last_opened_at) {
        dates.add(item.last_opened_at.slice(0, 10));
      }

      if (item.completed_at) {
        dates.add(item.completed_at.slice(0, 10));
      }
    });

    const now = new Date();
    const days = [];

    for (let index = 27; index >= 0; index -= 1) {
      const date = new Date(now);
      date.setDate(now.getDate() - index);
      const key = date.toISOString().slice(0, 10);

      days.push(`
        <span
          class="study-day ${dates.has(key) ? "active" : ""}"
          title="${key}"
        >
          ${date.getDate()}
        </span>
      `);
    }

    $("#studyCalendar").innerHTML = days.join("");

    let streak = 0;
    const cursor = new Date(now);

    while (dates.has(cursor.toISOString().slice(0, 10))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    $("#streakText").textContent = streak
      ? `Current learning streak: ${streak} day${streak === 1 ? "" : "s"}`
      : "Open a course today to begin a learning streak.";
  }

  function achievementDetail(item) {
    const root = $("#achievementDetailRoot");
    const earned = Boolean(item.earned);

    root.innerHTML = `
      <div class="achievement-detail-backdrop">
        <article class="achievement-detail">
          <span class="achievement-icon">
            ${escape(item.icon || "🏅")}
          </span>

          <small>${earned ? "ACHIEVEMENT EARNED" : "LOCKED ACHIEVEMENT"}</small>
          <h2>${escape(item.name)}</h2>
          <p>${escape(item.description || "")}</p>
          <p><strong>How to unlock:</strong><br>${escape(item.unlock_text || "")}</p>

          <div class="achievement-progress">
            <span style="width:${Math.max(0, Math.min(100, Number(item.progress_percent || 0)))}%"></span>
          </div>

          <p>
            ${earned
              ? `Earned ${new Date(item.awarded_at).toLocaleDateString()}`
              : `${Number(item.current_value || 0)} of ${Number(item.target_value || 1)}`
            }
          </p>

          <div class="achievement-detail-actions">
            <button class="button" id="closeAchievementDetail">
              Close
            </button>
          </div>
        </article>
      </div>
    `;

    $("#closeAchievementDetail").onclick = () => {
      root.innerHTML = "";
    };
  }

  async function renderAchievements() {
    await window.KrakenAchievements.evaluate();
    const catalogue = await window.KrakenAchievements.getCatalogue();

    $("#achievementCabinet").innerHTML = catalogue.length
      ? catalogue.map(item => `
          <button
            class="achievement-card ${item.earned ? "earned" : "locked"}"
            data-achievement-id="${escape(item.id)}"
            type="button"
          >
            <span class="achievement-icon">
              ${escape(item.icon || "🏅")}
            </span>

            <small>${item.earned ? "EARNED" : "LOCKED"}</small>
            <h3>${escape(item.name)}</h3>
            <p>${escape(item.unlock_text || item.description || "")}</p>

            <div class="achievement-progress">
              <span style="width:${Math.max(0, Math.min(100, Number(item.progress_percent || 0)))}%"></span>
            </div>

            <small>
              ${item.earned
                ? `Earned ${new Date(item.awarded_at).toLocaleDateString()}`
                : `${Number(item.current_value || 0)} of ${Number(item.target_value || 1)}`
              }
            </small>
          </button>
        `).join("")
      : `<div class="empty-panel">No achievements are active yet.</div>`;

    document.querySelectorAll("[data-achievement-id]").forEach(button => {
      button.onclick = () => {
        const item = catalogue.find(entry => entry.id === button.dataset.achievementId);
        if (item) achievementDetail(item);
      };
    });

    await window.KrakenAchievements.showNextPopup();
  }

  async function load() {
    const session = await getCurrentSession();

    if (!session) {
      location.href = "student-login.html";
      return;
    }

    const [
      profile,
      items,
      certificates,
      announcements
    ] = await Promise.all([
      ensureLearnerProfile(),
      getMyProgress(),
      getMyCertificates(),
      getActiveAnnouncements().catch(() => [])
    ]);

    if (announcements.length) {
      $("#announcementSection").hidden = false;
      $("#dashboardAnnouncements").innerHTML = announcements.map(item => `
        <article class="notice">
          <strong>${escape(item.title)}</strong>
          <p>${escape(item.message)}</p>
        </article>
      `).join("");
    }

    renderStudyCalendar(items);

    $("#welcome").textContent =
      `Welcome back, ${profile.display_name}`;

    $("#xp").textContent = profile.xp || 0;
    $("#level").textContent =
      `Level ${Math.floor((profile.xp || 0) / 500) + 1}`;

    $("#completed").textContent =
      items.filter(item => item.completed).length;

    $("#active").textContent =
      items.filter(item => !item.completed).length;

    $("#courses").innerHTML = items.length
      ? items.map(item => `
          <a
            class="card"
            href="course.html?id=${encodeURIComponent(item.course_id)}"
          >
            <span class="card-icon">
              ${escape(item.courses?.icon || "K")}
            </span>

            <h3>${escape(item.courses?.title || item.course_id)}</h3>

            <div class="progress-track">
              <span style="width:${item.percent || 0}%"></span>
            </div>

            <strong>${item.percent || 0}% complete</strong>
          </a>
        `).join("")
      : `
        <div class="empty-panel">
          <h3>Start your first course</h3>
          <a class="button" href="courses.html">Browse courses</a>
        </div>
      `;

    $("#certificateList").innerHTML = certificates.length
      ? certificates.map(certificate => `
          <a
            class="card"
            href="certificate.html?course=${encodeURIComponent(certificate.course_id)}"
          >
            <span class="card-icon">📜</span>
            <h3>${escape(certificate.course_title)}</h3>
            <p>${escape(certificate.certificate_code)}</p>
            <strong>${certificate.final_score ?? 100}%</strong>
          </a>
        `).join("")
      : `
        <div class="empty-panel">
          Complete an eligible course to earn a certificate.
        </div>
      `;

    await renderAchievements();
  }

  $("#logout").onclick = async () => {
    await supabaseClient.auth.signOut();
    location.href = "index.html";
  };

  load().catch(error => {
    console.error(error);
    $("#courses").textContent = error.message;
  });
})();
