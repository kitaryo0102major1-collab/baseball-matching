// 打席と走者の動きの記録から、今の試合の状態を計算する（純粋な関数。画面・保存とは独立）
import type { LineupRow } from '../lineup'
import type { Base, Bases, Move, PlateAppearance, Runner, RunnerEvent } from './types'
import { EMPTY_BASES } from './types'

export interface ScoringGame {
  batting_first: boolean
  lineup_size: number
  defense_mode: 'summary' | 'detailed'
  opponent_innings: (number | null)[]
}

export interface GameState {
  inning: number
  // 自チームの攻撃中か
  isOffense: boolean
  // 表か（先攻の攻撃が表）
  top: boolean
  outs: number
  bases: Bases
  score: { our: number; opponent: number }
  // 守備の回で、まだ守備の入力がない（守備の入力は次のタスク）
  defensePending: boolean
  // 次の打席・走者の動きの通し番号
  nextSeq: number
  nextEventSeq: number
  // 攻撃中の次の打者
  battingSlot: number | null
  batter: LineupRow | null
}

const BASES: Base[] = ['1', '2', '3']

function eventsOfHalf(events: RunnerEvent[], inning: number, isOffense: boolean) {
  return events.filter((e) => e.inning === inning && e.is_offense === isOffense).sort((a, b) => a.seq - b.seq)
}

export function halfOuts(events: RunnerEvent[], inning: number, isOffense: boolean) {
  return eventsOfHalf(events, inning, isOffense).filter((e) => e.to_base === 'OUT').length
}

// 同じプレーの動きはまとめて適用する（先の走者が動く前に後ろの走者が同じ塁へ来ても上書きしない）
export function applyMoves(bases: Bases, moves: (Move & { runner: Runner })[]): Bases {
  const next: Bases = { ...bases }
  for (const m of moves) if (m.from !== 'B') next[m.from] = null
  for (const m of moves) if (m.to === '1' || m.to === '2' || m.to === '3') next[m.to] = m.runner
  return next
}

function runnerOf(e: RunnerEvent): Runner {
  return { lineupId: e.runner_lineup_id, opponentSlot: e.opponent_slot }
}

// その回の塁上。3アウトになっていれば空
export function halfBases(events: RunnerEvent[], inning: number, isOffense: boolean): Bases {
  const list = eventsOfHalf(events, inning, isOffense)
  if (list.filter((e) => e.to_base === 'OUT').length >= 3) return { ...EMPTY_BASES }
  let bases: Bases = { ...EMPTY_BASES }
  let i = 0
  while (i < list.length) {
    // 同じ打席の動き、または同じ seq の打席の間の動き（続いている行）を1つのプレーとして扱う
    const paId = list[i].plate_appearance_id
    const seq = list[i].seq
    let j = i + 1
    while (
      j < list.length &&
      (paId ? list[j].plate_appearance_id === paId : !list[j].plate_appearance_id && list[j].seq === seq)
    )
      j++
    bases = applyMoves(
      bases,
      list.slice(i, j).map((e) => ({ from: e.from_base, to: e.to_base, reason: e.reason, runner: runnerOf(e) }))
    )
    i = j
  }
  return bases
}

export function basesMask(bases: Bases) {
  return (bases['1'] ? 1 : 0) + (bases['2'] ? 2 : 0) + (bases['3'] ? 4 : 0)
}

function rowOrder(a: LineupRow, b: LineupRow) {
  return (a.entered_at ?? 0) - (b.entered_at ?? 0) || a.created_at.localeCompare(b.created_at)
}

// その打順で、seq 番目の打席に立つ人（交代は entered_at から反映。臨時代打はその打席だけ）
export function batterAt(rows: LineupRow[], slot: number, seq: number): LineupRow | null {
  const inSlot = rows.filter((r) => r.batting_slot === slot).sort(rowOrder)
  const pinch = inSlot.filter((r) => r.entry_type === '臨時代打' && r.entered_at === seq)
  if (pinch.length) return pinch[pinch.length - 1]
  const regular = inSlot.filter((r) => r.entry_type !== '臨時代打' && r.entry_type !== '臨時代走' && (r.entered_at ?? 0) <= seq)
  return regular[regular.length - 1] ?? null
}

