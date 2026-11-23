'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  BATS_OPTIONS,
  FIELD_POSITIONS,
  PLAYER_NUMBER_PATTERN,
  THROWS_OPTIONS,
  comparePlayers,
  handednessLabel,
  positionLabel,
} from '@/lib/players'
import type { Bats, FieldPosition, Player, PlayerInput, Throws } from '@/lib/types'
import ConfirmDialog from './ConfirmDialog'

export type RosterPlayer = Player & { hasRecords: boolean }

type Filter = 'active' | 'helper' | 'retired'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'active', label: '在籍' },
  { value: 'helper', label: '助っ人' },
  { value: 'retired', label: '退団' },
]

// 在籍＝在籍中のメンバー、助っ人＝在籍中の助っ人、退団＝退団した選手（助っ人を含む）
function filterOf(p: Pick<Player, 'active' | 'is_helper'>): Filter {
  if (!p.active) return 'retired'
  return p.is_helper ? 'helper' : 'active'
}

const INPUT_CLASS =
  'w-full border rounded-lg px-3 py-2.5 text-sm bg-[var(--surface)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--green)]/40 transition'

function choiceClass(active: boolean) {
  return `min-h-11 rounded-xl border text-sm transition-colors ${
    active
      ? 'bg-[var(--green)] text-[var(--bg)] font-bold border-[var(--green)]'
      : 'bg-[var(--surface)] text-[var(--ink-sub)] border-[var(--line)]'
  }`
}

function chipClass(active: boolean) {
  return `text-[13px] px-3 py-1.5 rounded-full border transition-colors ${
    active
      ? 'bg-[var(--green)] text-[var(--bg)] font-bold border-[var(--green)]'
      : 'bg-[var(--surface)] text-[var(--ink-sub)] border-[var(--line)]'
  }`
}

const SAVE_ERROR = '保存できませんでした。通信状態を確認して、もう一度お試しください。'

interface Props {
  teamId: string
  initialPlayers: RosterPlayer[]
}

