# Kraken V12.5 Quiz Builder and Assessment Engine

## Install

1. Open Supabase **SQL Editor**.
2. Run `database/v12-5-quiz-engine.sql`.
3. Upload/replace every root-level file from this package:
   - `admin.html`
   - `admin-v12-5.css`
   - `admin-v12-5.js`
   - `quiz-admin.html`
   - `quiz-admin.css`
   - `quiz-admin.js`
   - `course.html`
   - `course-player.js`
   - `course-player.css`
   - `course-engine.js`
   - `quiz-player.js`
   - `quiz-player.css`
4. Keep your existing `data.js`, `common.js`, `supabase-config.js`, `styles.css`, and `kraken-v12-pages.css`.
5. Redeploy Cloudflare.
6. Close and reopen the browser tab or clear the site cache.

## How to use

Open **Course Admin**, then press **Quiz** on a course card.

You can create:
- multiple-choice questions
- true/false questions
- scenario questions
- explanations and teaching feedback
- pass marks
- attempt limits
- timed assessments
- shuffled questions and answers

The learner quiz appears automatically inside the course player when the course has a published quiz.

A required quiz keeps the certificate locked until:
1. every lesson is complete, and
2. the learner passes the quiz.
