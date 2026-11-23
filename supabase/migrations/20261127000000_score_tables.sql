-- スコア機能（段階①のデータ）。仕様は docs/score-spec.md の「5. データ」「7. ゲストのスコア」。
--
-- チームの試合（games.team_id あり）: 書き込みはそのチームの管理者のみ（RLS）。
--   読み取りは管理者、または teams.stats_public = true なら誰でも。
-- ゲストの試合（games.team_id が null）: テーブルを直接は読み書きできない。
--   作成・保存・削除・取り込みは編集用トークンを確認する security definer 関数だけ、
--   閲覧は id を指定する関数（get_score_game）だけ（一覧で他人の試合を拾えないようにする）。
--
-- 選手は game_lineups の行（打順・出場）で指す。打席・走者・投手成績はすべて game_lineups.id を参照し、
-- チームの試合では game_lineups.player_id、ゲストの試合では game_lineups.guest_name が選手を表す。
-- 得点は runner_events の to_base = 'H'（打者自身の得点も「B → H」の行として記録する）。

-- ============================================================
-- teams: 成績の設定
-- ============================================================
alter table public.teams
  add column if not exists stats_public       boolean      not null default false,
  add column if not exists innings_per_game   smallint     not null default 7,
  add column if not exists qualify_pa_rate    numeric(3,1) not null default 2.0,
  add column if not exists qualify_ip_rate    numeric(3,1) not null default 1.0,
  add column if not exists season_start_month smallint     not null default 1;

alter table public.teams drop constraint if exists teams_innings_per_game_check;
alter table public.teams add constraint teams_innings_per_game_check check (innings_per_game between 1 and 12);
alter table public.teams drop constraint if exists teams_qualify_pa_rate_check;
alter table public.teams add constraint teams_qualify_pa_rate_check check (qualify_pa_rate between 0 and 9.9);
alter table public.teams drop constraint if exists teams_qualify_ip_rate_check;
alter table public.teams add constraint teams_qualify_ip_rate_check check (qualify_ip_rate between 0 and 9.9);
alter table public.teams drop constraint if exists teams_season_start_month_check;
alter table public.teams add constraint teams_season_start_month_check check (season_start_month between 1 and 12);

-- 公開ビューに末尾で追加（公開ページが成績を出してよいか・換算の回数を知るため）
create or replace view public.team_profiles as
select
  id,
  name,
  logo_url,
  description,
  prefecture,
  area_detail,
  level,
  activity_days,
  activity_times,
  home_ground,
  member_count,
  age_range,
  founded_year,
  league,
  sns_x,
  sns_instagram,
  case when contact_public then contact_email end as contact_email,
  case when contact_public then contact_phone end as contact_phone,
  case when contact_public then contact_other end as contact_other,
  created_at,
  updated_at,
  city,
  travel_range,
  stats_public,
  innings_per_game,
  qualify_pa_rate,
  qualify_ip_rate,
  season_start_month
from public.teams;

revoke all on public.team_profiles from public, anon, authenticated;
grant select on public.team_profiles to anon, authenticated;

-- ============================================================
-- players: 選手名簿（チームのみ）
-- ============================================================
create table if not exists public.players (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null references public.teams(id) on delete cascade,
  real_name    text check (real_name is null or char_length(real_name) <= 50),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 30),
  number       text check (number is null or number ~ '^[0-9]{1,3}$'),
  throws       text check (throws is null or throws in ('R', 'L')),
  bats         text check (bats is null or bats in ('R', 'L', 'S')),
  positions    text[] not null default '{}'
                 check (positions <@ array['1', '2', '3', '4', '5', '6', '7', '8', '9']),
  is_helper    boolean not null default false,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (id, team_id)
);

create index if not exists players_team_id_idx on public.players (team_id);

drop trigger if exists players_set_updated_at on public.players;
create trigger players_set_updated_at
  before update on public.players
  for each row execute function public.set_updated_at();

