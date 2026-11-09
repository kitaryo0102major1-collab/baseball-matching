-- 365日を超えて更新されていないメンバー募集の連絡先を、月1回 pg_cron で空にする。
-- 365日超の募集は画面上「終了扱い」で、どこにも表示されない（lib/postRules.ts の memberVisibility）。
-- 募集そのものは残す。対象はメンバー募集のみ。

create extension if not exists pg_cron;

create or replace function public.purge_expired_member_contacts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  purged integer;
begin
  update public.match_posts
  set contact_email = null,
      contact_phone = null,
      contact_other = null
  where post_type = 'member'
    and renewed_at < now() - interval '365 days'
    and (contact_email is not null or contact_phone is not null or contact_other is not null);

  get diagnostics purged = row_count;
  return purged;
end;
$$;

-- cron 専用。REST API（rpc）からは呼べないようにする
revoke all on function public.purge_expired_member_contacts() from public, anon, authenticated;

-- 毎月2日 03:00 JST（pg_cron は UTC なので 1日 18:00）
select cron.schedule(
  'purge-expired-member-contacts',
  '0 18 1 * *',
  $$select public.purge_expired_member_contacts()$$
);
