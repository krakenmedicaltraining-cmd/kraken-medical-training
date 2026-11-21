"use strict";
(async () => {
  const price = document.getElementById("homeMembershipPrice");
  const name = document.getElementById("homeMembershipName");
  const button = document.getElementById("homeMembershipButton");
  if (!price || !name || !button || typeof supabaseClient === "undefined") return;
  try {
    const result = await supabaseClient.from("membership_plans")
      .select("name,monthly_price_pence,status").eq("status","active").limit(2);
    if (result.error) throw result.error;
    if (!result.data || result.data.length !== 1) {
      price.textContent = "Membership coming soon";
      button.textContent = "Browse courses";
      button.href = "courses.html";
      return;
    }
    const plan = result.data[0];
    name.textContent = plan.name || "Kraken All Access";
    price.textContent = "£" + (Number(plan.monthly_price_pence) / 100).toFixed(2) + " / month";
    try {
      const session = (await supabaseClient.auth.getSession()).data?.session;
      if (session?.user?.id) {
        const sub = await supabaseClient.from("membership_subscriptions")
          .select("status,current_period_end")
          .eq("learner_id",session.user.id)
          .in("status",["active","trialing"])
          .order("current_period_end",{ascending:false}).limit(1);
        if (!sub.error && sub.data?.some(s => new Date(s.current_period_end).getTime() > Date.now())) {
          button.href = "dashboard.html";
          button.textContent = "Manage your membership";
        }
      }
    } catch (error) { console.warn("Membership state unavailable:", error); }
  } catch (error) {
    console.warn("Membership offer unavailable:", error);
    price.textContent = "View membership options";
  }
})();
