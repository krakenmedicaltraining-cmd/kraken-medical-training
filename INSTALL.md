# Kraken V12.2 Course Builder

## Before replacing files
Keep a copy of your current repository or download a GitHub ZIP backup.

## 1. Database check
In Supabase, open **SQL Editor**, paste the contents of:

`database/v12-2-builder-check.sql`

Run it once. It is safe after the V12 Stage 1 migration.

## 2. Upload these files to the website root
Replace:

- `admin.html`
- `data.js`

Add:

- `admin-v12.css`
- `admin-v12.js`

Do not delete `styles.css`, `kraken-v11.css`, `common.js`, `supabase-config.js` or your other existing files.

## 3. Test
1. Sign in as an administrator.
2. Open `admin.html`.
3. Create a draft course with two lessons.
4. Save it.
5. Open its Preview button.
6. Return to admin and edit it again.

## What this update adds
- Course details, metadata and imagery
- Proper lesson editor using `course_lessons`
- Lesson order controls for mobile
- Video, podcast and simulation links per lesson
- Live course preview
- Local draft autosave
- Search, edit, duplicate and delete controls
- Course feature toggles

## Important
A phone draft is stored only in that browser until you press **Save course**. Saving writes the course and lessons to Supabase.
