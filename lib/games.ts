import type { DefenseMode, Game, GameType } from './types'

export const GAME_TYPES: GameType[] = ['練習試合', '公式戦']

export const DEFENSE_MODES: { value: DefenseMode; label: string; description: string }[] = [
  {
    value: 'summary',
    label: '投手ごとの合計',
    description: '相手の攻撃は、投手ごとの成績と回ごとの得点だけを入れます（手早く記録したいとき）',
  },
  {
    value: 'detailed',
    label: '相手も1打席ずつ',
    description: '相手の打者も1打席ずつ入れます（被打率や自責点まで正確に出せます）',
  },
]

export const DEFAULT_INNINGS = 7
export const MIN_INNINGS = 1
export const MAX_INNINGS = 15
// 打順の人数。9人を超えるのは全員打ち
export const STANDARD_LINEUP_SIZE = 9
export const MAX_LINEUP_SIZE = 30

export const GAME_TEXT_LIMITS = {
  guest_team_name: 50,
  opponent_name: 50,
  venue: 100,
  tournament_name: 100,
} as const

// 得点は runner_events の to_base = 'H' の行。相手の得点は、合計モードなら回ごとの得点の和
export function gameScore(
  game: Pick<Game, 'defense_mode' | 'opponent_innings'>,
  runs: { is_offense: boolean }[]
): { our: number; opponent: number } {
  const our = runs.filter((r) => r.is_offense).length
  const opponent =
    game.defense_mode === 'summary'
      ? game.opponent_innings.reduce((sum, v) => sum + (v ?? 0), 0)
      : runs.filter((r) => !r.is_offense).length
  return { our, opponent }
}

// 勝敗。没収試合は手で指定した結果、それ以外は得点で決める（同点は引き分け）
export function gameResult(
  game: Pick<Game, 'end_reason' | 'forfeit_result'>,
  score: { our: number; opponent: number }
): '勝' | '敗' | '分' {
  if (game.end_reason === '没収') return game.forfeit_result === '勝ち' ? '勝' : '敗'
  if (score.our > score.opponent) return '勝'
  if (score.our < score.opponent) return '敗'
  return '分'
}

// 年度。開始月より前の試合は前の年度に入る（例: 開始月4月なら 2027-03-10 は 2026年度）
export function seasonYear(date: string, startMonth = 1) {
  const year = Number(date.slice(0, 4))
  const month = Number(date.slice(5, 7))
  return month >= startMonth ? year : year - 1
}

// 年度の表示。1月始まりなら「2026年」、それ以外は「2026年度」
export function seasonLabel(year: number, startMonth = 1) {
  return startMonth === 1 ? `${year}年` : `${year}年度`
}

// 年度の期間（game_date の範囲。to は含まない）
export function seasonRange(year: number, startMonth = 1) {
  const pad = (m: number) => String(m).padStart(2, '0')
  return {
    from: `${year}-${pad(startMonth)}-01`,
    to: startMonth === 1 ? `${year + 1}-01-01` : `${year + 1}-${pad(startMonth)}-01`,
  }
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

// 「11/23(月)」
export function gameDateLabel(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return `${m}/${d}(${weekday})`
}
