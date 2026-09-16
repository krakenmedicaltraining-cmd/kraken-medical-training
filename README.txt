KRAKEN V17 - MY MISSION CERTIFICATE GRID

Replace:
- dashboard.html
- dashboard.js

Add:
- dashboard-v17.css

No SQL required.

This removes the old plain certificate renderer from dashboard.js itself.
Certificates now render natively as compact cards:
- 3 across desktop
- 2 across tablet
- 1 across mobile
- mini certificate preview
- learner/course details
- issue date
- score
- certificate code
- View certificate
- Copy code

It also constrains Continue Learning to the same responsive grid.

IMPORTANT:
You no longer need certificate-cards.js or certificate-cards.css from V16.9.
They can be deleted if you uploaded them.

Deploy:
1. Upload/replace the three files.
2. Commit to main.
3. Wait for Cloudflare deployment.
4. Ctrl + Shift + R on /dashboard.
