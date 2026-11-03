-- フェーズ2: チームとして募集・チャットする

alter table public.match_posts
  add column if not exists team_id uuid references public.teams(id) on delete set null,
  add column if not exists created_by uuid references auth.users(id) on delete set null;

create index if not exists match_posts_team_id_idx on public.match_posts (team_id, game_date);

alter table public.chats
  add column if not exists team_id uuid references public.teams(id) on delete set null;

-- team_id / created_by は投稿後に付け替えられない（チーム・アカウント削除による null 化だけ許可）。
-- これがないと、チームの管理者がゲストの募集を自チームのものに書き換えて乗っ取れてしまう。
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
  return new;
end;
$$;

drop trigger if exists match_posts_lock_ownership on public.match_posts;
create trigger match_posts_lock_ownership
  before update on public.match_posts
  for each row execute function public.lock_post_ownership();

-- match_posts の RLS
drop policy if exists "anyone can insert posts" on public.match_posts;
drop policy if exists "anyone can update posts" on public.match_posts;
drop policy if exists "guests or team members can insert posts" on public.match_posts;
drop policy if exists "guest posts or team members can update posts" on public.match_posts;
drop policy if exists "team members can delete team posts" on public.match_posts;

create policy "guests or team members can insert posts"
  on public.match_posts for insert
  with check (
    (team_id is null or public.is_team_member(team_id))
    and (created_by is null or created_by = (select auth.uid()))
  );

create policy "guest posts or team members can update posts"
  on public.match_posts for update
  using (team_id is null or public.is_team_member(team_id))
  with check (team_id is null or public.is_team_member(team_id));

create policy "team members can delete team posts"
  on public.match_posts for delete to authenticated
  using (team_id is not null and public.is_team_member(team_id));

-- chats の RLS
drop policy if exists "anyone can insert chats" on public.chats;
drop policy if exists "guests or team members can insert chats" on public.chats;

create policy "guests or team members can insert chats"
  on public.chats for insert
  with check (team_id is null or public.is_team_member(team_id));
