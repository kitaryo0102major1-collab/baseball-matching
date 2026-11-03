import type { Metadata } from 'next'
import { requireMyTeams } from '@/lib/myTeam'
import TeamForm from '@/components/TeamForm'

export const metadata: Metadata = {
  title: 'チームを登録する',
  robots: { index: false },
}

export default async function NewTeamPage() {
  const { teams } = await requireMyTeams()

  return <TeamForm initialTeam={null} cancelHref={teams.length ? '/mypage' : '/'} />
}
