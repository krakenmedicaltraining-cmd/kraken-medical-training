KRAKEN MEDICAL TRAINING V16.6
NEWS + AUTOMATIC NEWSLETTER

WHAT THIS DOES
- Homepage mailing-list signup stores/re-activates subscribers in Supabase.
- News Builder has "Send as newsletter".
- Saving a Published story with that box ticked calls a protected Supabase Edge Function.
- The function verifies the caller is in admin_users.
- It fetches active subscribers server-side.
- Each subscriber gets an individual branded email.
- Email includes cover picture, headline, subtitle and Read full story button.
- Every email has an unsubscribe link plus List-Unsubscribe headers.
- newsletter_sends logs sent / failed emails and prevents duplicate sends.
- newsletter-admin.html lets admins view subscribers and recent delivery history.

FILES TO PUT IN WEBSITE ROOT
- newsletter.js                  REPLACE
- journal-admin.html             REPLACE
- journal-admin.js               REPLACE
- newsletter-admin.html          NEW
- newsletter-admin.js            NEW
- newsletter-admin.css           NEW

DATABASE
Run supabase-v16-6-newsletter.sql in Supabase SQL Editor.

EDGE FUNCTIONS
Deploy:
- supabase/functions/send-newsletter/index.ts
- supabase/functions/unsubscribe-newsletter/index.ts

SECRETS REQUIRED
RESEND_API_KEY
NEWSLETTER_FROM
SITE_URL

Example:
RESEND_API_KEY=re_xxxxxxxxx
NEWSLETTER_FROM=Kraken Medical Training <news@krakenmedicaltraining.com>
SITE_URL=https://kraken-medical.krakenmedicaltraining.workers.dev

IMPORTANT
Do not put the Resend API key in JavaScript, GitHub frontend files or supabase-config.js.
It belongs only in Supabase Edge Function Secrets.

RESEND DOMAIN
Verify a sending domain in Resend before using your own From address.
A subdomain such as updates.krakenmedicaltraining.com or news.krakenmedicaltraining.com is a tidy option.

DEPLOY ORDER
1. Run the SQL.
2. Create/verify your sending domain in Resend.
3. Create a Resend API key.
4. Add the three Edge Function secrets in Supabase.
5. Deploy both Edge Functions.
6. Upload the website files.
7. Redeploy Cloudflare.
8. Join the mailing list with your own email.
9. Create a test News story, set Published, tick Send as newsletter, save.
10. Check newsletter-admin.html and your inbox.

No Resend API key is included in this ZIP.
