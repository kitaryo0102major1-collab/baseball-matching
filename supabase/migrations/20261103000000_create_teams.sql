-- チーム登録機能（フェーズ1）
-- teams: 本人のみ読み書き可。他人は公開ビュー team_profiles 経由でのみ参照する。

create table if not exists public.teams (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null unique references auth.users(id) on delete cascade,
  name           text not null check (char_length(btrim(name)) between 1 and 50),
  logo_url       text,
  description    text check (description is null or char_length(description) <= 500),
  prefecture     text not null,
  area_detail    text,
  level          text not null check (level in ('A+', 'A', 'B', 'C')),
  activity_days  text[] not null default '{}'
                   check (activity_days <@ array['月', '火', '水', '木', '金', '土', '日', '祝']),
  activity_times text[] not null default '{}'
                   check (activity_times <@ array['午前', '午後', '夕方以降', '不定']),
  home_ground    text,
  member_count   int check (member_count is null or member_count between 1 and 999),
  age_range      text check (age_range is null or age_range in ('10代', '20代', '30代', '40代', '50代以上', '幅広い')),
  founded_year   int check (founded_year is null or founded_year between 1900 and 2100),
  league         text,
  sns_x          text check (sns_x is null or sns_x ~* '^https?://'),
  sns_instagram  text check (sns_instagram is null or sns_instagram ~* '^https?://'),
  contact_email  text,
  contact_phone  text,
  contact_other  text,
  contact_public boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists teams_set_updated_at on public.teams;
create trigger teams_set_updated_at
  before update on public.teams
  for each row execute function public.set_updated_at();

-- RLS: 本人のみ
alter table public.teams enable row level security;

drop policy if exists "owner can select own team" on public.teams;
create policy "owner can select own team"
  on public.teams for select to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "owner can insert own team" on public.teams;
create policy "owner can insert own team"
  on public.teams for insert to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists "owner can update own team" on public.teams;
create policy "owner can update own team"
  on public.teams for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "owner can delete own team" on public.teams;
create policy "owner can delete own team"
  on public.teams for delete to authenticated
  using ((select auth.uid()) = owner_id);

-- 公開ビュー: owner_id は出さず、連絡先は contact_public = true のときだけ返す。
-- ビューの所有者権限で teams の RLS をバイパスして全チームを読む（意図的に security_invoker を使わない）。
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
  updated_at
from public.teams;

-- 単一テーブルのビューは自動で更新可能になり、所有者権限で RLS をすり抜けるため、読み取り専用にする
revoke all on public.team_profiles from public, anon, authenticated;
grant select on public.team_profiles to anon, authenticated;

-- Storage: チームロゴ（公開バケット・2MBまで・画像のみ）
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('team-logos', 'team-logos', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "team logos are publicly readable" on storage.objects;
create policy "team logos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'team-logos');

drop policy if exists "users can upload own team logo" on storage.objects;
create policy "users can upload own team logo"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'team-logos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "users can update own team logo" on storage.objects;
create policy "users can update own team logo"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'team-logos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'team-logos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "users can delete own team logo" on storage.objects;
create policy "users can delete own team logo"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'team-logos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