-- ============================================================
-- games: 試合
-- ============================================================
create table if not exists public.games (
  id                uuid primary key default gen_random_uuid(),
  team_id           uuid references public.teams(id) on delete cascade,
  guest_team_name   text check (guest_team_name is null or char_length(guest_team_name) <= 50),
  game_date         date not null,
  game_type         text not null default '練習試合' check (game_type in ('練習試合', '公式戦')),
  tournament_name   text check (tournament_name is null or char_length(tournament_name) <= 100),
  opponent_name     text not null check (char_length(btrim(opponent_name)) between 1 and 50),
  opponent_team_id  uuid references public.teams(id) on delete set null,
  source_post_id    uuid references public.match_posts(id) on delete set null,
  venue             text check (venue is null or char_length(venue) <= 100),
  batting_first     boolean not null,
  scheduled_innings smallint not null default 7 check (scheduled_innings between 1 and 15),
  end_reason        text not null default '通常' check (end_reason in ('通常', '時間切れ', 'コールド', '没収')),
  forfeit_result    text check (forfeit_result is null or forfeit_result in ('勝ち', '負け')),
  defense_mode      text not null default 'summary' check (defense_mode in ('summary', 'detailed')),
  lineup_size       smallint not null default 9 check (lineup_size between 1 and 30),
  use_dh            boolean not null default false,
  opponent_innings  smallint[] not null default '{}'
                      check (cardinality(opponent_innings) <= 30
                             and 0 <= all (opponent_innings) and 99 >= all (opponent_innings)),
  status            text not null default '入力中' check (status in ('入力中', '確定')),
  memo              text check (memo is null or char_length(memo) <= 1000),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- 没収試合のときだけ勝ち負けを手で指定する
  constraint games_forfeit_needs_result check ((end_reason = '没収') = (forfeit_result is not null)),
  constraint games_opponent_not_self check (opponent_team_id is null or opponent_team_id <> team_id)
);

create index if not exists games_team_id_date_idx on public.games (team_id, game_date desc);
create index if not exists games_opponent_team_id_idx on public.games (opponent_team_id) where opponent_team_id is not null;
create index if not exists games_source_post_id_idx on public.games (source_post_id) where source_post_id is not null;
create index if not exists games_guest_updated_at_idx on public.games (updated_at) where team_id is null;

drop trigger if exists games_set_updated_at on public.games;
create trigger games_set_updated_at
  before update on public.games
  for each row execute function public.set_updated_at();

-- ゲストの試合の編集用トークン（ハッシュ）と作った端末。API からは一切読めない
create table if not exists public.guest_game_secrets (
  game_id            uuid primary key references public.games(id) on delete cascade,
  edit_token_hash    text not null,
  creator_visitor_id text not null check (creator_visitor_id ~ '^[0-9a-f-]{36}$'),
  created_at         timestamptz not null default now()
);

create index if not exists guest_game_secrets_visitor_idx
  on public.guest_game_secrets (creator_visitor_id, created_at);

-- ============================================================
-- game_lineups: 打順・出場（先発と交代）
-- ============================================================
create table if not exists public.game_lineups (
  id           uuid primary key default gen_random_uuid(),
  game_id      uuid not null references public.games(id) on delete cascade,
  player_id    uuid references public.players(id) deferrable initially deferred, -- チーム削除の連鎖削除は通し、選手だけの削除は止める
  guest_name   text check (guest_name is null or char_length(btrim(guest_name)) between 1 and 30),
  guest_bats   text check (guest_bats is null or guest_bats in ('R', 'L', 'S')),
  guest_throws text check (guest_throws is null or guest_throws in ('R', 'L')),
  batting_slot smallint check (batting_slot between 1 and 30),            -- DH 時の投手は null
  position     text check (position is null or position in ('1', '2', '3', '4', '5', '6', '7', '8', '9', 'DH')),
  entry_type   text not null default '先発'
                 check (entry_type in ('先発', '代打', '代走', '守備', '再出場', '臨時代走', '臨時代打')),
  entered_at   smallint check (entered_at >= 1),                          -- 何打席目（plate_appearances.seq）から。先発は null
  created_at   timestamptz not null default now(),
  unique (id, game_id),
  -- 名簿の選手か、ゲストの試合での名前のどちらかは必ずある（取り込み後は両方残る）
  constraint game_lineups_who_check check (player_id is not null or guest_name is not null)
);

create index if not exists game_lineups_game_id_idx on public.game_lineups (game_id);
create index if not exists game_lineups_player_id_idx on public.game_lineups (player_id) where player_id is not null;

