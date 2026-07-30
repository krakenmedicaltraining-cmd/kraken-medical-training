# Quiz and Certificate Fix

Replace these website files:

- course.html
- course-player.js
- course-player.css
- quiz-player.js
- quiz-player.css
- certificate.html
- certificate.css
- certificate.js

Then redeploy Cloudflare and fully close/reopen the browser tab.

## Certificate flow

1. Learner completes every lesson.
2. Final quiz unlocks.
3. Learner passes the quiz.
4. Course progress is marked complete.
5. A row is added to your existing `certificates` table.
6. The learner sees a `View certificate` button.

If certificate creation reports an RLS permission error, run:

`database/certificate-policies.sql`
