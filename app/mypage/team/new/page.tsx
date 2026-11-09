import { pageMetadata } from '@/lib/seo'
import { requireMyTeams } from '@/lib/myTeam'
import TeamForm from '@/components/TeamForm'

export const metadata = pageMetadata({ title: 'チームを登録する', path: '/mypage/team/new', noindex: true })

export default async function NewTeamPage() {
  const { teams } = await requireMyTeams()

  return <TeamForm initialTeam={null} cancelHref={teams.length ? '/mypage' : '/'} />
}
