// 打席結果ごとの、走者の動きと打点の「標準的な予想」。画面ではこれを初期値にして、違えば直してもらう
import type { Base, Bases, FromBase, Move, PaResult, RunnerReason, ToBase } from './types'

export const HIT_RESULTS: PaResult[] = ['単打', '二塁打', '三塁打', '本塁打']
export const STRIKEOUT_RESULTS: PaResult[] = ['空振り三振', '見逃し三振', '振り逃げ']
export const WALK_RESULTS: PaResult[] = ['四球', '敬遠', '死球']
// 打球の方向を記録しない結果
export const NO_DIRECTION_RESULTS: PaResult[] = [...STRIKEOUT_RESULTS, ...WALK_RESULTS, '打撃妨害']
// 打者がアウトになる結果（守備者の並びを選べる）
export const OUT_RESULTS: PaResult[] = ['ゴロ', 'フライ', 'ライナー', 'ファウルフライ', '犠打', '犠飛', '併殺', '三重殺']

const ORDER: Base[] = ['3', '2', '1']

function advance(base: FromBase, n: number): ToBase {
  const v = (base === 'B' ? 0 : Number(base)) + n
  return v >= 4 ? 'H' : (String(v) as Base)
}

// 打者が一塁に出たとき、押し出される走者だけ1つ進む
function forcedMoves(bases: Bases, reason: RunnerReason): Move[] {
  const moves: Move[] = []
  if (!bases['1']) return moves
  moves.push({ from: '1', to: '2', reason })
  if (!bases['2']) return moves
  moves.push({ from: '2', to: '3', reason })
  if (!bases['3']) return moves
  moves.push({ from: '3', to: 'H', reason })
  return moves
}

// 全走者が n 個進む
function allAdvance(bases: Bases, n: number, reason: RunnerReason): Move[] {
  return ORDER.filter((b) => bases[b]).map((b) => ({ from: b, to: advance(b, n), reason }))
}

function batterReason(result: PaResult): RunnerReason {
  if (WALK_RESULTS.includes(result)) return '四死球'
  if (result === '失策出塁') return '失策'
  if (result === '野選') return '野選'
  if (result === '打撃妨害' || result === '走塁妨害') return '妨害'
  if (STRIKEOUT_RESULTS.includes(result)) return 'その他'
  return '打球'
}

// 併殺・三重殺でアウトにする走者。一塁の走者（二塁で封殺）から順に、いなければ先の塁の走者
function runnersForDoublePlay(bases: Bases, count: number): Base[] {
  const order: Base[] = ['1', '2', '3']
  return order.filter((b) => bases[b]).slice(0, count)
}

export interface Prediction {
  moves: Move[]
  rbi: number
  outsOnPlay: number
}

// 走者の動き（打者を含む）。動かない走者は含めない
export function predictMoves(result: PaResult, bases: Bases, outs: number): Move[] {
  const reason = batterReason(result)
  let moves: Move[]
  switch (result) {
    case '単打':
      moves = [...allAdvance(bases, 1, '打球'), { from: 'B', to: '1', reason }]
      break
    case '二塁打':
      moves = [...allAdvance(bases, 2, '打球'), { from: 'B', to: '2', reason }]
      break
    case '三塁打':
      moves = [...allAdvance(bases, 3, '打球'), { from: 'B', to: '3', reason }]
      break
    case '本塁打':
      moves = [...allAdvance(bases, 3, '打球'), { from: 'B', to: 'H', reason }]
      break
    case '四球':
    case '敬遠':
    case '死球':
    case '打撃妨害':
    case '走塁妨害':
    case '振り逃げ':
    case '野選':
      moves = [...forcedMoves(bases, reason).reverse(), { from: 'B', to: '1', reason }]
      break
    case '失策出塁':
      moves = [...allAdvance(bases, 1, '失策'), { from: 'B', to: '1', reason }]
      break
    case '犠打':
      moves = [...allAdvance(bases, 1, '打球'), { from: 'B', to: 'OUT', reason }]
      break
    case '犠飛':
      moves = [...(bases['3'] ? [{ from: '3' as const, to: 'H' as const, reason: '打球' as const }] : []), { from: 'B', to: 'OUT', reason }]
      break
    case '併殺': {
      const outRunners = runnersForDoublePlay(bases, 1)
      moves = [...outRunners.map((b) => ({ from: b, to: 'OUT' as const, reason: '打球' as const })), { from: 'B', to: 'OUT', reason }]
      break
    }
    case '三重殺': {
      const outRunners = runnersForDoublePlay(bases, 2)
      moves = [...outRunners.map((b) => ({ from: b, to: 'OUT' as const, reason: '打球' as const })), { from: 'B', to: 'OUT', reason }]
      break
    }
    default:
      // ゴロ・フライ・ライナー・ファウルフライ・三振: 打者アウト、走者は動かない
      moves = [{ from: 'B', to: 'OUT', reason }]
  }

  // 3アウト目が入るプレーでは、ほかの走者の進塁・得点は数えない（予想では動かさない）
  const outsOnPlay = moves.filter((m) => m.to === 'OUT').length
  if (outs + outsOnPlay >= 3) {
    moves = moves.filter((m) => m.to === 'OUT' || m.from === 'B')
  }
  return moves
}

// 打点のルール: 得点（H）の数。ただし失策・併殺での得点は打点なし、暴投・捕逸・ボークでの得点も打点なし。押し出しは打点あり
const NO_RBI_RESULTS: PaResult[] = ['失策出塁', '併殺', '三重殺', '振り逃げ']
const NO_RBI_REASONS: RunnerReason[] = ['失策', '暴投', '捕逸', 'ボーク', '盗塁']

export function rbiFor(result: PaResult, moves: Move[]): number {
  if (NO_RBI_RESULTS.includes(result)) return 0
  const runs = moves.filter((m) => m.to === 'H' && !NO_RBI_REASONS.includes(m.reason)).length
  return Math.min(4, runs)
}

export function predictPlay(result: PaResult, bases: Bases, outs: number): Prediction {
  const moves = predictMoves(result, bases, outs)
  return { moves, rbi: rbiFor(result, moves), outsOnPlay: moves.filter((m) => m.to === 'OUT').length }
}
