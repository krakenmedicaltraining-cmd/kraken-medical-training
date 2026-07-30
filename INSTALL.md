# Kraken Course Builder Hotfix

This fixes the two issues shown in the screenshots:

1. Course saving failed because `courses.access_type` was missing.
2. Course-player text had poor contrast on mobile.
3. Course progress could show above 100% when old lesson progress remained after rebuilding lessons.

## Install

### Step 1: Repair Supabase

Open **Supabase → SQL Editor**, paste and run:

`database/v12-schema-repair.sql`

Wait around 10 seconds after it reports success.

### Step 2: Replace website files

Upload and replace:

- `course-player.css`
- `course-player.js`

### Step 3: Redeploy and refresh

Redeploy the Cloudflare project.

On the phone, close the tab fully and reopen it. If the old appearance remains, clear cached site data.

## Expected result

- The course builder saves without the `access_type` error.
- Hero and lesson text are readable.
- Progress is clamped between 0% and 100%.
- Old progress rows from deleted lessons no longer inflate the percentage.
