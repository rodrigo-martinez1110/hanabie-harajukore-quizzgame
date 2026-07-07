create extension if not exists pgcrypto;

create table if not exists public.leaderboard_scores (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null,
  run_id uuid not null unique,
  nickname text not null check (char_length(nickname) between 2 and 18),
  country_code char(2) not null check (country_code ~ '^[A-Z]{2}$'),
  score integer not null check (score >= 0 and score <= 20000),
  accuracy numeric(5,4) not null check (accuracy >= 0 and accuracy <= 1),
  max_combo integer not null check (max_combo >= 1 and max_combo <= 5),
  answered integer not null check (answered >= 0 and answered <= 80),
  rating integer not null check (rating >= 0),
  fan_rank text not null,
  language text not null default 'pt-BR',
  created_at timestamptz not null default now()
);

alter table public.leaderboard_scores enable row level security;

drop policy if exists "Public leaderboard read" on public.leaderboard_scores;
drop policy if exists "No public leaderboard reads" on public.leaderboard_scores;
create policy "No public leaderboard reads"
on public.leaderboard_scores
for select
to anon, authenticated
using (false);

drop policy if exists "No public leaderboard writes" on public.leaderboard_scores;
create policy "No public leaderboard writes"
on public.leaderboard_scores
for insert
to anon, authenticated
with check (false);

create index if not exists leaderboard_scores_global_idx
on public.leaderboard_scores (score desc, accuracy desc, max_combo desc, created_at asc);

create index if not exists leaderboard_scores_country_idx
on public.leaderboard_scores (country_code, score desc, accuracy desc, max_combo desc, created_at asc);

create index if not exists leaderboard_scores_player_idx
on public.leaderboard_scores (player_id, score desc, accuracy desc, max_combo desc, created_at asc);

create index if not exists leaderboard_scores_created_idx
on public.leaderboard_scores (created_at desc);

create or replace view public.player_best_scores as
select distinct on (player_id)
  id,
  player_id,
  nickname,
  country_code,
  score,
  accuracy,
  max_combo,
  answered,
  rating,
  fan_rank,
  language,
  created_at
from public.leaderboard_scores
order by player_id, score desc, accuracy desc, max_combo desc, created_at asc;

revoke all on table public.leaderboard_scores from anon, authenticated;
revoke all on table public.player_best_scores from anon, authenticated;
