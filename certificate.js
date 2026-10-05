"use strict";

(() => {
  const $ = selector => document.querySelector(selector);

  const params = new URLSearchParams(window.location.search);
  const courseId = params.get("course") || params.get("id");
  const certificateCode = params.get("code");

  function showStatus(message) {
    const status = $("#certificateStatus");
    const card = $("#certificateCard");
    if (status) {
      status.textContent = message;
      status.hidden = false;
    }
    if (card) card.hidden = true;
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  async function findIssuedCertificate(userId) {
    // course_id in the real Kraken certificates table is TEXT.
    const { data, error } = await supabaseClient
      .from("certificates")
      .select("id,certificate_code,user_id,course_id,learner_name,course_title,final_score,issued_at")
      .eq("user_id", userId)
      .eq("course_id", String(courseId))
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async function loadManualCertificate() {
    const { data, error } = await supabaseClient.from("manual_certificates").select("*").eq("certificate_code", certificateCode).maybeSingle();
    if (error) throw error;
    if (!data) { showStatus("Certificate not found."); return; }
    $("#learnerName").textContent = data.learner_name || "Learner";
    $("#courseTitle").textContent = data.course_title || "Completed course";
    const training = formatDate(data.training_date || data.issued_at);
    const issuedDate = $("#trainingDate") || $("#issuedDate");
    if (issuedDate) issuedDate.textContent = training ? "Completed " + training : "Certificate issued";
    const instructor = $("#instructorName"); if (instructor) { instructor.textContent = data.instructor_name ? "Instructor: " + data.instructor_name : ""; instructor.hidden = !data.instructor_name; }
    const locationEl = $("#locationName"); if (locationEl) { locationEl.textContent = data.location ? "Location: " + data.location : ""; locationEl.hidden = !data.location; }
    const durationEl = $("#duration"); if (durationEl) { durationEl.textContent = data.duration ? "Duration: " + data.duration : ""; durationEl.hidden = !data.duration; }
    $("#finalScore").textContent = data.final_score !== null && data.final_score !== undefined ? "Score: " + data.final_score + "%" : "";
    const expiry = $("#expiryDate"); if (expiry) expiry.textContent = data.expires_at ? "Expires " + formatDate(data.expires_at) : "No expiry";
    $("#certificateCode").textContent = "Certificate code: " + data.certificate_code;
    const inner = $("#certificateInner"); if (inner && data.border_colour) { inner.style.borderColor = data.border_colour; inner.style.outlineColor = data.border_colour; }
    const logoWrap = $("#certificateLogoWrap"); const logo = $("#certificateLogo"); if (logoWrap && logo) { if (data.logo_url) { logo.src = data.logo_url; logoWrap.hidden = false; } else { logoWrap.hidden = true; } }
    const expired = data.expires_at && new Date(data.expires_at + "T23:59:59") < new Date();
    const validity = $("#certificateValidity"); if (validity) validity.textContent = data.revoked || data.status === "revoked" ? "Certificate revoked" : expired ? "Certificate expired" : "Verified training certificate";
    $("#certificateStatus").hidden = true; $("#certificateCard").hidden = false;
    document.title = (data.course_title || "Course") + " Certificate | Kraken Medical Training";
  }

  async function initialiseCertificate() {
    if (certificateCode) { showStatus("Loading certificate…"); await loadManualCertificate(); return; }
    const { data: sessionData, error: sessionError } =
      await supabaseClient.auth.getSession();

    if (sessionError) throw sessionError;

    const session = sessionData.session;

    if (!session) {
      localStorage.setItem(
        "kmtReturnTo",
        window.location.pathname + window.location.search
      );
      window.location.href = "student-login.html";
      return;
    }

    if (!courseId) {
      showStatus("No course was selected.");
      return;
    }

    showStatus("Loading your certificate…");

    // V16.8 intentionally uses ONLY the real issued-certificate table.
    // It does not query course_certificate_settings or course_certificates.
    const certificate = await findIssuedCertificate(session.user.id);

    if (!certificate) {
      showStatus(
        "Certificate not issued yet. Return to the course and make sure all required lessons and the final quiz are complete."
      );
      return;
    }

    $("#learnerName").textContent =
      certificate.learner_name ||
      session.user.user_metadata?.full_name ||
      session.user.user_metadata?.name ||
      session.user.email ||
      "Learner";

    $("#courseTitle").textContent =
      certificate.course_title || "Completed course";

    const issued = formatDate(certificate.issued_at);
    $("#issuedDate").textContent =
      issued ? `Issued ${issued}` : "Certificate issued";

    $("#finalScore").textContent =
      certificate.final_score !== null &&
      certificate.final_score !== undefined
        ? `Final score ${certificate.final_score}%`
        : "Course passed";

    $("#certificateCode").textContent =
      certificate.certificate_code
        ? `Certificate code: ${certificate.certificate_code}`
        : `Certificate ID: ${certificate.id}`;

    $("#certificateStatus").hidden = true;
    $("#certificateCard").hidden = false;

    document.title =
      `${certificate.course_title || "Course"} Certificate | Kraken Medical Training`;
  }

  $("#printCertificate")
    ?.addEventListener("click", () => window.print());

  initialiseCertificate().catch(error => {
    console.error("Certificate error:", error);
    showStatus(`Certificate error: ${error.message}`);
  });
})();