import { pageMetadata } from '@/lib/seo'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireMyTeams } from '@/lib/myTeam'
import type { Player } from '@/lib/types'
import PlayersManager from '@/components/PlayersManager'
import TeamSwitcher from '@/components/TeamSwitcher'

export const metadata = pageMetadata({ title: '選手名簿', path: '/mypage/players', noindex: true })

type PlayerRow = Player & {
  game_lineups: { count: number }[]
  player_season_imports: { count: number }[]
}

export default async function PlayersPage() {
  const { supabase, teams, selectedTeam: team } = await requireMyTeams()
  if (!team) redirect('/mypage/team/new')

  // 出場記録（打順・交代）と過去データの取り込みがある選手は削除できないので、件数も一緒に取る
  const { data } = await supabase
    .from('players')
    .select('*, game_lineups(count), player_season_imports(count)')
    .eq('team_id', team.id)

  const players = ((data ?? []) as PlayerRow[]).map(({ game_lineups, player_season_imports, ...player }) => ({
    ...player,
    hasRecords: (game_lineups[0]?.count ?? 0) > 0 || (player_season_imports[0]?.count ?? 0) > 0,
  }))

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-5">
      <div>
        <Link href="/mypage" className="text-sm text-[var(--ink-mute)] hover:text-[var(--green)] transition-colors">
          ← マイページに戻る
        </Link>
        <h1 className="text-xl font-black text-[var(--ink)] mt-3">選手名簿</h1>
        <p className="text-sm text-[var(--ink-sub)] mt-1 break-words">{team.name}</p>
      </div>

      <TeamSwitcher teams={teams} selectedId={team.id} />

      <PlayersManager key={team.id} teamId={team.id} initialPlayers={players} />
    </div>
  )
}
