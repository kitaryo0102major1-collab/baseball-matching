-- ゲスト募集を投稿した端末も、自分の募集には気になるを付けられないようにする（管理者と同じ扱い）

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
    and p.creator_visitor_id is distinct from p_visitor_id
  on conflict do nothing;
$$;