-- ============================================================
-- plate_appearances: 打席（攻撃は自チームの打者、守備は相手の打者）
-- ============================================================
create table if not exists public.plate_appearances (
  id                    uuid primary key default gen_random_uuid(),
  game_id               uuid not null references public.games(id) on delete cascade,
  seq                   int not null check (seq >= 1),
  inning                smallint not null check (inning between 1 and 30),
  is_offense            boolean not null,
  batter_lineup_id      uuid,                                            -- 攻撃時
  opponent_batting_slot smallint check (opponent_batting_slot between 1 and 30), -- 守備時
  pitcher_lineup_id     uuid,                                            -- 守備時の自チームの投手
  opp_pitcher_throws    text check (opp_pitcher_throws is null or opp_pitcher_throws in ('R', 'L')),
  result                text not null check (result in (
                          '単打', '二塁打', '三塁打', '本塁打',
                          'ゴロ', 'フライ', 'ライナー', 'ファウルフライ',
                          '空振り三振', '見逃し三振', '振り逃げ',
                          '四球', '敬遠', '死球',
                          '犠打', '犠飛',
                          '野選', '失策出塁',
                          '打撃妨害', '走塁妨害',
                          '併殺', '三重殺')),
  fielders              text check (fielders is null or fielders ~ '^[1-9](-[1-9]){0,6}$'),
  direction_pos         smallint check (direction_pos between 1 and 9),
  direction_x           real check (direction_x between 0 and 1),
  direction_y           real check (direction_y between 0 and 1),
  rbi                   smallint not null default 0 check (rbi between 0 and 4),
  outs_on_play          smallint not null default 0 check (outs_on_play between 0 and 3),
  runners_before        smallint not null default 0 check (runners_before between 0 and 7), -- 1=一塁, 2=二塁, 4=三塁 の和
  created_at            timestamptz not null default now(),
  unique (id, game_id),
  constraint plate_appearances_seq_key unique (game_id, seq) deferrable initially immediate,
  constraint plate_appearances_side_check check (
    case when is_offense
      then batter_lineup_id is not null and opponent_batting_slot is null and pitcher_lineup_id is null
      else batter_lineup_id is null and opponent_batting_slot is not null and pitcher_lineup_id is not null
           and opp_pitcher_throws is null
    end),
  constraint plate_appearances_direction_xy_check check ((direction_x is null) = (direction_y is null)),
  foreign key (batter_lineup_id, game_id) references public.game_lineups (id, game_id),
  foreign key (pitcher_lineup_id, game_id) references public.game_lineups (id, game_id)
);

-- ============================================================
-- runner_events: 走者の動き（打席に伴うもの、打席の間の盗塁・暴投など）
-- ============================================================
create table if not exists public.runner_events (
  id                  uuid primary key default gen_random_uuid(),
  game_id             uuid not null references public.games(id) on delete cascade,
  plate_appearance_id uuid,                                              -- 打席の間の動きは null
  seq                 int not null check (seq >= 1),                     -- 試合内の並び順
  inning              smallint not null check (inning between 1 and 30),
  is_offense          boolean not null,
  runner_lineup_id    uuid,                                              -- 自チームの走者
  opponent_slot       smallint check (opponent_slot between 1 and 30),   -- 相手の走者（打順）
  from_base           text not null check (from_base in ('B', '1', '2', '3')), -- B は打者
  to_base             text not null check (to_base in ('1', '2', '3', 'H', 'OUT')),
  reason              text not null check (reason in (
                        '打球', '四死球', '盗塁', '盗塁死', '暴投', '捕逸', 'ボーク',
                        '失策', '野選', '牽制死', '走塁死', '妨害', 'その他')),
  earned              boolean,                                           -- 守備時の得点のみ。自責点か
  created_at          timestamptz not null default now(),
  constraint runner_events_who_check check (
    case when is_offense
      then runner_lineup_id is not null and opponent_slot is null
      else runner_lineup_id is null and opponent_slot is not null
    end),
  constraint runner_events_move_check check (
    to_base = 'OUT' or to_base = 'H' or from_base = 'B' or to_base > from_base),
  constraint runner_events_earned_check check (earned is null or (to_base = 'H' and not is_offense)),
  foreign key (plate_appearance_id, game_id) references public.plate_appearances (id, game_id) on delete cascade,
  foreign key (runner_lineup_id, game_id) references public.game_lineups (id, game_id)
);

create index if not exists runner_events_game_id_idx on public.runner_events (game_id, seq);
create index if not exists runner_events_pa_idx on public.runner_events (plate_appearance_id) where plate_appearance_id is not null;

