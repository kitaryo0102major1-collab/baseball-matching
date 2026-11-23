-- 募集を出した人向けの閲覧数・気になる数

-- 自分のチームの募集には気になるを付けられない（管理者が呼んでも記録しない）
create or replace function public.like_post(p_post_id uuid, p_visitor_id text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.post_likes (post_id, visitor_id, user_id)
  select p.id, p_visitor_id, (select auth.uid())
  from public.match_posts p
  where p.id = p_post_id
    and p_visitor_id ~ '^[0-9a-f-]{36}$'
    and not (p.team_id is not null and public.is_team_member(p.team_id))
  on conflict do nothing;
$$;

-- 閲覧数を複数の募集でまとめて返す。見られる人の判定は get_post_view_count と同じで、見られない募集は null。
-- 存在しない募集は行を返さない。一度に200件まで
create or replace function public.get_post_view_counts(p_post_ids uuid[], p_visitor_id text default null)
returns table (post_id uuid, view_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    case
      when (p.team_id is not null and public.is_team_member(p.team_id))
        or (p.team_id is null and p.creator_visitor_id is not null and p.creator_visitor_id = p_visitor_id)
      then (select count(*) from public.post_views v where v.post_id = p.id)
    end
  from public.match_posts p
  where p.id = any (p_post_ids[1:200]);
$$;

revoke all on function public.get_post_view_counts(uuid[], text) from public, anon, authenticated;
grant execute on function public.get_post_view_counts(uuid[], text) to anon, authenticated;
