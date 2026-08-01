"use strict";

window.KrakenAchievements = (() => {
  const safe = value => String(value ?? "");
  const escape = value =>
    safe(value).replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[character]));

  async function session() {
    const result = await supabaseClient.auth.getSession();
    if (result.error) throw result.error;
    return result.data.session;
  }

  async function evaluate() {
    const current = await session();
    if (!current) return [];

    const result = await supabaseClient.rpc(
      "evaluate_user_achievements",
      { target_user_id: current.user.id }
    );

    if (result.error) throw result.error;
    return result.data || [];
  }

  async function getCatalogue() {
    const current = await session();
    if (!current) return [];

    const result = await supabaseClient.rpc(
      "get_user_achievement_catalogue",
      { target_user_id: current.user.id }
    );

    if (result.error) throw result.error;
    return result.data || [];
  }

  async function markSeen(achievementId) {
    const current = await session();
    if (!current) return;

    const result = await supabaseClient
      .from("user_achievements")
      .update({ popup_seen_at: new Date().toISOString() })
      .eq("user_id", current.user.id)
      .eq("achievement_id", achievementId);

    if (result.error) throw result.error;
  }

  async function getUnseen() {
    const current = await session();
    if (!current) return [];

    const result = await supabaseClient
      .from("user_achievements")
      .select("achievement_id, awarded_at, achievement_definitions(*)")
      .eq("user_id", current.user.id)
      .is("popup_seen_at", null)
      .order("awarded_at", { ascending: true });

    if (result.error) throw result.error;
    return result.data || [];
  }

  function popupHtml(item) {
    const definition =
      item.achievement_definitions || item;

    return `
      <div class="achievement-popup-backdrop">
        <article class="achievement-popup">
          <span class="achievement-icon">
            ${escape(definition.icon || "🏅")}
          </span>

          <small>ACHIEVEMENT UNLOCKED</small>
          <h2>${escape(definition.name)}</h2>
          <p>${escape(definition.description || definition.unlock_text || "")}</p>

          <div class="achievement-popup-actions">
            <button
              class="button"
              data-achievement-view="${escape(definition.id)}"
            >
              View achievement
            </button>

            <button
              class="small-button"
              data-achievement-close="${escape(definition.id)}"
            >
              Continue
            </button>
          </div>
        </article>
      </div>
    `;
  }

  async function showNextPopup(rootSelector = "#achievementPopupRoot") {
    const root = document.querySelector(rootSelector);
    if (!root) return;

    const unseen = await getUnseen();
    if (!unseen.length) return;

    const item = unseen[0];
    const definition = item.achievement_definitions;

    root.innerHTML = popupHtml(item);

    root.querySelector("[data-achievement-close]").onclick = async () => {
      await markSeen(definition.id);
      root.innerHTML = "";
      showNextPopup(rootSelector);
    };

    root.querySelector("[data-achievement-view]").onclick = async () => {
      await markSeen(definition.id);
      root.innerHTML = "";
      location.href = `dashboard.html#achievements`;
    };
  }

  async function recordSimulationLaunch(simulationKey) {
    const current = await session();
    if (!current) return;

    const result = await supabaseClient
      .from("simulation_activity")
      .insert({
        user_id: current.user.id,
        simulation_key: safe(simulationKey)
      });

    if (result.error) {
      console.warn("Simulation launch could not be recorded:", result.error);
      return;
    }

    await evaluate();
    await showNextPopup();
  }

  return {
    evaluate,
    getCatalogue,
    getUnseen,
    markSeen,
    showNextPopup,
    recordSimulationLaunch
  };
})();
