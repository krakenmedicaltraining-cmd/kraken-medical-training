# Kraken V12.4 Course Builder

## What this update adds

- Full mobile course builder
- Unlimited lessons
- Reordering and duplication
- Learning blocks for text, video, image, download, podcast, simulation and reflection
- Live preview
- Draft and publish status
- Phone autosave
- Sticky mobile save bar
- Course search and filtering
- Duplicate and delete protection
- Backwards compatibility with the current course player

## Installation

1. In Supabase, open **SQL Editor**.
2. Run `database/v12-4-course-builder.sql`.
3. Upload these files to the same website folder:
   - `admin.html`
   - `admin-v12-4.css`
   - `admin-v12-4.js`
4. Keep your existing:
   - `data.js`
   - `common.js`
   - `supabase-config.js`
   - `styles.css`
   - `kraken-v12-pages.css`
5. Redeploy the Cloudflare project.
6. Close and reopen the website tab on your phone. Clear the site cache if the old builder remains.

## Important

The builder stores the full block structure in `course_lessons.blocks`. It also creates the existing text/video/podcast/simulation lesson fields, so the current course player continues to work.

No existing courses are deleted.
