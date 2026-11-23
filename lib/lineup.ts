// 打順と交代（game_lineups の行）の扱い。ゲスト・チーム共通。
// 行の並び: 同じ打順の中では entered_at（先発は null = 0）→ created_at の順に出場した。
import { positionLabel } from './players'
import type { Bats, FieldPosition, Throws } from './types'

export type LineupPosition = FieldPosition | 'DH'
export type EntryType = '先発' | '代打' | '代走' | '守備' | '再出場' | '臨時代走' | '臨時代打'

export interface LineupRow {
  id: string
  player_id: string | null
  guest_name: string | null
  guest_bats: Bats | null
  guest_throws: Throws | null
  // DH のときの投手は打順の外（null）
  batting_slot: number | null
  position: LineupPosition | null
  entry_type: EntryType
  // 何打席目（plate_appearances.seq）から出場したか。先発は null
  entered_at: number | null
  created_at: string
}

export const LINEUP_POSITIONS: LineupPosition[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'DH']

export function lineupPositionLabel(p: LineupPosition | null) {
  if (!p) return '—'
  return p === 'DH' ? 'DH' : positionLabel(p)
}

// 交代の種類（画面の表示）。投手交代は DB では「守備」で position = '1'
export type SubstitutionKind = '代打' | '代走' | '守備交代' | '投手交代' | '再出場' | '臨時代走' | '臨時代打'

export const SUBSTITUTION_KINDS: { value: SubstitutionKind; description: string }[] = [
  { value: '代打', description: 'この打順に代わりの打者が入る' },
  { value: '代走', description: 'この打順の走者に代わりの走者が入る' },
  { value: '守備交代', description: '守備につく選手・守備位置を変える' },
  { value: '投手交代', description: '投手を代える' },
  { value: '再出場', description: '先発で出ていた選手がもう一度出る' },
  { value: '臨時代走', description: 'その場だけの代走（交代にはならない）' },
  { value: '臨時代打', description: 'その場だけの代打（交代にはならない）' },
]

export function entryTypeFor(kind: SubstitutionKind): EntryType {
  if (kind === '守備交代' || kind === '投手交代') return '守備'
  return kind
}

export function isTemporary(row: Pick<LineupRow, 'entry_type'>) {
  return row.entry_type === '臨時代走' || row.entry_type === '臨時代打'
}

// 表示用の交代の名前
export function entryLabel(row: Pick<LineupRow, 'entry_type' | 'position'>) {
  if (row.entry_type === '守備') return row.position === '1' ? '投手交代' : '守備交代'
  return row.entry_type
}

function order(a: LineupRow, b: LineupRow) {
  return (a.entered_at ?? 0) - (b.entered_at ?? 0) || a.created_at.localeCompare(b.created_at)
}

// 打順（null は DH 時の投手）の行を出場順に
export function slotRows(rows: LineupRow[], slot: number | null) {
  return rows.filter((r) => r.batting_slot === slot).sort(order)
}

// 今その打順にいる行（臨時代走・臨時代打は交代扱いにしないので除く）
export function currentRow(rows: LineupRow[], slot: number | null) {
  const list = slotRows(rows, slot).filter((r) => !isTemporary(r))
  return list[list.length - 1] ?? null
}

// 同じ人かどうか（チームは選手ID、ゲストは名前）
export function samePerson(a: Pick<LineupRow, 'player_id' | 'guest_name'>, b: Pick<LineupRow, 'player_id' | 'guest_name'>) {
  if (a.player_id || b.player_id) return a.player_id === b.player_id
  return !!a.guest_name && a.guest_name === b.guest_name
}

// 打順の番号（1..人数）と、DH のときの投手（null）
export function lineupSlots(lineupSize: number, useDh: boolean): (number | null)[] {
  const slots: (number | null)[] = Array.from({ length: lineupSize }, (_, i) => i + 1)
  return useDh ? [...slots, null] : slots
}

// 今出ている人（各打順の最新の行）
export function currentRows(rows: LineupRow[], slots: (number | null)[]) {
  return slots.map((s) => currentRow(rows, s)).filter((r): r is LineupRow => r !== null)
}

