"use strict";
(async()=>{
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

  const session=await requireAdmin();
  if(!session)return;

  let subscribers=[];

  async function load(){
    const [subs,sends]=await Promise.all([
      supabaseClient.from("mailing_list").select("*").order("created_at",{ascending:false}),
      supabaseClient.from("newsletter_sends").select("*").order("created_at",{ascending:false}).limit(100)
    ]);

    if(subs.error)throw subs.error;
    if(sends.error)throw sends.error;

    subscribers=subs.data||[];
    const delivery=sends.data||[];

    $("#activeCount").textContent=subscribers.filter(x=>x.is_active).length;
    $("#inactiveCount").textContent=subscribers.filter(x=>!x.is_active).length;
    $("#sentCount").textContent=delivery.filter(x=>x.status==="sent").length;
    $("#failedCount").textContent=delivery.filter(x=>x.status==="failed").length;

    renderSubscribers();

    $("#sendList").innerHTML=delivery.length?`
      <table>
        <thead><tr><th>Email</th><th>Status</th><th>Sent</th><th>Provider ID</th></tr></thead>
        <tbody>${delivery.map(x=>`
          <tr>
            <td>${esc(x.email)}</td>
            <td><span class="nl-status ${esc(x.status)}">${esc(x.status)}</span></td>
            <td>${x.sent_at?new Date(x.sent_at).toLocaleString():"—"}</td>
            <td>${esc(x.provider_message_id||x.error_message||"—")}</td>
          </tr>`).join("")}</tbody>
      </table>`:'<div class="nl-empty">No newsletter sends yet.</div>';
  }

  function renderSubscribers(){
    const q=$("#subscriberSearch").value.trim().toLowerCase();
    const rows=subscribers.filter(x=>!q||x.email.toLowerCase().includes(q));

    $("#subscriberList").innerHTML=rows.length?`
      <table>
        <thead><tr><th>Email</th><th>Status</th><th>Source</th><th>Joined</th><th></th></tr></thead>
        <tbody>${rows.map(x=>`
          <tr>
            <td>${esc(x.email)}</td>
            <td><span class="nl-status ${x.is_active?"sent":"skipped"}">${x.is_active?"Active":"Unsubscribed"}</span></td>
            <td>${esc(x.source||"—")}</td>
            <td>${x.consented_at?new Date(x.consented_at).toLocaleDateString():"—"}</td>
            <td><button data-toggle="${x.id}" data-active="${x.is_active}">${x.is_active?"Unsubscribe":"Reactivate"}</button></td>
          </tr>`).join("")}</tbody>
      </table>`:'<div class="nl-empty">No matching subscribers.</div>';

    document.querySelectorAll("[data-toggle]").forEach(button=>{
      button.onclick=async()=>{
        const active=button.dataset.active==="true";
        const update=active
          ? {is_active:false,unsubscribed_at:new Date().toISOString()}
          : {is_active:true,unsubscribed_at:null,consented_at:new Date().toISOString()};

        const {error}=await supabaseClient.from("mailing_list").update(update).eq("id",button.dataset.toggle);
        if(error)return alert(error.message);
        await load();
      };
    });
  }

  $("#subscriberSearch").oninput=renderSubscribers;
  await load();
})().catch(e=>alert(`Mailing list could not load: ${e.message}`));