export default function PlayersManager({ teamId, initialPlayers }: Props) {
  const [players, setPlayers] = useState<RosterPlayer[]>(initialPlayers)
  const [filter, setFilter] = useState<Filter>('active')
  // null: 閉じている、'new': 追加、それ以外: 編集中の選手
  const [editing, setEditing] = useState<RosterPlayer | 'new' | null>(null)

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { active: 0, helper: 0, retired: 0 }
    for (const p of players) c[filterOf(p)]++
    return c
  }, [players])

  const shown = useMemo(
    () => players.filter((p) => filterOf(p) === filter).sort(comparePlayers),
    [players, filter]
  )

  // followFilter: 保存した選手が見える絞り込みに切り替える（退団・在籍に戻すでは今の一覧のままにする）
  function handleSaved(player: RosterPlayer, followFilter = true) {
    setPlayers((list) => (list.some((p) => p.id === player.id) ? list.map((p) => (p.id === player.id ? player : p)) : [...list, player]))
    if (followFilter) setFilter(filterOf(player))
    setEditing(null)
  }

  function handleDeleted(id: string) {
    setPlayers((list) => list.filter((p) => p.id !== id))
    setEditing(null)
  }

  return (
    <>
      <section className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2" role="group" aria-label="絞り込み">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                aria-pressed={filter === f.value}
                className={chipClass(filter === f.value)}
              >
                {f.label} {counts[f.value]}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setEditing('new')}
          className="w-full bg-[var(--green)] text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 transition-opacity"
        >
          ＋ 選手を追加
        </button>

        {shown.length === 0 ? (
          <p className="text-sm text-[var(--ink-mute)] text-center py-6 leading-relaxed">
            {players.length === 0
              ? 'まだ選手がいません。「選手を追加」から登録してください。'
              : filter === 'retired'
                ? '退団した選手はいません。'
                : filter === 'helper'
                  ? '助っ人はいません。'
                  : '在籍中の選手はいません。'}
          </p>
        ) : (
          <ul className="divide-y divide-[var(--line)] -mx-1">
            {shown.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setEditing(p)}
                  className="w-full flex items-center gap-3 px-1 py-3 text-left hover:bg-[var(--bg)] rounded-lg transition-colors"
                >
                  <span className="w-11 h-11 shrink-0 rounded-full border border-[var(--line)] flex items-center justify-center text-sm font-black text-[var(--ink)]">
                    {p.number ?? '–'}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-[var(--ink)] truncate">{p.display_name}</span>
                      {p.is_helper && (
                        <span className="shrink-0 text-[11px] font-bold text-[#9A6B00] bg-[#FFF4D6] border border-[#F0DDA0] rounded-full px-2 py-0.5">
                          助っ人
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-[var(--ink-mute)] truncate mt-0.5">
                      {[
                        p.real_name && p.real_name !== p.display_name ? `本名 ${p.real_name}` : '',
                        handednessLabel(p),
                        p.positions.map(positionLabel).join('・'),
                      ]
                        .filter(Boolean)
                        .join(' ／ ') || '投打・守備位置は未設定'}
                    </span>
                  </span>
                  <span className="text-[var(--ink-mute)] shrink-0" aria-hidden>
                    ›
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-[var(--ink-mute)] leading-relaxed">
          本名は管理者だけが見られます。成績を公開したときに表示されるのは表示名です。
        </p>
      </section>

      {editing && (
        <PlayerSheet
          key={editing === 'new' ? 'new' : editing.id}
          teamId={teamId}
          player={editing === 'new' ? null : editing}
          players={players}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}

interface SheetProps {
  teamId: string
  player: RosterPlayer | null
  players: RosterPlayer[]
  onSaved: (player: RosterPlayer, followFilter?: boolean) => void
  onDeleted: (id: string) => void
  onClose: () => void
}

function PlayerSheet({ teamId, player, players, onSaved, onDeleted, onClose }: SheetProps) {
  const isNew = player === null
  const [realName, setRealName] = useState(player?.real_name ?? '')
  const [displayName, setDisplayName] = useState(player?.display_name ?? '')
  const [number, setNumber] = useState(player?.number ?? '')
  const [throws, setThrows] = useState<Throws | null>(player?.throws ?? null)
  const [bats, setBats] = useState<Bats | null>(player?.bats ?? null)
  const [positions, setPositions] = useState<FieldPosition[]>(player?.positions ?? [])
  const [isHelper, setIsHelper] = useState(player?.is_helper ?? false)

  const [errors, setErrors] = useState<{ displayName?: string; number?: string }>({})
  // 表示名が本名と同じときに、公開されることを確認してから保存する
  const [confirmSameName, setConfirmSameName] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const trimmedNumber = number.trim()
  const duplicateNumber =
    trimmedNumber !== '' &&
    players.some((p) => p.id !== player?.id && p.active && p.number === trimmedNumber)

  function togglePosition(value: FieldPosition) {
    setPositions((list) =>
      list.includes(value) ? list.filter((v) => v !== value) : [...list, value].sort()
    )
  }

  // 表示名が空なら本名を初期値にする
  function fillDisplayName() {
    if (!displayName.trim() && realName.trim()) setDisplayName(realName.trim())
  }

  async function write(input: PlayerInput) {
    setBusy(true)
    setSaveError(null)
    const supabase = createClient()
    const { data, error } = isNew
      ? await supabase.from('players').insert({ ...input, team_id: teamId }).select('*').single()
      : await supabase.from('players').update(input).eq('id', player.id).select('*').single()
    setBusy(false)
    if (error || !data) {
      setSaveError(SAVE_ERROR)
      return
    }
    onSaved({ ...(data as Player), hasRecords: player?.hasRecords ?? false })
  }

  function buildInput(): PlayerInput {
    return {
      real_name: realName.trim() || null,
      display_name: displayName.trim(),
      number: trimmedNumber || null,
      throws,
      bats,
      positions,
      is_helper: isHelper,
      active: player?.active ?? true,
    }
  }

  function save(skipNameCheck = false) {
    const real = realName.trim()
    let display = displayName.trim()
    if (!display && real) {
      display = real
      setDisplayName(real)
    }

    const next: typeof errors = {}
    if (!display) next.displayName = '表示名を入力してください'
    else if (display.length > 30) next.displayName = '表示名は30文字以内にしてください'
    if (trimmedNumber && !PLAYER_NUMBER_PATTERN.test(trimmedNumber)) next.number = '背番号は0〜999の数字で入力してください'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    if (!skipNameCheck && real && display === real) {
      setConfirmSameName(true)
      return
    }
    setConfirmSameName(false)
    write({ ...buildInput(), display_name: display })
  }

  async function setActive(active: boolean) {
    if (!player) return
    setBusy(true)
    setSaveError(null)
    const { data, error } = await createClient().from('players').update({ active }).eq('id', player.id).select('*').single()
    setBusy(false)
    if (error || !data) {
      setSaveError(SAVE_ERROR)
      return
    }
    onSaved({ ...(data as Player), hasRecords: player.hasRecords }, false)
  }

  async function remove() {
    if (!player) return
    setBusy(true)
    setDeleteError(null)
    const { data, error } = await createClient().from('players').delete().eq('id', player.id).select('id')
    setBusy(false)
    if (error || !data?.length) {
      setDeleteError(
        error?.code === '23503'
          ? '試合に出た記録があるため削除できません。「退団にする」を使ってください。'
          : '削除できませんでした。もう一度お試しください。'
      )
      return
    }
    setDeleteOpen(false)
    onDeleted(player.id)
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
        <div className="absolute inset-0 bg-black/40" />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={isNew ? '選手を追加' : '選手を編集'}
          className="relative w-full sm:max-w-md max-h-[92dvh] overflow-y-auto bg-[var(--surface)] rounded-t-2xl sm:rounded-2xl border border-[var(--line)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 z-10 bg-[var(--surface)] border-b border-[var(--line)] px-5 py-3 flex items-center justify-between">
            <p className="font-bold text-[var(--ink)]">{isNew ? '選手を追加' : '選手を編集'}</p>
            <button type="button" onClick={onClose} className="text-sm text-[var(--ink-mute)] min-h-11 px-2">
              閉じる
            </button>
          </div>

          <form
            className="px-5 py-4 space-y-5"
            onSubmit={(e) => {
              e.preventDefault()
              save()
            }}
          >
            <div>
              <label htmlFor="player-real-name" className="block text-sm font-semibold text-[var(--ink)] mb-1">
                本名（管理用・任意）
              </label>
              <input
                id="player-real-name"
                type="text"
                value={realName}
                onChange={(e) => setRealName(e.target.value)}
                onBlur={fillDisplayName}
                maxLength={50}
                autoComplete="off"
                className={`${INPUT_CLASS} border-[var(--line)]`}
              />
              <p className="text-xs text-[var(--ink-mute)] mt-1">管理者だけが見られます。公開ページには出ません。</p>
            </div>

            <div>
              <label htmlFor="player-display-name" className="block text-sm font-semibold text-[var(--ink)] mb-1">
                表示名<span className="text-red-500 ml-1">*</span>
              </label>
              <input
                id="player-display-name"
                type="text"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value)
                  setConfirmSameName(false)
                }}
                maxLength={30}
                autoComplete="off"
                placeholder="例: ヤマダ、山田（兄）"
                className={`${INPUT_CLASS} ${errors.displayName ? 'border-red-400' : 'border-[var(--line)]'}`}
              />
              {errors.displayName ? (
                <p className="text-xs text-red-500 mt-1">{errors.displayName}</p>
              ) : (
                <p className="text-xs text-[var(--ink-mute)] mt-1">打順やスコアに出る名前です。成績を公開するとこの名前が公開されます。</p>
              )}
            </div>

            <div>
              <label htmlFor="player-number" className="block text-sm font-semibold text-[var(--ink)] mb-1">
                背番号（任意）
              </label>
              <input
                id="player-number"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={number}
                onChange={(e) => setNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
                maxLength={3}
                autoComplete="off"
                className={`${INPUT_CLASS} w-28 ${errors.number ? 'border-red-400' : 'border-[var(--line)]'}`}
              />
              {errors.number && <p className="text-xs text-red-500 mt-1">{errors.number}</p>}
              {!errors.number && duplicateNumber && (
                <p className="text-xs text-[#9A6B00] mt-1">同じ背番号の在籍選手がいます（このまま保存できます）</p>
              )}
            </div>

            <div>
              <p className="text-sm font-semibold text-[var(--ink)] mb-1.5">投げ（任意）</p>
              <div className="grid grid-cols-2 gap-2">
                {THROWS_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={throws === o.value}
                    onClick={() => setThrows(throws === o.value ? null : o.value)}
                    className={choiceClass(throws === o.value)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-[var(--ink)] mb-1.5">打ち（任意）</p>
              <div className="grid grid-cols-3 gap-2">
                {BATS_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={bats === o.value}
                    onClick={() => setBats(bats === o.value ? null : o.value)}
                    className={choiceClass(bats === o.value)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-[var(--ink)] mb-1.5">守備位置（複数選べます・任意）</p>
              <div className="grid grid-cols-5 gap-2">
                {FIELD_POSITIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={positions.includes(o.value)}
                    aria-label={`${o.value} ${o.label}`}
                    onClick={() => togglePosition(o.value)}
                    className={choiceClass(positions.includes(o.value))}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-start gap-3 min-h-11 cursor-pointer">
              <input
                type="checkbox"
                checked={isHelper}
                onChange={(e) => setIsHelper(e.target.checked)}
                className="mt-0.5 w-5 h-5 accent-[var(--green)] shrink-0"
              />
              <span>
                <span className="block text-sm font-semibold text-[var(--ink)]">助っ人</span>
                <span className="block text-xs text-[var(--ink-mute)] mt-0.5">成績は記録し、チーム内のランキングからは外します。</span>
              </span>
            </label>

            {confirmSameName && (
              <div className="bg-[#FFF4D6] border border-[#F0DDA0] rounded-xl p-4 space-y-3">
                <p className="text-sm text-[#7A5500] leading-relaxed">
                  表示名が本名と同じです。成績を公開すると、この名前がチーム外の人にも表示されます。このまま保存しますか？
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmSameName(false)
                      document.getElementById('player-display-name')?.focus()
                    }}
                    className="border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] font-semibold min-h-11 rounded-xl text-sm"
                  >
                    表示名を変える
                  </button>
                  <button
                    type="button"
                    onClick={() => save(true)}
                    disabled={busy}
                    className="bg-[var(--green)] text-white font-bold min-h-11 rounded-xl text-sm disabled:opacity-50"
                  >
                    このまま保存
                  </button>
                </div>
              </div>
            )}

            {saveError && <p className="text-xs text-[#A3462B]">{saveError}</p>}

            {!confirmSameName && (
              <button
                type="submit"
                disabled={busy}
                className="w-full bg-[var(--green)] text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {busy ? '保存中...' : isNew ? '追加する' : '保存する'}
              </button>
            )}

            {player && (
              <div className="pt-4 border-t border-[var(--line)] space-y-3">
                {player.active ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setActive(false)}
                      disabled={busy}
                      className="w-full border border-[var(--line)] text-[var(--ink)] font-bold py-3 rounded-xl text-sm disabled:opacity-50"
                    >
                      退団にする
                    </button>
                    <p className="text-xs text-[var(--ink-mute)] leading-relaxed">
                      退団にすると、打順を組むときの候補から外れます。これまでの成績は残り、あとで在籍に戻せます。
                    </p>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActive(true)}
                    disabled={busy}
                    className="w-full border border-[var(--green)]/40 text-[var(--green)] font-bold py-3 rounded-xl text-sm disabled:opacity-50"
                  >
                    在籍に戻す
                  </button>
                )}

                {player.hasRecords ? (
                  <p className="text-xs text-[var(--ink-mute)] leading-relaxed">
                    試合に出た記録があるため、この選手は削除できません。チームを離れた選手は「退団にする」を使ってください。
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError(null)
                      setDeleteOpen(true)
                    }}
                    disabled={busy}
                    className="w-full text-sm font-bold text-[#A32D2D] py-2 min-h-11 disabled:opacity-50"
                  >
                    この選手を削除する
                  </button>
                )}
              </div>
            )}
          </form>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="選手を削除しますか？"
        description={<>「{player?.display_name}」を名簿から削除します。元に戻せません。</>}
        confirmLabel="削除する"
        busy={busy}
        error={deleteError}
        onConfirm={remove}
        onClose={() => setDeleteOpen(false)}
      />
    </>
  )
}
