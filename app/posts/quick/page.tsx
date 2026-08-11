'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { FieldStatus, Level, MatchPostInsert } from '@/lib/types'
import { PREFECTURES } from '@/lib/prefectures'
import Logo from '@/components/Logo'
import PostCreatedScreen from '@/components/PostCreatedScreen'

type Phase =
  | 'prefecture'
  | 'field_status'
  | 'venue_name'
  | 'game_date'
  | 'time_choice'
  | 'time_range'
  | 'level'
  | 'contact'
  | 'confirm'

type TimeChoice = 'specify' | 'unspecified' | null

interface Answers {
  prefecture: string
  fieldStatus: FieldStatus | null
  venueName: string
  gameDate: string
  timeChoice: TimeChoice
  startTime: string
  endTime: string
  level: Level | null
  contactEmail: string
  contactPhone: string
  contactOther: string
}

interface Message {
  from: 'bot' | 'user'
  text: string
}

interface Snapshot {
  phase: Phase
  messages: Message[]
  answers: Answers
  prefectureDraft: string
  venueNameDraft: string
  gameDateDraft: string
  startTimeDraft: string
  endTimeDraft: string
  contactEmailDraft: string
  contactPhoneDraft: string
  contactOtherDraft: string
}

const LEVELS: Level[] = ['A+', 'A', 'B', 'C']

const LEVEL_SHORT: Record<Level, string> = {
  'A+': 'ガチ草野球チーム',
  'A': 'スタメン全員経験者',
  'B': '未経験5人未満',
  'C': '未経験5人以上',
}

const BOT_MESSAGES: Record<Phase, string> = {
  prefecture: '都道府県を教えてください',
  field_status: 'グラウンドの手配はできますか？',
  venue_name: 'グラウンド名を教えてください',
  game_date: '試合希望日を教えてください',
  time_choice: '時間帯はいつ頃希望ですか？（任意）',
  time_range: '開始時刻・終了時刻を教えてください',
  level: 'チームのレベルを教えてください',
  contact: '連絡先を教えてください（どれか1つで大丈夫です）',
  confirm: 'ありがとうございます。内容を確認して投稿してください',
}

function formatDateDisplay(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
}

function buildTitle(a: Answers): string {
  if (!a.prefecture || !a.level) return ''
  return `${a.prefecture}で対戦相手募集（Lv.${a.level}）`
}

const QUICK_REPLY_CLASS =
  'border-2 border-[var(--line)] rounded-xl p-4 text-center font-semibold text-sm text-[var(--ink)] transition-all'

const NEXT_BUTTON_CLASS =
  'w-full bg-[var(--green)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors'

const FIELD_INPUT_CLASS =
  'w-full border border-[var(--line)] rounded-lg px-3 py-2.5 text-sm bg-[var(--surface)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--green)]/40'

