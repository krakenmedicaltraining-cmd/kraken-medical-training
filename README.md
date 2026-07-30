# Kraken Medical Training V10.1

V10.1 adds the Instructor Hub to the existing V9 platform.

## Main additions
- Live learner, completion, score and certificate statistics
- Searchable learner table
- Course completion analytics
- Announcement publishing and deletion
- Certificate revocation and restoration
- Invite-only course enrolment controls
- Course prerequisites, quiz attempt limits and timed quiz settings
- Responsive instructor interface

## Upgrade from V9
1. Upload all files to replace the existing site files.
2. In Supabase, open SQL Editor.
3. Run `v10-1-database-update.sql` once.
4. Open `instructor.html` while signed in as an administrator.

Do not run the database update repeatedly unless you understand the policy changes. The script is designed to be mostly idempotent.
