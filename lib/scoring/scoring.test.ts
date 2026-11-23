import { describe, expect, it } from 'vitest'
import type { LineupRow } from '../lineup'
import { predictPlay, rbiFor } from './predict'
import { buildOffenseRecord } from './record'
import { batterAt, computeGameState, halfBases, nextBattingSlot, type ScoringGame } from './state'
import type { Bases, Move, PaResult, PlateAppearance, RunnerEvent } from './types'

const R = (id: string) => ({ lineupId: id, opponentSlot: null })
const bases = (b1?: string, b2?: string, b3?: string): Bases => ({
  '1': b1 ? R(b1) : null,
  '2': b2 ? R(b2) : null,
  '3': b3 ? R(b3) : null,
})
const moveSet = (moves: Move[]) => moves.map((m) => `${m.from}>${m.to}`).sort()

describe('predictPlay: 走者の動きの予想', () => {
  it('単打: 打者は一塁、走者は1つ進む', () => {
    const p = predictPlay('単打', bases('a', 'b', 'c'), 0)
    expect(moveSet(p.moves)).toEqual(['1>2', '2>3', '3>H', 'B>1'])
    expect(p.rbi).toBe(1)
    expect(p.outsOnPlay).toBe(0)
  })

  it('二塁打: 走者は2つ進む（一塁走者は三塁へ）', () => {
    const p = predictPlay('二塁打', bases('a', 'b'), 1)
    expect(moveSet(p.moves)).toEqual(['1>3', '2>H', 'B>2'])
    expect(p.rbi).toBe(1)
  })

  it('三塁打: 走者は全員生還', () => {
    const p = predictPlay('三塁打', bases('a', null as unknown as string, 'c'), 0)
    expect(moveSet(p.moves)).toEqual(['1>H', '3>H', 'B>3'])
    expect(p.rbi).toBe(2)
  })

  it('本塁打: 満塁なら4点・4打点', () => {
    const p = predictPlay('本塁打', bases('a', 'b', 'c'), 2)
    expect(moveSet(p.moves)).toEqual(['1>H', '2>H', '3>H', 'B>H'])
    expect(p.rbi).toBe(4)
  })

  it('本塁打: 走者なしなら1打点', () => {
    expect(predictPlay('本塁打', bases(), 0).rbi).toBe(1)
  })

  it('四球: 押し出しの走者だけ進む', () => {
    expect(moveSet(predictPlay('四球', bases(), 0).moves)).toEqual(['B>1'])
    expect(moveSet(predictPlay('四球', bases(undefined, 'b'), 0).moves)).toEqual(['B>1'])
    expect(moveSet(predictPlay('四球', bases('a', undefined, 'c'), 0).moves)).toEqual(['1>2', 'B>1'])
    expect(moveSet(predictPlay('死球', bases('a', 'b'), 0).moves)).toEqual(['1>2', '2>3', 'B>1'])
  })

  it('押し出しは打点あり', () => {
    const p = predictPlay('四球', bases('a', 'b', 'c'), 1)
    expect(moveSet(p.moves)).toEqual(['1>2', '2>3', '3>H', 'B>1'])
    expect(p.rbi).toBe(1)
    expect(p.moves.find((m) => m.from === '3')?.reason).toBe('四死球')
  })

  it.each<PaResult>(['空振り三振', '見逃し三振', 'フライ', 'ライナー', 'ファウルフライ', 'ゴロ'])('%s: 打者アウト、走者は進まない', (result) => {
    const p = predictPlay(result, bases('a', 'b', 'c'), 0)
    expect(moveSet(p.moves)).toEqual(['B>OUT'])
    expect(p.rbi).toBe(0)
    expect(p.outsOnPlay).toBe(1)
  })

  it('犠飛: 三塁走者が生還し打点1', () => {
    const p = predictPlay('犠飛', bases('a', undefined, 'c'), 1)
    expect(moveSet(p.moves)).toEqual(['3>H', 'B>OUT'])
    expect(p.rbi).toBe(1)
  })

  it('犠打: 打者アウト、走者は1つ進む', () => {
    const p = predictPlay('犠打', bases('a', 'b'), 0)
    expect(moveSet(p.moves)).toEqual(['1>2', '2>3', 'B>OUT'])
    expect(p.rbi).toBe(0)
  })

  it('併殺: 打者と一塁走者がアウト、得点は打点なし', () => {
    const p = predictPlay('併殺', bases('a'), 0)
    expect(moveSet(p.moves)).toEqual(['1>OUT', 'B>OUT'])
    expect(p.outsOnPlay).toBe(2)
    expect(rbiFor('併殺', [...p.moves, { from: '3', to: 'H', reason: '打球' }])).toBe(0)
  })

  it('併殺: 一塁に走者がいなければ先の塁の走者', () => {
    expect(moveSet(predictPlay('併殺', bases(undefined, 'b'), 0).moves)).toEqual(['2>OUT', 'B>OUT'])
  })

  it('三重殺: 打者と走者2人がアウト', () => {
    const p = predictPlay('三重殺', bases('a', 'b'), 0)
    expect(moveSet(p.moves)).toEqual(['1>OUT', '2>OUT', 'B>OUT'])
    expect(p.outsOnPlay).toBe(3)
  })

  it('失策出塁: 走者は1つ進むが、得点は打点なし', () => {
    const p = predictPlay('失策出塁', bases(undefined, undefined, 'c'), 0)
    expect(moveSet(p.moves)).toEqual(['3>H', 'B>1'])
    expect(p.moves.every((m) => m.reason === '失策')).toBe(true)
    expect(p.rbi).toBe(0)
  })

  it('振り逃げ: 打者は一塁へ、打点なし', () => {
    const p = predictPlay('振り逃げ', bases('a', 'b', 'c'), 0)
    expect(moveSet(p.moves)).toEqual(['1>2', '2>3', '3>H', 'B>1'])
    expect(p.rbi).toBe(0)
  })

  it('野選・打撃妨害・走塁妨害: 打者は一塁、押し出しの走者だけ進む', () => {
    expect(moveSet(predictPlay('野選', bases('a'), 0).moves)).toEqual(['1>2', 'B>1'])
    expect(moveSet(predictPlay('打撃妨害', bases(undefined, 'b'), 0).moves)).toEqual(['B>1'])
    expect(predictPlay('走塁妨害', bases(), 0).moves[0].reason).toBe('妨害')
  })

  it('3アウト目が入るプレーでは得点しない（2アウトからの犠飛・併殺）', () => {
    const p = predictPlay('犠飛', bases(undefined, undefined, 'c'), 2)
    expect(moveSet(p.moves)).toEqual(['B>OUT'])
    expect(p.rbi).toBe(0)
    const dp = predictPlay('併殺', bases('a', undefined, 'c'), 1)
    expect(moveSet(dp.moves)).toEqual(['1>OUT', 'B>OUT'])
  })
})

