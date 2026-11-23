import { pageMetadata } from '@/lib/seo'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireMyTeams } from '@/lib/myTeam'
import { DEFAULT_INNINGS } from '@/lib/games'
import TeamGameCreate from '@/components/TeamGameCreate'

export const metadata = pageMetadata({ title: '試合を記録する', path: '/mypage/games/new', noindex: true })

export default async function NewTeamGamePage() {
  const { teams, selectedTeam: team } = await requireMyTeams()
  if (!team) redirect('/mypage/team/new')

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-5">
      <div>
        <Link href="/mypage/games" className="text-sm text-[var(--ink-mute)] hover:text-[var(--green)] transition-colors">
          ← 試合一覧に戻る
        </Link>
        <h1 className="text-xl font-black text-[var(--ink)] mt-3">試合を記録する</h1>
        <p className="text-sm text-[var(--ink-sub)] mt-1 break-words">{team.name}</p>
      </div>
      {teams.length > 1 && (
        <p className="text-xs text-[var(--ink-mute)]">別のチームの試合を記録するときは、試合一覧でチームを切り替えてください。</p>
      )}
      <section className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5">
        <TeamGameCreate key={team.id} teamId={team.id} defaultInnings={team.innings_per_game ?? DEFAULT_INNINGS} />
      </section>
    </div>
  )
}
