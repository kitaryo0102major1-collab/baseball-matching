'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { LineupRow } from '@/lib/lineup'
import { NO_DIRECTION_RESULTS, OUT_RESULTS, predictPlay, rbiFor } from '@/lib/scoring/predict'
import { buildOffenseRecord } from '@/lib/scoring/record'
import { BASES, computeGameState } from '@/lib/scoring/state'
import type { Base, Bases, FromBase, Move, PaResult, PlateAppearance, RunnerEvent, ToBase } from '@/lib/scoring/types'
import type { Bats, Game, Throws } from '@/lib/types'
import ConfirmDialog from './ConfirmDialog'

interface Props {
  game: Pick<Game, 'batting_first' | 'lineup_size' | 'defense_mode' | 'opponent_innings'>
  ourName: string
  opponentName: string
  rows: LineupRow[]
  initialPas: PlateAppearance[]
  initialEvents: RunnerEvent[]
  nameOf: (lineupId: string | null) => string
  batsOf: (row: LineupRow) => Bats | null
  lineupHref: string
  // 失敗したらエラーメッセージを返す。all〜 は保存後の全体（ゲストは丸ごと送る）
  onRecord: (pa: PlateAppearance, events: RunnerEvent[], allPas: PlateAppearance[], allEvents: RunnerEvent[]) => Promise<string | null>
  onUndo: (pa: PlateAppearance, allPas: PlateAppearance[], allEvents: RunnerEvent[]) => Promise<string | null>
}

// 結果ボタン。子の選択肢があるものは、最初の値を初期値にする（2タップで記録できるように）
const RESULT_BUTTONS: { label: string; results: PaResult[] }[] = [
  { label: 'ヒット', results: ['単打'] },
  { label: '二塁打', results: ['二塁打'] },
  { label: '三塁打', results: ['三塁打'] },
  { label: '本塁打', results: ['本塁打'] },
  { label: 'ゴロ', results: ['ゴロ'] },
  { label: 'フライ', results: ['フライ'] },
  { label: 'ライナー', results: ['ライナー'] },
  { label: '三振', results: ['空振り三振', '見逃し三振'] },
  { label: '四球', results: ['四球'] },
  { label: '死球', results: ['死球'] },
  { label: '犠打/犠飛', results: ['犠打', '犠飛'] },
  { label: 'その他', results: ['失策出塁', '野選', '振り逃げ', '併殺', '三重殺', '敬遠', 'ファウルフライ', '打撃妨害', '走塁妨害'] },
]

const RESULT_SHORT: Partial<Record<PaResult, string>> = { 空振り三振: '空振り', 見逃し三振: '見逃し', 失策出塁: '失策' }

// グラウンド図の守備位置（viewBox 0〜100）
const FIELD_POS: Record<number, { x: number; y: number; label: string }> = {
  1: { x: 50, y: 66, label: '投' },
  2: { x: 50, y: 93, label: '捕' },
  3: { x: 70, y: 62, label: '一' },
  4: { x: 61, y: 50, label: '二' },
  5: { x: 30, y: 62, label: '三' },
  6: { x: 39, y: 50, label: '遊' },
  7: { x: 18, y: 30, label: '左' },
  8: { x: 50, y: 16, label: '中' },
  9: { x: 82, y: 30, label: '右' },
}

function nearestPosition(x: number, y: number) {
  let best = 1
  let dist = Infinity
  for (const [pos, p] of Object.entries(FIELD_POS)) {
    const d = (p.x - x) ** 2 + (p.y - y) ** 2
    if (d < dist) {
      dist = d
      best = Number(pos)
    }
  }
  return best
}

const DEST_LABELS: Record<ToBase | 'stay', string> = { '1': '一塁', '2': '二塁', '3': '三塁', H: '得点', OUT: 'アウト', stay: 'そのまま' }

function destOptions(from: FromBase): (ToBase | 'stay')[] {
  if (from === 'B') return ['1', '2', '3', 'H', 'OUT']
  const n = Number(from)
  const ahead = (['2', '3'] as const).filter((b) => Number(b) > n)
  return ['stay', ...ahead, 'H', 'OUT']
}

function choiceClass(active: boolean) {
  return `min-h-11 rounded-xl border text-sm px-2 transition-colors ${
    active ? 'bg-[var(--green)] text-[var(--bg)] font-bold border-[var(--green)]' : 'bg-[var(--surface)] text-[var(--ink)] border-[var(--line)]'
  }`
}

