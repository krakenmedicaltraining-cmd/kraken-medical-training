"use strict";

(() => {
  const $ = selector => document.querySelector(selector);
  const escape = value => escapeHtml(String(value ?? ""));

  function formatCertificateDate(value) {
    if (!value) return "Date unavailable";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Date unavailable";
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  function renderStudyCalendar(items) {
    const dates = new Set();

    items.forEach(item => {
      if (item.last_opened_at) dates.add(item.last_opened_at.slice(0, 10));
      if (item.completed_at) dates.add(item.completed_at.slice(0, 10));
    });

    const now = new Date();
    const days = [];

    for (let index = 27; index >= 0; index -= 1) {
      const date = new Date(now);
      date.setDate(now.getDate() - index);
      const key = date.toISOString().slice(0, 10);

      days.push(`
        <span class="study-day ${dates.has(key) ? "active" : ""}" title="${key}">
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

  function renderCertificates(certificates, profile) {
    const list = $("#certificateList");
    const count = $("#certificateCount");

    if (count) count.textContent = certificates.length;

    if (!certificates.length) {
      list.innerHTML = `
        <div class="mission-empty-card">
          <span>📜</span>
          <div>
            <strong>No certificates yet</strong>
            <p>Complete an eligible course to earn your first certificate.</p>
          </div>
        </div>
      `;
      return;
    }

    list.innerHTML = certificates.map(certificate => {
      const title = certificate.course_title || certificate.course_id || "Completed course";
      const learner = certificate.learner_name || profile?.display_name || "Learner";
      const score = certificate.final_score ?? 100;
      const code = certificate.certificate_code || certificate.id || "Certificate";
      const issued = formatCertificateDate(certificate.issued_at);
      const href = `certificate.html?course=${encodeURIComponent(certificate.course_id)}`;

      return `
        <article class="mission-certificate-card">
          <div class="mission-certificate-preview">
            <span class="mission-certificate-earned">✓ Completed</span>

            <div class="mission-certificate-brand">
              <img src="assets/kraken-medical-logo.png" alt="">
              <span>
                <strong>KRAKEN</strong>
                <small>MEDICAL TRAINING</small>
              </span>
            </div>

            <div class="mission-certificate-copy">
              <small>CERTIFICATE OF COMPLETION</small>
              <strong>${escape(learner)}</strong>
              <span>has successfully completed</span>
              <h3>${escape(title)}</h3>
            </div>

            <div class="mission-certificate-preview-footer">
              <span>${escape(issued)}</span>
              <b>KMT</b>
              <span>${escape(score)}%</span>
            </div>
          </div>

          <div class="mission-certificate-details">
            <div class="mission-certificate-heading">
              <div>
                <span class="eyebrow">COURSE CERTIFICATE</span>
                <h3>${escape(title)}</h3>
              </div>
              <span class="mission-certificate-score">${escape(score)}%</span>
            </div>

            <div class="mission-certificate-meta">
              <span>Issued ${escape(issued)}</span>
              <span class="mission-certificate-code" title="${escape(code)}">${escape(code)}</span>
            </div>

            <div class="mission-certificate-actions">
              <a class="mission-certificate-view" href="${href}">View certificate</a>
              <button
                class="mission-certificate-copy-button"
                type="button"
                data-certificate-code="${escape(code)}"
                title="Copy certificate code"
              >Copy code</button>
            </div>
          </div>
        </article>
      `;
    }).join("");

    list.querySelectorAll("[data-certificate-code]").forEach(button => {
      button.addEventListener("click", async () => {
        const original = button.textContent;
        try {
          await navigator.clipboard.writeText(button.dataset.certificateCode || "");
          button.textContent = "Copied ✓";
        } catch {
          button.textContent = "Copy failed";
        }
        setTimeout(() => button.textContent = original, 1200);
      });
    });
  }

  function achievementDetail(item) {
    const root = $("#achievementDetailRoot");
    const earned = Boolean(item.earned);

    root.innerHTML = `
      <div class="achievement-detail-backdrop">
        <article class="achievement-detail">
          <span class="achievement-icon">${escape(item.icon || "🏅")}</span>
          <small>${earned ? "ACHIEVEMENT EARNED" : "LOCKED ACHIEVEMENT"}</small>
          <h2>${escape(item.name)}</h2>
          <p>${escape(item.description || "")}</p>
          <p><strong>How to unlock:</strong><br>${escape(item.unlock_text || "")}</p>
          <div class="achievement-progress">
            <span style="width:${Math.max(0, Math.min(100, Number(item.progress_percent || 0)))}%"></span>
          </div>
          <p>${earned
            ? `Earned ${new Date(item.awarded_at).toLocaleDateString()}`
            : `${Number(item.current_value || 0)} of ${Number(item.target_value || 1)}`}</p>
          <div class="achievement-detail-actions">
            <button class="button" id="closeAchievementDetail">Close</button>
          </div>
        </article>
      </div>
    `;

    $("#closeAchievementDetail").onclick = () => root.innerHTML = "";
  }

  async function renderAchievements() {
    await window.KrakenAchievements.evaluate();
    const catalogue = await window.KrakenAchievements.getCatalogue();

    $("#achievementCabinet").innerHTML = catalogue.length
      ? catalogue.map(item => `
          <button class="achievement-card ${item.earned ? "earned" : "locked"}"
            data-achievement-id="${escape(item.id)}" type="button">
            <span class="achievement-icon">${escape(item.icon || "🏅")}</span>
            <small>${item.earned ? "EARNED" : "LOCKED"}</small>
            <h3>${escape(item.name)}</h3>
            <p>${escape(item.unlock_text || item.description || "")}</p>
            <div class="achievement-progress">
              <span style="width:${Math.max(0, Math.min(100, Number(item.progress_percent || 0)))}%"></span>
            </div>
            <small>${item.earned
              ? `Earned ${new Date(item.awarded_at).toLocaleDateString()}`
              : `${Number(item.current_value || 0)} of ${Number(item.target_value || 1)}`}</small>
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

    const [profile, items, certificates, announcements] = await Promise.all([
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

    $("#welcome").textContent = `Welcome back, ${profile.display_name}`;
    $("#xp").textContent = profile.xp || 0;
    $("#level").textContent = `Level ${Math.floor((profile.xp || 0) / 500) + 1}`;
    $("#completed").textContent = items.filter(item => item.completed).length;
    $("#active").textContent = items.filter(item => !item.completed).length;

    $("#courses").innerHTML = items.length
      ? items.map(item => `
          <a class="card mission-course-card"
            href="course.html?id=${encodeURIComponent(item.course_id)}">
            <span class="card-icon">${escape(item.courses?.icon || "K")}</span>
            <div class="mission-course-copy">
              <h3>${escape(item.courses?.title || item.course_id)}</h3>
              <div class="progress-track">
                <span style="width:${item.percent || 0}%"></span>
              </div>
              <strong>${item.percent || 0}% complete</strong>
            </div>
          </a>
        `).join("")
      : `<div class="empty-panel">
          <h3>Start your first course</h3>
          <a class="button" href="courses.html">Browse courses</a>
        </div>`;

    renderCertificates(certificates, profile);
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