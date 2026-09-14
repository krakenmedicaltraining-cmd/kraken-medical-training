# Kraken V15 — Admin Hub, Dynamic Course Menu, Homepage Flow & Calm Theme

## Run Supabase

Run:

`database/v15-mailing-list.sql`

The Instructor Package tables from V14 must already exist.

## Replace

- `index.html`
- `home.js`
- `v14-home.css`
- `instructor-tools.html`
- `instructor-package.html`
- `instructor-package-builder.html`

## Add

- `kraken-global.css`
- `kraken-nav.js`
- `newsletter.js`
- `admin-hub.html`
- `admin-hub.css`
- `admin-hub.js`
- `database/v15-mailing-list.sql`

## Homepage order

1. Welcome / hero
2. Choose your route
3. Continue course
4. Training categories
5. Latest courses
6. Instructor packages
7. Simulations
8. Mailing list

The Journal remains available from the route selector and navigation, but its full latest-post shelf is removed from the homepage to keep the page calmer.

## Admin Hub

Open:

`admin-hub.html`

It gives direct access to:

- Course Builder
- Instructor Package Builder
- Journal Admin
- Uploads & Resources
- Instructor Hub
- Quiz Builder
- Certificate Admin
- Public Instructor Tools

## Dynamic Courses menu

`kraken-nav.js` loads every published course from Supabase and groups them by the course category.

When a published course is added later, it automatically appears in the top Courses dropdown. No HTML editing is required.

## Site-wide visual theme

`kraken-global.css` is the shared Kraken V15 palette:

- calm deep navy headers
- off-white page backgrounds
- teal/aqua highlights
- warm orange actions
- higher text contrast
- softer cards and spacing

To migrate older legacy pages, add this inside their `<head>`:

`<link rel="stylesheet" href="kraken-global.css">`

To give a page the live Courses dropdown, also add before its own page JS:

`<script src="kraken-nav.js"></script>`

and mark its Courses navigation link:

`<a href="courses.html" data-course-menu-trigger>Courses <span class="nav-caret">⌄</span></a>`

This keeps the styling and menu logic centralized instead of duplicating it across every page.
