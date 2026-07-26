-- 既存テーブルへのマイグレーション（prefecture カラム追加。既存投稿は NULL 許容）
alter table match_posts add column if not exists prefecture text;

create index if not exists match_posts_prefecture_idx on match_posts (prefecture);
