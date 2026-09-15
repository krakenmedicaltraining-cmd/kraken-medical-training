-- Kraken V16.4 News + Newsletter
alter table public.journal_items add column if not exists send_newsletter boolean not null default false;
alter table public.journal_items add column if not exists newsletter_sent_at timestamptz;

-- Existing mailing_list table is used as the subscriber source.
-- Expected columns: email, is_active, source, created_at.
