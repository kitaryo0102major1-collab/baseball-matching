import type { Bats, FieldPosition, Player, Throws } from './types'

// 守備位置（スコアブックの番号）と短い表記
export const FIELD_POSITIONS: { value: FieldPosition; label: string }[] = [
  { value: '1', label: '投' },
  { value: '2', label: '捕' },
  { value: '3', label: '一' },
  { value: '4', label: '二' },
  { value: '5', label: '三' },
  { value: '6', label: '遊' },
  { value: '7', label: '左' },
  { value: '8', label: '中' },
  { value: '9', label: '右' },
]

export const THROWS_OPTIONS: { value: Throws; label: string }[] = [
  { value: 'R', label: '右投' },
  { value: 'L', label: '左投' },
]

export const BATS_OPTIONS: { value: Bats; label: string }[] = [
  { value: 'R', label: '右打' },
  { value: 'L', label: '左打' },
  { value: 'S', label: '両打' },
]

export function positionLabel(value: FieldPosition) {
  return FIELD_POSITIONS.find((p) => p.value === value)?.label ?? value
}

// 「右投左打」のような表記。どちらも未設定なら空
export function handednessLabel(player: Pick<Player, 'throws' | 'bats'>) {
  const t = THROWS_OPTIONS.find((o) => o.value === player.throws)?.label ?? ''
  const b = BATS_OPTIONS.find((o) => o.value === player.bats)?.label ?? ''
  return t + b
}

// 背番号は '0' と '00' を区別するため、数値→文字数→文字列の順で比べる。背番号なしは最後
export function comparePlayers(a: Player, b: Player) {
  if (a.number !== b.number) {
    if (a.number === null) return 1
    if (b.number === null) return -1
    const diff = Number(a.number) - Number(b.number) || a.number.length - b.number.length
    if (diff) return diff
  }
  return a.display_name.localeCompare(b.display_name, 'ja')
}

export const PLAYER_NUMBER_PATTERN = /^[0-9]{1,3}$/
