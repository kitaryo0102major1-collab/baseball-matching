import { pageMetadata } from '@/lib/seo'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireMyTeams } from '@/lib/myTeam'
import { toLineupRow } from '@/lib/lineup'
import type { PlateAppearance, RunnerEvent } from '@/lib/scoring/types'
import type { Game, Player } from '@/lib/types'
import TeamScoreInput from '@/components/TeamScoreInput'
import OfflineSupport from '@/components/OfflineSupport'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  return pageMetadata({ title: '打席の入力', path: `/mypage/games/${id}/input`, noindex: true })
}

export default async function TeamInputPage({ params }: Props) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()

  const { supabase, teams, selectedTeam: team } = await requireMyTeams()
  if (!team) redirect('/mypage/team/new')

  const { data } = await supabase.from('games').select('*').eq('id', id).maybeSingle()
  const game = data as Game | null
  if (!game || !teams.some((t) => t.id === game.team_id)) notFound()
  // 選択中のチームを切り替えたら、そのチームの試合一覧へ
  if (game.team_id !== team.id) redirect('/mypage/games')

  const [{ data: lineups }, { data: players }, { data: pas }, { data: events }] = await Promise.all([
    supabase.from('game_lineups').select('*').eq('game_id', game.id).order('created_at', { ascending: true }),
    supabase.from('players').select('*').eq('team_id', team.id),
    supabase.from('plate_appearances').select('*').eq('game_id', game.id).order('seq', { ascending: true }),
    supabase.from('runner_events').select('*').eq('game_id', game.id).order('seq', { ascending: true }),
  ])

  return (
    <div className="max-w-md mx-auto px-4 pt-4 pb-8">
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <Link href={`/mypage/games/${game.id}`} className="text-[var(--ink-mute)] hover:text-[var(--green)] transition-colors">
          ← 試合情報
        </Link>
        <Link href={`/mypage/games/${game.id}/lineup`} className="text-[var(--green)] font-bold">
          打順と交代
        </Link>
      </div>
      <h1 className="sr-only">打席の入力</h1>
      <TeamScoreInput
        key={game.id}
        game={game}
        teamName={team.name}
        rows={(lineups ?? []).map(toLineupRow)}
        players={(players ?? []) as Player[]}
        pas={(pas ?? []) as PlateAppearance[]}
        events={(events ?? []) as RunnerEvent[]}
      />
      <OfflineSupport />
    </div>
  )
}
