create extension if not exists pgcrypto;

create table if not exists public.duel_challenges (
  id uuid primary key default gen_random_uuid(),
  question_ids jsonb not null check (jsonb_typeof(question_ids) = 'array' and jsonb_array_length(question_ids) = 20),
  creator_player_id uuid not null,
  creator_nickname text not null check (char_length(creator_nickname) between 2 and 18),
  creator_country_code char(2) not null check (creator_country_code ~ '^[A-Z]{2}$'),
  creator_score integer check (creator_score is null or (creator_score >= 0 and creator_score <= 100000)),
  creator_accuracy numeric(5,4) check (creator_accuracy is null or (creator_accuracy >= 0 and creator_accuracy <= 1)),
  creator_max_combo integer check (creator_max_combo is null or (creator_max_combo >= 1 and creator_max_combo <= 5)),
  creator_answered integer check (creator_answered is null or creator_answered = 20),
  creator_fan_rank text,
  creator_submitted_at timestamptz,
  challenger_player_id uuid,
  challenger_nickname text check (challenger_nickname is null or char_length(challenger_nickname) between 2 and 18),
  challenger_country_code char(2) check (challenger_country_code is null or challenger_country_code ~ '^[A-Z]{2}$'),
  challenger_score integer check (challenger_score is null or (challenger_score >= 0 and challenger_score <= 100000)),
  challenger_accuracy numeric(5,4) check (challenger_accuracy is null or (challenger_accuracy >= 0 and challenger_accuracy <= 1)),
  challenger_max_combo integer check (challenger_max_combo is null or (challenger_max_combo >= 1 and challenger_max_combo <= 5)),
  challenger_answered integer check (challenger_answered is null or challenger_answered = 20),
  challenger_fan_rank text,
  challenger_submitted_at timestamptz,
  winner text check (winner is null or winner in ('creator', 'challenger', 'tie')),
  language text not null default 'pt-BR',
  created_at timestamptz not null default now()
);

alter table public.duel_challenges enable row level security;

drop policy if exists "No public duel reads" on public.duel_challenges;
create policy "No public duel reads"
on public.duel_challenges
for select
to anon, authenticated
using (false);

drop policy if exists "No public duel writes" on public.duel_challenges;
create policy "No public duel writes"
on public.duel_challenges
for insert
to anon, authenticated
with check (false);

create index if not exists duel_challenges_created_idx
on public.duel_challenges (created_at desc);

create index if not exists duel_challenges_creator_idx
on public.duel_challenges (creator_player_id, created_at desc);

create index if not exists duel_challenges_challenger_idx
on public.duel_challenges (challenger_player_id, created_at desc);

grant select, insert, update on table public.duel_challenges to service_role;
revoke all on table public.duel_challenges from anon, authenticated;