-- ============================================================
-- pitching_summaries: 投手ごとの合計（守備を合計モードで記録する試合）
-- ============================================================
create table if not exists public.pitching_summaries (
  id         uuid primary key default gen_random_uuid(),
  game_id    uuid not null references public.games(id) on delete cascade,
  lineup_id  uuid not null,
  order_no   smallint not null default 1 check (order_no between 1 and 30), -- 登板順
  outs       smallint not null default 0 check (outs between 0 and 99),     -- 投球回はアウト数（5 1/3 回 = 16）
  bf         smallint not null default 0 check (bf between 0 and 999),
  h          smallint not null default 0 check (h between 0 and 999),
  r          smallint not null default 0 check (r between 0 and 999),
  er         smallint not null default 0 check (er between 0 and 999),
  bb         smallint not null default 0 check (bb between 0 and 999),
  hbp        smallint not null default 0 check (hbp between 0 and 999),
  so         smallint not null default 0 check (so between 0 and 999),
  hr         smallint not null default 0 check (hr between 0 and 999),
  created_at timestamptz not null default now(),
  unique (game_id, lineup_id),
  constraint pitching_summaries_totals_check check (er <= r and hr <= h),
  foreign key (lineup_id, game_id) references public.game_lineups (id, game_id)
);

-- ============================================================
-- pitching_decisions: 投手の勝敗・セーブ・ホールド
-- ============================================================
create table if not exists public.pitching_decisions (
  id         uuid primary key default gen_random_uuid(),
  game_id    uuid not null references public.games(id) on delete cascade,
  lineup_id  uuid not null,
  decision   text not null check (decision in ('W', 'L', 'S', 'H')),
  created_at timestamptz not null default now(),
  unique (game_id, lineup_id),
  foreign key (lineup_id, game_id) references public.game_lineups (id, game_id)
);

-- 勝ち・負け・セーブは1試合1人まで（ホールドは複数可）
create unique index if not exists pitching_decisions_one_per_game
  on public.pitching_decisions (game_id, decision) where decision in ('W', 'L', 'S');

-- ============================================================
-- player_season_imports: 過去データ（選手ごとの年度合計）
-- ============================================================
create table if not exists public.player_season_imports (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams(id) on delete cascade,
  player_id  uuid not null,
  year       smallint not null check (year between 1900 and 2100),
  -- 打撃
  g          smallint not null default 0 check (g between 0 and 999),
  pa         smallint not null default 0 check (pa between 0 and 9999),
  ab         smallint not null default 0 check (ab between 0 and 9999),
  h          smallint not null default 0 check (h between 0 and 9999),
  doubles    smallint not null default 0 check (doubles between 0 and 9999),
  triples    smallint not null default 0 check (triples between 0 and 9999),
  hr         smallint not null default 0 check (hr between 0 and 9999),
  rbi        smallint not null default 0 check (rbi between 0 and 9999),
  runs       smallint not null default 0 check (runs between 0 and 9999),
  bb         smallint not null default 0 check (bb between 0 and 9999),
  hbp        smallint not null default 0 check (hbp between 0 and 9999),
  so         smallint not null default 0 check (so between 0 and 9999),
  sh         smallint not null default 0 check (sh between 0 and 9999),
  sf         smallint not null default 0 check (sf between 0 and 9999),
  sb         smallint not null default 0 check (sb between 0 and 9999),
  cs         smallint not null default 0 check (cs between 0 and 9999),
  -- 投手
  p_g        smallint not null default 0 check (p_g between 0 and 999),
  p_outs     smallint not null default 0 check (p_outs between 0 and 9999),
  p_bf       smallint not null default 0 check (p_bf between 0 and 9999),
  p_h        smallint not null default 0 check (p_h between 0 and 9999),
  p_r        smallint not null default 0 check (p_r between 0 and 9999),
  p_er       smallint not null default 0 check (p_er between 0 and 9999),
  p_bb       smallint not null default 0 check (p_bb between 0 and 9999),
  p_hbp      smallint not null default 0 check (p_hbp between 0 and 9999),
  p_so       smallint not null default 0 check (p_so between 0 and 9999),
  p_hr       smallint not null default 0 check (p_hr between 0 and 9999),
  p_w        smallint not null default 0 check (p_w between 0 and 999),
  p_l        smallint not null default 0 check (p_l between 0 and 999),
  p_sv       smallint not null default 0 check (p_sv between 0 and 999),
  p_hld      smallint not null default 0 check (p_hld between 0 and 999),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (player_id, year),
  constraint player_season_imports_batting_check
    check (h <= ab and ab <= pa and doubles + triples + hr <= h and p_er <= p_r),
  -- 選手は同じチームの名簿から
  foreign key (player_id, team_id) references public.players (id, team_id) on delete cascade
);

create index if not exists player_season_imports_team_idx on public.player_season_imports (team_id, year);

drop trigger if exists player_season_imports_set_updated_at on public.player_season_imports;
create trigger player_season_imports_set_updated_at
  before update on public.player_season_imports
  for each row execute function public.set_updated_at();

-- ============================================================
-- トリガー: 所属の付け替え防止と整合性
-- ============================================================