function Diamond({ bases }: { bases: Bases }) {
  const fill = (b: Base) => (bases[b] ? 'var(--green)' : 'var(--surface)')
  return (
    <svg viewBox="0 0 60 44" className="w-14 h-10 shrink-0" aria-label={`走者: ${BASES.filter((b) => bases[b]).map((b) => `${b}塁`).join('・') || 'なし'}`} role="img">
      <rect x="24" y="2" width="12" height="12" transform="rotate(45 30 8)" fill={fill('2')} stroke="var(--ink-sub)" strokeWidth="1.5" />
      <rect x="42" y="16" width="12" height="12" transform="rotate(45 48 22)" fill={fill('1')} stroke="var(--ink-sub)" strokeWidth="1.5" />
      <rect x="6" y="16" width="12" height="12" transform="rotate(45 12 22)" fill={fill('3')} stroke="var(--ink-sub)" strokeWidth="1.5" />
    </svg>
  )
}

export default function ScoreInput({
  game,
  ourName,
  opponentName,
  rows,
  initialPas,
  initialEvents,
  nameOf,
  batsOf,
  lineupHref,
  onRecord,
  onUndo,
}: Props) {
  const [pas, setPas] = useState(initialPas)
  const [events, setEvents] = useState(initialEvents)
  // 守備の入力ができるまで、「進む」を押した守備の回
  const [skipped, setSkipped] = useState<Set<number>>(new Set())
  const lastOffense = [...pas].filter((p) => p.is_offense).sort((a, b) => b.seq - a.seq)[0]
  const [oppThrows, setOppThrows] = useState<Throws>(lastOffense?.opp_pitcher_throws ?? 'R')

  const [buttonIndex, setButtonIndex] = useState<number | null>(null)
  const [result, setResult] = useState<PaResult | null>(null)
  const [direction, setDirection] = useState<{ pos: number; x: number; y: number } | null>(null)
  const [fielders, setFielders] = useState<number[]>([])
  const [moves, setMoves] = useState<Move[]>([])
  const [rbi, setRbi] = useState(0)
  const [rbiTouched, setRbiTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [undoOpen, setUndoOpen] = useState(false)
  const [undoError, setUndoError] = useState<string | null>(null)

  const state = useMemo(() => computeGameState(game, rows, pas, events, skipped), [game, rows, pas, events, skipped])
  const top = state.top
  const half = `${state.inning}回${top ? '表' : '裏'}`
  const [topName, bottomName] = game.batting_first ? [ourName, opponentName] : [opponentName, ourName]
  const [topScore, bottomScore] = game.batting_first ? [state.score.our, state.score.opponent] : [state.score.opponent, state.score.our]

  function reset() {
    setButtonIndex(null)
    setResult(null)
    setDirection(null)
    setFielders([])
    setMoves([])
    setRbi(0)
    setRbiTouched(false)
    setError(null)
  }

  function chooseResult(r: PaResult) {
    const p = predictPlay(r, state.bases, state.outs)
    setResult(r)
    setMoves(p.moves)
    setRbi(p.rbi)
    setRbiTouched(false)
    if (NO_DIRECTION_RESULTS.includes(r)) {
      setDirection(null)
      setFielders([])
    }
    setError(null)
  }

  function setDest(from: FromBase, to: ToBase | 'stay') {
    if (!result) return
    const reason = moves.find((m) => m.from === from)?.reason ?? moves.find((m) => m.from === 'B')?.reason ?? '打球'
    const next = moves.filter((m) => m.from !== from)
    if (to !== 'stay') next.push({ from, to, reason })
    setMoves(next)
    if (!rbiTouched) setRbi(rbiFor(result, next))
  }

  function tapField(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
    setDirection({ pos: nearestPosition(x * 100, y * 100), x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 })
  }

  // 走者が同じ塁に2人いないか
  const conflict = useMemo(() => {
    const dest = new Map<string, number>()
    for (const b of BASES) {
      if (!state.bases[b]) continue
      const m = moves.find((x) => x.from === b)
      const to = m ? m.to : b
      if (to === '1' || to === '2' || to === '3') dest.set(to, (dest.get(to) ?? 0) + 1)
    }
    const bm = moves.find((m) => m.from === 'B')
    if (bm && (bm.to === '1' || bm.to === '2' || bm.to === '3')) dest.set(bm.to, (dest.get(bm.to) ?? 0) + 1)
    return [...dest].some(([, n]) => n > 1)
  }, [moves, state.bases])

  async function record() {
    if (!result || !state.batter) return
    if (!moves.some((m) => m.from === 'B')) {
      setError('打者がどうなったかを選んでください。')
      return
    }
    setBusy(true)
    setError(null)
    const rec = buildOffenseRecord(
      state,
      {
        result,
        moves,
        rbi,
        fielders: fielders.length ? fielders.join('-') : null,
        direction: NO_DIRECTION_RESULTS.includes(result) ? null : direction,
        oppPitcherThrows: oppThrows,
      },
      () => crypto.randomUUID()
    )
    const allPas = [...pas, rec.pa]
    const allEvents = [...events, ...rec.events]
    const err = await onRecord(rec.pa, rec.events, allPas, allEvents)
    setBusy(false)
    if (err) {
      setError(err)
      return
    }
    setPas(allPas)
    setEvents(allEvents)
    reset()
  }

  async function undo() {
    const last = [...pas].sort((a, b) => b.seq - a.seq)[0]
    if (!last) return
    setBusy(true)
    setUndoError(null)
    const allPas = pas.filter((p) => p.id !== last.id)
    const allEvents = events.filter((e) => e.plate_appearance_id !== last.id)
    const err = await onUndo(last, allPas, allEvents)
    setBusy(false)
    if (err) {
      setUndoError(err)
      return
    }
    setPas(allPas)
    setEvents(allEvents)
    setUndoOpen(false)
    reset()
  }

  const batter = state.batter
  const batterBats = batter ? batsOf(batter) : null
  const batterSide = batterBats === 'S' ? (oppThrows === 'R' ? '左打席' : '右打席') : batterBats === 'L' ? '左打' : batterBats === 'R' ? '右打' : null
  const lastPa = [...pas].sort((a, b) => b.seq - a.seq)[0]
  const showFielders = result && (OUT_RESULTS.includes(result) || result === '失策出塁' || result === '野選')
  const participants: { from: FromBase; name: string }[] = [
    ...(['3', '2', '1'] as Base[]).filter((b) => state.bases[b]).map((b) => ({ from: b as FromBase, name: nameOf(state.bases[b]!.lineupId) })),
    ...(batter ? [{ from: 'B' as FromBase, name: nameOf(batter.id) }] : []),
  ]

  return (
    <div className="pb-28">
      {/* 上部: イニング・アウト・走者・得点 */}
      <div className="sticky top-14 z-30 -mx-4 px-4 py-2 bg-[var(--bg)]/95 backdrop-blur border-b border-[var(--line)]">
        <div className="flex items-center gap-3">
          <div className="shrink-0">
            <p className="text-base font-black text-[var(--ink)] leading-tight">{half}</p>
            <p className="text-[11px] text-[var(--ink-mute)]">{state.isOffense ? '攻撃' : '守備'}</p>
          </div>
          <div className="flex gap-1 shrink-0" aria-label={`${state.outs}アウト`} role="img">
            {[0, 1, 2].map((i) => (
              <span key={i} className={`w-3 h-3 rounded-full border ${i < state.outs ? 'bg-[#C2410C] border-[#C2410C]' : 'border-[var(--line)]'}`} />
            ))}
          </div>
          <Diamond bases={state.bases} />
          <div className="flex-1 min-w-0 text-right text-xs leading-tight">
            <p className="truncate">
              <span className="text-[var(--ink-sub)]">{topName}</span> <span className="font-black text-base text-[var(--ink)] tabular-nums">{topScore}</span>
            </p>
            <p className="truncate">
              <span className="text-[var(--ink-sub)]">{bottomName}</span> <span className="font-black text-base text-[var(--ink)] tabular-nums">{bottomScore}</span>
            </p>
          </div>
        </div>
      </div>

      {state.defensePending ? (
        <section className="mt-4 bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 space-y-4 text-center">
          <p className="text-base font-bold text-[var(--ink)]">{half}は守備（{opponentName}の攻撃）</p>
          <p className="text-sm text-[var(--ink-sub)]">守備の入力は準備中です。</p>
          <button
            type="button"
            onClick={() => setSkipped(new Set([...skipped, state.inning]))}
            className="w-full bg-[var(--green)] text-white font-bold min-h-12 rounded-xl text-base"
          >
            次の攻撃へ進む
          </button>
        </section>
      ) : !batter ? (
        <section className="mt-4 bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 space-y-3">
          <p className="text-sm text-[var(--ink-sub)]">{state.battingSlot}番の打者が打順に入っていません。先に打順を入れてください。</p>
          <Link href={lineupHref} className="block text-center bg-[var(--green)] text-white font-bold py-3 rounded-xl text-sm">
            打順と交代を入力する
          </Link>
        </section>
      ) : (
        <div className="mt-4 space-y-4">
          {/* 今の打者と相手投手 */}
          <section className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-3 flex items-center gap-3">
            <span className="w-10 h-10 shrink-0 rounded-full bg-[var(--green-bg)] text-[var(--green)] flex items-center justify-center text-sm font-black">
              {state.battingSlot}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-base font-black text-[var(--ink)] truncate">{nameOf(batter.id)}</p>
              <p className="text-xs text-[var(--ink-mute)]">
                {state.battingSlot}番{batterSide ? `・${batterSide}` : ''}
              </p>
            </div>
            <div className="shrink-0 text-center">
              <p className="text-[10px] text-[var(--ink-mute)] mb-0.5">相手投手</p>
              <div className="flex rounded-lg border border-[var(--line)] overflow-hidden" role="group" aria-label="相手投手の左右">
                {(['R', 'L'] as Throws[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={oppThrows === t}
                    onClick={() => setOppThrows(t)}
                    className={`w-11 min-h-11 text-sm ${oppThrows === t ? 'bg-[var(--ink)] text-[var(--bg)] font-bold' : 'text-[var(--ink-sub)]'}`}
                  >
                    {t === 'R' ? '右' : '左'}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ① 結果 */}
          <section className="space-y-2">
            <p className="text-xs font-bold text-[var(--ink-mute)]">① 結果</p>
            <div className="grid grid-cols-4 gap-2">
              {RESULT_BUTTONS.map((b, i) => (
                <button
                  key={b.label}
                  type="button"
                  aria-pressed={buttonIndex === i}
                  onClick={() => {
                    setButtonIndex(i)
                    if (b.results.length === 1 || b.label !== 'その他') chooseResult(b.results[0])
                    else {
                      setResult(null)
                      setMoves([])
                    }
                  }}
                  className={`${choiceClass(buttonIndex === i)} min-h-12 text-[13px]`}
                >
                  {b.label}
                </button>
              ))}
            </div>
            {buttonIndex !== null && RESULT_BUTTONS[buttonIndex].results.length > 1 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {RESULT_BUTTONS[buttonIndex].results.map((r) => (
                  <button key={r} type="button" aria-pressed={result === r} onClick={() => chooseResult(r)} className={`${choiceClass(result === r)} px-3 text-[13px]`}>
                    {RESULT_SHORT[r] ?? r}
                  </button>
                ))}
              </div>
            )}
          </section>

          {result && !NO_DIRECTION_RESULTS.includes(result) && (
            <section className="space-y-2">
              <p className="text-xs font-bold text-[var(--ink-mute)]">② 打球方向（任意・グラウンドをタップ）</p>
              <svg
                viewBox="0 0 100 100"
                onClick={tapField}
                className="w-full max-w-[18rem] mx-auto block touch-manipulation cursor-crosshair"
                role="img"
                aria-label="グラウンド図"
              >
                <path d="M50 97 L2 49 A48 48 0 0 1 98 49 Z" fill="var(--green-bg)" stroke="var(--line)" />
                <path d="M50 92 L70 70 L50 48 L30 70 Z" fill="#E9DCC6" stroke="var(--line)" />
                {Object.entries(FIELD_POS).map(([pos, p]) => (
                  <text key={pos} x={p.x} y={p.y} fontSize="5" textAnchor="middle" fill={direction?.pos === Number(pos) ? 'var(--green)' : 'var(--ink-mute)'} fontWeight={direction?.pos === Number(pos) ? 700 : 400}>
                    {p.label}
                  </text>
                ))}
                {direction && <circle cx={direction.x * 100} cy={direction.y * 100} r="2.5" fill="#C2410C" />}
              </svg>
              {direction && (
                <p className="text-xs text-center text-[var(--ink-sub)]">
                  {FIELD_POS[direction.pos].label}方向
                  <button type="button" onClick={() => setDirection(null)} className="ml-2 underline text-[var(--ink-mute)]">
                    消す
                  </button>
                </p>
              )}
              {showFielders && (
                <div>
                  <p className="text-xs text-[var(--ink-mute)] mb-1">
                    処理した守備者（順にタップ）: <span className="font-bold text-[var(--ink)]">{fielders.join('-') || '—'}</span>
                    {fielders.length > 0 && (
                      <button type="button" onClick={() => setFielders([])} className="ml-2 underline">
                        消す
                      </button>
                    )}
                  </p>
                  <div className="grid grid-cols-9 gap-1">
                    {Object.entries(FIELD_POS).map(([pos, p]) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => fielders.length < 7 && setFielders([...fielders, Number(pos)])}
                        aria-label={`${pos} ${p.label}`}
                        className="min-h-11 rounded-lg border border-[var(--line)] text-xs text-[var(--ink)]"
                      >
                        {pos}
                        <span className="block text-[10px] text-[var(--ink-mute)]">{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {result && (
            <section className="space-y-2">
              <p className="text-xs font-bold text-[var(--ink-mute)]">③ 走者の動き（予想。違えば直す）</p>
              <ul className="space-y-2">
                {participants.map((p) => {
                  const current = moves.find((m) => m.from === p.from)?.to ?? 'stay'
                  return (
                    <li key={p.from} className="bg-[var(--surface)] border border-[var(--line)] rounded-xl p-2">
                      <p className="text-xs text-[var(--ink-sub)] mb-1.5 truncate">
                        <span className="font-bold text-[var(--ink)]">{p.from === 'B' ? '打者' : `${p.from}塁`}</span> {p.name}
                      </p>
                      <div className="flex gap-1.5">
                        {destOptions(p.from).map((d) => (
                          <button key={d} type="button" aria-pressed={current === d} onClick={() => setDest(p.from, d)} className={`${choiceClass(current === d)} flex-1 text-xs px-1`}>
                            {DEST_LABELS[d]}
                          </button>
                        ))}
                      </div>
                    </li>
                  )
                })}
              </ul>
              {conflict && <p className="text-xs text-[#9A6B00]">同じ塁に2人の走者がいます。確認してください。</p>}
              <div className="flex items-center justify-between bg-[var(--surface)] border border-[var(--line)] rounded-xl p-2">
                <span className="text-sm text-[var(--ink)] pl-1">打点</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => { setRbi(Math.max(0, rbi - 1)); setRbiTouched(true) }} className="w-11 h-11 rounded-lg border border-[var(--line)] text-lg" aria-label="打点を減らす">
                    −
                  </button>
                  <span className="w-6 text-center text-lg font-black tabular-nums">{rbi}</span>
                  <button type="button" onClick={() => { setRbi(Math.min(4, rbi + 1)); setRbiTouched(true) }} className="w-11 h-11 rounded-lg border border-[var(--line)] text-lg" aria-label="打点を増やす">
                    ＋
                  </button>
                </div>
              </div>
            </section>
          )}

          {lastPa && (
            <button
              type="button"
              onClick={() => {
                setUndoError(null)
                setUndoOpen(true)
              }}
              className="w-full text-xs text-[var(--ink-mute)] underline min-h-11"
            >
              直前の打席を取り消す
            </button>
          )}
        </div>
      )}

      {!state.defensePending && batter && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-[var(--surface)]/95 backdrop-blur border-t border-[var(--line)] px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="max-w-md mx-auto space-y-1">
            {error && <p className="text-xs text-[#A3462B]">{error}</p>}
            <button
              type="button"
              onClick={record}
              disabled={!result || busy}
              className="w-full bg-[var(--green)] text-white font-bold min-h-12 rounded-xl text-base disabled:opacity-40"
            >
              {busy ? '記録中...' : '記録して次の打者へ'}
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={undoOpen}
        title="直前の打席を取り消しますか？"
        description={lastPa ? <>{lastPa.inning}回の{lastPa.is_offense ? nameOf(lastPa.batter_lineup_id) : '相手'}の打席（{lastPa.result}）と、その走者の動きを消します。</> : null}
        confirmLabel="取り消す"
        busy={busy}
        error={undoError}
        onConfirm={undo}
        onClose={() => setUndoOpen(false)}
      />
    </div>
  )
}
