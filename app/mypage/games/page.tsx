import { pageMetadata } from '@/lib/seo'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireMyTeams } from '@/lib/myTeam'
import { todayJST } from '@/lib/dates'
import { gameDateLabel, gameResult, gameScore, seasonLabel, seasonRange, seasonYear } from '@/lib/games'
import type { Game } from '@/lib/types'
import TeamSwitcher from '@/components/TeamSwitcher'
import { GameStatusBadge } from '@/components/GameInfoSummary'

export const metadata = pageMetadata({ title: '試合一覧', path: '/mypage/games', noindex: true })

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

type GameRow = Pick<
  Game,
  | 'id'
  | 'game_date'
  | 'opponent_name'
  | 'status'
  | 'end_reason'
  | 'forfeit_result'
  | 'defense_mode'
  | 'opponent_innings'
  | 'game_type'
  | 'tournament_name'
> & { runner_events: { is_offense: boolean }[] }

const RESULT_STYLES = {
  勝: 'text-white bg-[var(--green)] border-[var(--green)]',
  敗: 'text-white bg-[#A32D2D] border-[#A32D2D]',
  分: 'text-[var(--ink-sub)] bg-[var(--bg)] border-[var(--line)]',
} as const

const RESULT_LABELS = { 勝: '勝ち', 敗: '負け', 分: '引き分け' } as const

export default async function TeamGamesPage({ searchParams }: Props) {
  const { supabase, teams, selectedTeam: team } = await requireMyTeams()
  if (!team) redirect('/mypage/team/new')

  const startMonth = team.season_start_month ?? 1
  const currentSeason = seasonYear(todayJST(), startMonth)
  const { year: yearParam } = await searchParams
  const requested = Number(typeof yearParam === 'string' ? yearParam : NaN)
  const season = Number.isInteger(requested) && requested >= 1900 && requested <= 2100 ? requested : currentSeason
  const range = seasonRange(season, startMonth)

  const [{ data: dates }, { data: rows }] = await Promise.all([
    // 年度の切り替え用に、試合のある年度を集める
    supabase.from('games').select('game_date').eq('team_id', team.id),
    // 得点は to_base = 'H' の走者の行だけを取り、攻守で数える
    supabase
      .from('games')
      .select(
        'id, game_date, opponent_name, status, end_reason, forfeit_result, defense_mode, opponent_innings, game_type, tournament_name, runner_events(is_offense)'
      )
      .eq('team_id', team.id)
      .eq('runner_events.to_base', 'H')
      .gte('game_date', range.from)
      .lt('game_date', range.to)
      .order('game_date', { ascending: false })
      .order('created_at', { ascending: false }),
  ])

  const seasons = [
    ...new Set([currentSeason, season, ...((dates ?? []) as { game_date: string }[]).map((d) => seasonYear(d.game_date, startMonth))]),
  ].sort((a, b) => b - a)
  const games = ((rows ?? []) as GameRow[]).map((g) => {
    const score = gameScore(g, g.runner_events)
    // 勝敗は確定した試合だけ
    return { ...g, score, result: g.status === '確定' ? gameResult(g, score) : null }
  })
  const record = { 勝: 0, 敗: 0, 分: 0 }
  for (const g of games) if (g.result) record[g.result]++

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-5">
      <div>
        <Link href="/mypage" className="text-sm text-[var(--ink-mute)] hover:text-[var(--green)] transition-colors">
          ← マイページに戻る
        </Link>
        <h1 className="text-xl font-black text-[var(--ink)] mt-3">試合</h1>
        <p className="text-sm text-[var(--ink-sub)] mt-1 break-words">{team.name}</p>
      </div>

      <TeamSwitcher teams={teams} selectedId={team.id} />

      <Link
        href="/mypage/games/new"
        className="block text-center bg-[var(--green)] text-white font-bold py-3.5 rounded-xl text-base hover:opacity-90 transition-opacity"
      >
        ＋ 試合を記録する
      </Link>

      <section className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-4 space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="年度">
          {seasons.map((y) => {
            const active = y === season
            return (
              <Link
                key={y}
                href={y === currentSeason ? '/mypage/games' : `/mypage/games?year=${y}`}
                aria-current={active ? 'page' : undefined}
                className={`shrink-0 text-[13px] px-3 py-1.5 rounded-full border transition-colors ${
                  active
                    ? 'bg-[var(--green)] text-[var(--bg)] font-bold border-[var(--green)]'
                    : 'bg-[var(--surface)] text-[var(--ink-sub)] border-[var(--line)]'
                }`}
              >
                {seasonLabel(y, startMonth)}
              </Link>
            )
          })}
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-base font-bold text-[var(--ink)]">
              {seasonLabel(season, startMonth)}の試合（{games.length}）
            </h2>
            {games.some((g) => g.result) && (
              <p className="text-xs text-[var(--ink-sub)] shrink-0">
                {record.勝}勝 {record.敗}敗 {record.分}分
              </p>
            )}
          </div>
          {startMonth !== 1 && <p className="text-xs text-[var(--ink-mute)] mt-1">年度は{startMonth}月始まりです（チーム設定）。</p>}
        </div>

        {games.length === 0 ? (
          <p className="text-sm text-[var(--ink-mute)] text-center py-6">この年度の試合はまだありません。</p>
        ) : (
          <ul className="divide-y divide-[var(--line)] -mx-1">
            {games.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/mypage/games/${g.id}`}
                  className="flex items-center gap-3 px-1 py-3 hover:bg-[var(--bg)] rounded-lg transition-colors"
                >
                  <span
                    className={`w-9 h-9 shrink-0 rounded-full border flex items-center justify-center text-sm font-black ${
                      g.result ? RESULT_STYLES[g.result] : 'text-[var(--ink-mute)] border-dashed border-[var(--line)]'
                    }`}
                    aria-label={g.result ? RESULT_LABELS[g.result] : '未確定'}
                  >
                    {g.result ?? '–'}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-1.5 text-xs text-[var(--ink-mute)]">
                      <span className="shrink-0">{gameDateLabel(g.game_date)}</span>
                      {g.game_type === '公式戦' && <span className="truncate">{g.tournament_name || '公式戦'}</span>}
                    </span>
                    <span className="block text-sm font-bold text-[var(--ink)] truncate mt-0.5">vs {g.opponent_name}</span>
                  </span>
                  <span className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-base font-black text-[var(--ink)] tabular-nums">
                      {g.score.our} - {g.score.opponent}
                    </span>
                    <GameStatusBadge status={g.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
