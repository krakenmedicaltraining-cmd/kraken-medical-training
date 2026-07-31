# Kraken Featured Course Selector

This replaces the hardcoded MARCH PAWS prime course on the homepage.

## Install

1. Run `database/v12-featured-course.sql` in Supabase SQL Editor.
2. Replace:
   - `index.html`
   - `home.js`
3. Redeploy Cloudflare and clear the browser cache.

## Choose the prime course

1. Open Course Builder.
2. Edit any published course.
3. Open the Features tab.
4. Switch on `Featured course`.
5. Save.

That course will automatically become the homepage prime course. Selecting another featured course automatically removes the old selection.

The homepage uses:
- course title
- description
- category
- icon
- banner or thumbnail
- estimated time
- XP reward
- learner lesson progress
