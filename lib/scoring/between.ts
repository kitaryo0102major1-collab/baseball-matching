// 打席と打席の間のプレー（盗塁・暴投など）と、「直前の操作」の取り消し
import type { GameState } from './state'
import type { Base, Bases, Move, PlateAppearance, RunnerEvent, RunnerReason, ToBase } from './types'

export type BetweenKind = '盗塁' | '盗塁死' | '暴投' | '捕逸' | 'ボーク' | '牽制死' | '走塁死' | '失策'

export const BETWEEN_KINDS: BetweenKind[] = ['盗塁', '盗塁死', '暴投', '捕逸', 'ボーク', '牽制死', '走塁死', '失策']

// 種類ごとの runner_events.reason（名前が同じ）
export function betweenReason(kind: BetweenKind): RunnerReason {
  return kind
}

const OUT_KINDS: BetweenKind[] = ['盗塁死', '牽制死', '走塁死']

function occupied(bases: Bases): Base[] {
  return (['1', '2', '3'] as Base[]).filter((b) => bases[b])
}

function plusOne(b: Base): ToBase {
  return b === '3' ? 'H' : (String(Number(b) + 1) as Base)
}

// 対象の走者の初期値。盗塁・盗塁死は次の塁（二塁・三塁）が空いている先頭の走者、牽制死は一番後ろの走者、
// 走塁死・失策は先頭の走者、暴投・捕逸・ボークは全員
export function defaultTargets(kind: BetweenKind, bases: Bases): Base[] {
  const runners = occupied(bases)
  if (runners.length === 0) return []
  if (kind === '暴投' || kind === '捕逸' || kind === 'ボーク') return runners
  if (kind === '盗塁' || kind === '盗塁死') {
    // 本盗はまれなので、二塁・三塁への盗塁を先に探す
    const lead = (['2', '1'] as Base[]).find((b) => bases[b] && !bases[String(Number(b) + 1) as Base])
    return [lead ?? runners[runners.length - 1]]
  }
  if (kind === '牽制死') return [runners[0]]
  return [runners[runners.length - 1]]
}

// 対象の走者の動きの予想。盗塁死・牽制死・走塁死はアウト、ほかは1つ進む（ボークは対象によらず全員）
export function predictBetween(kind: BetweenKind, bases: Bases, targets: Base[]): Move[] {
  const list = kind === 'ボーク' ? occupied(bases) : targets.filter((b) => bases[b])
  const reason = betweenReason(kind)
  return list
    .sort((a, b) => Number(b) - Number(a))
    .map((b) => ({ from: b, to: OUT_KINDS.includes(kind) ? 'OUT' : plusOne(b), reason }))
}

// 1つのプレーの走者の動き。同じプレーの行は同じ seq にして、まとめて1つのプレーとして読む
export function buildBetweenRecord(state: GameState, moves: Move[], newId: () => string): RunnerEvent[] {
  return [...moves]
    .filter((m) => m.from !== 'B')
    .sort((a, b) => Number(b.from) - Number(a.from))
    .map((m) => ({
      id: newId(),
      plate_appearance_id: null,
      seq: state.nextEventSeq,
      inning: state.inning,
      is_offense: state.isOffense,
      runner_lineup_id: state.bases[m.from as Base]?.lineupId ?? null,
      opponent_slot: state.bases[m.from as Base]?.opponentSlot ?? null,
      from_base: m.from,
      to_base: m.to,
      reason: m.reason,
      earned: null,
    }))
}

export type LastOperation =
  | { kind: 'pa'; pa: PlateAppearance; events: RunnerEvent[] }
  | { kind: 'play'; seq: number; events: RunnerEvent[] }

// 直前の操作: いちばん後に記録した走者の動きが属する打席、または打席の間のプレー
export function lastOperation(pas: PlateAppearance[], events: RunnerEvent[]): LastOperation | null {
  const last = events.reduce<RunnerEvent | null>((m, e) => (!m || e.seq > m.seq ? e : m), null)
  const lastPa = pas.reduce<PlateAppearance | null>((m, p) => (!m || p.seq > m.seq ? p : m), null)
  if (last && !last.plate_appearance_id) {
    return { kind: 'play', seq: last.seq, events: events.filter((e) => !e.plate_appearance_id && e.seq === last.seq) }
  }
  const pa = (last && pas.find((p) => p.id === last.plate_appearance_id)) ?? lastPa
  if (!pa) return null
  return { kind: 'pa', pa, events: events.filter((e) => e.plate_appearance_id === pa.id) }
}

// 取り消したあとの記録
export function withoutOperation(op: LastOperation, pas: PlateAppearance[], events: RunnerEvent[]) {
  const ids = new Set(op.events.map((e) => e.id))
  return {
    pas: op.kind === 'pa' ? pas.filter((p) => p.id !== op.pa.id) : pas,
    events: events.filter((e) => !ids.has(e.id) && (op.kind !== 'pa' || e.plate_appearance_id !== op.pa.id)),
  }
}