-- 選手のチームは変えられない（別チームの試合の成績が混ざらないように）
create or replace function public.lock_player_team()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.team_id is distinct from old.team_id then
    raise exception 'player_team_immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists players_lock_team on public.players;
create trigger players_lock_team
  before update on public.players
  for each row execute function public.lock_player_team();

-- 試合のチームは付いたら変えられない（ゲスト→チームの取り込みだけ可）
create or replace function public.lock_game_team()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.team_id is not null and new.team_id is distinct from old.team_id then
    raise exception 'game_team_immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists games_lock_team on public.games;
create trigger games_lock_team
  before update on public.games
  for each row execute function public.lock_game_team();

-- 出場選手: チームの試合は同じチームの名簿の選手、ゲストの試合は名前だけ
create or replace function public.check_lineup_player()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team_id uuid;
begin
  select team_id into v_team_id from public.games where id = new.game_id;

  if v_team_id is null then
    if new.player_id is not null then
      raise exception 'guest_game_player_not_allowed' using errcode = '23514';
    end if;
  else
    if new.player_id is null then
      raise exception 'lineup_player_required' using errcode = '23514';
    end if;
    if not exists (select 1 from public.players where id = new.player_id and team_id = v_team_id) then
      raise exception 'lineup_player_other_team' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists game_lineups_check_player on public.game_lineups;
create trigger game_lineups_check_player
  before insert or update on public.game_lineups
  for each row execute function public.check_lineup_player();

-- 相手チーム・引き継ぎ元の募集はチームの試合だけ
create or replace function public.check_game_links()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.team_id is null and (new.opponent_team_id is not null or new.source_post_id is not null) then
    raise exception 'guest_game_links_not_allowed' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists games_check_links on public.games;
create trigger games_check_links
  before insert or update on public.games
  for each row execute function public.check_game_links();

-- ============================================================
-- 権限の判定（RLS から呼ぶため security definer）
-- ============================================================

-- チームの試合を編集できるか（そのチームの管理者）
create or replace function public.can_edit_game(p_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.games g
    where g.id = p_game_id and g.team_id is not null and public.is_team_member(g.team_id)
  );
$$;

-- チームの試合を見られるか（管理者、または成績を公開しているチーム）。ゲストの試合は false（関数経由で読む）
create or replace function public.can_view_game(p_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.games g
    join public.teams t on t.id = g.team_id
    where g.id = p_game_id and (t.stats_public or public.is_team_member(t.id))
  );
$$;

-- チームの成績を見られるか
create or replace function public.can_view_team_stats(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.teams t
    where t.id = p_team_id and (t.stats_public or public.is_team_member(t.id))
  );
$$;

revoke all on function public.can_edit_game(uuid) from public;
revoke all on function public.can_view_game(uuid) from public;
revoke all on function public.can_view_team_stats(uuid) from public;
grant execute on function public.can_edit_game(uuid) to anon, authenticated;
grant execute on function public.can_view_game(uuid) to anon, authenticated;
grant execute on function public.can_view_team_stats(uuid) to anon, authenticated;

-- ============================================================
-- RLS
-- ============================================================
alter table public.players enable row level security;
alter table public.games enable row level security;
alter table public.guest_game_secrets enable row level security;
alter table public.game_lineups enable row level security;
alter table public.plate_appearances enable row level security;
alter table public.runner_events enable row level security;
alter table public.pitching_summaries enable row level security;
alter table public.pitching_decisions enable row level security;
alter table public.player_season_imports enable row level security;

-- players: 本名を含むので管理者のみ。公開は player_profiles ビュー
drop policy if exists "members can select players" on public.players;
create policy "members can select players"
  on public.players for select to authenticated
  using (public.is_team_member(team_id));

drop policy if exists "members can insert players" on public.players;
create policy "members can insert players"
  on public.players for insert to authenticated
  with check (public.is_team_member(team_id));

drop policy if exists "members can update players" on public.players;
create policy "members can update players"
  on public.players for update to authenticated
  using (public.is_team_member(team_id))
  with check (public.is_team_member(team_id));

drop policy if exists "members can delete players" on public.players;
create policy "members can delete players"
  on public.players for delete to authenticated
  using (public.is_team_member(team_id));

-- games: チームの試合のみ。ゲストの試合（team_id null）はどのポリシーにも当たらない
drop policy if exists "team games are readable" on public.games;
create policy "team games are readable"
  on public.games for select to anon, authenticated
  using (team_id is not null and public.can_view_team_stats(team_id));

