# Kraken V12.1 Mobile Fix Update

This update fixes the two problems visible in the screenshots:

1. **Courses returned a 404** because `courses.html` was missing.
2. **Headings and descriptions were nearly invisible** because pale mint text was displayed over a pale background.

## Upload these files to the repository root

Replace existing files when GitHub asks:

- `kraken-v11.css` (replacement high-contrast shared theme)
- `course.html`
- `course-player.css`
- `course-player.js`
- `course-engine.js`

Add these new files:

- `courses.html`
- `courses.css`
- `courses.js`

All files must sit beside `index.html`, `data.js`, `common.js`, and `supabase-config.js`.

## Do not run SQL again

This package does not change the V12 Stage 1 database. If you already ran the Stage 1 migration, nothing else is needed in Supabase.

## Test after deployment

1. Open the pop-out menu and press **Courses**.
2. Confirm the course catalogue opens rather than showing HTTP 404.
3. Open Course Admin, Instructor Hub and Resource Manager.
4. Confirm hero titles are dark navy and descriptions are clearly readable.
5. Open a published course and confirm it opens through `course.html?id=...`.
6. Hard-refresh Chrome if it still shows the previous colours.

## Cloudflare cache

Cloudflare may briefly retain the old stylesheet. If the old pale text remains, use a private tab or clear the site cache, then reload.
