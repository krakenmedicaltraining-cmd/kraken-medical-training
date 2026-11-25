begin;
insert into storage.buckets (id,name,public,file_size_limit)
values ('protected-library-files','protected-library-files',false,52428800)
on conflict (id) do update set public=false;
drop policy if exists "KMT library admin access" on storage.objects;
create policy "KMT library admin access" on storage.objects
for all to authenticated
using (bucket_id='protected-library-files' and public.kraken_is_admin())
with check (bucket_id='protected-library-files' and public.kraken_is_admin());
commit;
-- Learner access intentionally not enabled until resource entitlements are implemented.
-- Review existing permissive storage policies before uploading paid content.
