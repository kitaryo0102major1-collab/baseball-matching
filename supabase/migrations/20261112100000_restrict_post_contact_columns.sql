-- match_posts の連絡先3列を API から読めなくする。読むときは get_post_contacts を使う。
-- insert / update の権限は変えない。
-- 列単位の権限なので、match_posts に列を追加したら公開する列をここと同じように grant する。

revoke select on public.match_posts from anon, authenticated;

grant select (
  id,
  title,
  post_type,
  field_status,
  venue_name,
  area_detail,
  prefecture,
  level,
  status,
  game_date,
  start_time,
  end_time,
  positions,
  headcount,
  experience,
  fee,
  opponent_name,
  age_condition,
  activity_note,
  trial_ok,
  renewed_at,
  source_post_id,
  description,
  sns_x,
  sns_instagram,
  team_id,
  created_by,
  created_at
) on public.match_posts to anon, authenticated;