// 守備位置の重複（今出ている人で数える）
export function duplicatePositions(rows: LineupRow[], slots: (number | null)[]) {
  const count = new Map<LineupPosition, number>()
  for (const r of currentRows(rows, slots)) {
    if (r.position) count.set(r.position, (count.get(r.position) ?? 0) + 1)
  }
  return [...count].filter(([, n]) => n > 1).map(([p]) => p)
}

// 再出場できる人: 先発で出ていて、今はどの打順にもいない人
export function reentryCandidates(rows: LineupRow[], slots: (number | null)[]) {
  const playing = currentRows(rows, slots)
  const seen: LineupRow[] = []
  for (const r of rows.filter((r) => r.entry_type === '先発')) {
    if (playing.some((p) => samePerson(p, r))) continue
    if (seen.some((s) => samePerson(s, r))) continue
    seen.push(r)
  }
  return seen
}

// 新しい行の created_at。同じ打席から出た交代の順番を保つため、既存の行より必ず後にする
export function nextCreatedAt(rows: LineupRow[]) {
  const last = rows.reduce((max, r) => (r.created_at > max ? r.created_at : max), '')
  const now = new Date().toISOString()
  if (now > last) return now
  return new Date(new Date(last).getTime() + 1).toISOString()
}

// DB から読んだ行を、画面で使う形にそろえる
export function toLineupRow(r: Record<string, unknown>): LineupRow {
  return {
    id: String(r.id),
    player_id: (r.player_id as string | null) ?? null,
    guest_name: (r.guest_name as string | null) ?? null,
    guest_bats: (r.guest_bats as Bats | null) ?? null,
    guest_throws: (r.guest_throws as Throws | null) ?? null,
    batting_slot: (r.batting_slot as number | null) ?? null,
    position: (r.position as LineupPosition | null) ?? null,
    entry_type: r.entry_type as EntryType,
    entered_at: (r.entered_at as number | null) ?? null,
    created_at: String(r.created_at),
  }
}

// ゲスト: この端末で前に使った名前（新しい順、最大50件）
const NAMES_KEY = 'guest_player_names'
const ROSTER_TIP_KEY = 'hide_roster_tip'

export function readRecentNames(): string[] {
  try {
    const list = JSON.parse(window.localStorage.getItem(NAMES_KEY) ?? '[]')
    return Array.isArray(list) ? list.filter((n): n is string => typeof n === 'string' && n.length > 0).slice(0, 50) : []
  } catch {
    return []
  }
}

export function rememberNames(names: string[]) {
  try {
    const merged = [...new Set([...names.map((n) => n.trim()).filter(Boolean), ...readRecentNames()])].slice(0, 50)
    window.localStorage.setItem(NAMES_KEY, JSON.stringify(merged))
  } catch {
    // 保存できなくても入力には困らない
  }
}

export function isRosterTipHidden() {
  try {
    return window.localStorage.getItem(ROSTER_TIP_KEY) === '1'
  } catch {
    return false
  }
}

export function hideRosterTip() {
  try {
    window.localStorage.setItem(ROSTER_TIP_KEY, '1')
  } catch {
    // 閉じた状態はこの画面の間だけ保つ
  }
}

// 打席・走者の記録から参照されている出場の行は消せない（消すと送信が失敗し続けるため、保存前に止める）
export function referencedLineupError(
  records: {
    lineups: Pick<LineupRow, 'id'>[]
    pas: { batter_lineup_id: string | null; pitcher_lineup_id: string | null }[]
    events: { runner_lineup_id: string | null }[]
  },
  nextRows: Pick<LineupRow, 'id'>[]
): string | null {
  const kept = new Set(nextRows.map((r) => r.id))
  const used = new Set<string>()
  for (const p of records.pas) {
    if (p.batter_lineup_id) used.add(p.batter_lineup_id)
    if (p.pitcher_lineup_id) used.add(p.pitcher_lineup_id)
  }
  for (const e of records.events) if (e.runner_lineup_id) used.add(e.runner_lineup_id)
  const removedUsed = records.lineups.some((r) => !kept.has(r.id) && used.has(r.id))
  return removedUsed ? '打席の記録がある出場は取り消せません。先に打席の入力画面で、その打席を取り消してください。' : null
}
