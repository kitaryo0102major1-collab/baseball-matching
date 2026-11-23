// 打席入力で使う記録の形（plate_appearances・runner_events の行）。DB と同じ列名
import type { Throws } from '../types'

export type PaResult =
  | '単打'
  | '二塁打'
  | '三塁打'
  | '本塁打'
  | 'ゴロ'
  | 'フライ'
  | 'ライナー'
  | 'ファウルフライ'
  | '空振り三振'
  | '見逃し三振'
  | '振り逃げ'
  | '四球'
  | '敬遠'
  | '死球'
  | '犠打'
  | '犠飛'
  | '野選'
  | '失策出塁'
  | '打撃妨害'
  | '走塁妨害'
  | '併殺'
  | '三重殺'

export type Base = '1' | '2' | '3'
export type FromBase = 'B' | Base
export type ToBase = Base | 'H' | 'OUT'
export type RunnerReason =
  | '打球'
  | '四死球'
  | '盗塁'
  | '盗塁死'
  | '暴投'
  | '捕逸'
  | 'ボーク'
  | '失策'
  | '野選'
  | '牽制死'
  | '走塁死'
  | '妨害'
  | 'その他'

export interface PlateAppearance {
  id: string
  seq: number
  inning: number
  is_offense: boolean
  batter_lineup_id: string | null
  opponent_batting_slot: number | null
  pitcher_lineup_id: string | null
  opp_pitcher_throws: Throws | null
  result: PaResult
  fielders: string | null
  direction_pos: number | null
  direction_x: number | null
  direction_y: number | null
  rbi: number
  outs_on_play: number
  runners_before: number
}

export interface RunnerEvent {
  id: string
  plate_appearance_id: string | null
  seq: number
  inning: number
  is_offense: boolean
  runner_lineup_id: string | null
  opponent_slot: number | null
  from_base: FromBase
  to_base: ToBase
  reason: RunnerReason
  earned: boolean | null
}

// 塁上の走者（自チームは出場の行の id、相手は打順番号）
export interface Runner {
  lineupId: string | null
  opponentSlot: number | null
}

export type Bases = Record<Base, Runner | null>

export const EMPTY_BASES: Bases = { '1': null, '2': null, '3': null }

// 走者（または打者）1人の動き
export interface Move {
  from: FromBase
  to: ToBase
  reason: RunnerReason
}
