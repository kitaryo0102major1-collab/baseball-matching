'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  LINEUP_POSITIONS,
  SUBSTITUTION_KINDS,
  currentRow,
  currentRows,
  duplicatePositions,
  entryLabel,
  entryTypeFor,
  hideRosterTip,
  isRosterTipHidden,
  isTemporary,
  lineupPositionLabel,
  lineupSlots,
  nextCreatedAt,
  readRecentNames,
  reentryCandidates,
  samePerson,
  slotRows,
  type LineupPosition,
  type LineupRow,
  type SubstitutionKind,
} from '@/lib/lineup'
import { BATS_OPTIONS, THROWS_OPTIONS, comparePlayers } from '@/lib/players'
import type { Bats, Game, Player, Throws } from '@/lib/types'

// 選手の選び方: チームは名簿、ゲストは名前の入力
export type LineupPeople =
  | { kind: 'team'; players: Player[]; addHelper: (displayName: string) => Promise<Player | null> }
  | { kind: 'guest' }

interface Props {
  game: Pick<Game, 'lineup_size' | 'use_dh' | 'defense_mode' | 'opponent_lineup'>
  initialRows: LineupRow[]
  people: LineupPeople
  // 交代の「何打席目から」の初期値（今ある打席の次）
  nextSeq: number
  // 失敗したらエラーメッセージを返す
  onSave: (rows: LineupRow[], opponentLineup: string[]) => Promise<string | null>
}

type Person = Pick<LineupRow, 'player_id' | 'guest_name' | 'guest_bats' | 'guest_throws'>

// 行から人の項目だけを取り出す（id などを新しい行に持ち込まない）
function toPerson(p: Person): Person {
  return { player_id: p.player_id, guest_name: p.guest_name, guest_bats: p.guest_bats, guest_throws: p.guest_throws }
}

const CARD = 'bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-4'
const INPUT_CLASS =
  'w-full border border-[var(--line)] rounded-lg px-3 py-2.5 text-sm bg-[var(--surface)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--green)]/40 transition'

function choiceClass(active: boolean, disabled = false) {
  return `min-h-11 rounded-xl border text-sm px-2 transition-colors ${
    active
      ? 'bg-[var(--green)] text-[var(--bg)] font-bold border-[var(--green)]'
      : disabled
        ? 'bg-[var(--bg)] text-[var(--ink-mute)] border-[var(--line)] opacity-50'
        : 'bg-[var(--surface)] text-[var(--ink-sub)] border-[var(--line)]'
  }`
}

function slotLabel(slot: number | null) {
  return slot === null ? '投手' : `${slot}番`
}

