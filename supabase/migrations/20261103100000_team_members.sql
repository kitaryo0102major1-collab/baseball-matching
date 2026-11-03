-- 複数管理者（フェーズ1.5）
-- 1チームを複数アカウントで管理し、1人が複数チームを管理できるようにする。

-- ============================================================
-- teams: owner_id → created_by（unique を外す）
-- ============================================================
alter table public.teams rename column owner_id to created_by;
alter table public.teams drop constraint if exists teams_owner_id_key;
alter table public.teams alter column created_by drop not null;
alter table public.teams alter column created_by set default auth.uid();
alter table public.teams drop constraint if exists teams_owner_id_fkey;
alter table public.teams
  add constraint teams_created_by_fkey foreign key (created_by) references auth.users(id) on delete set null;

-- ============================================================
-- team_members: 管理者
-- ============================================================
create table if not exists public.team_members (
  team_id      uuid not null references public.teams(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  primary key (team_id, user_id)
);

create index if not exists team_members_user_id_idx on public.team_members (user_id);

-- 既存データ: チームの登録者を管理者に移す
insert into public.team_members (team_id, user_id, display_name, avatar_url, created_at)
select t.id, t.created_by,
       coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', u.email),
       coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture'),
       t.created_at
from public.teams t
join auth.users u on u.id = t.created_by
on conflict do nothing;

-- ============================================================
-- team_invites: 招待リンク
-- ============================================================
create table if not exists public.team_invites (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams(id) on delete cascade,
  token      text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  expires_at timestamptz not null default now() + interval '7 days',
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists team_invites_team_id_idx on public.team_invites (team_id);

-- ============================================================
-- 関数
-- ============================================================

-- RLS 内で team_members を読むため security definer（RLS の再帰を避ける）
create or replace function public.is_team_member(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = (select auth.uid())
  );
$$;

-- Storage のフォルダ名（文字列）で判定する版。uuid でない名前でもエラーにしない
create or replace function public.is_team_member_folder(p_folder text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members
    where team_id::text = p_folder and user_id = (select auth.uid())
  );
$$;

create or replace function public.member_profile(p_user_id uuid, out display_name text, out avatar_url text)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', u.email),
         coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')
  from auth.users u
  where u.id = p_user_id;
$$;
revoke execute on function public.member_profile(uuid) from public, anon, authenticated;

-- チーム作成時、作成者を管理者に追加
create or replace function public.add_team_creator_as_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is not null then
    insert into public.team_members (team_id, user_id, display_name, avatar_url)
    select new.id, new.created_by, p.display_name, p.avatar_url
    from public.member_profile(new.created_by) p
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists teams_add_creator_as_member on public.teams;
create trigger teams_add_creator_as_member
  after insert on public.teams
  for each row execute function public.add_team_creator_as_member();

-- 最後の1人は外せない（チーム削除・アカウント削除による連鎖削除は通す）
create or replace function public.prevent_removing_last_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  remaining int;
begin
  if not exists (select 1 from public.teams where id = old.team_id) then
    return old;
  end if;
  if not exists (select 1 from auth.users where id = old.user_id) then
    return old;
  end if;

  -- 2人が同時にお互いを外して管理者ゼロになるのを防ぐ
  perform 1 from public.teams where id = old.team_id for update;

  select count(*) into remaining
  from public.team_members
  where team_id = old.team_id and user_id <> old.user_id;

  if remaining = 0 then
    raise exception 'last_member' using
      errcode = 'P0001',
      hint = 'チームには少なくとも1人の管理者が必要です';
  end if;
  return old;
end;
$$;

drop trigger if exists team_members_prevent_last on public.team_members;
create trigger team_members_prevent_last
  before delete on public.team_members
  for each row execute function public.prevent_removing_last_member();

-- 招待リンクの発行（前の有効なリンクは無効にする）
create or replace function public.create_team_invite(p_team_id uuid)
returns public.team_invites
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.team_invites;
begin
  if not public.is_team_member(p_team_id) then
    raise exception 'not_team_member' using errcode = '42501';
  end if;

  update public.team_invites
  set revoked_at = now()
  where team_id = p_team_id and revoked_at is null;

  insert into public.team_invites (team_id, created_by)
  values (p_team_id, auth.uid())
  returning * into result;

  return result;
end;
$$;

-- 招待ページ用のプレビュー（チーム名・ロゴ・招待者名だけを返す）
create or replace function public.get_invite_preview(p_token text)
returns table (
  team_id uuid,
  team_name text,
  logo_url text,
  inviter_name text,
  is_valid boolean,
  already_member boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    t.id,
    t.name,
    t.logo_url,
    coalesce(m.display_name, (select p.display_name from public.member_profile(i.created_by) p)),
    (i.revoked_at is null and i.expires_at > now()),
    public.is_team_member(t.id)
  from public.team_invites i
  join public.teams t on t.id = i.team_id
  left join public.team_members m on m.team_id = i.team_id and m.user_id = i.created_by
  where i.token = p_token;
$$;

-- 招待の受け入れ
create or replace function public.accept_team_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select team_id into v_team_id
  from public.team_invites
  where token = p_token and revoked_at is null and expires_at > now();

  if v_team_id is null then
    raise exception 'invalid_invite' using errcode = 'P0001';
  end if;

  insert into public.team_members (team_id, user_id, display_name, avatar_url)
  select v_team_id, v_user_id, p.display_name, p.avatar_url
  from public.member_profile(v_user_id) p
  on conflict do nothing;

  return v_team_id;
end;
$$;

revoke execute on function public.create_team_invite(uuid) from public, anon;
revoke execute on function public.accept_team_invite(text) from public, anon;
grant execute on function public.create_team_invite(uuid) to authenticated;
grant execute on function public.accept_team_invite(text) to authenticated;
grant execute on function public.get_invite_preview(text) to anon, authenticated;

-- ============================================================
-- RLS
-- ============================================================

-- teams
drop policy if exists "owner can select own team" on public.teams;
drop policy if exists "owner can insert own team" on public.teams;
drop policy if exists "owner can update own team" on public.teams;
drop policy if exists "owner can delete own team" on public.teams;

create policy "members can select team"
  on public.teams for select to authenticated
  using (public.is_team_member(id));

create policy "users can create team"
  on public.teams for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy "members can update team"
  on public.teams for update to authenticated
  using (public.is_team_member(id))
  with check (public.is_team_member(id));

create policy "members can delete team"
  on public.teams for delete to authenticated
  using (public.is_team_member(id));

-- team_members（追加は関数・トリガー経由のみ）
alter table public.team_members enable row level security;

create policy "members can see co-members"
  on public.team_members for select to authenticated
  using (public.is_team_member(team_id));

create policy "members can remove members"
  on public.team_members for delete to authenticated
  using (public.is_team_member(team_id));

-- team_invites
alter table public.team_invites enable row level security;

create policy "members can see invites"
  on public.team_invites for select to authenticated
  using (public.is_team_member(team_id));

create policy "members can create invites"
  on public.team_invites for insert to authenticated
  with check (public.is_team_member(team_id) and created_by = (select auth.uid()));

create policy "members can revoke invites"
  on public.team_invites for update to authenticated
  using (public.is_team_member(team_id))
  with check (public.is_team_member(team_id));

-- ============================================================
-- Storage: 保存先を {team_id}/logo に変更
-- （適用時点で既存チーム・ロゴは0件のため、ファイルの移動は不要）
-- ============================================================
drop policy if exists "users can upload own team logo" on storage.objects;
drop policy if exists "users can update own team logo" on storage.objects;
drop policy if exists "users can delete own team logo" on storage.objects;

create policy "members can upload team logo"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'team-logos' and public.is_team_member_folder((storage.foldername(name))[1]));

create policy "members can update team logo"
  on storage.objects for update to authenticated
  using (bucket_id = 'team-logos' and public.is_team_member_folder((storage.foldername(name))[1]))
  with check (bucket_id = 'team-logos' and public.is_team_member_folder((storage.foldername(name))[1]));

create policy "members can delete team logo"
  on storage.objects for delete to authenticated
  using (bucket_id = 'team-logos' and public.is_team_member_folder((storage.foldername(name))[1]));
