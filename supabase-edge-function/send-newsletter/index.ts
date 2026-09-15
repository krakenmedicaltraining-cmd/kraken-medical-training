import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
Deno.serve(async(req)=>{
  try{
    const {item_id}=await req.json();
    const url=Deno.env.get("SUPABASE_URL")!, service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, key=Deno.env.get("RESEND_API_KEY")!, from=Deno.env.get("NEWSLETTER_FROM")!, site=(Deno.env.get("SITE_URL")||"").replace(/\/$/,"");
    if(!item_id||!key||!from) return new Response(JSON.stringify({error:"Missing item_id or email secrets"}),{status:400});
    const sb=createClient(url,service);
    const {data:item,error}=await sb.from("journal_items").select("*").eq("id",item_id).eq("status","published").single(); if(error)throw error;
    if(item.newsletter_sent_at) return Response.json({ok:true,already_sent:true});
    const {data:subs,error:se}=await sb.from("mailing_list").select("email").eq("is_active",true); if(se)throw se;
    const recipients=(subs||[]).map(x=>x.email).filter(Boolean);
    const story=`${site}/journal-item.html?slug=${encodeURIComponent(item.slug)}`;
    const batches=[]; for(let i=0;i<recipients.length;i+=100)batches.push(recipients.slice(i,i+100));
    for(const batch of batches){
      const emails=batch.map(to=>({from,to:[to],subject:item.title,html:`<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#102b35"><div style="background:#071b24;padding:24px;color:white"><b>KRAKEN MEDICAL TRAINING</b></div>${item.cover_image_url?`<img src="${item.cover_image_url}" style="width:100%;display:block">`:""}<div style="padding:28px"><div style="color:#18a88e;font-weight:700;text-transform:uppercase">${item.category||"Kraken News"}</div><h1>${item.title}</h1><p style="font-size:18px;line-height:1.6">${item.excerpt||""}</p><p><a href="${story}" style="display:inline-block;background:#e06d42;color:white;padding:14px 18px;border-radius:10px;text-decoration:none;font-weight:700">Read full story</a></p><p style="margin-top:32px;color:#71817e;font-size:12px">You are receiving Kraken Medical Training news because you joined our mailing list.</p></div></div>`}));
      const rr=await fetch("https://api.resend.com/emails/batch",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify(emails)}); if(!rr.ok)throw new Error(await rr.text());
    }
    await sb.from("journal_items").update({newsletter_sent_at:new Date().toISOString()}).eq("id",item_id);
    return Response.json({ok:true,sent:recipients.length});
  }catch(e){return new Response(JSON.stringify({error:String(e?.message||e)}),{status:500,headers:{"Content-Type":"application/json"}})}
});