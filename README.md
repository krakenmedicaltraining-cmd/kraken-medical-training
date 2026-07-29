# Kraken Medical Training V5: Supabase Edition

Project URL configured:
https://nipfbcnesknegakrzcfo.supabase.co

Publishable browser key configured:
sb_publishable_VAqvmzhk2q3MjfMR31_VvQ_2Gc7ACLk

## Before uploading the website

1. Open Supabase > SQL Editor.
2. Create a new query.
3. Paste and run `supabase-setup.sql`.
4. Open Authentication > Users.
5. Create your administrator user with an email and password.
6. Return to SQL Editor and run the final admin statement shown at the bottom
   of `supabase-setup.sql`, replacing the placeholder with your admin email.

## Uploading to GitHub

Upload every file and folder in this V5 package to the repository root,
replacing the previous versions.

## Admin login

Open:
`https://YOUR-WEBSITE/admin.html`

You will be redirected to:
`login.html`

Use the administrator email and password created in Supabase.

## Features

- Shared online courses
- Secure administrator login
- Row Level Security
- Draft and published courses
- PDF/resource uploads to Supabase Storage
- Public course pages
- Import V4 courses stored in the same browser
- Export online JSON backups

## Security

The included `sb_publishable_...` key is intended for browser use.
Never add a Supabase secret key or service-role key to these files.


## Version 6 update
1. Run `v6-database-update.sql` once in Supabase SQL Editor.
2. Upload all V6 files to GitHub, replacing V5.
3. Open `/admin.html`, edit a course and use the visual block palette.
