import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const htmlEscape = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
    const NEWSLETTER_FROM =
      Deno.env.get("NEWSLETTER_FROM") ||
      "Kraken Medical Training <news@krakenmedicaltraining.com>";
    const SITE_URL =
      (Deno.env.get("SITE_URL") || "https://kraken-medical.krakenmedicaltraining.workers.dev").replace(/\/+$/, "");

    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured.");

    // Validate the signed-in caller.
    const authHeader = req.headers.get("Authorization") || "";
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData.user) {
      return Response.json({ ok: false, error: "Not signed in." }, { status: 401, headers: corsHeaders });
    }

    const adminCheck = await authClient
      .from("admin_users")
      .select("user_id")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (adminCheck.error || !adminCheck.data) {
      return Response.json({ ok: false, error: "Admin access required." }, { status: 403, headers: corsHeaders });
    }

    const body = await req.json();
    const journalItemId = body?.journal_item_id;

    if (!journalItemId) throw new Error("journal_item_id is required.");

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: story, error: storyError } = await admin
      .from("journal_items")
      .select("id,title,slug,excerpt,cover_image_url,author,status,published_at")
      .eq("id", journalItemId)
      .single();

    if (storyError) throw storyError;
    if (story.status !== "published") throw new Error("Only published stories can be emailed.");

    const { data: subscribers, error: subscriberError } = await admin
      .from("mailing_list")
      .select("id,email,unsubscribe_token")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (subscriberError) throw subscriberError;

    if (!subscribers?.length) {
      return Response.json(
        { ok: true, sent: 0, skipped: 0, failed: 0, message: "No active subscribers." },
        { headers: corsHeaders }
      );
    }

    const storyUrl = `${SITE_URL}/journal-item.html?slug=${encodeURIComponent(story.slug)}`;
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    // Small controlled concurrency keeps this suitable for an early-stage mailing list.
    for (let i = 0; i < subscribers.length; i += 5) {
      const chunk = subscribers.slice(i, i + 5);

      await Promise.all(chunk.map(async (subscriber) => {
        const existing = await admin
          .from("newsletter_sends")
          .select("id,status")
          .eq("journal_item_id", story.id)
          .eq("subscriber_id", subscriber.id)
          .maybeSingle();

        if (existing.data?.status === "sent") {
          skipped++;
          return;
        }

        const unsubscribeUrl =
          `${SUPABASE_URL}/functions/v1/unsubscribe-newsletter?token=${encodeURIComponent(subscriber.unsubscribe_token)}`;

        const emailHtml = `<!doctype html>
<html>
<body style="margin:0;background:#f4f7f5;font-family:Arial,Helvetica,sans-serif;color:#102b35">
  <div style="display:none;max-height:0;overflow:hidden">${htmlEscape(story.excerpt)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7f5;padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #d6e3de">
        <tr>
          <td style="padding:22px 28px;background:#071b24;color:#ffffff">
            <div style="font-size:12px;font-weight:800;letter-spacing:2px;color:#48d6bd">KRAKEN MEDICAL TRAINING</div>
            <div style="margin-top:6px;font-size:14px;color:#bfd0cc">News from Kraken</div>
          </td>
        </tr>
        ${story.cover_image_url ? `<tr><td><img src="${htmlEscape(story.cover_image_url)}" alt="" width="680" style="display:block;width:100%;max-height:380px;object-fit:cover"></td></tr>` : ""}
        <tr>
          <td style="padding:34px 30px 38px">
            <div style="font-size:12px;font-weight:800;letter-spacing:1.5px;color:#18a88e">LATEST NEWS</div>
            <h1 style="margin:12px 0 14px;font-size:36px;line-height:1.05;color:#071b24">${htmlEscape(story.title)}</h1>
            <p style="margin:0 0 26px;font-size:18px;line-height:1.6;color:#526b68">${htmlEscape(story.excerpt)}</p>
            <a href="${storyUrl}" style="display:inline-block;padding:14px 20px;border-radius:10px;background:#e06d42;color:#ffffff;text-decoration:none;font-weight:800">Read full story →</a>
          </td>
        </tr>
        <tr>
          <td style="padding:22px 30px;background:#edf3f0;color:#617673;font-size:12px;line-height:1.6">
            You received this because you joined the Kraken Medical Training mailing list.<br>
            <a href="${unsubscribeUrl}" style="color:#0c806d">Unsubscribe</a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

        const logPayload = {
          journal_item_id: story.id,
          subscriber_id: subscriber.id,
          email: subscriber.email,
          status: "queued",
        };

        const { data: logRow } = await admin
          .from("newsletter_sends")
          .upsert(logPayload, {
            onConflict: "journal_item_id,subscriber_id",
            ignoreDuplicates: false,
          })
          .select("id")
          .single();

        try {
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
              "Idempotency-Key": `kraken-news-${story.id}-${subscriber.id}`,
            },
            body: JSON.stringify({
              from: NEWSLETTER_FROM,
              to: [subscriber.email],
              subject: story.title,
              html: emailHtml,
              headers: {
                "List-Unsubscribe": `<${unsubscribeUrl}>`,
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
              },
            }),
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result?.message || result?.error || `Resend returned ${response.status}`);
          }

          sent++;

          if (logRow?.id) {
            await admin.from("newsletter_sends").update({
              status: "sent",
              provider_message_id: result.id || null,
              sent_at: new Date().toISOString(),
              error_message: null,
            }).eq("id", logRow.id);
          }
        } catch (error) {
          failed++;

          if (logRow?.id) {
            await admin.from("newsletter_sends").update({
              status: "failed",
              error_message: error instanceof Error ? error.message : String(error),
            }).eq("id", logRow.id);
          }
        }
      }));
    }

    return Response.json(
      { ok: true, sent, skipped, failed, subscribers: subscribers.length },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error(error);
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 400, headers: corsHeaders }
    );
  }
});
