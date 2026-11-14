import { getMyTeams } from '@/lib/myTeam'
import { pageMetadata } from '@/lib/seo'
import TeamPostForm, { type SourcePost } from '@/components/TeamPostForm'
import TeamPostGate from '@/components/TeamPostGate'

export const metadata = pageMetadata({
  title: '助っ人を募集する',
  description: '登録チームの管理者は、試合に来てくれる助っ人を募集できます。',
  path: '/posts/new/helper',
  noindex: true,
})

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function NewHelperPostPage({ searchParams }: Props) {
  const { from } = await searchParams
  const { supabase, user, teams, selectedTeam } = await getMyTeams()

  if (!user || !selectedTeam) return <TeamPostGate nextPath="/posts/new/helper" loggedIn={!!user} />

  // 引き継ぎ元は、自分が管理するチームの対戦相手募集だけ受け付ける
  let source: SourcePost | null = null
  if (typeof from === 'string') {
    const { data } = await supabase
      .from('match_posts')
      .select('id, title, team_id, game_date, start_time, end_time, prefecture, city, area_detail, venue_name')
      .eq('id', from)
      .eq('post_type', 'match')
      .in(
        'team_id',
        teams.map((t) => t.id)
      )
      .maybeSingle()
    source = data as SourcePost | null
  }

  return <TeamPostForm postType="helper" teams={teams} defaultTeamId={selectedTeam.id} userId={user.id} source={source} />
}
