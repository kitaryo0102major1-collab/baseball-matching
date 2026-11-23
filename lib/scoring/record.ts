// 入力した1打席を、保存する行（plate_appearances 1行と runner_events）にする
import type { Throws } from '../types'
import type { GameState } from './state'
import { basesMask } from './state'
import type { Move, PaResult, PlateAppearance, RunnerEvent } from './types'

export interface OffenseInput {
  result: PaResult
  moves: Move[]
  rbi: number
  fielders: string | null
  direction: { pos: number; x: number; y: number } | null
  oppPitcherThrows: Throws | null
}

const MOVE_ORDER: Record<string, number> = { '3': 0, '2': 1, '1': 2, B: 3 }

export function buildOffenseRecord(
  state: GameState,
  input: OffenseInput,
  newId: () => string
): { pa: PlateAppearance; events: RunnerEvent[] } {
  if (!state.isOffense || !state.batter) throw new Error('not_offense')
  const pa: PlateAppearance = {
    id: newId(),
    seq: state.nextSeq,
    inning: state.inning,
    is_offense: true,
    batter_lineup_id: state.batter.id,
    opponent_batting_slot: null,
    pitcher_lineup_id: null,
    opp_pitcher_throws: input.oppPitcherThrows,
    result: input.result,
    fielders: input.fielders,
    direction_pos: input.direction?.pos ?? null,
    direction_x: input.direction?.x ?? null,
    direction_y: input.direction?.y ?? null,
    rbi: Math.max(0, Math.min(4, input.rbi)),
    outs_on_play: input.moves.filter((m) => m.to === 'OUT').length,
    runners_before: basesMask(state.bases),
  }
  // 先の塁の走者から順に記録する（同じ打席の行はまとめて1つのプレーとして読む）
  const moves = [...input.moves].sort((a, b) => MOVE_ORDER[a.from] - MOVE_ORDER[b.from])
  const events: RunnerEvent[] = moves.map((m, i) => ({
    id: newId(),
    plate_appearance_id: pa.id,
    seq: state.nextEventSeq + i,
    inning: state.inning,
    is_offense: true,
    runner_lineup_id: m.from === 'B' ? state.batter!.id : state.bases[m.from]?.lineupId ?? null,
    opponent_slot: null,
    from_base: m.from,
    to_base: m.to,
    reason: m.reason,
    earned: null,
  }))
  return { pa, events }
}