describe('rbiFor: 打点のルール', () => {
  it('暴投・捕逸・失策で入った得点は打点にしない', () => {
    expect(
      rbiFor('単打', [
        { from: '3', to: 'H', reason: '打球' },
        { from: '2', to: 'H', reason: '失策' },
        { from: '1', to: 'H', reason: '暴投' },
      ])
    ).toBe(1)
  })
  it('最大4', () => {
    expect(rbiFor('本塁打', Array.from({ length: 5 }, () => ({ from: 'B' as const, to: 'H' as const, reason: '打球' as const })))).toBe(4)
  })
})

// ---- 試合の状態 ----

const game = (over: Partial<ScoringGame> = {}): ScoringGame => ({
  batting_first: true,
  lineup_size: 9,
  defense_mode: 'summary',
  opponent_innings: [],
  ...over,
})

let created = 0
function row(id: string, slot: number | null, over: Partial<LineupRow> = {}): LineupRow {
  created++
  return {
    id,
    player_id: null,
    guest_name: id,
    guest_bats: null,
    guest_throws: null,
    batting_slot: slot,
    position: null,
    entry_type: '先発',
    entered_at: null,
    created_at: `2026-01-01T00:00:${String(created).padStart(2, '0')}Z`,
    ...over,
  }
}
const lineup = Array.from({ length: 9 }, (_, i) => row(`p${i + 1}`, i + 1))

