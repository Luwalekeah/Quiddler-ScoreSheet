-- Quiddler ScoreSheet: core schema.
-- Ready to apply. Not yet run against any environment.
-- See .pipeline/spec.md section 1 for the design rationale behind every
-- decision below (JSONB words, denormalised standings, composite FKs).

create schema if not exists quiddler;

create type quiddler.game_status as enum ('active', 'finished', 'abandoned');

-- Values match the BonusMode union in src/lib/score.ts exactly, including case.
create type quiddler.bonus_mode as enum ('both', 'mostWords', 'longestWord');

create table quiddler.profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  created_at   timestamptz not null default now()
);

create table quiddler.games (
  id           uuid primary key default gen_random_uuid(),
  created_by   uuid not null references auth.users(id),
  status       quiddler.game_status not null default 'active',
  bonus_mode   quiddler.bonus_mode not null,
  total_rounds smallint not null default 8 check (total_rounds between 1 and 8),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  finished_at  timestamptz,
  constraint finished_has_timestamp
    check ((status = 'finished') = (finished_at is not null))
);

create table quiddler.game_players (
  id           uuid primary key default gen_random_uuid(),
  game_id      uuid not null references quiddler.games(id) on delete cascade,
  -- null means a guest at the table with no account. See OPEN QUESTION Q1.
  user_id      uuid references auth.users(id) on delete set null,
  display_name text not null check (char_length(display_name) between 1 and 40),
  seat         smallint not null check (seat between 0 and 7),
  -- Denormalised on finish. Justified below.
  final_total  integer,
  final_rank   smallint,
  is_winner    boolean not null default false,
  unique (game_id, seat),
  -- Postgres treats NULLs as distinct here, so many guests per game are allowed
  -- while a real account can only be seated once.
  unique (game_id, user_id),
  -- Target for the composite FK from rounds and round_entries.
  unique (id, game_id)
);

create table quiddler.rounds (
  id           uuid primary key default gen_random_uuid(),
  game_id      uuid not null references quiddler.games(id) on delete cascade,
  round_number smallint not null check (round_number between 1 and 8),
  -- Mirrors cardsDealtInRound(): round + 2.
  cards_dealt  smallint not null check (cards_dealt between 3 and 10),
  completed_at timestamptz,
  unique (game_id, round_number),
  unique (id, game_id),
  constraint cards_dealt_matches_round check (cards_dealt = round_number + 2)
);

create table quiddler.round_entries (
  id              uuid primary key default gen_random_uuid(),
  round_id        uuid not null,
  -- Denormalised. Required for two reasons, both load bearing:
  --   1. Realtime postgres_changes filters are single-column equality on the
  --      changed table. Without game_id here a phone cannot subscribe to one game.
  --   2. RLS then evaluates without a join on every row.
  game_id         uuid not null references quiddler.games(id) on delete cascade,
  game_player_id  uuid not null,
  words           jsonb not null default '[]'::jsonb,
  unused          jsonb not null default '[]'::jsonb,
  challenge_delta integer not null default 0,
  manual_score    integer,
  -- Client wall clock at the moment of the edit. Drives last-write-wins.
  updated_at      timestamptz not null default now(),
  -- Device that made the edit. Deterministic tiebreak on identical timestamps.
  client_id       text not null check (char_length(client_id) between 1 and 64),
  unique (round_id, game_player_id),
  -- Composite FKs. These make it structurally impossible to graft an entry from
  -- one game onto a round or player in another, which a policy alone cannot do.
  foreign key (round_id, game_id)
    references quiddler.rounds(id, game_id) on delete cascade,
  foreign key (game_player_id, game_id)
    references quiddler.game_players(id, game_id) on delete cascade,
  constraint words_is_array  check (jsonb_typeof(words) = 'array'),
  constraint unused_is_array check (jsonb_typeof(unused) = 'array')
);

-- Indexes -------------------------------------------------------------------

create index game_players_game_idx  on quiddler.game_players (game_id);
create index game_players_user_idx  on quiddler.game_players (user_id)
  where user_id is not null;
-- Serves "how many games has this player won", the win-totals screen.
create index game_players_wins_idx  on quiddler.game_players (user_id)
  where user_id is not null and is_winner;
create index games_recent_idx       on quiddler.games (created_at desc);
create index rounds_game_idx        on quiddler.rounds (game_id, round_number);
create index entries_game_idx       on quiddler.round_entries (game_id);
create index entries_round_idx      on quiddler.round_entries (round_id);

-- Trigger ---------------------------------------------------------------

create or replace function quiddler.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := greatest(new.updated_at, old.updated_at);
  return new;
end $$;

create trigger round_entries_touch_updated_at
  before update on quiddler.round_entries
  for each row execute function quiddler.touch_updated_at();
