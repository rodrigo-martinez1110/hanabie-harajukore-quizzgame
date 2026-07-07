create extension if not exists pgcrypto;

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('game_started', 'question_answered', 'game_finished', 'score_submitted')),
  player_id uuid not null,
  country_code char(2) not null check (country_code ~ '^[A-Z]{2}$'),
  language text not null default 'pt-BR',
  score integer check (score is null or (score >= 0 and score <= 100000)),
  accuracy numeric(5,4) check (accuracy is null or (accuracy >= 0 and accuracy <= 1)),
  max_combo integer check (max_combo is null or (max_combo >= 1 and max_combo <= 5)),
  answered integer check (answered is null or (answered >= 0 and answered <= 80)),
  fan_rank text,
  question_id text,
  question_category text,
  question_difficulty integer check (question_difficulty is null or (question_difficulty >= 1 and question_difficulty <= 5)),
  correct boolean,
  created_at timestamptz not null default now()
);

alter table public.analytics_events enable row level security;

drop policy if exists "No public analytics reads" on public.analytics_events;
create policy "No public analytics reads"
on public.analytics_events
for select
to anon, authenticated
using (false);

drop policy if exists "No public analytics writes" on public.analytics_events;
create policy "No public analytics writes"
on public.analytics_events
for insert
to anon, authenticated
with check (false);

create index if not exists analytics_events_created_idx
on public.analytics_events (created_at desc);

create index if not exists analytics_events_type_created_idx
on public.analytics_events (event_type, created_at desc);

create index if not exists analytics_events_player_created_idx
on public.analytics_events (player_id, created_at desc);

create index if not exists analytics_events_question_idx
on public.analytics_events (question_id, correct);

grant select, insert on table public.analytics_events to service_role;
revoke all on table public.analytics_events from anon, authenticated;