// 打席を1つずつ記録して、状態を進める
function play(g: ScoringGame, rows: LineupRow[], results: PaResult[], skipped = new Set<number>()) {
  const pas: PlateAppearance[] = []
  const events: RunnerEvent[] = []
  let n = 0
  for (const result of results) {
    const state = computeGameState(g, rows, pas, events, skipped)
    const p = predictPlay(result, state.bases, state.outs)
    const rec = buildOffenseRecord(
      state,
      { result, moves: p.moves, rbi: p.rbi, fielders: null, direction: null, oppPitcherThrows: 'R' },
      () => `id${++n}`
    )
    pas.push(rec.pa)
    events.push(...rec.events)
  }
  return { pas, events, state: computeGameState(g, rows, pas, events, skipped) }
}

describe('computeGameState: 試合の状態', () => {
  it('先攻の試合は1回表の攻撃から、1番打者', () => {
    const s = computeGameState(game(), lineup, [], [])
    expect(s).toMatchObject({ inning: 1, top: true, isOffense: true, outs: 0, battingSlot: 1, nextSeq: 1 })
    expect(s.batter?.id).toBe('p1')
  })

  it('後攻の試合は1回表の守備から（守備の入力がないので待ち）', () => {
    const s = computeGameState(game({ batting_first: false }), lineup, [], [])
    expect(s).toMatchObject({ inning: 1, top: true, isOffense: false, defensePending: true })
  })

  it('後攻: 守備の回を進めると1回裏の攻撃', () => {
    const s = computeGameState(game({ batting_first: false }), lineup, [], [], new Set([1]))
    expect(s).toMatchObject({ inning: 1, top: false, isOffense: true, battingSlot: 1 })
  })

  it('単打・四球・二塁打のあとの塁・得点・アウト・次の打者', () => {
    const { state } = play(game(), lineup, ['単打', '四球', '二塁打'])
    // 単打で p1 が一塁、四球で p1 は二塁・p2 は一塁、二塁打で p1 生還・p2 は三塁・打者 p3 は二塁
    expect(state.score.our).toBe(1)
    expect(state.bases['3']?.lineupId).toBe('p2')
    expect(state.bases['2']?.lineupId).toBe('p3')
    expect(state.bases['1']).toBeNull()
    expect(state.outs).toBe(0)
    expect(state.batter?.id).toBe('p4')
  })

  it('3アウトで守備の回になり、塁は空く', () => {
    const { state } = play(game(), lineup, ['単打', '空振り三振', 'フライ', 'ゴロ'])
    expect(state).toMatchObject({ inning: 1, top: false, isOffense: false, defensePending: true, outs: 0 })
  })

  it('守備の回を進めると2回表、打順は続きから', () => {
    const { state } = play(game(), lineup, ['単打', '空振り三振', 'フライ', 'ゴロ'], new Set([1]))
    expect(state).toMatchObject({ inning: 2, top: true, isOffense: true, outs: 0, battingSlot: 5 })
  })

  it('合計モードで相手の回の得点が入っていれば、その守備の回は終わり', () => {
    const { state } = play(game({ opponent_innings: [2] }), lineup, ['空振り三振', '空振り三振', '空振り三振'])
    expect(state).toMatchObject({ inning: 2, isOffense: true })
    expect(state.score.opponent).toBe(2)
  })

  it('9番の次は1番に戻る', () => {
    const results: PaResult[] = Array.from({ length: 9 }, () => '四球')
    const { state } = play(game(), lineup, results)
    expect(state.battingSlot).toBe(1)
    expect(state.score.our).toBe(6)
  })

  it('併殺で2アウト、走者が消える', () => {
    const { state } = play(game(), lineup, ['単打', '併殺'])
    expect(state.outs).toBe(2)
    expect(state.bases['1']).toBeNull()
  })

  it('全員打ち（11人）は11番の次が1番', () => {
    const rows = Array.from({ length: 11 }, (_, i) => row(`q${i + 1}`, i + 1))
    const { state } = play(game({ lineup_size: 11 }), rows, Array.from({ length: 11 }, () => '四球'))
    expect(state.battingSlot).toBe(1)
  })
})

