-- Quiddler ScoreSheet: row level security.
-- Ready to apply. Not yet run against any environment.
-- This schema shares a Postgres instance with other homelab apps and
-- PostgREST is reachable from the internet through the tunnel. Treat every
-- policy as the only thing between a stranger and the data.

-- Grants first, policies second -----------------------------------------
-- RLS filters rows. It does not grant table access. Do both.

revoke all on schema quiddler from anon, public;
revoke all on all tables    in schema quiddler from anon, public;
revoke all on all functions in schema quiddler from anon, public;
revoke all on all sequences in schema quiddler from anon, public;

grant usage on schema quiddler to authenticated;
grant select, insert, update on all tables in schema quiddler to authenticated;
-- No blanket delete. Delete is granted per table below, owner only.

alter default privileges in schema quiddler revoke all on tables from anon, public;

-- Helper functions --------------------------------------------------------
-- Membership checks must not be written as inline subqueries against
-- game_players, because a policy on game_players that selects from
-- game_players recurses infinitely. Use SECURITY DEFINER helpers, which
-- bypass RLS on the tables they read.

create or replace function quiddler.is_participant(p_game uuid)
returns boolean
language sql
security definer
stable
set search_path = quiddler, pg_catalog
as $$
  select exists (
    select 1 from quiddler.game_players gp
    where gp.game_id = p_game
      and gp.user_id = auth.uid()
  );
$$;

create or replace function quiddler.is_owner(p_game uuid)
returns boolean
language sql
security definer
stable
set search_path = quiddler, pg_catalog
as $$
  select exists (
    select 1 from quiddler.games g
    where g.id = p_game
      and g.created_by = auth.uid()
  );
$$;

revoke all on function quiddler.is_participant(uuid) from public, anon;
revoke all on function quiddler.is_owner(uuid)       from public, anon;
grant execute on function quiddler.is_participant(uuid) to authenticated;
grant execute on function quiddler.is_owner(uuid)       to authenticated;

-- set search_path is mandatory on every SECURITY DEFINER function here.
-- Without it a caller can shadow game_players with a temp table and defeat
-- the check.

-- Do not use FORCE ROW LEVEL SECURITY --------------------------------------
-- FORCE makes RLS apply to the table owner as well. The SECURITY DEFINER
-- helpers run as their owner, which is the table owner, so FORCE would
-- subject is_participant to the very policy that calls it and reintroduce
-- the recursion. RLS still fully applies to anon and authenticated because
-- neither is the table owner and neither is superuser. Deliberate, not an
-- omission.

alter table quiddler.profiles      enable row level security;
alter table quiddler.games         enable row level security;
alter table quiddler.game_players  enable row level security;
alter table quiddler.rounds        enable row level security;
alter table quiddler.round_entries enable row level security;

-- Policies ------------------------------------------------------------------
-- Every policy below is `to authenticated`. There is not one `to anon`
-- policy in this schema, by design. Combined with the revoked grants that
-- means anon receives an empty result or a permission error on every table,
-- whichever PostgREST reports first.

-- profiles

create policy profiles_select on quiddler.profiles
  for select to authenticated using (true);

create policy profiles_insert on quiddler.profiles
  for insert to authenticated with check (user_id = auth.uid());

create policy profiles_update on quiddler.profiles
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Tradeoff on the open select: the setup screen needs to list accounts so
-- you can add them to a game, and there is no way to do that without
-- reading rows for people you have not yet played with. The table
-- deliberately holds no email, no auth metadata, and nothing beyond a
-- display name, so the exposure is a first-name list on a family homelab.
-- If that becomes unacceptable, replace the open select with a SECURITY
-- DEFINER quiddler.roster() returning (user_id, display_name) only, and
-- tighten the policy to own-row-or-shared-game.

-- games

create policy games_select on quiddler.games
  for select to authenticated using (quiddler.is_participant(id));

-- The creator is not a participant yet at INSERT time, since their
-- game_players row does not exist. This is why the check is on created_by.
create policy games_insert on quiddler.games
  for insert to authenticated with check (created_by = auth.uid());

create policy games_update on quiddler.games
  for update to authenticated
  using (quiddler.is_owner(id)) with check (quiddler.is_owner(id));

create policy games_delete on quiddler.games
  for delete to authenticated using (quiddler.is_owner(id));

grant delete on quiddler.games to authenticated;

-- Only the owner mutates the game record itself, so nobody else can flip
-- bonus_mode mid-game and silently rescore every round.

-- game_players (this is where the "player added later" case lives)

create policy game_players_select on quiddler.game_players
  for select to authenticated using (quiddler.is_participant(game_id));

-- Adding a player to an existing game. Owner only, at any point in the
-- game's life. is_owner reads quiddler.games, not game_players, so there is
-- no bootstrap problem: the owner can insert their own first row
-- immediately after creating the game.
create policy game_players_insert on quiddler.game_players
  for insert to authenticated with check (quiddler.is_owner(game_id));

create policy game_players_update on quiddler.game_players
  for update to authenticated
  using (quiddler.is_participant(game_id))
  with check (quiddler.is_participant(game_id));

create policy game_players_delete on quiddler.game_players
  for delete to authenticated using (quiddler.is_owner(game_id));

grant delete on quiddler.game_players to authenticated;

-- Consequence worth stating plainly: a newly added player gains read access
-- to the game's entire history the moment their row is inserted, including
-- rounds played before they joined. That is correct for a shared score
-- sheet on a table, and it is the reason insert is owner-only.
--
-- Accepted risk on the update policy (Q3 answered: any participant can
-- finish a game): any participant can write final_total and is_winner, so
-- any participant can falsify standings. The round grid is stored
-- separately and is the audit trail, so the lie is visible.

