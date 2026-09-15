KRAKEN MEDICAL TRAINING — V16.3 UNIFIED PUBLIC WEBSITE

PURPOSE
Every main public page now uses the exact same navigation component, colour palette, typography and hero system.

REPLACE / UPLOAD
- index.html
- courses.html
- course.html
- in-person-training.html
- in-person-course.html
- instructor-tools.html
- library.html
- journal.html
- games.html
- dashboard.html
- kraken-site-nav.css
- kraken-site-nav.js
- kraken-public.css

ALSO INCLUDED
- in-person-training.css
- in-person-training.js
- in-person-course.js (if available from the V16 package)

IMPORTANT
1. Keep your existing page-specific CSS/JS files unless this package explicitly includes a replacement.
2. kraken-public.css loads AFTER page-specific CSS so it can enforce the same public shell.
3. kraken-site-nav.js is the ONE navigation component used everywhere.
4. Admin pages continue using admin-nav and are NOT changed by this package.
5. No Supabase SQL changes are required.

DEPLOY
Upload/replace the files, redeploy Cloudflare, then hard refresh with Ctrl+Shift+R.
