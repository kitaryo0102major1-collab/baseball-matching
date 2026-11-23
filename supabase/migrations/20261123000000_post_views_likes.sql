-- 募集の閲覧数と「気になる」。テーブルは API から直接読み書きできず、すべて下の関数を通す。
-- visitor_id は端末ごとのランダムID（lib/visitor.ts、localStorage に保存）。

-- ゲスト募集を投稿した端末。閲覧数を見てよいかの判定にだけ使い、API からは読めない（select を grant しない）
alter table public.match_posts add column if not exists creator_visitor_id text;

alter table public.match_posts drop constraint if exists match_posts_creator_visitor_id_check;
alter table public.match_posts
  add constraint match_posts_creator_visitor_id_check
  check (creator_visitor_id is null or creator_visitor_id ~ '^[0-9a-f-]{36}$');

-- ゲスト募集は誰でも更新できるため、投稿後に creator_visitor_id を書き換えて閲覧数を覗けないようにする
create or replace function public.lock_post_ownership()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.team_id is distinct from old.team_id and new.team_id is not null then
    raise exception 'team_id_immutable' using errcode = '42501';
  end if;
  if new.created_by is distinct from old.created_by and new.created_by is not null then
    raise exception 'created_by_immutable' using errcode = '42501';
  end if;
  if new.post_type is distinct from old.post_type then
    raise exception 'post_type_immutable' using errcode = '42501';
  end if;
  if new.source_post_id is distinct from old.source_post_id and new.source_post_id is not null then
    raise exception 'source_post_id_immutable' using errcode = '42501';
  end if;
  if new.creator_visitor_id is distinct from old.creator_visitor_id then
    raise exception 'creator_visitor_id_immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

create table if not exists public.post_views (
  post_id uuid not null references public.match_posts(id) on delete cascade,
  visitor_id text not null check (visitor_id ~ '^[0-9a-f-]{36}$'),
  viewed_on date not null,
  unique (post_id, visitor_id, viewed_on)
);

create table if not exists public.post_likes (
  post_id uuid not null references public.match_posts(id) on delete cascade,
  visitor_id text not null check (visitor_id ~ '^[0-9a-f-]{36}$'),
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (post_id, visitor_id)
);

-- 直接の読み書きは不可（ポリシーなし＋権限なし）
alter table public.post_views enable row level security;
alter table public.post_likes enable row level security;
revoke all on public.post_views from public, anon, authenticated;
revoke all on public.post_likes from public, anon, authenticated;

-- 閲覧を記録する。同じ端末は1募集につき1日（日本時間）1回まで
create or replace function public.record_post_view(p_post_id uuid, p_visitor_id text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.post_views (post_id, visitor_id, viewed_on)
  select p.id, p_visitor_id, (now() at time zone 'Asia/Tokyo')::date
  from public.match_posts p
  where p.id = p_post_id and p_visitor_id ~ '^[0-9a-f-]{36}$'
  on conflict do nothing;
$$;

-- 気になるを付ける。同じ端末は1募集1回まで。ログイン中なら user_id も残す
create or replace function public.like_post(p_post_id uuid, p_visitor_id text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.post_likes (post_id, visitor_id, user_id)
  select p.id, p_visitor_id, (select auth.uid())
  from public.match_posts p
  where p.id = p_post_id and p_visitor_id ~ '^[0-9a-f-]{36}$'
  on conflict do nothing;
$$;

-- 気になるを取り消す（その端末の分だけ）
create or replace function public.unlike_post(p_post_id uuid, p_visitor_id text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.post_likes where post_id = p_post_id and visitor_id = p_visitor_id;
$$;

-- 気になる数（誰でも可）。複数の募集をまとめて取得でき、visitor_id を渡すとその端末が付けたかも返す。
-- 1件もない募集は行を返さない（0 として扱う）。一度に取得できるのは200件まで
create or replace function public.get_post_like_counts(p_post_ids uuid[], p_visitor_id text default null)
returns table (post_id uuid, like_count bigint, liked boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select l.post_id, count(*), coalesce(bool_or(l.visitor_id = p_visitor_id), false)
  from public.post_likes l
  where l.post_id = any (p_post_ids[1:200])
  group by l.post_id;
$$;

-- 閲覧数（のべ。同じ端末は1日1回まで数える）。見られるのは、チームの募集ならそのチームの管理者、
-- ゲスト募集なら投稿した端末だけ。それ以外は null
create or replace function public.get_post_view_count(p_post_id uuid, p_visitor_id text default null)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select (select count(*) from public.post_views v where v.post_id = p.id)
  from public.match_posts p
  where p.id = p_post_id
    and (
      (p.team_id is not null and public.is_team_member(p.team_id))
      or (p.team_id is null and p.creator_visitor_id is not null and p.creator_visitor_id = p_visitor_id)
    );
$$;

revoke all on function public.record_post_view(uuid, text) from public, anon, authenticated;
revoke all on function public.like_post(uuid, text) from public, anon, authenticated;
revoke all on function public.unlike_post(uuid, text) from public, anon, authenticated;
revoke all on function public.get_post_like_counts(uuid[], text) from public, anon, authenticated;
revoke all on function public.get_post_view_count(uuid, text) from public, anon, authenticated;
grant execute on function public.record_post_view(uuid, text) to anon, authenticated;
grant execute on function public.like_post(uuid, text) to anon, authenticated;
grant execute on function public.unlike_post(uuid, text) to anon, authenticated;
grant execute on function public.get_post_like_counts(uuid[], text) to anon, authenticated;
grant execute on function public.get_post_view_count(uuid, text) to anon, authenticated;