export default function LineupEditor({ game, initialRows, people, nextSeq, onSave }: Props) {
  const [rows, setRows] = useState<LineupRow[]>(initialRows)
  const [players, setPlayers] = useState<Player[]>(people.kind === 'team' ? people.players : [])
  const [opponentLineup, setOpponentLineup] = useState<string[]>(() => {
    const list = [...(game.opponent_lineup ?? [])]
    while (list.length < 9) list.push('')
    return list
  })
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  // 選手を選ぶシート: 先発の設定か交代
  const [sheet, setSheet] = useState<{ mode: 'starter' | 'sub'; slot: number | null } | null>(null)
  const [showTip, setShowTip] = useState(false)

  useEffect(() => {
    if (people.kind === 'guest') setShowTip(!isRosterTipHidden())
  }, [people.kind])

  // 保存していない変更があるときは、ページを離れる前に確認する
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const slots = useMemo(() => {
    // 試合情報で人数を減らしたあとも、入力済みの打順は表示する
    const maxSlot = rows.reduce((m, r) => Math.max(m, r.batting_slot ?? 0), 0)
    const size = Math.max(game.lineup_size, maxSlot)
    const hasPitcherRow = rows.some((r) => r.batting_slot === null)
    return lineupSlots(size, game.use_dh || hasPitcherRow)
  }, [rows, game.lineup_size, game.use_dh])

  const duplicates = duplicatePositions(rows, slots)
  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players])

  function nameOf(p: Pick<LineupRow, 'player_id' | 'guest_name'>) {
    if (p.player_id) return playerById.get(p.player_id)?.display_name ?? '（名簿から削除された選手）'
    return p.guest_name ?? ''
  }

  function update(next: LineupRow[]) {
    setRows(next)
    setDirty(true)
    setMessage(null)
  }

  function setStarter(slot: number | null, person: Person | null) {
    const existing = rows.find((r) => r.batting_slot === slot && r.entry_type === '先発')
    if (!person) {
      if (existing) update(rows.filter((r) => r.id !== existing.id))
      return
    }
    if (existing) {
      update(rows.map((r) => (r.id === existing.id ? { ...r, ...toPerson(person) } : r)))
    } else {
      update([
        ...rows,
        {
          id: crypto.randomUUID(),
          ...toPerson(person),
          batting_slot: slot,
          position: slot === null ? '1' : null,
          entry_type: '先発',
          entered_at: null,
          created_at: nextCreatedAt(rows),
        },
      ])
    }
  }

  function setStarterPosition(slot: number | null, position: LineupPosition | null) {
    update(rows.map((r) => (r.batting_slot === slot && r.entry_type === '先発' ? { ...r, position } : r)))
  }

  // 打順を入れ替える（その打順の交代の記録ごと）
  function swapSlots(a: number, b: number) {
    update(
      rows.map((r) => (r.batting_slot === a ? { ...r, batting_slot: b } : r.batting_slot === b ? { ...r, batting_slot: a } : r))
    )
  }

  function addSubstitution(slot: number | null, kind: SubstitutionKind, person: Person, position: LineupPosition | null, enteredAt: number) {
    update([
      ...rows,
      {
        id: crypto.randomUUID(),
        ...toPerson(person),
        batting_slot: slot,
        position,
        entry_type: entryTypeFor(kind),
        entered_at: enteredAt,
        created_at: nextCreatedAt(rows),
      },
    ])
  }

  function removeRow(id: string) {
    update(rows.filter((r) => r.id !== id))
  }

  async function save() {
    // 同じ人が2つの打順に同時にいるのは保存しない
    const playing = currentRows(rows, slots)
    const twice = playing.find((r, i) => playing.findIndex((o) => samePerson(o, r)) !== i)
    if (twice && people.kind === 'team') {
      setMessage({ kind: 'error', text: `「${nameOf(twice)}」が2つの打順に入っています。どちらかを直してください。` })
      return
    }
    setBusy(true)
    setMessage(null)
    const names = game.defense_mode === 'detailed' ? trimOpponent(opponentLineup) : game.opponent_lineup ?? []
    const error = await onSave(rows, names)
    setBusy(false)
    if (error) {
      setMessage({ kind: 'error', text: error })
      return
    }
    setDirty(false)
    setMessage({ kind: 'ok', text: '保存しました。' })
  }

  const sheetSlot = sheet?.slot ?? null

  return (
    <div className="space-y-5 pb-24">
      {showTip && (
        <div className="flex items-start gap-3 bg-[var(--green-bg)] border border-[var(--green)]/20 rounded-xl px-4 py-3">
          <p className="flex-1 text-xs text-[var(--ink-sub)] leading-relaxed">
            チーム登録すると名簿から選べて、毎回入力しなくて済みます。
          </p>
          <button
            type="button"
            onClick={() => {
              hideRosterTip()
              setShowTip(false)
            }}
            aria-label="案内を閉じる"
            className="shrink-0 text-[var(--ink-mute)] text-sm w-8 h-8 -m-1"
          >
            ×
          </button>
        </div>
      )}

      <section className={`${CARD} space-y-3`}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-base font-bold text-[var(--ink)]">打順</h2>
          <p className="text-xs text-[var(--ink-mute)]">
            {game.lineup_size}人{game.use_dh ? '・DHあり' : ''}
          </p>
        </div>

        {duplicates.length > 0 && (
          <p className="text-xs text-[#9A6B00] bg-[#FFF4D6] border border-[#F0DDA0] rounded-lg px-3 py-2">
            守備位置が重なっています（{duplicates.map(lineupPositionLabel).join('・')}）。このまま保存もできます。
          </p>
        )}

        <ol className="space-y-2">
          {slots.map((slot) => {
            const starter = rows.find((r) => r.batting_slot === slot && r.entry_type === '先発') ?? null
            const history = slotRows(rows, slot).filter((r) => r.entry_type !== '先発')
            const current = currentRow(rows, slot)
            const lastHistory = history[history.length - 1]
            const numbered = slot !== null
            return (
              <li key={slot ?? 'p'} className="border border-[var(--line)] rounded-xl p-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-10 shrink-0 text-center text-sm font-black text-[var(--ink)]">{slotLabel(slot)}</span>
                  <button
                    type="button"
                    onClick={() => setSheet({ mode: 'starter', slot })}
                    className={`flex-1 min-w-0 min-h-11 text-left rounded-lg border px-3 text-sm ${
                      starter ? 'border-[var(--line)] text-[var(--ink)] font-bold' : 'border-dashed border-[var(--green)]/50 text-[var(--green)]'
                    }`}
                  >
                    <span className="block truncate">{starter ? nameOf(starter) : '＋ 選手を選ぶ'}</span>
                  </button>
                  {slot === null ? (
                    <span className="w-16 shrink-0 text-center text-sm text-[var(--ink-sub)]">投</span>
                  ) : (
                    <select
                      value={starter?.position ?? ''}
                      onChange={(e) => setStarterPosition(slot, (e.target.value || null) as LineupPosition | null)}
                      disabled={!starter}
                      aria-label={`${slotLabel(slot)}の守備位置`}
                      className={`w-16 shrink-0 min-h-11 border rounded-lg px-1 text-sm bg-[var(--surface)] text-[var(--ink)] disabled:opacity-40 ${
                        starter?.position && duplicates.includes(starter.position) && current?.id === starter.id
                          ? 'border-[#E0B84A]'
                          : 'border-[var(--line)]'
                      }`}
                    >
                      <option value="">守備</option>
                      {LINEUP_POSITIONS.filter((p) => game.use_dh || p !== 'DH').map((p) => (
                        <option key={p} value={p}>
                          {lineupPositionLabel(p)}
                        </option>
                      ))}
                    </select>
                  )}
                  {numbered && (
                    <span className="flex flex-col shrink-0">
                      <button
                        type="button"
                        onClick={() => swapSlots(slot, slot - 1)}
                        disabled={slot === 1}
                        aria-label={`${slotLabel(slot)}を上へ`}
                        className="w-9 h-[22px] text-xs text-[var(--ink-sub)] disabled:opacity-20"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => swapSlots(slot, slot + 1)}
                        disabled={slot === slots.filter((s) => s !== null).length}
                        aria-label={`${slotLabel(slot)}を下へ`}
                        className="w-9 h-[22px] text-xs text-[var(--ink-sub)] disabled:opacity-20"
                      >
                        ▼
                      </button>
                    </span>
                  )}
                </div>

                {history.length > 0 && (
                  <ul className="mt-2 ml-12 space-y-1">
                    {history.map((h) => (
                      <li key={h.id} className="flex items-center gap-2 text-xs">
                        <span className="text-[var(--ink-mute)] shrink-0 tabular-nums">{h.entered_at}打席目〜</span>
                        <span className={`shrink-0 font-bold ${isTemporary(h) ? 'text-[var(--ink-mute)]' : 'text-[var(--ink-sub)]'}`}>
                          {entryLabel(h)}
                        </span>
                        <span className="flex-1 min-w-0 truncate text-[var(--ink)]">
                          {nameOf(h)}
                          {h.position && <span className="text-[var(--ink-mute)]">（{lineupPositionLabel(h.position)}）</span>}
                        </span>
                        {h.id === lastHistory?.id && (
                          <button
                            type="button"
                            onClick={() => removeRow(h.id)}
                            className="shrink-0 text-[#A32D2D] underline min-h-8 px-1"
                          >
                            取り消し
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {starter && (
                  <div className="mt-2 ml-12 flex items-center justify-between gap-2">
                    <span className="text-xs text-[var(--ink-mute)] truncate">
                      {history.some((h) => !isTemporary(h)) && current ? `今: ${nameOf(current)}（${lineupPositionLabel(current.position)}）` : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSheet({ mode: 'sub', slot })}
                      className="shrink-0 text-xs font-bold text-[var(--green)] border border-[var(--green)]/40 rounded-lg px-3 min-h-9"
                    >
                      交代
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      </section>

      {game.defense_mode === 'detailed' && (
        <section className={`${CARD} space-y-3`}>
          <div>
            <h2 className="text-base font-bold text-[var(--ink)]">相手の打順</h2>
            <p className="text-xs text-[var(--ink-mute)] mt-1">相手の打者も1打席ずつ記録するため、打順を用意します。名前は空欄のままでも大丈夫です。</p>
          </div>
          <ol className="space-y-2">
            {opponentLineup.map((name, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-10 shrink-0 text-center text-sm font-black text-[var(--ink)]">{i + 1}番</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    const next = [...opponentLineup]
                    next[i] = e.target.value.slice(0, 30)
                    setOpponentLineup(next)
                    setDirty(true)
                    setMessage(null)
                  }}
                  placeholder="名前（任意）"
                  maxLength={30}
                  aria-label={`相手の${i + 1}番の名前`}
                  className={INPUT_CLASS}
                />
              </li>
            ))}
          </ol>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (opponentLineup.length >= 30) return
                setOpponentLineup([...opponentLineup, ''])
                setDirty(true)
              }}
              disabled={opponentLineup.length >= 30}
              className="flex-1 min-h-11 border border-[var(--line)] rounded-xl text-sm text-[var(--ink)] disabled:opacity-40"
            >
              ＋ 打順を増やす
            </button>
            <button
              type="button"
              onClick={() => {
                if (opponentLineup.length <= 1) return
                setOpponentLineup(opponentLineup.slice(0, -1))
                setDirty(true)
              }}
              disabled={opponentLineup.length <= 1}
              className="flex-1 min-h-11 border border-[var(--line)] rounded-xl text-sm text-[var(--ink)] disabled:opacity-40"
            >
              − 減らす
            </button>
          </div>
        </section>
      )}

      <div className="bg-[var(--bg)] border border-dashed border-[var(--line)] rounded-2xl p-4 text-center">
        <p className="text-sm font-bold text-[var(--ink-sub)]">次は打席の入力（準備中）</p>
        <p className="text-xs text-[var(--ink-mute)] mt-1">打席の入力は、もうすぐ使えるようになります。</p>
      </div>

      <div className="fixed bottom-0 inset-x-0 z-40 bg-[var(--surface)]/95 backdrop-blur border-t border-[var(--line)] px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <p
            className={`flex-1 text-xs ${message?.kind === 'error' ? 'text-[#A3462B]' : message?.kind === 'ok' ? 'text-[var(--green)]' : 'text-[var(--ink-mute)]'}`}
            role="status"
          >
            {message?.text ?? (dirty ? '保存していない変更があります' : '保存済み')}
          </p>
          <button
            type="button"
            onClick={save}
            disabled={busy || !dirty}
            className="shrink-0 bg-[var(--green)] text-white font-bold px-6 min-h-11 rounded-xl text-sm disabled:opacity-40"
          >
            {busy ? '保存中...' : '保存する'}
          </button>
        </div>
      </div>

      {sheet && (
        <Sheet title={sheet.mode === 'starter' ? `${slotLabel(sheetSlot)}の先発` : `${slotLabel(sheetSlot)}の交代`} onClose={() => setSheet(null)}>
          {sheet.mode === 'starter' ? (
            <StarterPicker
              people={people}
              players={players}
              setPlayers={setPlayers}
              rows={rows}
              slots={slots}
              starter={rows.find((r) => r.batting_slot === sheetSlot && r.entry_type === '先発') ?? null}
              onPick={(person) => {
                setStarter(sheetSlot, person)
                setSheet(null)
              }}
            />
          ) : (
            <SubstitutionForm
              people={people}
              players={players}
              setPlayers={setPlayers}
              rows={rows}
              slots={slots}
              slot={sheetSlot}
              nextSeq={nextSeq}
              useDh={game.use_dh}
              nameOf={nameOf}
              onAdd={(kind, person, position, enteredAt) => {
                addSubstitution(sheetSlot, kind, person, position, enteredAt)
                setSheet(null)
              }}
            />
          )}
        </Sheet>
      )}
    </div>
  )
}

// 末尾の空欄は保存しない（9人分は画面で用意する）
function trimOpponent(list: string[]) {
  const trimmed = list.map((n) => n.trim())
  let end = trimmed.length
  while (end > 0 && !trimmed[end - 1]) end--
  return trimmed.slice(0, end)
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full sm:max-w-md max-h-[92dvh] overflow-y-auto bg-[var(--surface)] rounded-t-2xl sm:rounded-2xl border border-[var(--line)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-[var(--surface)] border-b border-[var(--line)] px-5 py-3 flex items-center justify-between">
          <p className="font-bold text-[var(--ink)]">{title}</p>
          <button type="button" onClick={onClose} className="text-sm text-[var(--ink-mute)] min-h-11 px-2">
            閉じる
          </button>
        </div>
        <div className="px-5 py-4 space-y-5">{children}</div>
      </div>
    </div>
  )
}

interface PickerProps {
  people: LineupPeople
  players: Player[]
  setPlayers: (p: Player[]) => void
  rows: LineupRow[]
  slots: (number | null)[]
}

// 先発の選手を選ぶ
function StarterPicker({ starter, onPick, ...picker }: PickerProps & { starter: LineupRow | null; onPick: (p: Person | null) => void }) {
  const hasSubs = starter ? picker.rows.some((r) => r.batting_slot === starter.batting_slot && r.entry_type !== '先発') : false
  // 先発で使っている人は選べない（自分の打順は除く）
  const used = picker.rows.filter((r) => r.entry_type === '先発' && r.id !== starter?.id)
  return (
    <>
      <PersonPicker {...picker} initial={starter} exclude={used} onPick={onPick} submitLabel="この選手にする" />
      {starter && (
        <div className="pt-4 border-t border-[var(--line)]">
          {hasSubs ? (
            <p className="text-xs text-[var(--ink-mute)]">この打順には交代の記録があるため、空けられません。先に交代を取り消してください。</p>
          ) : (
            <button type="button" onClick={() => onPick(null)} className="w-full min-h-11 text-sm font-bold text-[#A32D2D]">
              この打順を空ける
            </button>
          )}
        </div>
      )}
    </>
  )
}

// 交代を記録する
function SubstitutionForm({
  slot,
  nextSeq,
  useDh,
  nameOf,
  onAdd,
  ...picker
}: PickerProps & {
  slot: number | null
  nextSeq: number
  useDh: boolean
  nameOf: (p: Pick<LineupRow, 'player_id' | 'guest_name'>) => string
  onAdd: (kind: SubstitutionKind, person: Person, position: LineupPosition | null, enteredAt: number) => void
}) {
  const current = currentRow(picker.rows, slot)
  // 投手の交代は、DH 時の投手の枠か、今の守備位置が投手の打順だけ
  const kinds = SUBSTITUTION_KINDS.filter((k) => {
    if (slot === null) return k.value === '投手交代'
    if (k.value === '投手交代') return current?.position === '1'
    return true
  })
  const [kind, setKind] = useState<SubstitutionKind>(kinds[0].value)
  const [enteredAt, setEnteredAt] = useState(Math.max(1, nextSeq))
  const [position, setPosition] = useState<LineupPosition | null>(current?.position ?? null)

  const needsPosition = kind === '守備交代' || kind === '再出場'
  const fixedPosition: LineupPosition | null = kind === '投手交代' ? '1' : null
  const candidates = reentryCandidates(picker.rows, picker.slots)
  // 一度出て交代した人は、再出場のほかは出られない。臨時代走・臨時代打は誰でも
  const appeared = picker.rows.filter((r) => !isTemporary(r))
  const exclude = kind === '臨時代走' || kind === '臨時代打' ? [] : appeared

  function submit(person: Person) {
    onAdd(kind, person, fixedPosition ?? (needsPosition ? position : null), enteredAt)
  }

  return (
    <>
      <div>
        <p className="text-sm font-semibold text-[var(--ink)] mb-1.5">交代の種類</p>
        <div className="grid grid-cols-2 gap-2">
          {kinds.map((k) => (
            <button key={k.value} type="button" aria-pressed={kind === k.value} onClick={() => setKind(k.value)} className={choiceClass(kind === k.value)}>
              {k.value}
            </button>
          ))}
        </div>
        <p className="text-xs text-[var(--ink-mute)] mt-1.5">{kinds.find((k) => k.value === kind)?.description}</p>
      </div>

      <div>
        <p className="text-sm font-semibold text-[var(--ink)] mb-1.5">何打席目から</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEnteredAt(Math.max(1, enteredAt - 1))}
            disabled={enteredAt <= 1}
            aria-label="打席を戻す"
            className="w-11 h-11 rounded-xl border border-[var(--line)] text-lg font-bold disabled:opacity-30"
          >
            −
          </button>
          <span className="min-w-[5rem] text-center text-base font-black text-[var(--ink)] tabular-nums">{enteredAt}打席目</span>
          <button
            type="button"
            onClick={() => setEnteredAt(enteredAt + 1)}
            aria-label="打席を進める"
            className="w-11 h-11 rounded-xl border border-[var(--line)] text-lg font-bold"
          >
            ＋
          </button>
        </div>
        <p className="text-xs text-[var(--ink-mute)] mt-1">試合の打席（自チーム・相手の両方）の通し番号です。打席の入力を始めると、自動で次の打席になります。</p>
      </div>

      {needsPosition && (
        <div>
          <p className="text-sm font-semibold text-[var(--ink)] mb-1.5">守備位置</p>
          <div className="grid grid-cols-5 gap-2">
            {LINEUP_POSITIONS.filter((p) => useDh || p !== 'DH').map((p) => (
              <button key={p} type="button" aria-pressed={position === p} onClick={() => setPosition(p)} className={choiceClass(position === p)}>
                {lineupPositionLabel(p)}
              </button>
            ))}
          </div>
        </div>
      )}

      {kind === '守備交代' && current && (
        <button
          type="button"
          onClick={() => submit(current)}
          disabled={!position}
          className="w-full min-h-11 border border-[var(--green)]/40 text-[var(--green)] font-bold rounded-xl text-sm disabled:opacity-40"
        >
          {nameOf(current)}のまま守備位置だけ変える
        </button>
      )}

      {kind === '再出場' ? (
        <div>
          <p className="text-sm font-semibold text-[var(--ink)] mb-1.5">再出場する選手</p>
          {candidates.length === 0 ? (
            <p className="text-xs text-[var(--ink-mute)]">再出場できるのは、先発で出ていて今は交代している選手です。いまはいません。</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {candidates.map((c) => (
                <button key={c.id} type="button" onClick={() => submit(c)} disabled={!position} className={choiceClass(false, !position)}>
                  {nameOf(c)}
                </button>
              ))}
            </div>
          )}
          {!position && candidates.length > 0 && <p className="text-xs text-[var(--ink-mute)] mt-1">先に守備位置を選んでください。</p>}
        </div>
      ) : (
        <PersonPicker
          {...picker}
          initial={null}
          exclude={exclude}
          onPick={(p) => p && submit(p)}
          submitLabel="交代を記録する"
          disabled={needsPosition && !position}
        />
      )}
    </>
  )
}

// 人を選ぶ: チームは名簿の在籍選手（背番号順）、ゲストは名前の入力
function PersonPicker({
  people,
  players,
  setPlayers,
  rows,
  initial,
  exclude,
  onPick,
  submitLabel,
  disabled,
}: PickerProps & {
  initial: Person | null
  exclude: Pick<LineupRow, 'player_id' | 'guest_name'>[]
  onPick: (p: Person | null) => void
  submitLabel: string
  disabled?: boolean
}) {
  if (people.kind === 'team') {
    return (
      <RosterPicker
        players={players}
        setPlayers={setPlayers}
        addHelper={people.addHelper}
        selectedId={initial?.player_id ?? null}
        excludeIds={new Set(exclude.map((e) => e.player_id).filter((id): id is string => !!id))}
        onPick={(id) => onPick({ player_id: id, guest_name: null, guest_bats: null, guest_throws: null })}
        disabled={disabled}
      />
    )
  }
  return <GuestNameInput initial={initial} usedNames={rows.map((r) => r.guest_name ?? '')} onPick={onPick} submitLabel={submitLabel} disabled={disabled} />
}

function RosterPicker({
  players,
  setPlayers,
  addHelper,
  selectedId,
  excludeIds,
  onPick,
  disabled,
}: {
  players: Player[]
  setPlayers: (p: Player[]) => void
  addHelper: (name: string) => Promise<Player | null>
  selectedId: string | null
  excludeIds: Set<string>
  onPick: (id: string) => void
  disabled?: boolean
}) {
  const [helperName, setHelperName] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const active = players.filter((p) => p.active).sort(comparePlayers)

  async function add() {
    const name = helperName.trim()
    if (!name) {
      setError('名前を入力してください')
      return
    }
    setAdding(true)
    setError(null)
    const player = await addHelper(name)
    setAdding(false)
    if (!player) {
      setError('追加できませんでした。もう一度お試しください。')
      return
    }
    setPlayers([...players, player])
    setHelperName('')
    if (!disabled) onPick(player.id)
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-[var(--ink)] mb-1.5">名簿から選ぶ</p>
        {active.length === 0 ? (
          <p className="text-xs text-[var(--ink-mute)]">名簿に在籍中の選手がいません。下の欄から追加するか、選手名簿で登録してください。</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {active.map((p) => {
              const taken = excludeIds.has(p.id) && p.id !== selectedId
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onPick(p.id)}
                  disabled={taken || disabled}
                  aria-pressed={p.id === selectedId}
                  className={`${choiceClass(p.id === selectedId, taken || disabled)} flex items-center gap-2 text-left`}
                >
                  <span className="w-7 shrink-0 text-center text-xs font-black">{p.number ?? '–'}</span>
                  <span className="truncate">{p.display_name}</span>
                  {p.is_helper && <span className="shrink-0 text-[10px]">助</span>}
                </button>
              )
            })}
          </div>
        )}
        {disabled && <p className="text-xs text-[var(--ink-mute)] mt-1">先に守備位置を選んでください。</p>}
      </div>

      <div className="pt-4 border-t border-[var(--line)]">
        <label htmlFor="helper-name" className="block text-sm font-semibold text-[var(--ink)] mb-1.5">
          名簿にいない人を助っ人として追加
        </label>
        <div className="flex gap-2">
          <input
            id="helper-name"
            type="text"
            value={helperName}
            onChange={(e) => setHelperName(e.target.value)}
            maxLength={30}
            placeholder="表示名"
            autoComplete="off"
            className={INPUT_CLASS}
          />
          <button
            type="button"
            onClick={add}
            disabled={adding}
            className="shrink-0 bg-[var(--green)] text-white font-bold px-4 min-h-11 rounded-xl text-sm disabled:opacity-50"
          >
            {adding ? '追加中' : '追加'}
          </button>
        </div>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        <p className="text-xs text-[var(--ink-mute)] mt-1">名簿に「助っ人」として登録されます。成績公開時に出るのはこの名前です。</p>
      </div>
    </div>
  )
}

function GuestNameInput({
  initial,
  usedNames,
  onPick,
  submitLabel,
  disabled,
}: {
  initial: Person | null
  usedNames: string[]
  onPick: (p: Person | null) => void
  submitLabel: string
  disabled?: boolean
}) {
  const [name, setName] = useState(initial?.guest_name ?? '')
  const [bats, setBats] = useState<Bats | null>(initial?.guest_bats ?? null)
  const [throws, setThrows] = useState<Throws | null>(initial?.guest_throws ?? null)
  const [error, setError] = useState<string | null>(null)
  const [recent, setRecent] = useState<string[]>([])

  useEffect(() => {
    setRecent(readRecentNames())
  }, [])

  const query = name.trim()
  // この試合でまだ使っていない名前を、入力に合うものから出す
  const suggestions = recent
    .filter((n) => !usedNames.includes(n) && n !== query && (!query || n.includes(query)))
    .slice(0, 8)

  function submit() {
    if (!query) {
      setError('名前を入力してください')
      return
    }
    onPick({ player_id: null, guest_name: query, guest_bats: bats, guest_throws: throws })
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="guest-player-name" className="block text-sm font-semibold text-[var(--ink)] mb-1.5">
          名前
        </label>
        <input
          id="guest-player-name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError(null)
          }}
          maxLength={30}
          autoComplete="off"
          className={INPUT_CLASS}
        />
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        {suggestions.length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-[var(--ink-mute)] mb-1">前に使った名前</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setName(n)}
                  className="text-[13px] px-3 min-h-9 rounded-full border border-[var(--line)] text-[var(--ink-sub)]"
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold text-[var(--ink)] mb-1">投げ（任意）</p>
          <div className="grid grid-cols-2 gap-1.5">
            {THROWS_OPTIONS.map((o) => (
              <button key={o.value} type="button" aria-pressed={throws === o.value} onClick={() => setThrows(throws === o.value ? null : o.value)} className={choiceClass(throws === o.value)}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-[var(--ink)] mb-1">打ち（任意）</p>
          <div className="grid grid-cols-3 gap-1.5">
            {BATS_OPTIONS.map((o) => (
              <button key={o.value} type="button" aria-pressed={bats === o.value} onClick={() => setBats(bats === o.value ? null : o.value)} className={choiceClass(bats === o.value)}>
                {o.label.slice(0, 1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={disabled}
        className="w-full bg-[var(--green)] text-white font-bold min-h-11 rounded-xl text-sm disabled:opacity-40"
      >
        {submitLabel}
      </button>
      {disabled && <p className="text-xs text-[var(--ink-mute)] -mt-3">先に守備位置を選んでください。</p>}
    </div>
  )
}
