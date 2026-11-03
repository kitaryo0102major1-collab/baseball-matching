import type { Metadata } from 'next'
import { requireUserWithTeam } from '@/lib/myTeam'
import TeamForm from '@/components/TeamForm'

export const metadata: Metadata = {
  title: 'チーム情報の登録・編集',
  robots: { index: false },
}

export default async function MyTeamPage() {
  const { user, team } = await requireUserWithTeam()

  return <TeamForm userId={user.id} initialTeam={team} />
}
