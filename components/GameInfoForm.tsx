'use client'

import { useState } from 'react'
import { todayJST } from '@/lib/dates'
import {
  DEFENSE_MODES,
  GAME_TEXT_LIMITS,
  GAME_TYPES,
  MAX_INNINGS,
  MAX_LINEUP_SIZE,
  MIN_INNINGS,
  STANDARD_LINEUP_SIZE,
} from '@/lib/games'
import type { DefenseMode, GameInfoInput, GameType } from '@/lib/types'

const INPUT_CLASS =
  'w-full border rounded-lg px-3 py-2.5 text-sm bg-[var(--surface)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--green)]/40 transition'

function choiceClass(active: boolean) {
  return `min-h-11 rounded-xl border text-sm px-3 transition-colors ${
    active
      ? 'bg-[var(--green)] text-[var(--bg)] font-bold border-[var(--green)]'
      : 'bg-[var(--surface)] text-[var(--ink-sub)] border-[var(--line)]'
  }`
}

function Label({ htmlFor, children, required }: { htmlFor?: string; children: React.ReactNode; required?: boolean }) {
  const cls = 'block text-sm font-semibold text-[var(--ink)] mb-1.5'
  const body = (
    <>
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </>
  )
  return htmlFor ? (
    <label htmlFor={htmlFor} className={cls}>
      {body}
    </label>
  ) : (
    <p className={cls}>{body}</p>
  )
}

function Stepper({
  value,
  min,
  max,
  unit,
  label,
  onChange,
}: {
  value: number
  min: number
  max: number
  unit: string
  label: string
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={`${label}を減らす`}
        className="w-11 h-11 rounded-xl border border-[var(--line)] text-lg font-bold text-[var(--ink)] disabled:opacity-30"
      >
        −
      </button>
      <span className="min-w-[4.5rem] text-center text-base font-black text-[var(--ink)]" aria-live="polite">
        {value}
        <span className="text-sm font-normal text-[var(--ink-sub)] ml-0.5">{unit}</span>
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={`${label}を増やす`}
        className="w-11 h-11 rounded-xl border border-[var(--line)] text-lg font-bold text-[var(--ink)] disabled:opacity-30"
      >
        ＋
      </button>
    </div>
  )
}

interface Props {
  // ゲストの試合は自チーム名を入力する
  isGuest: boolean
  initial?: Partial<GameInfoInput>
  // 予定イニングの初期値（チームはチーム設定、ゲストは7）
  defaultInnings: number
  submitLabel: string
  busyLabel?: string
  // 失敗したらエラーメッセージを返す
  onSubmit: (values: GameInfoInput) => Promise<string | null>
  onCancel?: () => void
}

type Errors = Partial<Record<'game_date' | 'guest_team_name' | 'opponent_name' | 'venue' | 'tournament_name', string>>

