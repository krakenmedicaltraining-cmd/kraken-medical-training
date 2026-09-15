KRAKEN V16 STARTER BUILD
=========================

1. Run supabase-v16.sql in Supabase SQL Editor.

2. Upload all .html, .js and .css files in this package to the ROOT of the repo.
   Do not upload README.txt or ADMIN-HUB-CARD.html as pages.

3. Add the two links in ADMIN-HUB-CARD.html to your existing Admin Hub.

4. PUBLIC GLOBAL NAV:
   Pages using the new nav need these in <head>:
      <link rel="stylesheet" href="kraken-nav-v16.css">

   and directly after <body>:
      <div data-kraken-nav></div>

   and near the end of <body>, after supabase-config.js:
      <script src="kraken-nav.js"></script>

   in-person-training.html and in-person-course.html are already wired this way.

5. Rename visible "Courses" labels on the existing public course library/home page to "CPD Courses".
   Do NOT rename the database table. It remains public.courses.

6. Admin Hub:
   Add:
      In-Person Course Builder -> in-person-admin.html
      Training Enquiries -> training-enquiries-admin.html

7. Test:
   - Open in-person-admin.html as an admin
   - Create a Draft course
   - Fill title, category, duration, image URLs, overview, outcomes, FAQs
   - Change status to Published and Save
   - Open in-person-training.html
   - Open the course
   - Submit a test enquiry
   - Open training-enquiries-admin.html

WHAT THIS VERSION BUILDS
- Separate CPD vs In-Person architecture
- Dynamic In-Person course library
- Dynamic individual in-person course pages
- Course Builder
- Public training enquiry form
- Admin enquiry inbox
- Dynamic mega-menu categories for CPD and In-Person Training
- Responsive mobile navigation

NOTE
The package intentionally does not overwrite your existing index.html/admin-hub.html because I do not have
their latest V15.1 source in this turn. Use the supplied Admin Hub card snippet and nav instructions rather
than replacing working pages blindly.
