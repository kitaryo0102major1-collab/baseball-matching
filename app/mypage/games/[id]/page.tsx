import { pageMetadata } from '@/lib/seo'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireMyTeams } from '@/lib/myTeam'
import { DEFAULT_INNINGS } from '@/lib/games'
import type { Game } from '@/lib/types'
import TeamGameManager from '@/components/TeamGameManager'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  return pageMetadata({ title: '試合', path: `/mypage/games/${id}`, noindex: true })
}

export default async function TeamGamePage({ params }: Props) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()

  const { supabase, teams, selectedTeam: team } = await requireMyTeams()
  if (!team) redirect('/mypage/team/new')

  const { data } = await supabase.from('games').select('*').eq('id', id).maybeSingle()
  const game = data as Game | null
  if (!game || !teams.some((t) => t.id === game.team_id)) notFound()
  // 選択中のチームを切り替えたら、そのチームの試合一覧へ
  if (game.team_id !== team.id) redirect('/mypage/games')

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-5">
      <div>
        <Link href="/mypage/games" className="text-sm text-[var(--ink-mute)] hover:text-[var(--green)] transition-colors">
          ← 試合一覧に戻る
        </Link>
        <h1 className="text-xl font-black text-[var(--ink)] mt-3 break-words">vs {game.opponent_name}</h1>
        <p className="text-sm text-[var(--ink-sub)] mt-1 break-words">{team.name}</p>
      </div>
      <TeamGameManager
        key={game.id}
        game={game}
        teamName={team.name}
        defaultInnings={team.innings_per_game ?? DEFAULT_INNINGS}
      />
    </div>
  )
}
