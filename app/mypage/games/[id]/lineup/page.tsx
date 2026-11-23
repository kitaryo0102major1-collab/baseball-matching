import { pageMetadata } from '@/lib/seo'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireMyTeams } from '@/lib/myTeam'
import { toLineupRow } from '@/lib/lineup'
import type { Game, Player } from '@/lib/types'
import TeamLineup from '@/components/TeamLineup'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  return pageMetadata({ title: '打順と交代', path: `/mypage/games/${id}/lineup`, noindex: true })
}

export default async function TeamLineupPage({ params }: Props) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()

  const { supabase, teams, selectedTeam: team } = await requireMyTeams()
  if (!team) redirect('/mypage/team/new')

  const { data } = await supabase.from('games').select('*').eq('id', id).maybeSingle()
  const game = data as Game | null
  if (!game || !teams.some((t) => t.id === game.team_id)) notFound()
  // 選択中のチームを切り替えたら、そのチームの試合一覧へ
  if (game.team_id !== team.id) redirect('/mypage/games')

  const [{ data: lineups }, { data: players }, { data: lastPa }] = await Promise.all([
    supabase.from('game_lineups').select('*').eq('game_id', game.id).order('created_at', { ascending: true }),
    // 退団した選手も、過去に出場していれば名前を出すので全員取る
    supabase.from('players').select('*').eq('team_id', team.id),
    supabase.from('plate_appearances').select('seq').eq('game_id', game.id).order('seq', { ascending: false }).limit(1),
  ])
  const nextSeq = ((lastPa?.[0]?.seq as number | undefined) ?? 0) + 1

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-5">
      <div>
        <Link href={`/mypage/games/${game.id}`} className="text-sm text-[var(--ink-mute)] hover:text-[var(--green)] transition-colors">
          ← 試合情報に戻る
        </Link>
        <h1 className="text-xl font-black text-[var(--ink)] mt-3 break-words">打順と交代</h1>
        <p className="text-sm text-[var(--ink-sub)] mt-1 break-words">
          {team.name} vs {game.opponent_name}
        </p>
      </div>
      <TeamLineup
        key={game.id}
        game={game}
        teamId={team.id}
        initialRows={(lineups ?? []).map(toLineupRow)}
        players={(players ?? []) as Player[]}
        nextSeq={nextSeq}
      />
    </div>
  )
}
