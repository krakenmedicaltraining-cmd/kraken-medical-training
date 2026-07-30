"use strict";
(() => {
  const $ = s => document.querySelector(s);

  async function init() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
      location.href = "student-login.html";
      return;
    }

    const existing = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (existing.data) {
      $("#firstName").value = existing.data.first_name || "";
      $("#lastName").value = existing.data.last_name || "";
      $("#displayName").value = existing.data.display_name || "";
      $("#organisation").value = existing.data.organisation || "";
      $("#rankRole").value = existing.data.rank_role || "";
    }

    if (!$("#displayName").value) {
      $("#displayName").value =
        session.user.user_metadata?.full_name || "";
    }
  }

  $("#setupForm").addEventListener("submit", async event => {
    event.preventDefault();
    $("#status").textContent = "Saving profile…";

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;

    const payload = {
      user_id: session.user.id,
      first_name: $("#firstName").value.trim(),
      last_name: $("#lastName").value.trim(),
      display_name: $("#displayName").value.trim(),
      organisation: $("#organisation").value.trim() || null,
      rank_role: $("#rankRole").value.trim() || null,
      updated_at: new Date().toISOString()
    };

    const result = await supabaseClient
      .from("profiles")
      .upsert(payload, { onConflict: "user_id" });

    if (result.error) {
      $("#status").textContent = result.error.message;
      return;
    }

    await supabaseClient.auth.updateUser({
      data: { full_name: payload.display_name }
    });

    location.href = "dashboard.html";
  });

  init().catch(error => {
    $("#status").textContent = error.message;
  });
})();
