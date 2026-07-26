-- 試合ステータス（募集中 / 決定済み）カラムを追加
alter table match_posts
  add column if not exists status text not null default '募集中'
    check (status in ('募集中', '決定済み'));

-- このマイグレーション実行時点で既に存在する投稿は「決定済み」に更新する
-- （今後新規に作成される投稿は、上記のデフォルト値 '募集中' が設定される）
update match_posts set status = '決定済み';

-- 絞り込み・並び替え用インデックス
create index if not exists match_posts_status_idx on match_posts (status);

-- ステータス変更（「試合が決まりました」ボタン）はログイン不要のため、誰でも更新可能にする
drop policy if exists "anyone can update posts" on match_posts;
create policy "anyone can update posts"
  on match_posts for update
  using (true)
  with check (true);