// 塁上の走者に代走・臨時代走が出ていれば、その人に置き換える。
// 代走の行は、その走者が塁に出た打席より後（entered_at が大きい）で、次の打席までに出たものだけを使う
export function substituteRunners(bases: Bases, rows: LineupRow[], pas: PlateAppearance[], nextSeq: number): Bases {
  const next: Bases = { ...bases }
  for (const b of BASES) {
    const runner = next[b]
    if (!runner?.lineupId) continue
    const row = rows.find((r) => r.id === runner.lineupId)
    if (!row || row.batting_slot === null) continue
    const reachedSeq = pas
      .filter((p) => p.is_offense && rows.find((r) => r.id === p.batter_lineup_id)?.batting_slot === row.batting_slot)
      .reduce((m, p) => Math.max(m, p.seq), 0)
    const sub = rows
      .filter(
        (r) =>
          r.batting_slot === row.batting_slot &&
          (r.entry_type === '代走' || r.entry_type === '臨時代走') &&
          r.entered_at !== null &&
          r.entered_at > reachedSeq &&
          r.entered_at <= nextSeq
      )
      .sort(rowOrder)
      .pop()
    if (sub) next[b] = { lineupId: sub.id, opponentSlot: null }
  }
  return next
}

export function slotCount(game: Pick<ScoringGame, 'lineup_size'>, rows: LineupRow[]) {
  return Math.max(game.lineup_size, ...rows.map((r) => r.batting_slot ?? 0))
}

// 自チームの次の打順。前の打者の次（最後の打順の次は1番）
export function nextBattingSlot(game: Pick<ScoringGame, 'lineup_size'>, rows: LineupRow[], pas: PlateAppearance[]) {
  const offense = pas.filter((p) => p.is_offense).sort((a, b) => a.seq - b.seq)
  const last = offense[offense.length - 1]
  if (!last) return 1
  const slot = rows.find((r) => r.id === last.batter_lineup_id)?.batting_slot
  if (!slot) return 1
  return (slot % slotCount(game, rows)) + 1
}

export function computeScore(game: Pick<ScoringGame, 'defense_mode' | 'opponent_innings'>, events: RunnerEvent[]) {
  const our = events.filter((e) => e.is_offense && e.to_base === 'H').length
  const opponent =
    game.defense_mode === 'summary'
      ? game.opponent_innings.reduce<number>((s, v) => s + (v ?? 0), 0)
      : events.filter((e) => !e.is_offense && e.to_base === 'H').length
  return { our, opponent }
}

export function isTop(game: Pick<ScoringGame, 'batting_first'>, isOffense: boolean) {
  return isOffense === game.batting_first
}

// 守備の回が終わっているか（守備の入力は次のタスク。今は「進む」を押した回も終わったことにする）
function defenseDone(game: ScoringGame, events: RunnerEvent[], inning: number, skipped: Set<number>) {
  if (skipped.has(inning)) return true
  if (halfOuts(events, inning, false) >= 3) return true
  return game.defense_mode === 'summary' && game.opponent_innings[inning - 1] != null
}

export function computeGameState(
  game: ScoringGame,
  rows: LineupRow[],
  pas: PlateAppearance[],
  events: RunnerEvent[],
  skippedDefense: Set<number> = new Set()
): GameState {
  const nextSeq = pas.reduce((m, p) => Math.max(m, p.seq), 0) + 1
  const nextEventSeq = events.reduce((m, e) => Math.max(m, e.seq), 0) + 1
  const score = computeScore(game, events)
  const lastOff = pas.filter((p) => p.is_offense).reduce((m, p) => Math.max(m, p.inning), 0)

  const offenseState = (inning: number): GameState => {
    const slot = nextBattingSlot(game, rows, pas)
    return {
      inning,
      isOffense: true,
      top: isTop(game, true),
      outs: halfOuts(events, inning, true),
      bases: substituteRunners(halfBases(events, inning, true), rows, pas, nextSeq),
      score,
      defensePending: false,
      nextSeq,
      nextEventSeq,
      battingSlot: slot,
      batter: batterAt(rows, slot, nextSeq),
    }
  }

  // 攻撃の途中
  if (lastOff > 0 && halfOuts(events, lastOff, true) < 3) return offenseState(lastOff)

  // 次の攻撃の前に守備の回がある: 先攻なら同じ回の裏、後攻なら次の回の表
  const nextOff = lastOff + 1
  const defenseInning = game.batting_first ? lastOff : nextOff
  if (defenseInning > 0 && !defenseDone(game, events, defenseInning, skippedDefense)) {
    return {
      inning: defenseInning,
      isOffense: false,
      top: isTop(game, false),
      outs: halfOuts(events, defenseInning, false),
      bases: halfBases(events, defenseInning, false),
      score,
      defensePending: true,
      nextSeq,
      nextEventSeq,
      battingSlot: null,
      batter: null,
    }
  }
  return offenseState(nextOff)
}

export { BASES }
