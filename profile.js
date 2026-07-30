"use strict";
(() => {
  const $ = s => document.querySelector(s);
  let session = null;

  function toast(message) {
    const el = $("#toast");
    el.textContent = message;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 2200);
  }

  function initials(name) {
    return String(name || "K")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0])
      .join("")
      .toUpperCase();
  }

  function refreshHeading() {
    const name = $("#displayName").value.trim() || "Your profile";
    $("#profileHeading").textContent = name;
    $("#avatarInitials").textContent = initials(name);
  }

  async function init() {
    const result = await supabaseClient.auth.getSession();
    session = result.data.session;

    if (!session) {
      location.href = "student-login.html";
      return;
    }

    $("#email").value = session.user.email || "";

    const profileResult = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (profileResult.error) throw profileResult.error;

    const profile = profileResult.data || {};
    $("#firstName").value = profile.first_name || "";
    $("#lastName").value = profile.last_name || "";
    $("#displayName").value =
      profile.display_name ||
      session.user.user_metadata?.full_name ||
      "";
    $("#organisation").value = profile.organisation || "";
    $("#rankRole").value = profile.rank_role || "";
    $("#bio").value = profile.bio || "";

    refreshHeading();
  }

  $("#profileForm").addEventListener("input", () => {
    $("#saveState").textContent = "Unsaved";
    refreshHeading();
  });

  $("#profileForm").addEventListener("submit", async event => {
    event.preventDefault();
    $("#saveState").textContent = "Saving…";

    const payload = {
      user_id: session.user.id,
      first_name: $("#firstName").value.trim(),
      last_name: $("#lastName").value.trim(),
      display_name: $("#displayName").value.trim(),
      organisation: $("#organisation").value.trim() || null,
      rank_role: $("#rankRole").value.trim() || null,
      bio: $("#bio").value.trim() || null,
      updated_at: new Date().toISOString()
    };

    const result = await supabaseClient
      .from("profiles")
      .upsert(payload, { onConflict: "user_id" });

    if (result.error) {
      $("#saveState").textContent = "Save failed";
      alert(result.error.message);
      return;
    }

    await supabaseClient.auth.updateUser({
      data: { full_name: payload.display_name }
    });

    $("#saveState").textContent = "Saved";
    toast("Profile updated");
  });

  $("#passwordForm").addEventListener("submit", async event => {
    event.preventDefault();

    const password = $("#newPassword").value;
    const confirmation = $("#confirmPassword").value;

    if (password !== confirmation) {
      alert("The passwords do not match.");
      return;
    }

    if (password.length < 8) {
      alert("Use at least 8 characters.");
      return;
    }

    const result = await supabaseClient.auth.updateUser({ password });

    if (result.error) {
      alert(result.error.message);
      return;
    }

    event.target.reset();
    toast("Password changed");
  });

  $("#deleteAccount").addEventListener("click", async () => {
    const first = confirm(
      "Request deletion of this account? Your profile will be disabled and you will be signed out."
    );
    if (!first) return;

    const typed = prompt('Type DELETE to confirm.');
    if (typed !== "DELETE") return;

    const requestResult = await supabaseClient
      .from("account_deletion_requests")
      .upsert({
        user_id: session.user.id,
        email: session.user.email,
        requested_at: new Date().toISOString(),
        status: "pending"
      }, { onConflict: "user_id" });

    if (requestResult.error) {
      alert(requestResult.error.message);
      return;
    }

    await supabaseClient
      .from("profiles")
      .update({
        deleted_at: new Date().toISOString(),
        display_name: "Deleted member"
      })
      .eq("user_id", session.user.id);

    await supabaseClient.auth.signOut();
    location.href = "index.html";
  });

  $("#signOut").addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    location.href = "index.html";
  });

  init().catch(error => {
    console.error(error);
    alert(error.message);
  });
})();
