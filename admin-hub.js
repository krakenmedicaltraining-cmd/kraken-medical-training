"use strict";
(async () => {
  const sessionResult = await supabaseClient.auth.getSession();
  const session = sessionResult.data.session;

  if (!session) {
    location.href = "login.html";
    return;
  }

  const adminResult = await supabaseClient
    .from("admin_users")
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (!adminResult.data) {
    alert("This page is only available to Kraken administrators.");
    location.href = "index.html";
    return;
  }

  document.querySelector("#signOut").onclick = async () => {
    await supabaseClient.auth.signOut();
    location.href = "index.html";
  };
})().catch(error => {
  console.error(error);
  alert(`Admin Hub could not start: ${error.message}`);
});
