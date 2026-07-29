# Kraken Medical Training V8: Resource Library

V8 adds a central reusable resource library.

## What it does
- Store Google Drive links instead of uploading large files to Supabase
- Supports PDFs, PowerPoints, Word documents, spreadsheets, images, video, podcast and ZIP links
- Public searchable Kraken Library
- Secure Resource Manager for administrators
- Attach the same resource to multiple courses
- Updating a resource updates it everywhere it is used
- Google Drive links are normalised automatically
- Google Drive preview and download links are generated automatically

## Installation
1. Run `v8-database-update.sql` in Supabase SQL Editor.
2. Upload every V8 file to GitHub, replacing V7.
3. Wait for Cloudflare to deploy.
4. Open `resource-admin.html`.
5. Add Google Drive resources.
6. Edit a course and select resources from the library.

## Google Drive permissions
Before pasting a file link:
- Open the file in Google Drive
- Tap Share
- Under General access, choose Anyone with the link
- Use Viewer permission
- Copy the link and paste it into Kraken

Do not put patient-identifiable or sensitive clinical data in publicly shared Drive files.
