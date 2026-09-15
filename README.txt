KRAKEN V16.4.1 - CPD NAVIGATION FIX

UPLOAD / REPLACE THESE THREE FILES IN THE REPOSITORY ROOT:

1. courses.html
2. kraken-site-nav.css
3. kraken-site-nav.js

What this fixes:
- CPD Courses now uses the same dark Kraken navigation as every other public page.
- Generic course-page button styles can no longer turn the CPD and In-Person dropdown buttons white.
- Shared nav stylesheet is loaded last on courses.html.
- Existing CPD search/filter IDs and course scripts are preserved.
- Dynamic CPD and In-Person category mega menus remain connected to Supabase.
- Mobile navigation remains supported.

No SQL is required.

DEPLOY:
1. Upload/replace all three files together.
2. Commit to GitHub.
3. Redeploy Cloudflare.
4. Hard refresh with Ctrl + Shift + R.
