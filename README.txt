KRAKEN V16.8 CERTIFICATE DISPLAY FIX

Your actual public.certificates table is:
id uuid
certificate_code text
user_id uuid
course_id text
learner_name text
course_title text
final_score integer
issued_at timestamptz

This replacement is wired ONLY to that real table.

REPLACE:
certificate.html
certificate.js
certificate.css

IMPORTANT:
The old/deployed certificate code that references:
- course_certificate_settings
- course_certificates

is not used by these replacement files.

The certificate page now:
- requires the learner to be signed in
- looks up certificates by user_id + TEXT course_id
- displays learner name
- displays stored course title
- displays issue date
- displays final score when present
- displays certificate code
- prints cleanly as A4 landscape
- uses assets/kraken-medical-logo.png

DEPLOY:
1. Replace all 3 files together.
2. Commit.
3. Redeploy Cloudflare.
4. Hard refresh Ctrl + Shift + R.
5. Open:
   certificate.html?course=shortness-of-breath

If the page says 'Certificate not issued yet', the display page is now working
but there is no row for that user/course in public.certificates. In that case,
the next check is the certificate issuance/upsert, not the display page.

NO SQL REQUIRED.
