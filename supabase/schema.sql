-- MatchPost テーブル
create table if not exists match_posts (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  field_status  text not null check (field_status in ('ok', 'ng')),
  venue_name    text,
  area          text,
  level         text not null check (level in ('A+', 'A', 'B', 'C')),
  game_date     date not null,
  start_time    time,
  end_time      time,
  description   text,
  contact_email text,
  contact_phone text,
  contact_other text,
  sns_x         text,
  sns_instagram text,
  created_at    timestamptz not null default now()
);

-- 新着順インデックス
create index if not exists match_posts_created_at_idx on match_posts (created_at desc);

-- 絞り込みインデックス
create index if not exists match_posts_field_status_idx on match_posts (field_status);
create index if not exists match_posts_area_idx on match_posts (area);
create index if not exists match_posts_level_idx on match_posts (level);
create index if not exists match_posts_game_date_idx on match_posts (game_date);

-- RLS（Row Level Security）: 誰でも読み書き可（登録不要のため）
alter table match_posts enable row level security;

create policy "anyone can read posts"
  on match_posts for select
  using (true);

create policy "anyone can insert posts"
  on match_posts for insert
  with check (true);

-- chats テーブル
create table if not exists chats (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references match_posts(id) on delete cascade,
  team_name  text not null,
  message    text not null,
  created_at timestamptz not null default now()
);

-- インデックス
create index if not exists chats_post_id_idx on chats (post_id, created_at asc);

-- RLS: 誰でも読み書き可
alter table chats enable row level security;

create policy "anyone can read chats"
  on chats for select
  using (true);

create policy "anyone can insert chats"
  on chats for insert
  with check (true);

-- リアルタイム配信を有効化
alter publication supabase_realtime add table chats;
