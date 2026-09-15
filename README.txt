KRAKEN V16.4 - NEWS + NEWSLETTER

WHAT CHANGED
- Public Journal is renamed News.
- Homepage Continue Training section is replaced visually by Latest Kraken News.
- Existing Continue Training markup remains hidden for compatibility with current home.js.
- Homepage automatically loads the latest 3 published journal_items.
- Existing title = headline, excerpt = subtitle/standfirst, cover_image_url = picture.
- News Admin adds a Send as newsletter toggle.
- My Mission remains the home for learner progress/continue training.

DEPLOY WEBSITE
1. Upload/replace the files in this package.
2. Run supabase-v16-4-newsletter.sql in Supabase SQL Editor.
3. Redeploy Cloudflare and hard refresh.

EMAIL DELIVERY
Website News works immediately without an email provider.
For actual newsletter sending, deploy the included Supabase Edge Function named send-newsletter and set secrets:
- RESEND_API_KEY
- NEWSLETTER_FROM (example: Kraken Medical Training <news@yourdomain>)
- SITE_URL (your public Kraken URL)
The function uses the existing mailing_list table where is_active=true.
If the Edge Function is not configured, publishing still saves the News story; only email delivery will fail.
