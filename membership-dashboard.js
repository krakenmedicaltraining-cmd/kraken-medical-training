// Read-only membership overview; billing changes happen only in Stripe's hosted portal.
async function renderKrakenMembership(userId) {
  const mount=document.getElementById("membershipStatus");if(!mount)return;
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const fmt=s=>s?new Date(s).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}):"Unavailable";
  try {
    const {data,error}=await supabaseClient.from("membership_subscriptions")
      .select("id,status,plan_id,current_period_end,cancel_at_period_end,stripe_customer_id,created_at")
      .eq("learner_id",userId).order("created_at",{ascending:false}).limit(20);
    if(error)throw error;
    const rows=data||[];
    const entitled=rows.find(s=>["active","trialing"].includes(s.status)&&s.current_period_end&&new Date(s.current_period_end)>new Date());
    const latest=entitled||rows[0];
    if(!latest){
      mount.innerHTML='<h3>No active membership</h3><p>Buy individual courses or subscribe for access to all eligible online training.</p><a class="small-button" href="membership.html">Explore Kraken All Access</a>';return;
    }
    const plan=await supabaseClient.from("membership_plans").select("name").eq("id",latest.plan_id).maybeSingle();
    const name=plan.data?.name||"Kraken All Access";
    const state=entitled?(latest.cancel_at_period_end?"Cancels at period end":"Active"):(latest.status==="canceled"?"Cancelled":latest.status);
    mount.innerHTML='<h3>'+esc(name)+'</h3><p><strong>Status:</strong> '+esc(state)+'</p>'+
      '<p><strong>'+(latest.cancel_at_period_end?"Access ends":"Current period ends")+':</strong> '+esc(fmt(latest.current_period_end))+'</p>'+
      '<p>'+(entitled?"Your membership currently unlocks eligible online courses and resources.":"Membership access is not currently active. Individually purchased courses remain yours.")+'</p>'+
      (latest.stripe_customer_id?'<button class="small-button" type="button" id="manageKrakenMembership">Manage billing & cancellation</button>':'<a class="small-button" href="membership.html">View membership</a>')+
      '<p id="membershipBillingMessage" role="status" aria-live="polite"></p>';
    const button=document.getElementById("manageKrakenMembership");
    if(button)button.onclick=async()=>{
      // Open synchronously from the click so browsers don't block the new tab
      // while the authenticated billing portal request is in flight.
      const portalTab=window.open("about:blank","_blank");
      if(portalTab){portalTab.opener=null;portalTab.document.title="Opening Stripe billing…";}
      button.disabled=true;document.getElementById("membershipBillingMessage").textContent="Opening secure billing portal…";
      try{
        const {data:session,error:authError}=await supabaseClient.auth.getSession();
        if(authError||!session?.session?.access_token)throw Error("Please sign in again.");
        const response=await fetch("https://kraken-payments.krakenmedicaltraining.workers.dev/api/membership-portal",{
          method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.session.access_token},body:"{}"
        });
        const payload=await response.json();
        if(!response.ok)throw Error(payload.error||"Billing portal unavailable");
        if(!/^https:\/\/billing\.stripe\.com\//.test(payload.url||""))throw Error("Unexpected billing URL");
        if(portalTab && !portalTab.closed) portalTab.location.replace(payload.url);
        else window.location.assign(payload.url);
      }catch(e){if(portalTab && !portalTab.closed)portalTab.close();document.getElementById("membershipBillingMessage").textContent=e.message;button.disabled=false;}
    };
  }catch(e){mount.textContent="Membership details unavailable: "+e.message;}
}
