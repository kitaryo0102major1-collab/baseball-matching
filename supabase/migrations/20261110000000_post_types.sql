-- フェーズ4: 助っ人募集・メンバー募集

alter table public.match_posts
  add column if not exists post_type text not null default 'match',
  add column if not exists positions text[],
  add column if not exists headcount text,
  add column if not exists experience text,
  add column if not exists fee text,
  add column if not exists opponent_name text,
  add column if not exists age_condition text,
  add column if not exists activity_note text,
  add column if not exists trial_ok boolean,
  add column if not exists renewed_at timestamptz not null default now(),
  add column if not exists source_post_id uuid references public.match_posts(id) on delete set null;

alter table public.match_posts alter column field_status drop not null;
alter table public.match_posts alter column game_date drop not null;

alter table public.match_posts drop constraint if exists match_posts_status_check;
alter table public.match_posts drop constraint if exists match_posts_post_type_check;
alter table public.match_posts drop constraint if exists match_posts_field_status_required;
alter table public.match_posts drop constraint if exists match_posts_game_date_required;
alter table public.match_posts drop constraint if exists match_posts_experience_check;
alter table public.match_posts drop constraint if exists match_posts_team_post_fields_check;

alter table public.match_posts
  add constraint match_posts_post_type_check check (post_type in ('match', 'helper', 'member')),
  add constraint match_posts_field_status_required check (post_type <> 'match' or field_status is not null),
  add constraint match_posts_game_date_required check (post_type = 'member' or game_date is not null),
  add constraint match_posts_status_check check (
    (post_type = 'member' and status in ('募集中', '募集終了'))
    or (post_type <> 'member' and status in ('募集中', '決定済み'))
  ),
  add constraint match_posts_experience_check check (experience is null or experience in ('経験者のみ', '未経験OK', '問わない')),
  add constraint match_posts_team_post_fields_check check (
    post_type = 'match'
    or (
      cardinality(positions) > 0
      and experience is not null
      and (post_type <> 'helper' or headcount ~ '^[1-9]$')
    )
  );

create index if not exists match_posts_type_date_idx on public.match_posts (post_type, status, game_date);
create index if not exists match_posts_type_renewed_idx on public.match_posts (post_type, status, renewed_at desc);

-- 種類と元の募集も投稿後は付け替えられない（元の募集の削除による null 化だけ許可）
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
  return new;
end;
$$;

-- 引き継ぎ元は、同じチームの対戦相手募集だけ
create or replace function public.check_post_source()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.source_post_id is not null and not (
    new.post_type = 'helper'
    and exists (
      select 1 from public.match_posts s
      where s.id = new.source_post_id and s.post_type = 'match' and s.team_id = new.team_id
    )
  ) then
    raise exception 'invalid_source_post' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists match_posts_check_source on public.match_posts;
create trigger match_posts_check_source
  before insert on public.match_posts
  for each row execute function public.check_post_source();

-- チームを消すと助っ人・メンバー募集は誰も管理できなくなり、連絡先だけが公開され続けるので一緒に消す。
-- 対戦相手募集は従来どおり team_id が null になってゲスト募集として残る。
create or replace function public.delete_team_only_posts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.match_posts where team_id = old.id and post_type <> 'match';
  return old;
end;
$$;

drop trigger if exists teams_delete_team_only_posts on public.teams;
create trigger teams_delete_team_only_posts
  before delete on public.teams
  for each row execute function public.delete_team_only_posts();

-- RLS: 助っ人・メンバー募集は登録チームの管理者だけ
drop policy if exists "guests or team members can insert posts" on public.match_posts;
drop policy if exists "guest posts or team members can update posts" on public.match_posts;

create policy "guests or team members can insert posts"
  on public.match_posts for insert
  with check (
    (created_by is null or created_by = (select auth.uid()))
    and (
      (post_type = 'match' and (team_id is null or public.is_team_member(team_id)))
      or (post_type <> 'match' and team_id is not null and public.is_team_member(team_id))
    )
  );

create policy "guest posts or team members can update posts"
  on public.match_posts for update
  using (
    (post_type = 'match' and (team_id is null or public.is_team_member(team_id)))
    or (post_type <> 'match' and team_id is not null and public.is_team_member(team_id))
  )
  with check (
    (post_type = 'match' and (team_id is null or public.is_team_member(team_id)))
    or (post_type <> 'match' and team_id is not null and public.is_team_member(team_id))
  );
