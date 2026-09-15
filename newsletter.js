"use strict";

(() => {
  const form =
    document.querySelector("#mailingListForm") ||
    document.querySelector("[data-newsletter-form]");

  if (!form) return;

  const emailInput =
    form.querySelector("#mailingEmail") ||
    form.querySelector('input[type="email"]');

  const state =
    document.querySelector("#mailingListState") ||
    form.querySelector("[data-newsletter-state]");

  const button = form.querySelector('button[type="submit"]');

  function setState(message, type = "") {
    if (!state) return;
    state.textContent = message;
    state.dataset.state = type;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = String(emailInput?.value || "").trim();

    if (!email) {
      setState("Enter your email address first.", "error");
      return;
    }

    if (button) button.disabled = true;
    setState("Joining the Kraken mailing list…", "loading");

    try {
      if (typeof supabaseClient === "undefined") {
        throw new Error("Supabase is not available.");
      }

      const { data, error } = await supabaseClient.rpc(
        "subscribe_newsletter",
        {
          p_email: email,
          p_source: "homepage"
        }
      );

      if (error) throw error;

      emailInput.value = "";
      setState(
        data?.status === "resubscribed"
          ? "You're back on the list. Welcome aboard."
          : "You're on the list. Kraken updates will land here.",
        "success"
      );
    } catch (error) {
      console.error("Newsletter signup failed:", error);
      setState(error.message || "Could not join the list. Try again.", "error");
    } finally {
      if (button) button.disabled = false;
    }
  });
})();
