KRAKEN V16.2
=============
FIXES
1. Fixes the broken/un-styled In-Person Training page.
2. Introduces one reusable navigation bar matching the homepage navigation.
3. Both CPD Courses and In-Person Training have dynamic mega menus.
4. In-Person Training now uses the same dark Kraken visual language as the homepage.
5. Category query strings now work on the in-person library.

UPLOAD / REPLACE
- in-person-training.html (replace)
- in-person-training.js (replace)
- in-person-course.html (replace)
- in-person-training.css (replace)
- kraken-site-nav.css (new)
- kraken-site-nav.js (new)

NO SQL REQUIRED.

For every other PUBLIC page, follow GLOBAL-NAV-INSTALL.html.
The next safest step is to convert the existing pages one at a time, because their current headers contain page-specific IDs/JS and blindly replacing every HTML file could break existing functions.
