-- 打順と交代の画面のための変更（docs/score-spec.md 5b）
-- 1. games.opponent_lineup: 相手の打順の名前（打順番号 = 配列の位置。名前は任意なので空文字も可）。
--    守備を「相手も1打席ずつ」で記録する試合で使う
-- 2. save_guest_game: opponent_lineup を保存し、出場の行の created_at を送られた値のまま残す
--    （同じ打席から出た交代の順番を、丸ごと入れ替えたあとも保つため）

alter table public.games add column if not exists opponent_lineup text[] not null default '{}';

alter table public.games drop constraint if exists games_opponent_lineup_check;
alter table public.games
  add constraint games_opponent_lineup_check
  check (cardinality(opponent_lineup) <= 30 and char_length(array_to_string(opponent_lineup, '')) <= 900);

create or replace function public.save_guest_game(
  p_game_id uuid,
  p_token text,
  p_game jsonb,
  p_lineups jsonb default '[]',
  p_plate_appearances jsonb default '[]',
  p_runner_events jsonb default '[]',
  p_pitching_summaries jsonb default '[]',
  p_pitching_decisions jsonb default '[]',
  p_expected_updated_at timestamptz default null
)
returns table (updated_at timestamptz, conflict boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  cur public.games;
  r public.games;
  v_conflict boolean;
begin
  if not public.check_guest_game_token(p_game_id, p_token) then
    raise exception 'invalid_edit_token' using errcode = '42501';
  end if;

  if jsonb_array_length(coalesce(p_lineups, '[]')) > 80
     or jsonb_array_length(coalesce(p_plate_appearances, '[]')) > 400
     or jsonb_array_length(coalesce(p_runner_events, '[]')) > 1200
     or jsonb_array_length(coalesce(p_pitching_summaries, '[]')) > 30
     or jsonb_array_length(coalesce(p_pitching_decisions, '[]')) > 30 then
    raise exception 'guest_game_too_large' using errcode = '22023';
  end if;

  select * into cur from public.games where id = p_game_id for update;
  v_conflict := p_expected_updated_at is not null and cur.updated_at <> p_expected_updated_at;

  -- 送られてこない項目は今の値を残す。id・チーム・作成日時は変えさせない
  r := jsonb_populate_record(cur, coalesce(p_game, '{}'::jsonb) - 'id' - 'team_id' - 'opponent_team_id'
                                  - 'source_post_id' - 'created_at' - 'updated_at');

  update public.games g set
    guest_team_name = r.guest_team_name,
    game_date = r.game_date,
    game_type = r.game_type,
    tournament_name = r.tournament_name,
    opponent_name = r.opponent_name,
    venue = r.venue,
    batting_first = r.batting_first,
    scheduled_innings = r.scheduled_innings,
    end_reason = r.end_reason,
    forfeit_result = r.forfeit_result,
    defense_mode = r.defense_mode,
    lineup_size = r.lineup_size,
    use_dh = r.use_dh,
    opponent_innings = r.opponent_innings,
    opponent_lineup = r.opponent_lineup,
    status = r.status,
    memo = r.memo,
    updated_at = now()
  where g.id = p_game_id;

  delete from public.runner_events where game_id = p_game_id;
  delete from public.pitching_decisions where game_id = p_game_id;
  delete from public.pitching_summaries where game_id = p_game_id;
  delete from public.plate_appearances where game_id = p_game_id;
  delete from public.game_lineups where game_id = p_game_id;

  insert into public.game_lineups (id, game_id, player_id, guest_name, guest_bats, guest_throws,
                                   batting_slot, position, entry_type, entered_at, created_at)
  select coalesce(x.id, gen_random_uuid()), p_game_id, null, x.guest_name, x.guest_bats, x.guest_throws,
         x.batting_slot, x.position, coalesce(x.entry_type, '先発'), x.entered_at, coalesce(x.created_at, now())
  from jsonb_populate_recordset(null::public.game_lineups, coalesce(p_lineups, '[]')) x;

  insert into public.plate_appearances (id, game_id, seq, inning, is_offense, batter_lineup_id,
    opponent_batting_slot, pitcher_lineup_id, opp_pitcher_throws, result, fielders, direction_pos,
    direction_x, direction_y, rbi, outs_on_play, runners_before)
  select coalesce(x.id, gen_random_uuid()), p_game_id, x.seq, x.inning, x.is_offense, x.batter_lineup_id,
         x.opponent_batting_slot, x.pitcher_lineup_id, x.opp_pitcher_throws, x.result, x.fielders, x.direction_pos,
         x.direction_x, x.direction_y, coalesce(x.rbi, 0), coalesce(x.outs_on_play, 0), coalesce(x.runners_before, 0)
  from jsonb_populate_recordset(null::public.plate_appearances, coalesce(p_plate_appearances, '[]')) x;

  insert into public.runner_events (id, game_id, plate_appearance_id, seq, inning, is_offense,
    runner_lineup_id, opponent_slot, from_base, to_base, reason, earned)
  select coalesce(x.id, gen_random_uuid()), p_game_id, x.plate_appearance_id, x.seq, x.inning, x.is_offense,
         x.runner_lineup_id, x.opponent_slot, x.from_base, x.to_base, x.reason, x.earned
  from jsonb_populate_recordset(null::public.runner_events, coalesce(p_runner_events, '[]')) x;

  insert into public.pitching_summaries (id, game_id, lineup_id, order_no, outs, bf, h, r, er, bb, hbp, so, hr)
  select coalesce(x.id, gen_random_uuid()), p_game_id, x.lineup_id, coalesce(x.order_no, 1),
         coalesce(x.outs, 0), coalesce(x.bf, 0), coalesce(x.h, 0), coalesce(x.r, 0), coalesce(x.er, 0),
         coalesce(x.bb, 0), coalesce(x.hbp, 0), coalesce(x.so, 0), coalesce(x.hr, 0)
  from jsonb_populate_recordset(null::public.pitching_summaries, coalesce(p_pitching_summaries, '[]')) x;

  insert into public.pitching_decisions (id, game_id, lineup_id, decision)
  select coalesce(x.id, gen_random_uuid()), p_game_id, x.lineup_id, x.decision
  from jsonb_populate_recordset(null::public.pitching_decisions, coalesce(p_pitching_decisions, '[]')) x;

  return query select g.updated_at, v_conflict from public.games g where g.id = p_game_id;
end;
$$;