-- rounds

create policy rounds_select on quiddler.rounds
  for select to authenticated using (quiddler.is_participant(game_id));

create policy rounds_insert on quiddler.rounds
  for insert to authenticated with check (quiddler.is_participant(game_id));

create policy rounds_update on quiddler.rounds
  for update to authenticated
  using (quiddler.is_participant(game_id))
  with check (quiddler.is_participant(game_id));

-- No delete policy and no delete grant. Rounds are never removed.

-- round_entries

create policy entries_select on quiddler.round_entries
  for select to authenticated using (quiddler.is_participant(game_id));

create policy entries_insert on quiddler.round_entries
  for insert to authenticated with check (quiddler.is_participant(game_id));

create policy entries_update on quiddler.round_entries
  for update to authenticated
  using (quiddler.is_participant(game_id))
  with check (quiddler.is_participant(game_id));

-- No delete policy and no delete grant. Clearing an entry means writing
-- words: [] and unused: [], not deleting the row. That keeps the
-- last-write-wins timestamp meaningful, because a delete has no timestamp
-- to compare against and would lose to a stale write on replay.
--
-- Any participant may edit any participant's entry. This is correct. One
-- phone on the table is a normal way to play, and the person holding it
-- enters everyone's words.

-- Conditional upsert RPC ------------------------------------------------
-- The sync layer needs last-write-wins enforced server-side, not just
-- client-side. PostgREST's upsert cannot express a conditional
-- do update ... where. Use an RPC.

create or replace function quiddler.upsert_round_entry(
  p_round_id        uuid,
  p_game_id         uuid,
  p_game_player_id  uuid,
  p_words           jsonb,
  p_unused          jsonb,
  p_challenge_delta integer,
  p_manual_score    integer,
  p_updated_at      timestamptz,
  p_client_id       text
) returns quiddler.round_entries
language plpgsql
security invoker                       -- RLS still applies. Do not change this.
set search_path = quiddler, pg_catalog
as $$
declare
  result quiddler.round_entries;
  v_updated_at timestamptz;
begin
  -- Clamp the client timestamp to the server clock. p_updated_at comes from
  -- the phone's own clock, and last-write-wins compares it directly, so a
  -- device running fast would write a future timestamp and win every
  -- comparison from then on. The touch_updated_at trigger uses greatest(),
  -- which makes that permanent: no correctly-clocked write could ever lower
  -- it again, and every later edit would lose in silence. The user would type
  -- a score, see it accepted, and watch it revert. That is the exact failure
  -- this rewrite exists to remove, so a clock cannot be trusted to be honest.
  --
  -- Clamping only caps the future. An op queued offline keeps its earlier
  -- timestamp, so genuine offline ordering still works.
  v_updated_at := least(coalesce(p_updated_at, now()), now());

  insert into quiddler.round_entries (
    round_id, game_id, game_player_id, words, unused,
    challenge_delta, manual_score, updated_at, client_id
  ) values (
    p_round_id, p_game_id, p_game_player_id, p_words, p_unused,
    coalesce(p_challenge_delta, 0), p_manual_score, v_updated_at, p_client_id
  )
  on conflict (round_id, game_player_id) do update set
    words           = excluded.words,
    unused          = excluded.unused,
    challenge_delta = excluded.challenge_delta,
    manual_score    = excluded.manual_score,
    updated_at      = excluded.updated_at,
    client_id       = excluded.client_id
  where excluded.updated_at > quiddler.round_entries.updated_at
     or (excluded.updated_at = quiddler.round_entries.updated_at
         and excluded.client_id > quiddler.round_entries.client_id)
  returning * into result;

  -- A losing write matches no row in RETURNING and leaves result NULL.
  -- Re-select so the caller always gets the authoritative current row and
  -- can reconcile its local copy downward. Do not skip this branch.
  if result is null then
    select * into result from quiddler.round_entries
    where round_id = p_round_id and game_player_id = p_game_player_id;
  end if;

  return result;
end $$;

revoke all on function quiddler.upsert_round_entry from public, anon;
grant execute on function quiddler.upsert_round_entry to authenticated;

-- security invoker is deliberate. The function must not be a hole around RLS.

-- Realtime --------------------------------------------------------------

alter publication supabase_realtime add table quiddler.games;
alter publication supabase_realtime add table quiddler.game_players;
alter publication supabase_realtime add table quiddler.rounds;
alter publication supabase_realtime add table quiddler.round_entries;

alter table quiddler.round_entries replica identity full;
alter table quiddler.game_players  replica identity full;

-- replica identity full is required or UPDATE payloads arrive without the
-- unchanged columns and the merge cannot run.
--
-- Realtime only applies RLS to postgres_changes when the socket carries the
-- user's JWT. After sign-in and after every token refresh the client must
-- call supabase.realtime.setAuth(session.access_token). Miss this and
-- either the subscription returns nothing or it leaks other games,
-- depending on the Realtime config. Handle it in the auth listener, not
-- per subscription.

-- Ops prerequisites (not code, but the build fails without them) --------
-- - PostgREST PGRST_DB_SCHEMAS must include quiddler. Reload the config
--   after changing it.
-- - GoTrue DISABLE_SIGNUP=true.
-- - GoTrue SITE_URL and URI_ALLOW_LIST must include the deployed origin and
--   <origin>/auth/callback.