describe('batterAt: 交代の反映', () => {
  const rows = [
    row('s3', 3),
    row('ph', 3, { entry_type: '代打', entered_at: 10 }),
    row('tmp', 3, { entry_type: '臨時代打', entered_at: 15 }),
    row('tr', 3, { entry_type: '臨時代走', entered_at: 12 }),
  ]
  it('代打は entered_at の打席から', () => {
    expect(batterAt(rows, 3, 9)?.id).toBe('s3')
    expect(batterAt(rows, 3, 10)?.id).toBe('ph')
    expect(batterAt(rows, 3, 14)?.id).toBe('ph')
  })
  it('臨時代打はその打席だけ、臨時代走は打者にしない', () => {
    expect(batterAt(rows, 3, 15)?.id).toBe('tmp')
    expect(batterAt(rows, 3, 16)?.id).toBe('ph')
    expect(batterAt(rows, 3, 12)?.id).toBe('ph')
  })
  it('打順が空なら null', () => {
    expect(batterAt(rows, 4, 1)).toBeNull()
  })
})

describe('halfBases / nextBattingSlot', () => {
  it('同じ打席の動きはまとめて適用（後ろの走者が先の走者を上書きしない）', () => {
    const { events } = play(game(), lineup, ['単打', '単打'])
    const b = halfBases(events, 1, true)
    expect(b['1']?.lineupId).toBe('p2')
    expect(b['2']?.lineupId).toBe('p1')
  })
  it('打席がなければ1番', () => {
    expect(nextBattingSlot(game(), lineup, [])).toBe(1)
  })
})

// ---- 打席の間のプレー ----

import { buildBetweenRecord, defaultTargets, lastOperation, predictBetween, withoutOperation } from './between'
import { substituteRunners } from './state'

// 打席と打席の間のプレーを挟みながら進める
type Step = PaResult | { between: Parameters<typeof predictBetween>[0]; targets?: ('1' | '2' | '3')[] }
function playSteps(g: ScoringGame, rows: LineupRow[], steps: Step[], skipped = new Set<number>()) {
  const pas: PlateAppearance[] = []
  const events: RunnerEvent[] = []
  let n = 0
  for (const step of steps) {
    const state = computeGameState(g, rows, pas, events, skipped)
    if (typeof step === 'string') {
      const p = predictPlay(step, state.bases, state.outs)
      const rec = buildOffenseRecord(
        state,
        { result: step, moves: p.moves, rbi: p.rbi, fielders: null, direction: null, oppPitcherThrows: 'R' },
        () => `id${++n}`
      )
      pas.push(rec.pa)
      events.push(...rec.events)
    } else {
      const targets = step.targets ?? defaultTargets(step.between, state.bases)
      events.push(...buildBetweenRecord(state, predictBetween(step.between, state.bases, targets), () => `id${++n}`))
    }
  }
  return { pas, events, state: computeGameState(g, rows, pas, events, skipped) }
}

