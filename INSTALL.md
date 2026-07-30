# Kraken V12 Stage 1 Installation

This package replaces the individual course display with one dynamic course player. It is designed to remain compatible with existing `content_blocks`, so current published courses can still open before you create records in the new lesson tables.

## 1. Back up

Download a ZIP of the current GitHub repository before changing anything.

## 2. Run the database migration

1. Open Supabase.
2. Open **SQL Editor**.
3. Create a new query.
4. Paste all of `database/kraken-v12-stage1.sql`.
5. Press **Run** once.

The migration adds fields and tables. It does not delete existing courses.

## 3. Upload files to the repository root

Upload these files beside `data.js` and `supabase-config.js`:

- `course.html` (replace existing)
- `course-player.css` (new)
- `course-engine.js` (new)
- `course-player.js` (new)

Do not upload the `database` or `docs` folders to the live site unless you want them stored for reference.

## 4. Test

Open a published course from `courses.html`. Its URL should look like:

`course.html?id=YOUR_COURSE_ID`

Existing courses are translated from their current `content_blocks` automatically. New structured lessons can later be added to `course_lessons`.

## What Stage 1 provides

- One reusable cinematic course player
- Lesson navigation
- Mobile lesson drawer
- Per-lesson completion
- Overall course progress
- Existing XP and certificate flow compatibility
- Download/resource panel
- Simulation launch panel
- Existing content-block fallback
- New Supabase lesson/download/certificate structure

## Important

The next package, Stage 2, should update the admin builder so it writes directly to `course_lessons` and `course_downloads`. Until then, your existing admin builder continues working and the player translates those blocks for display.
