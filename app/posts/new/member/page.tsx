import { getMyTeams } from '@/lib/myTeam'
import { pageMetadata } from '@/lib/seo'
import TeamPostForm from '@/components/TeamPostForm'
import TeamPostGate from '@/components/TeamPostGate'

export const metadata = pageMetadata({
  title: 'メンバーを募集する',
  description: '登録チームの管理者は、一緒に活動するメンバーを募集できます。',
  path: '/posts/new/member',
  noindex: true,
})

export default async function NewMemberPostPage() {
  const { user, teams, selectedTeam } = await getMyTeams()

  if (!user || !selectedTeam) return <TeamPostGate nextPath="/posts/new/member" loggedIn={!!user} />

  return <TeamPostForm postType="member" teams={teams} defaultTeamId={selectedTeam.id} userId={user.id} />
}
