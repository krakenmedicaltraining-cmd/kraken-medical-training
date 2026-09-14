"use strict";

(() => {
  const form = document.querySelector("#mailingListForm");
  if (!form) return;

  const email = document.querySelector("#mailingEmail");
  const state = document.querySelector("#mailingListState");

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const value = email.value.trim().toLowerCase();
    if (!value) return;

    state.textContent = "Joining…";

    const result = await supabaseClient
      .from("mailing_list")
      .upsert(
        { email:value, subscribed:true, updated_at:new Date().toISOString() },
        { onConflict:"email" }
      );

    if (result.error) {
      console.error(result.error);
      state.textContent = "Could not join right now. Please try again.";
      return;
    }

    form.reset();
    state.textContent = "You're on the list ✓";
  });
})();
