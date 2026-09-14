# Kraken V14 — Medical Expedition UI + Instructor Toolkit

## 1. Run Supabase first

Run:

`database/v14-instructor-toolkit.sql`

## 2. Replace existing files

- `index.html`
- `home.js`
- `home-dynamic.css`

## 3. Add new files

- `v14-home.css`
- `instructor-tools.css`
- `instructor-tools.html`
- `instructor-tools.js`
- `instructor-package.html`
- `instructor-package.js`
- `instructor-package-builder.html`
- `instructor-package-builder.js`

Keep:

- `assets/kraken-medical-logo.png`

## 4. What changes

### Homepage
- lighter medical/editorial visual direction
- deep navy rather than near-black
- warmer orange accent for actions
- simpler four-route navigation
- CPD Builder removed from visible navigation
- Instructor Tools added
- dynamic Instructor Toolkit shelf added
- existing courses, categories, Journal and learner systems retained

### Instructor Tools
Public package library with:
- search
- categories
- product-style cards
- package detail pages
- downloadable resources and links

### Instructor Package Builder
Admins can:
- create draft/published packages
- add title, subtitle, description and cover image
- set teaching duration, audience, level and version
- add reusable content sections
- add unlimited files/download links
- edit, duplicate and delete packages

## 5. File links

Package resources are URL based, so they can point to:
- Supabase Storage
- Google Drive public/shared links
- OneDrive
- Dropbox
- GitHub
- other public HTTPS links

For reliable direct downloads, Supabase Storage is still recommended.

## 6. Cloudflare

After uploading:
1. Redeploy.
2. Fully close and reopen the site.
3. Clear cached site data if old styling remains.
