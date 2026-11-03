import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireMyTeams } from '@/lib/myTeam'
import TeamForm from '@/components/TeamForm'
import TeamDeleteSection from '@/components/TeamDeleteSection'

export const metadata: Metadata = {
  title: 'チーム情報の編集',
  robots: { index: false },
}

export default async function MyTeamEditPage() {
  const { selectedTeam } = await requireMyTeams()
  if (!selectedTeam) redirect('/mypage/team/new')

  return (
    <TeamForm key={selectedTeam.id} initialTeam={selectedTeam} cancelHref="/mypage">
      <TeamDeleteSection teamId={selectedTeam.id} teamName={selectedTeam.name} />
    </TeamForm>
  )
}