export default function QuickPostPage() {
  const [phase, setPhase] = useState<Phase>('prefecture')
  const [messages, setMessages] = useState<Message[]>([{ from: 'bot', text: BOT_MESSAGES.prefecture }])
  const [answers, setAnswers] = useState<Answers>({
    prefecture: '',
    fieldStatus: null,
    venueName: '',
    gameDate: '',
    timeChoice: null,
    startTime: '',
    endTime: '',
    level: null,
    contactEmail: '',
    contactPhone: '',
    contactOther: '',
  })
  const [history, setHistory] = useState<Snapshot[]>([])
  const [title, setTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(false)
  const [createdId, setCreatedId] = useState<string | null>(null)

  const [prefectureDraft, setPrefectureDraft] = useState('')
  const [venueNameDraft, setVenueNameDraft] = useState('')
  const [gameDateDraft, setGameDateDraft] = useState('')
  const [startTimeDraft, setStartTimeDraft] = useState('')
  const [endTimeDraft, setEndTimeDraft] = useState('')
  const [contactEmailDraft, setContactEmailDraft] = useState('')
  const [contactPhoneDraft, setContactPhoneDraft] = useState('')
  const [contactOtherDraft, setContactOtherDraft] = useState('')

  if (createdId) {
    return <PostCreatedScreen postId={createdId} />
  }

  function snapshot(): Snapshot {
    return {
      phase,
      messages,
      answers,
      prefectureDraft,
      venueNameDraft,
      gameDateDraft,
      startTimeDraft,
      endTimeDraft,
      contactEmailDraft,
      contactPhoneDraft,
      contactOtherDraft,
    }
  }

  function advance(userText: string, next: Phase, patch?: Partial<Answers>) {
    setHistory((h) => [...h, snapshot()])
    setMessages((prev) => [
      ...prev,
      { from: 'user', text: userText },
      { from: 'bot', text: BOT_MESSAGES[next] },
    ])
    if (patch) setAnswers((a) => ({ ...a, ...patch }))
    setPhase(next)
  }

  function goBack() {
    if (history.length === 0) return
    const last = history[history.length - 1]
    setPhase(last.phase)
    setMessages(last.messages)
    setAnswers(last.answers)
    setPrefectureDraft(last.prefectureDraft)
    setVenueNameDraft(last.venueNameDraft)
    setGameDateDraft(last.gameDateDraft)
    setStartTimeDraft(last.startTimeDraft)
    setEndTimeDraft(last.endTimeDraft)
    setContactEmailDraft(last.contactEmailDraft)
    setContactPhoneDraft(last.contactPhoneDraft)
    setContactOtherDraft(last.contactOtherDraft)
    setHistory(history.slice(0, -1))
  }

  function handlePrefectureNext() {
    if (!prefectureDraft) return
    advance(prefectureDraft, 'field_status', { prefecture: prefectureDraft })
  }

  function handleFieldStatus(value: FieldStatus) {
    const label = value === 'ok' ? 'できる' : 'できない'
    advance(label, value === 'ok' ? 'venue_name' : 'game_date', { fieldStatus: value })
  }

  function handleVenueNext() {
    const trimmed = venueNameDraft.trim()
    if (!trimmed) return
    advance(trimmed, 'game_date', { venueName: trimmed })
  }

  function handleDateNext() {
    if (!gameDateDraft) return
    advance(formatDateDisplay(gameDateDraft), 'time_choice', { gameDate: gameDateDraft })
  }

  function handleTimeChoice(choice: 'specify' | 'unspecified') {
    if (choice === 'unspecified') {
      advance('まだ未定', 'level', { timeChoice: choice })
    } else {
      advance('時間を指定する', 'time_range', { timeChoice: choice })
    }
  }

  function handleTimeRangeNext() {
    if (!startTimeDraft && !endTimeDraft) return
    advance(`${startTimeDraft || '?'}〜${endTimeDraft || '?'}`, 'level', {
      startTime: startTimeDraft,
      endTime: endTimeDraft,
    })
  }

  function handleLevelSelect(l: Level) {
    const finalAnswers: Answers = { ...answers, level: l }
    setTitle(buildTitle(finalAnswers))
    advance(`Lv.${l}（${LEVEL_SHORT[l]}）`, 'contact', { level: l })
  }

  function handleContactNext() {
    const email = contactEmailDraft.trim()
    const phone = contactPhoneDraft.trim()
    const other = contactOtherDraft.trim()
    if (!email && !phone && !other) return
    const label = [email, phone, other].filter(Boolean).join(' / ')
    advance(label, 'confirm', { contactEmail: email, contactPhone: phone, contactOther: other })
  }

  async function handleConfirmSubmit() {
    if (!title.trim() || !answers.prefecture || !answers.fieldStatus || !answers.gameDate || !answers.level) return

    setSubmitting(true)
    setSubmitError(false)
    const payload: MatchPostInsert = {
      title: title.trim(),
      prefecture: answers.prefecture,
      field_status: answers.fieldStatus,
      venue_name: answers.fieldStatus === 'ok' ? answers.venueName : null,
      level: answers.level,
      game_date: answers.gameDate,
      start_time: answers.timeChoice === 'specify' ? answers.startTime || null : null,
      end_time: answers.timeChoice === 'specify' ? answers.endTime || null : null,
      contact_email: answers.contactEmail || null,
      contact_phone: answers.contactPhone || null,
      contact_other: answers.contactOther || null,
    }

    const { data, error } = await supabase.from('match_posts').insert(payload).select('id').single()
    setSubmitting(false)
    if (error || !data) {
      setSubmitError(true)
      return
    }
    setCreatedId(data.id)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-[var(--ink-mute)] hover:text-[var(--green)] mb-4 transition-colors"
      >
        ← トップに戻る
      </Link>
      <h1 className="text-xl font-bold text-[var(--ink)] mb-1">かんたん募集</h1>
      <p className="text-sm text-[var(--ink-sub)] mb-6">
        質問に答えるだけで募集ができます。コメントやSNSは投稿後に追加できます。
      </p>

      {/* チャットトランスクリプト */}
      <div className="flex flex-col gap-3 mb-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex items-end ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.from === 'bot' && (
              <div className="shrink-0 mr-2">
                <Logo size={28} />
              </div>
            )}
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                m.from === 'user'
                  ? 'bg-[var(--green)] text-white rounded-tr-sm'
                  : 'bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] rounded-tl-sm'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {/* 1つ前の質問に戻る */}
      <button
        type="button"
        onClick={goBack}
        disabled={history.length === 0}
        className="text-xs font-semibold text-[var(--ink-mute)] hover:text-[var(--green)] disabled:opacity-40 disabled:cursor-not-allowed mb-3"
      >
        ← 1つ前の質問に戻る
      </button>

      {/* 回答エリア */}
      {phase !== 'confirm' && (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--line)] p-4">
          {phase === 'prefecture' && (
            <div className="space-y-3">
              <select
                value={prefectureDraft}
                onChange={(e) => setPrefectureDraft(e.target.value)}
                className={FIELD_INPUT_CLASS}
              >
                <option value="">選択してください</option>
                {PREFECTURES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <button type="button" onClick={handlePrefectureNext} disabled={!prefectureDraft} className={NEXT_BUTTON_CLASS}>
                次へ
              </button>
            </div>
          )}

          {phase === 'field_status' && (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleFieldStatus('ok')}
                className={`${QUICK_REPLY_CLASS} hover:border-[var(--green)] hover:bg-[var(--green-bg)]`}
              >
                できる
              </button>
              <button
                type="button"
                onClick={() => handleFieldStatus('ng')}
                className={`${QUICK_REPLY_CLASS} hover:border-[#A32D2D] hover:bg-[#FCEBEB]`}
              >
                できない
              </button>
            </div>
          )}

          {phase === 'venue_name' && (
            <div className="space-y-3">
              <input
                type="text"
                value={venueNameDraft}
                onChange={(e) => setVenueNameDraft(e.target.value)}
                placeholder="例：〇〇球場 第2グラウンド"
                className={FIELD_INPUT_CLASS}
              />
              <button type="button" onClick={handleVenueNext} disabled={!venueNameDraft.trim()} className={NEXT_BUTTON_CLASS}>
                次へ
              </button>
            </div>
          )}

          {phase === 'game_date' && (
            <div className="space-y-3">
              <input
                type="date"
                value={gameDateDraft}
                onChange={(e) => setGameDateDraft(e.target.value)}
                className={FIELD_INPUT_CLASS}
              />
              <button type="button" onClick={handleDateNext} disabled={!gameDateDraft} className={NEXT_BUTTON_CLASS}>
                次へ
              </button>
            </div>
          )}

          {phase === 'time_choice' && (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleTimeChoice('specify')}
                className={`${QUICK_REPLY_CLASS} hover:border-[var(--green)] hover:bg-[var(--green-bg)]`}
              >
                時間を指定する
              </button>
              <button
                type="button"
                onClick={() => handleTimeChoice('unspecified')}
                className={`${QUICK_REPLY_CLASS} hover:border-[var(--green)] hover:bg-[var(--green-bg)]`}
              >
                まだ未定
              </button>
            </div>
          )}

          {phase === 'time_range' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--ink-mute)] mb-1">開始時刻</label>
                  <input
                    type="time"
                    value={startTimeDraft}
                    onChange={(e) => setStartTimeDraft(e.target.value)}
                    className={FIELD_INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--ink-mute)] mb-1">終了時刻</label>
                  <input
                    type="time"
                    value={endTimeDraft}
                    onChange={(e) => setEndTimeDraft(e.target.value)}
                    className={FIELD_INPUT_CLASS}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleTimeRangeNext}
                disabled={!startTimeDraft && !endTimeDraft}
                className={NEXT_BUTTON_CLASS}
              >
                次へ
              </button>
            </div>
          )}

          {phase === 'level' && (
            <div className="grid grid-cols-2 gap-2">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => handleLevelSelect(l)}
                  className="border-2 border-[var(--line)] hover:border-[var(--green)] hover:bg-[var(--green-bg)] rounded-xl p-3 text-center transition-all"
                >
                  <span className="text-base font-extrabold block text-[var(--ink)]">{l}</span>
                  <span className="text-xs text-[var(--ink-mute)]">{LEVEL_SHORT[l]}</span>
                </button>
              ))}
            </div>
          )}

          {phase === 'contact' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[var(--ink-mute)] mb-1">メールアドレス</label>
                <input
                  type="email"
                  value={contactEmailDraft}
                  onChange={(e) => setContactEmailDraft(e.target.value)}
                  placeholder="team@example.com"
                  className={FIELD_INPUT_CLASS}
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--ink-mute)] mb-1">電話番号</label>
                <input
                  type="tel"
                  value={contactPhoneDraft}
                  onChange={(e) => setContactPhoneDraft(e.target.value)}
                  placeholder="090-0000-0000"
                  className={FIELD_INPUT_CLASS}
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--ink-mute)] mb-1">その他</label>
                <input
                  type="text"
                  value={contactOtherDraft}
                  onChange={(e) => setContactOtherDraft(e.target.value)}
                  placeholder="LINEオープンチャットのURL など"
                  className={FIELD_INPUT_CLASS}
                />
              </div>
              <p className="text-xs text-[var(--ink-mute)]">どれか1つで大丈夫です</p>
              <button
                type="button"
                onClick={handleContactNext}
                disabled={!contactEmailDraft.trim() && !contactPhoneDraft.trim() && !contactOtherDraft.trim()}
                className={NEXT_BUTTON_CLASS}
              >
                次へ
              </button>
            </div>
          )}
        </div>
      )}

      {/* 確認画面 */}
      {phase === 'confirm' && (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--line)] p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[var(--ink)] mb-1.5">タイトル</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={FIELD_INPUT_CLASS}
            />
            <p className="text-xs text-[var(--ink-mute)] mt-1">自由に書き換えられます</p>
          </div>

          <div className="border-t border-[var(--line)] pt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-[var(--ink-mute)] shrink-0">都道府県</span>
              <span className="text-[var(--ink)] font-medium text-right">{answers.prefecture}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[var(--ink-mute)] shrink-0">グラウンド</span>
              <span className="text-[var(--ink)] font-medium text-right">
                {answers.fieldStatus === 'ok' ? `あり（${answers.venueName}）` : 'なし'}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[var(--ink-mute)] shrink-0">試合希望日</span>
              <span className="text-[var(--ink)] font-medium text-right">{formatDateDisplay(answers.gameDate)}</span>
            </div>
            {answers.timeChoice === 'specify' && (
              <div className="flex justify-between gap-3">
                <span className="text-[var(--ink-mute)] shrink-0">時間帯</span>
                <span className="text-[var(--ink)] font-medium text-right">
                  {answers.startTime || '?'}〜{answers.endTime || '?'}
                </span>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <span className="text-[var(--ink-mute)] shrink-0">レベル</span>
              <span className="text-[var(--ink)] font-medium text-right">
                Lv.{answers.level}（{answers.level && LEVEL_SHORT[answers.level]}）
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[var(--ink-mute)] shrink-0">連絡先</span>
              <span className="text-[var(--ink)] font-medium text-right break-all">
                {[answers.contactEmail, answers.contactPhone, answers.contactOther].filter(Boolean).join(' / ')}
              </span>
            </div>
          </div>

          {submitError && <p className="text-xs text-red-500">投稿に失敗しました。もう一度お試しください。</p>}

          <button
            type="button"
            onClick={handleConfirmSubmit}
            disabled={submitting || !title.trim()}
            className="w-full bg-[var(--green)] hover:opacity-90 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-base transition-colors"
          >
            {submitting ? '投稿中...' : 'この内容で投稿する'}
          </button>
        </div>
      )}
    </div>
  )
}
