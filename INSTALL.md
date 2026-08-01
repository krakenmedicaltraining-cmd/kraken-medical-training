# Kraken V13.2 Dynamic Categories and Premium Cards

## Upload

Replace:

- `index.html`
- `home.js`

Add:

- `home-dynamic.css`

## Supabase

Run:

- `database/v13-2-course-card-fields.sql`

## What changes

- Homepage categories are generated from the categories used by published courses.
- Each category links to `courses.html?category=...`.
- The category cards show course count and lesson/time information.
- Latest courses use premium cover cards.
- Cards show difficulty, duration, lesson count, XP and learner progress.
- Course cover images use `courses.cover_image_url`.

## Course Builder

The SQL adds these optional course fields:

- `cover_image_url`
- `difficulty`
- `estimated_minutes`
- `xp_reward`

Your current Course Builder may not expose them yet. They can still be edited directly in Supabase until the builder fields are added in the next update.

## Important

The homepage queries `course_lessons` for lesson counts. If your table uses a different name, the cards will still load but lesson counts will be omitted.
