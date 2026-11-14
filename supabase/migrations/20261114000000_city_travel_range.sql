-- 募集とチームに市区町村と移動できる範囲を追加する。既存データは null のまま。
-- city は lib/municipalities.ts の市区町村名（政令指定都市は市単位、東京23区は区）。

alter table public.match_posts
  add column if not exists city text,
  add column if not exists travel_range text;

alter table public.teams
  add column if not exists city text,
  add column if not exists travel_range text;

alter table public.match_posts drop constraint if exists match_posts_travel_range_check;
alter table public.match_posts
  add constraint match_posts_travel_range_check
  check (travel_range is null or travel_range in ('市内のみ', '30分圏内', '1時間圏内', '県内どこでも'));

alter table public.teams drop constraint if exists teams_travel_range_check;
alter table public.teams
  add constraint teams_travel_range_check
  check (travel_range is null or travel_range in ('市内のみ', '30分圏内', '1時間圏内', '県内どこでも'));

-- match_posts は列単位の select 権限なので、追加した列も公開する
grant select (city, travel_range) on public.match_posts to anon, authenticated;

-- 公開ビューにも追加する（create or replace view は列を末尾にしか足せない）
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
  travel_range
from public.teams;

revoke all on public.team_profiles from public, anon, authenticated;
grant select on public.team_profiles to anon, authenticated;