drop policy if exists "members can insert games" on public.games;
create policy "members can insert games"
  on public.games for insert to authenticated
  with check (team_id is not null and public.is_team_member(team_id));

drop policy if exists "members can update games" on public.games;
create policy "members can update games"
  on public.games for update to authenticated
  using (team_id is not null and public.is_team_member(team_id))
  with check (team_id is not null and public.is_team_member(team_id));

drop policy if exists "members can delete games" on public.games;
create policy "members can delete games"
  on public.games for delete to authenticated
  using (team_id is not null and public.is_team_member(team_id));

-- 試合の子テーブル: 読み取りは can_view_game、書き込みは can_edit_game
do $$
declare
  t text;
begin
  foreach t in array array['game_lineups', 'plate_appearances', 'runner_events', 'pitching_summaries', 'pitching_decisions']
  loop
    execute format('drop policy if exists "game rows are readable" on public.%I', t);
    execute format('create policy "game rows are readable" on public.%I for select to anon, authenticated
                    using (public.can_view_game(game_id))', t);
    execute format('drop policy if exists "members can insert game rows" on public.%I', t);
    execute format('create policy "members can insert game rows" on public.%I for insert to authenticated
                    with check (public.can_edit_game(game_id))', t);
    execute format('drop policy if exists "members can update game rows" on public.%I', t);
    execute format('create policy "members can update game rows" on public.%I for update to authenticated
                    using (public.can_edit_game(game_id)) with check (public.can_edit_game(game_id))', t);
    execute format('drop policy if exists "members can delete game rows" on public.%I', t);
    execute format('create policy "members can delete game rows" on public.%I for delete to authenticated
                    using (public.can_edit_game(game_id))', t);
  end loop;
end;
$$;

-- player_season_imports
drop policy if exists "season imports are readable" on public.player_season_imports;
create policy "season imports are readable"
  on public.player_season_imports for select to anon, authenticated
  using (public.can_view_team_stats(team_id));

drop policy if exists "members can insert season imports" on public.player_season_imports;
create policy "members can insert season imports"
  on public.player_season_imports for insert to authenticated
  with check (public.is_team_member(team_id));

drop policy if exists "members can update season imports" on public.player_season_imports;
create policy "members can update season imports"
  on public.player_season_imports for update to authenticated
  using (public.is_team_member(team_id))
  with check (public.is_team_member(team_id));

drop policy if exists "members can delete season imports" on public.player_season_imports;
create policy "members can delete season imports"
  on public.player_season_imports for delete to authenticated
  using (public.is_team_member(team_id));

-- テーブル権限（新しいテーブルは自動で API に公開されないため明示する）
revoke all on public.players, public.games, public.guest_game_secrets, public.game_lineups,
  public.plate_appearances, public.runner_events, public.pitching_summaries,
  public.pitching_decisions, public.player_season_imports
  from public, anon, authenticated;

grant select, insert, update, delete on public.players to authenticated;
grant select on public.games, public.game_lineups, public.plate_appearances, public.runner_events,
  public.pitching_summaries, public.pitching_decisions, public.player_season_imports
  to anon, authenticated;
grant insert, update, delete on public.games, public.game_lineups, public.plate_appearances,
  public.runner_events, public.pitching_summaries, public.pitching_decisions, public.player_season_imports
  to authenticated;
-- guest_game_secrets は権限なし（関数だけが読み書きする）

-- 選手の公開ビュー: 本名を出さない。成績を公開しているチーム（と自チームの管理者）の選手だけ
create or replace view public.player_profiles as
select
  p.id,
  p.team_id,
  p.display_name,
  p.number,
  p.throws,
  p.bats,
  p.positions,
  p.is_helper,
  p.active,
  p.created_at
from public.players p
where public.can_view_team_stats(p.team_id);

revoke all on public.player_profiles from public, anon, authenticated;
grant select on public.player_profiles to anon, authenticated;

-- ============================================================
-- ゲストの試合の関数（編集用トークンで確認）
-- ============================================================

create or replace function public.hash_edit_token(p_token text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');
$$;
revoke all on function public.hash_edit_token(text) from public, anon, authenticated;

-- トークンが正しいゲストの試合か
create or replace function public.check_guest_game_token(p_game_id uuid, p_token text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.games g
    join public.guest_game_secrets s on s.game_id = g.id
    where g.id = p_game_id
      and g.team_id is null
      and p_token is not null
      and s.edit_token_hash = public.hash_edit_token(p_token)
  );
$$;

-- 作成。同じ端末は1日（日本時間）10試合まで。返す edit_token は平文で、この時だけ取得できる
create or replace function public.create_guest_game(p_visitor_id text, p_game jsonb)
returns table (game_id uuid, edit_token text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today_start timestamptz := ((now() at time zone 'Asia/Tokyo')::date)::timestamp at time zone 'Asia/Tokyo';
  v_count int;
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
  v_id uuid;
  r public.games;
begin
  if p_visitor_id is null or p_visitor_id !~ '^[0-9a-f-]{36}$' then
    raise exception 'invalid_visitor_id' using errcode = '22023';
  end if;

  -- 同じ端末の同時作成で上限を超えないように
  perform pg_advisory_xact_lock(hashtext('create_guest_game:' || p_visitor_id));

  select count(*) into v_count
  from public.guest_game_secrets
  where creator_visitor_id = p_visitor_id and created_at >= v_today_start;

  if v_count >= 10 then
    raise exception 'guest_game_daily_limit' using errcode = 'P0001',
      hint = '同じ端末から作成できる試合は1日10試合までです';
  end if;

  r := jsonb_populate_record(null::public.games, coalesce(p_game, '{}'::jsonb));

  insert into public.games (
    team_id, guest_team_name, game_date, game_type, tournament_name, opponent_name, venue,
    batting_first, scheduled_innings, end_reason, forfeit_result, defense_mode, lineup_size, use_dh,
    opponent_innings, status, memo
  ) values (
    null, r.guest_team_name, coalesce(r.game_date, (now() at time zone 'Asia/Tokyo')::date),
    coalesce(r.game_type, '練習試合'), r.tournament_name, r.opponent_name, r.venue,
    coalesce(r.batting_first, true), coalesce(r.scheduled_innings, 7), coalesce(r.end_reason, '通常'),
    r.forfeit_result, coalesce(r.defense_mode, 'summary'), coalesce(r.lineup_size, 9),
    coalesce(r.use_dh, false), coalesce(r.opponent_innings, '{}'), '入力中', r.memo
  )
  returning id into v_id;

  insert into public.guest_game_secrets (game_id, edit_token_hash, creator_visitor_id)
  values (v_id, public.hash_edit_token(v_token), p_visitor_id);

  return query select v_id, v_token;
end;
$$;

-- 保存。試合の内容を丸ごと受け取り、子の行は全部入れ替える（端末に保存した状態をそのまま送る想定）。
-- 子の行の id はクライアントが決めて送る（打席→出場選手などの参照を保つため）。
-- p_expected_updated_at を渡すと、ほかの端末が先に保存していたとき conflict = true を返す（保存は後勝ちで行う）
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
                                   batting_slot, position, entry_type, entered_at)
  select coalesce(x.id, gen_random_uuid()), p_game_id, null, x.guest_name, x.guest_bats, x.guest_throws,
         x.batting_slot, x.position, coalesce(x.entry_type, '先発'), x.entered_at
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

-- 削除（ゲストの試合のみ）
create or replace function public.delete_guest_game(p_game_id uuid, p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.check_guest_game_token(p_game_id, p_token) then
    raise exception 'invalid_edit_token' using errcode = '42501';
  end if;
  delete from public.games where id = p_game_id and team_id is null;
end;
$$;

-- 試合1件を丸ごと取得（/scores/[id] 用）。ゲストの試合は id を知っていれば誰でも、
-- 取り込み済みのチームの試合は can_view_game のときだけ。見られなければ null。
-- 選手名は表示名（players.display_name）か guest_name。本名は返さない
create or replace function public.get_score_game(p_game_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'game', to_jsonb(g) || jsonb_build_object('team_name', coalesce(t.name, g.guest_team_name)),
    'lineups', coalesce((
      select jsonb_agg(to_jsonb(l) || jsonb_build_object('name', coalesce(p.display_name, l.guest_name))
                       order by l.batting_slot nulls last, l.entered_at nulls first, l.created_at)
      from public.game_lineups l
      left join public.players p on p.id = l.player_id
      where l.game_id = g.id), '[]'),
    'plate_appearances', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.seq) from public.plate_appearances x where x.game_id = g.id), '[]'),
    'runner_events', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.seq, x.created_at) from public.runner_events x where x.game_id = g.id), '[]'),
    'pitching_summaries', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.order_no) from public.pitching_summaries x where x.game_id = g.id), '[]'),
    'pitching_decisions', coalesce((
      select jsonb_agg(to_jsonb(x)) from public.pitching_decisions x where x.game_id = g.id), '[]')
  )
  from public.games g
  left join public.teams t on t.id = g.team_id
  where g.id = p_game_id
    and (g.team_id is null or t.stats_public or public.is_team_member(g.team_id));
