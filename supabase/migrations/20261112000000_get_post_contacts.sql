-- 募集の連絡先は、掲載中の募集か、そのチームの管理者にだけ返す。それ以外は null。

create or replace function public.get_post_contacts(post_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'contact_email', p.contact_email,
    'contact_phone', p.contact_phone,
    'contact_other', p.contact_other
  )
  from public.match_posts p
  where p.id = get_post_contacts.post_id
    and (
      (
        p.status = '募集中'
        and (
          (p.post_type in ('match', 'helper') and p.game_date >= (now() at time zone 'Asia/Tokyo')::date)
          or (p.post_type = 'member' and p.renewed_at >= now() - interval '60 days')
        )
      )
      or (p.team_id is not null and public.is_team_member(p.team_id))
    );
$$;

revoke all on function public.get_post_contacts(uuid) from public, anon, authenticated;
grant execute on function public.get_post_contacts(uuid) to anon, authenticated;
