import { pageMetadata } from '@/lib/seo'
import { redirect } from 'next/navigation'
import { requireMyTeams } from '@/lib/myTeam'
import TeamForm from '@/components/TeamForm'
import TeamDeleteSection from '@/components/TeamDeleteSection'

export const metadata = pageMetadata({ title: 'チーム情報の編集', path: '/mypage/team', noindex: true })

export default async function MyTeamEditPage() {
  const { selectedTeam } = await requireMyTeams()
  if (!selectedTeam) redirect('/mypage/team/new')

  return (
    <TeamForm key={selectedTeam.id} initialTeam={selectedTeam} cancelHref="/mypage">
      <TeamDeleteSection teamId={selectedTeam.id} teamName={selectedTeam.name} />
    </TeamForm>
  )
}