export default function GameInfoForm({ isGuest, initial, defaultInnings, submitLabel, busyLabel, onSubmit, onCancel }: Props) {
  const [gameDate, setGameDate] = useState(initial?.game_date ?? todayJST())
  const [teamName, setTeamName] = useState(initial?.guest_team_name ?? '')
  const [opponentName, setOpponentName] = useState(initial?.opponent_name ?? '')
  const [venue, setVenue] = useState(initial?.venue ?? '')
  const [gameType, setGameType] = useState<GameType>(initial?.game_type ?? '練習試合')
  const [tournamentName, setTournamentName] = useState(initial?.tournament_name ?? '')
  const [battingFirst, setBattingFirst] = useState<boolean | null>(initial?.batting_first ?? null)
  const [innings, setInnings] = useState(initial?.scheduled_innings ?? defaultInnings)
  const [defenseMode, setDefenseMode] = useState<DefenseMode>(initial?.defense_mode ?? 'summary')
  const [lineupSize, setLineupSize] = useState(initial?.lineup_size ?? STANDARD_LINEUP_SIZE)
  const [useDh, setUseDh] = useState(initial?.use_dh ?? false)

  const [errors, setErrors] = useState<Errors>({})
  const [battingError, setBattingError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const allBat = lineupSize > STANDARD_LINEUP_SIZE

  function validate(): Errors {
    const e: Errors = {}
    if (!/^\d{4}-\d{2}-\d{2}$/.test(gameDate)) e.game_date = '日付を選んでください'
    if (isGuest && teamName.trim().length > GAME_TEXT_LIMITS.guest_team_name)
      e.guest_team_name = `${GAME_TEXT_LIMITS.guest_team_name}文字以内にしてください`
    if (!opponentName.trim()) e.opponent_name = '相手チーム名を入力してください'
    else if (opponentName.trim().length > GAME_TEXT_LIMITS.opponent_name)
      e.opponent_name = `${GAME_TEXT_LIMITS.opponent_name}文字以内にしてください`
    if (venue.trim().length > GAME_TEXT_LIMITS.venue) e.venue = `${GAME_TEXT_LIMITS.venue}文字以内にしてください`
    if (gameType === '公式戦' && tournamentName.trim().length > GAME_TEXT_LIMITS.tournament_name)
      e.tournament_name = `${GAME_TEXT_LIMITS.tournament_name}文字以内にしてください`
    return e
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    const e = validate()
    setErrors(e)
    setBattingError(battingFirst === null)
    if (Object.keys(e).length > 0 || battingFirst === null) return

    setBusy(true)
    setSubmitError(null)
    const error = await onSubmit({
      game_date: gameDate,
      guest_team_name: isGuest ? teamName.trim() || null : null,
      opponent_name: opponentName.trim(),
      venue: venue.trim() || null,
      game_type: gameType,
      tournament_name: gameType === '公式戦' ? tournamentName.trim() || null : null,
      batting_first: battingFirst,
      scheduled_innings: innings,
      defense_mode: defenseMode,
      lineup_size: lineupSize,
      use_dh: useDh,
    })
    setBusy(false)
    if (error) setSubmitError(error)
  }

  const errorText = (msg?: string) => msg && <p className="text-xs text-red-500 mt-1">{msg}</p>
  const borderFor = (msg?: string) => (msg ? 'border-red-400' : 'border-[var(--line)]')

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <Label htmlFor="game-date" required>
          日付
        </Label>
        <input
          id="game-date"
          type="date"
          value={gameDate}
          onChange={(e) => setGameDate(e.target.value)}
          className={`${INPUT_CLASS} ${borderFor(errors.game_date)}`}
        />
        {errorText(errors.game_date)}
      </div>

      {isGuest && (
        <div>
          <Label htmlFor="game-team-name">自チーム名（任意）</Label>
          <input
            id="game-team-name"
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            maxLength={GAME_TEXT_LIMITS.guest_team_name}
            placeholder="例: 草野球ズ"
            autoComplete="off"
            className={`${INPUT_CLASS} ${borderFor(errors.guest_team_name)}`}
          />
          {errorText(errors.guest_team_name)}
        </div>
      )}

      <div>
        <Label htmlFor="game-opponent" required>
          相手チーム名
        </Label>
        <input
          id="game-opponent"
          type="text"
          value={opponentName}
          onChange={(e) => setOpponentName(e.target.value)}
          maxLength={GAME_TEXT_LIMITS.opponent_name}
          autoComplete="off"
          className={`${INPUT_CLASS} ${borderFor(errors.opponent_name)}`}
        />
        {errorText(errors.opponent_name)}
      </div>

      <div>
        <Label htmlFor="game-venue">場所（任意）</Label>
        <input
          id="game-venue"
          type="text"
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          maxLength={GAME_TEXT_LIMITS.venue}
          placeholder="例: 駒沢オリンピック公園 第1球場"
          autoComplete="off"
          className={`${INPUT_CLASS} ${borderFor(errors.venue)}`}
        />
        {errorText(errors.venue)}
      </div>

      <div>
        <Label>種類</Label>
        <div className="grid grid-cols-2 gap-2">
          {GAME_TYPES.map((t) => (
            <button key={t} type="button" aria-pressed={gameType === t} onClick={() => setGameType(t)} className={choiceClass(gameType === t)}>
              {t}
            </button>
          ))}
        </div>
        {gameType === '公式戦' && (
          <div className="mt-3">
            <Label htmlFor="game-tournament">大会名・リーグ名（任意）</Label>
            <input
              id="game-tournament"
              type="text"
              value={tournamentName}
              onChange={(e) => setTournamentName(e.target.value)}
              maxLength={GAME_TEXT_LIMITS.tournament_name}
              placeholder="例: 区民大会 秋季"
              autoComplete="off"
              className={`${INPUT_CLASS} ${borderFor(errors.tournament_name)}`}
            />
            {errorText(errors.tournament_name)}
          </div>
        )}
      </div>

      <div>
        <Label required>先攻・後攻</Label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: true, label: '先攻' },
            { value: false, label: '後攻' },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              aria-pressed={battingFirst === o.value}
              onClick={() => {
                setBattingFirst(o.value)
                setBattingError(false)
              }}
              className={`${choiceClass(battingFirst === o.value)} ${battingError ? 'border-red-400' : ''}`}
            >
              {o.label}
            </button>
          ))}
        </div>
        {battingError && <p className="text-xs text-red-500 mt-1">先攻か後攻を選んでください</p>}
      </div>

      <div>
        <Label>予定イニング</Label>
        <Stepper value={innings} min={MIN_INNINGS} max={MAX_INNINGS} unit="回" label="予定イニング" onChange={setInnings} />
        <p className="text-xs text-[var(--ink-mute)] mt-1">時間切れ・コールドなどの終わり方は、試合を確定するときに入れます。</p>
      </div>

      <div>
        <Label>守備の記録方式</Label>
        <div className="space-y-2">
          {DEFENSE_MODES.map((m) => {
            const active = defenseMode === m.value
            return (
              <button
                key={m.value}
                type="button"
                aria-pressed={active}
                onClick={() => setDefenseMode(m.value)}
                className={`w-full text-left rounded-xl border-2 p-3 transition-colors ${
                  active ? 'border-[var(--green)] bg-[var(--green-bg)]' : 'border-[var(--line)] bg-[var(--surface)]'
                }`}
              >
                <span className={`block text-sm font-bold ${active ? 'text-[var(--green)]' : 'text-[var(--ink)]'}`}>{m.label}</span>
                <span className="block text-xs text-[var(--ink-sub)] mt-0.5 leading-relaxed">{m.description}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <Label>打順の人数</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-pressed={!allBat}
            onClick={() => setLineupSize(STANDARD_LINEUP_SIZE)}
            className={choiceClass(!allBat)}
          >
            9人
          </button>
          <button
            type="button"
            aria-pressed={allBat}
            onClick={() => !allBat && setLineupSize(STANDARD_LINEUP_SIZE + 1)}
            className={choiceClass(allBat)}
          >
            全員打ち
          </button>
        </div>
        {allBat && (
          <div className="mt-3">
            <p className="text-xs text-[var(--ink-sub)] mb-1.5">打つ人数</p>
            <Stepper
              value={lineupSize}
              min={STANDARD_LINEUP_SIZE + 1}
              max={MAX_LINEUP_SIZE}
              unit="人"
              label="打つ人数"
              onChange={setLineupSize}
            />
          </div>
        )}
      </div>

      <label className="flex items-start gap-3 min-h-11 cursor-pointer">
        <input
          type="checkbox"
          checked={useDh}
          onChange={(e) => setUseDh(e.target.checked)}
          className="mt-0.5 w-5 h-5 accent-[var(--green)] shrink-0"
        />
        <span>
          <span className="block text-sm font-semibold text-[var(--ink)]">DH（指名打者）を使う</span>
          <span className="block text-xs text-[var(--ink-mute)] mt-0.5">投手は打順に入らず、代わりに指名打者が打ちます。</span>
        </span>
      </label>

      {submitError && <p className="text-sm text-[#A3462B]">{submitError}</p>}

      <div className={onCancel ? 'grid grid-cols-2 gap-3' : ''}>
        {onCancel && (
          <button type="button" onClick={onCancel} className="border border-[var(--line)] text-[var(--ink)] font-semibold py-3 rounded-xl text-sm">
            キャンセル
          </button>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-[var(--green)] text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {busy ? (busyLabel ?? '保存中...') : submitLabel}
        </button>
      </div>
    </form>
  )
}
