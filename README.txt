KRAKEN V16.1 HOME + ADMIN INTEGRATION

REPLACE:
- admin-hub.html
- index.html

ADD:
- v16-home-routes.css
- v16-home-mega-menu.js

PREREQUISITE:
Install the V16 package first and run supabase-v16.sql.

WHAT CHANGED:
- Existing online Courses are presented as CPD Courses.
- In-Person Training is a new top-level route.
- Homepage Choose Your Route now includes In-Person Training.
- Homepage gains an In-Person Training feature section.
- Admin Hub gains In-Person Course Builder and Training Enquiries.
- Admin Course Builder is relabelled CPD Course Builder.
- Desktop homepage header gets dynamic CPD and In-Person mega menus.
- Existing course database remains named `courses`; this is a presentation rename only.

DEPLOY:
1. Upload/replace these four files in repo root.
2. Redeploy Cloudflare.
3. Hard refresh.
4. Test desktop hover on CPD Courses and In-Person Training.
5. Test Admin Hub links.
