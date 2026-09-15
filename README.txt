KRAKEN MEDICAL TRAINING V16.5 - VISUAL POLISH

This package addresses the three issues shown in the screenshots:

1. MY MISSION / CONTINUE LEARNING
   - Constrains the dashboard to a sensible 1120px content shell.
   - Stops the course/progress row stretching off screen.
   - Makes Continue Learning a clean full-width contained card.
   - Keeps stats, certificates, activity and achievements inside the page.

2. NAVIGATION MEGA MENU
   - Fixes dark/black category text on the dark dropdown.
   - Category names are now light grey/white.
   - Aqua arrows and headings remain Kraken accents.
   - Applies to both CPD Courses and In-Person Training.

3. HOMEPAGE DARK SECTIONS
   - Forces headings on dark category cards to readable off-white.
   - Fixes dark Simulation section text.
   - Fixes Ready Room / command banner heading and body copy.
   - Keeps aqua labels and orange CTA styling.

UPLOAD / REPLACE:
- kraken-site-nav.css
- kraken-public.css

ADD:
- dashboard-v16-5.css

IMPORTANT FOR dashboard.html:
Make sure these are loaded after your existing CSS:
<link rel="stylesheet" href="kraken-public.css">
<link rel="stylesheet" href="kraken-site-nav.css">
<link rel="stylesheet" href="dashboard-v16-5.css">

The dashboard body needs:
<body class="kraken-public-page kraken-mission-page">

The dashboard needs:
<div data-kraken-site-nav></div>

and after supabase-config.js:
<script src="kraken-site-nav.js"></script>

For index.html, make sure kraken-public.css is loaded AFTER the older homepage CSS.
The body should include kraken-home-page, for example:
<body class="kraken-public-page kraken-home-page">

No SQL is required.

DEPLOY:
1. Upload/replace the files.
2. Commit.
3. Redeploy Cloudflare.
4. Hard refresh: Ctrl + Shift + R.