describe('打席の間のプレー', () => {
  it('盗塁: 一塁走者が二塁へ（打者はそのまま）', () => {
    const { state } = playSteps(game(), lineup, ['単打', { between: '盗塁' }])
    expect(state.bases['2']?.lineupId).toBe('p1')
    expect(state.bases['1']).toBeNull()
    expect(state.batter?.id).toBe('p2')
    expect(state.outs).toBe(0)
  })

  it('盗塁の初期値は、次の塁が空いている先頭の走者', () => {
    expect(defaultTargets('盗塁', bases('a', undefined, 'c'))).toEqual(['1'])
    expect(defaultTargets('盗塁', bases('a', 'b'))).toEqual(['2'])
  })

  it('盗塁死でアウトが増え、走者が消える', () => {
    const { state } = playSteps(game(), lineup, ['単打', { between: '盗塁死' }])
    expect(state.outs).toBe(1)
    expect(state.bases['1']).toBeNull()
  })

  it('ボークは全走者が1つ進み、まとめて1つのプレーとして適用される', () => {
    const { state, events } = playSteps(game(), lineup, ['単打', '単打', { between: 'ボーク', targets: [] }])
    expect(state.bases['3']?.lineupId).toBe('p1')
    expect(state.bases['2']?.lineupId).toBe('p2')
    expect(state.bases['1']).toBeNull()
    const balk = events.filter((e) => e.reason === 'ボーク')
    expect(balk).toHaveLength(2)
    expect(new Set(balk.map((e) => e.seq)).size).toBe(1)
  })

  it('暴投・捕逸は選んだ走者だけ進む', () => {
    expect(predictBetween('暴投', bases('a', undefined, 'c'), ['3']).map((m) => `${m.from}>${m.to}`)).toEqual(['3>H'])
    expect(predictBetween('捕逸', bases('a', 'b'), ['1', '2']).map((m) => `${m.from}>${m.to}`)).toEqual(['2>3', '1>2'])
  })

  it('暴投での得点は点になるが、打席がないので打点はつかない', () => {
    const { state, pas } = playSteps(game(), lineup, ['三塁打', { between: '暴投' }])
    expect(state.score.our).toBe(1)
    expect(pas.reduce((s, p) => s + p.rbi, 0)).toBe(0)
    expect(state.bases['3']).toBeNull()
  })

  it('牽制死の初期値は一番後ろの走者', () => {
    expect(defaultTargets('牽制死', bases('a', undefined, 'c'))).toEqual(['1'])
  })

  it('盗塁死で3アウト → 攻守交代、次の回はその打席を終えていない打者から', () => {
    // 1番・2番が凡退、3番が単打、4番の打席中に3番が盗塁死
    const { state } = playSteps(game(), lineup, ['フライ', 'ゴロ', '単打', { between: '盗塁死' }], new Set([1]))
    expect(state).toMatchObject({ inning: 2, isOffense: true, outs: 0, battingSlot: 4 })
    expect(state.batter?.id).toBe('p4')
  })

  it('盗塁死で3アウトになると、守備の回になる', () => {
    const { state } = playSteps(game(), lineup, ['フライ', 'ゴロ', '単打', { between: '盗塁死' }])
    expect(state).toMatchObject({ inning: 1, isOffense: false, defensePending: true })
  })
})

describe('直前の操作の取り消し', () => {
  it('最後が打席の間のプレーなら、そのプレーだけを取り消す', () => {
    const { pas, events } = playSteps(game(), lineup, ['単打', '単打', { between: 'ボーク', targets: [] }])
    const op = lastOperation(pas, events)
    expect(op?.kind).toBe('play')
    expect(op?.events).toHaveLength(2)
    const after = withoutOperation(op!, pas, events)
    expect(after.pas).toHaveLength(2)
    const s = computeGameState(game(), lineup, after.pas, after.events)
    expect(s.bases['2']?.lineupId).toBe('p1')
    expect(s.bases['1']?.lineupId).toBe('p2')
  })

  it('最後が打席なら、その打席と走者の動きを取り消す', () => {
    const { pas, events } = playSteps(game(), lineup, ['単打', { between: '盗塁' }, '二塁打'])
    const op = lastOperation(pas, events)
    expect(op?.kind).toBe('pa')
    const after = withoutOperation(op!, pas, events)
    expect(after.pas).toHaveLength(1)
    const s = computeGameState(game(), lineup, after.pas, after.events)
    expect(s.bases['2']?.lineupId).toBe('p1')
    expect(s.score.our).toBe(0)
  })

  it('何も記録がなければ null', () => {
    expect(lastOperation([], [])).toBeNull()
  })
})

describe('代走・臨時代走', () => {
  it('走者が出たあとの代走は、塁上の走者を置き換える', () => {
    const rows = [...lineup, row('pr', 1, { entry_type: '代走', entered_at: 2 })]
    const { pas, events, state } = playSteps(game(), rows, ['単打'])
    expect(state.bases['1']?.lineupId).toBe('pr')
    // 代走の行は、そのあと塁に出た新しい打席には使わない
    expect(substituteRunners(bases('p1'), rows, [...pas, { ...pas[0], id: 'x', seq: 20 }], 21)['1']?.lineupId).toBe('p1')
    expect(events).toHaveLength(1)
  })

  it('臨時代走で生還した得点も記録される（走者は臨時代走の人）', () => {
    const rows = [...lineup, row('tr', 1, { entry_type: '臨時代走', entered_at: 2 })]
    const { events } = playSteps(game(), rows, ['単打', '本塁打'])
    expect(events.find((e) => e.from_base === '1')?.runner_lineup_id).toBe('tr')
  })
})