$$;

-- 端末に保存した試合の一覧（/scores の「この端末で記録した試合」）。最大50件。
-- 取り込み済みの試合は imported = true だけ返す（チーム名や得点は返さない）
create or replace function public.list_guest_games(p_game_ids uuid[])
returns table (
  id uuid,
  imported boolean,
  game_date date,
  guest_team_name text,
  opponent_name text,
  status text,
  our_runs bigint,
  opponent_runs bigint,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    g.id,
    g.team_id is not null,
    case when g.team_id is null then g.game_date end,
    case when g.team_id is null then g.guest_team_name end,
    case when g.team_id is null then g.opponent_name end,
    case when g.team_id is null then g.status end,
    case when g.team_id is null then
      (select count(*) from public.runner_events e where e.game_id = g.id and e.is_offense and e.to_base = 'H') end,
    case when g.team_id is null then
      case when g.defense_mode = 'summary'
        then (select coalesce(sum(v), 0) from unnest(g.opponent_innings) v)
        else (select count(*) from public.runner_events e where e.game_id = g.id and not e.is_offense and e.to_base = 'H')
      end end,
    g.updated_at
  from public.games g
  where g.id = any (p_game_ids[1:50]);
$$;

-- チームへの取り込み。p_player_map は { "<game_lineups.id>": "<players.id>", ... } で、出場選手すべてを対応づける。
-- 名簿にない選手は、先に players に追加してから渡す
create or replace function public.import_guest_game(
  p_game_id uuid,
  p_token text,
  p_team_id uuid,
  p_player_map jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_missing int;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not public.is_team_member(p_team_id) then
    raise exception 'not_team_member' using errcode = '42501';
  end if;
  if not public.check_guest_game_token(p_game_id, p_token) then
    raise exception 'invalid_edit_token' using errcode = '42501';
  end if;

  perform 1 from public.games where id = p_game_id for update;

  select count(*) into v_missing
  from public.game_lineups l
  where l.game_id = p_game_id
    and not exists (
      select 1 from public.players p
      where p.team_id = p_team_id
        and p.id::text = coalesce(p_player_map, '{}'::jsonb) ->> l.id::text
    );

  if v_missing > 0 then
    raise exception 'unmapped_lineups' using errcode = 'P0001',
      hint = 'すべての出場選手を名簿の選手に対応づけてください';
  end if;

  update public.games set team_id = p_team_id where id = p_game_id;

  update public.game_lineups l
  set player_id = (p_player_map ->> l.id::text)::uuid
  where l.game_id = p_game_id;

  -- 取り込んだ試合はチームの権限で編集する。トークンは使えなくする
  delete from public.guest_game_secrets where game_id = p_game_id;
end;
$$;

revoke all on function public.check_guest_game_token(uuid, text) from public;
revoke all on function public.create_guest_game(text, jsonb) from public;
revoke all on function public.save_guest_game(uuid, text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, timestamptz) from public;
revoke all on function public.delete_guest_game(uuid, text) from public;
revoke all on function public.get_score_game(uuid) from public;
revoke all on function public.list_guest_games(uuid[]) from public;
revoke all on function public.import_guest_game(uuid, text, uuid, jsonb) from public;

grant execute on function public.check_guest_game_token(uuid, text) to anon, authenticated;
grant execute on function public.create_guest_game(text, jsonb) to anon, authenticated;
grant execute on function public.save_guest_game(uuid, text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, timestamptz) to anon, authenticated;
grant execute on function public.delete_guest_game(uuid, text) to anon, authenticated;
grant execute on function public.get_score_game(uuid) to anon, authenticated;
grant execute on function public.list_guest_games(uuid[]) to anon, authenticated;
grant execute on function public.import_guest_game(uuid, text, uuid, jsonb) to authenticated;

-- ============================================================
-- 放置されたゲストの試合の削除（チームに取り込まれず1年更新のないもの）
-- ============================================================
create or replace function public.purge_stale_guest_games()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  purged integer;
begin
  delete from public.games
  where team_id is null and updated_at < now() - interval '1 year';
  get diagnostics purged = row_count;
  return purged;
end;
$$;

revoke all on function public.purge_stale_guest_games() from public, anon, authenticated;

-- 毎月3日 03:00 JST（pg_cron は UTC なので 2日 18:00）
select cron.schedule(
  'purge-stale-guest-games',
  '0 18 2 * *',
  $$select public.purge_stale_guest_games()$$
);
