"use strict";

(() => {
  const $ = selector => document.querySelector(selector);

  const courseId =
    new URLSearchParams(window.location.search).get("course") ||
    new URLSearchParams(window.location.search).get("id");

  async function initialiseCertificate() {
    const sessionResult = await supabaseClient.auth.getSession();
    const session = sessionResult.data.session;

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

    const certificateResult = await supabaseClient
      .from("certificates")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("course_id", courseId)
      .maybeSingle();

    if (certificateResult.error) {
      showStatus(certificateResult.error.message);
      return;
    }

    const certificate = certificateResult.data;

    if (!certificate) {
      showStatus(
        "Certificate locked. Complete every lesson and pass the final quiz."
      );
      return;
    }

    $("#learnerName").textContent =
      certificate.learner_name || session.user.email;

    $("#courseTitle").textContent =
      certificate.course_title || "Completed course";

    $("#issuedDate").textContent =
      `Issued ${new Date(certificate.issued_at).toLocaleDateString()}`;

    $("#finalScore").textContent =
      certificate.final_score !== null &&
      certificate.final_score !== undefined
        ? `Final score ${certificate.final_score}%`
        : "Course passed";

    $("#certificateCode").textContent =
      `Certificate code: ${certificate.certificate_code}`;

    $("#certificateStatus").hidden = true;
    $("#certificateCard").hidden = false;
  }

  function showStatus(message) {
    $("#certificateStatus").textContent = message;
    $("#certificateStatus").hidden = false;
    $("#certificateCard").hidden = true;
  }

  $("#printCertificate")
    ?.addEventListener("click", () => window.print());

  initialiseCertificate().catch(error => {
    console.error(error);
    showStatus(`Certificate error: ${error.message}`);
  });
})();
