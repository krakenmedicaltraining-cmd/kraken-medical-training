-- Kraken V17.4 advanced assessment question data
alter table public.quiz_questions
add column if not exists answer_data jsonb not null default '{}'::jsonb;

select 'V17.4 advanced question data ready' as status;
