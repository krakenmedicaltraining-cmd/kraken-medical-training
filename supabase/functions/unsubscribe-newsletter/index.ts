import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const page = (title: string, message: string) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
</head>
<body style="margin:0;background:#f6f9f6;font-family:Arial,Helvetica,sans-serif;color:#102b35">
  <main style="max-width:620px;margin:80px auto;padding:34px;background:white;border:1px solid #d6e3de;border-radius:20px">
    <div style="font-size:12px;font-weight:800;letter-spacing:2px;color:#18a88e">KRAKEN MEDICAL TRAINING</div>
    <h1 style="font-size:34px;color:#071b24">${title}</h1>
    <p style="font-size:17px;line-height:1.6;color:#617673">${message}</p>
  </main>
</body>
</html>`;

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(page("Invalid link", "This unsubscribe link is missing its token."), {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await admin
      .from("mailing_list")
      .update({
        is_active: false,
        unsubscribed_at: new Date().toISOString(),
      })
      .eq("unsubscribe_token", token)
      .select("id")
      .maybeSingle();

    if (error) throw error;

    // RFC 8058 one-click unsubscribe requests should receive a simple success.
    if (req.method === "POST") {
      return new Response("", { status: 200 });
    }

    return new Response(
      page(
        "You're unsubscribed",
        data
          ? "You will no longer receive Kraken Medical Training newsletters. You can rejoin from the website at any time."
          : "This address is already unsubscribed, or the link is no longer active."
      ),
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (error) {
    return new Response(
      page("Something went wrong", error instanceof Error ? error.message : String(error)),
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
});
