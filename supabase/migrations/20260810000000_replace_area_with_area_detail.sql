-- 広域選択の「エリア」を廃止し、自由入力の「エリア詳細」に置き換える
-- （都道府県フィルターで絞り込めるため、広域選択は不要と判断）
alter table match_posts add column if not exists area_detail text;

drop index if exists match_posts_area_idx;
alter table match_posts drop column if exists area;
