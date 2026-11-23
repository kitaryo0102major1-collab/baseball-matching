-- 閲覧の記録から、その募集のチームの管理者と、ゲスト募集を投稿した端末の閲覧を除く

create or replace function public.record_post_view(p_post_id uuid, p_visitor_id text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.post_views (post_id, visitor_id, viewed_on)
  select p.id, p_visitor_id, (now() at time zone 'Asia/Tokyo')::date
  from public.match_posts p
  where p.id = p_post_id
    and p_visitor_id ~ '^[0-9a-f-]{36}$'
    and not (p.team_id is not null and public.is_team_member(p.team_id))
    and p.creator_visitor_id is distinct from p_visitor_id
  on conflict do nothing;
$$;
