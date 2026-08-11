'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { FieldStatus, Level, MatchPost, MatchPostInsert } from '@/lib/types'
import { PREFECTURES, POPULAR_PREFECTURES } from '@/lib/prefectures'
import BottomSheet from './BottomSheet'
import PostCreatedScreen from './PostCreatedScreen'

const LEVELS: Level[] = ['A+', 'A', 'B', 'C']

const LEVEL_DETAILS: Record<Level, string> = {
  'A+': 'ガチ草野球チーム。リーグ・大会出場レベル',
  'A': 'スタメン全員野球経験者',
  'B': '野球未経験者が5人未満',
  'C': '5人以上野球未経験者',
}

const LEVEL_COLORS: Record<Level, string> = {
  'A+': '#c9960f',
  'A': '#d4307a',
  'B': '#1177dd',
  'C': '#00aa44',
}

const STEP_META = [
  { title: '基本情報', sub: 'まずは何を募集したいかだけ。' },
  { title: '試合の条件', sub: '残り2ステップ。あと1分ほどで終わります。' },
  { title: '連絡先とコメント', sub: '最後です。連絡先は1つでも構いません。' },
]

function FormLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-semibold text-[var(--ink)] mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  )
}

function inputClass(error?: boolean) {
  return `w-full border ${
    error ? 'border-red-400' : 'border-[var(--line)]'
  } rounded-lg px-3 py-2.5 text-sm bg-[var(--surface)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--green)]/40 transition`
}

function chipClass(active: boolean) {
  return `text-[13px] px-3 py-1.5 rounded-full border transition-colors ${
    active
      ? 'bg-[var(--green)] text-[var(--bg)] font-bold border-[var(--green)]'
      : 'bg-[var(--surface)] text-[var(--ink-sub)] border-[var(--line)]'
  }`
}

interface Props {
  mode: 'create' | 'edit'
  initialPost?: MatchPost
}

export default function PostForm({ mode, initialPost }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [showLevelSheet, setShowLevelSheet] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [title, setTitle] = useState(initialPost?.title ?? '')
  const [prefecture, setPrefecture] = useState(initialPost?.prefecture ?? '')
  const [areaDetail, setAreaDetail] = useState(initialPost?.area_detail ?? '')
  const [fieldStatus, setFieldStatus] = useState<FieldStatus | ''>(initialPost?.field_status ?? '')
  const [venueName, setVenueName] = useState(initialPost?.venue_name ?? '')
  const [gameDate, setGameDate] = useState(initialPost?.game_date ?? '')
  const [startTime, setStartTime] = useState(initialPost?.start_time?.slice(0, 5) ?? '')
  const [endTime, setEndTime] = useState(initialPost?.end_time?.slice(0, 5) ?? '')
  const [level, setLevel] = useState<Level | ''>(initialPost?.level ?? '')
  const [description, setDescription] = useState(initialPost?.description ?? '')
  const [contactEmail, setContactEmail] = useState(initialPost?.contact_email ?? '')
  const [contactPhone, setContactPhone] = useState(initialPost?.contact_phone ?? '')
  const [contactOther, setContactOther] = useState(initialPost?.contact_other ?? '')
  const [snsX, setSnsX] = useState(initialPost?.sns_x ?? '')
  const [snsInstagram, setSnsInstagram] = useState(initialPost?.sns_instagram ?? '')

  if (createdId) {
    return <PostCreatedScreen postId={createdId} />
  }

  function validateStep1() {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = 'タイトルは必須です'
    if (!prefecture) e.prefecture = '都道府県を選択してください'
    return e
  }

  function validateStep2() {
    const e: Record<string, string> = {}
    if (!fieldStatus) e.fieldStatus = 'グラウンドの有無を選択してください'
    if (fieldStatus === 'ok' && !venueName.trim()) e.venueName = 'グラウンド名は必須です'
    if (!gameDate) e.gameDate = '試合日は必須です'
    if (!level) e.level = 'レベルを選択してください'
    return e
  }

  function validateStep3() {
    const e: Record<string, string> = {}
    if (!contactEmail.trim() && !contactPhone.trim() && !contactOther.trim()) {
      e.contact = '連絡先を1つ以上入力してください'
    }
    return e
  }

  function goNext() {
    const stepErrors = step === 1 ? validateStep1() : validateStep2()
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors)
      return
    }
    setErrors({})
    setStep((s) => s + 1)
  }

  function goBack() {
    if (step === 1) {
      if (mode === 'edit' && initialPost) {
        router.push(`/posts/${initialPost.id}`)
      } else {
        router.back()
      }
      return
    }
    setErrors({})
    setStep((s) => s - 1)
  }

  async function handleSubmit() {
    const stepErrors = validateStep3()
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors)
      return
    }

    setSubmitting(true)
    setErrors({})

    const payload: MatchPostInsert = {
      title: title.trim(),
      prefecture,
      area_detail: areaDetail.trim() || null,
      field_status: fieldStatus as FieldStatus,
      venue_name: fieldStatus === 'ok' ? venueName.trim() : null,
      game_date: gameDate,
      start_time: startTime || null,
      end_time: endTime || null,
      level: level as Level,
      description: description.trim() || null,
      contact_email: contactEmail.trim() || null,
      contact_phone: contactPhone.trim() || null,
      contact_other: contactOther.trim() || null,
      sns_x: snsX.trim() || null,
      sns_instagram: snsInstagram.trim() || null,
    }

    if (mode === 'edit' && initialPost) {
      const { error } = await supabase.from('match_posts').update(payload).eq('id', initialPost.id)
      setSubmitting(false)
      if (error) {
        setErrors({ submit: '保存に失敗しました。もう一度お試しください。' })
        return
      }
      router.push(`/posts/${initialPost.id}`)
      return
    }

    const { data, error } = await supabase.from('match_posts').insert(payload).select('id').single()
    setSubmitting(false)
    if (error || !data) {
      setErrors({ submit: '投稿に失敗しました。もう一度お試しください。' })
      return
    }
    setCreatedId(data.id)
  }

  return (
    <div className="pb-28">
      <div className="max-w-2xl mx-auto px-4 pt-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold text-[var(--ink)]">
            {mode === 'edit' ? '募集内容を修正する' : '対戦相手を募集する'}
          </h1>
          <span className="text-sm text-[var(--ink-mute)]">{step} / 3</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 mb-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className={`h-1.5 rounded-full ${n <= step ? 'bg-[var(--green)]' : 'bg-[var(--line)]'}`} />
          ))}
        </div>

        <h2 className="text-lg font-bold text-[var(--ink)] mb-1">{STEP_META[step - 1].title}</h2>
        <p className="text-sm text-[var(--ink-mute)] mb-5">{STEP_META[step - 1].sub}</p>

        {Object.keys(errors).length > 0 && (
          <div className="bg-[#FBEDE8] border border-[#EBC9BC] text-[#A3462B] rounded-xl p-4 mb-5 text-sm space-y-1">
            {Object.values(errors).map((msg, i) => (
              <p key={i}>{msg}</p>
            ))}
          </div>
        )}

        <div className="space-y-5">
          {step === 1 && (
            <>
              <div>
                <FormLabel required>タイトル</FormLabel>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例：6月の練習試合募集！東京近郊で対戦できるチームを探しています"
                  className={inputClass(!!errors.title)}
                />
                <p className="text-xs text-[var(--ink-mute)] mt-1">
                  エリアと時期が入っていると連絡が来やすくなります
                </p>
              </div>

              <div>
                <FormLabel required>都道府県</FormLabel>
                <div className="flex flex-wrap gap-2 mb-2">
                  {POPULAR_PREFECTURES.map((p) => (
                    <button key={p} type="button" onClick={() => setPrefecture(p)} className={chipClass(prefecture === p)}>
                      {p}
                    </button>
                  ))}
                </div>
                <select
                  value={prefecture}
                  onChange={(e) => setPrefecture(e.target.value)}
                  className={inputClass(!!errors.prefecture)}
                >
                  <option value="">都道府県を選択</option>
                  {PREFECTURES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <FormLabel>エリア詳細（任意）</FormLabel>
                <input
                  type="text"
                  value={areaDetail}
                  onChange={(e) => setAreaDetail(e.target.value)}
                  placeholder="例：船橋市周辺、〇〇駅から車で15分 など"
                  className={inputClass()}
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <FormLabel required>グラウンド</FormLabel>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'ok' as const, label: 'あり', desc: '確保済み' },
                    { value: 'ng' as const, label: 'なし', desc: '相手を探す' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFieldStatus(opt.value)}
                      className={`border-2 rounded-xl p-4 text-left transition-all ${
                        fieldStatus === opt.value
                          ? 'border-[var(--green)] bg-[var(--green-bg)]'
                          : 'border-[var(--line)] bg-[var(--surface)]'
                      }`}
                    >
                      <p className={`font-semibold text-sm ${fieldStatus === opt.value ? 'text-[var(--green)]' : 'text-[var(--ink)]'}`}>
                        {opt.label}
                      </p>
                      <p className="text-xs text-[var(--ink-mute)] mt-1">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {fieldStatus === 'ok' && (
                <div>
                  <FormLabel required>グラウンド名</FormLabel>
                  <input
                    type="text"
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    placeholder="例：〇〇球場 第2グラウンド"
                    className={inputClass(!!errors.venueName)}
                  />
                </div>
              )}

              <div>
                <FormLabel required>試合日</FormLabel>
                <input
                  type="date"
                  value={gameDate}
                  onChange={(e) => setGameDate(e.target.value)}
                  className={inputClass(!!errors.gameDate)}
                />
              </div>

              <div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FormLabel>開始時間（任意）</FormLabel>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className={inputClass()}
                    />
                  </div>
                  <div>
                    <FormLabel>終了時間（任意）</FormLabel>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className={inputClass()}
                    />
                  </div>
                </div>
                <p className="text-xs text-[var(--ink-mute)] mt-1">時間は後から相手と相談でも大丈夫です</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <FormLabel required>チームレベル</FormLabel>
                  <button
                    type="button"
                    onClick={() => setShowLevelSheet(true)}
                    className="text-xs text-[var(--green)] underline"
                  >
                    定義を見る
                  </button>
                </div>
                <div className="space-y-2">
                  {LEVELS.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLevel(l)}
                      className={`w-full flex items-center gap-3 border-2 rounded-xl p-3 text-left transition-all ${
                        level === l ? 'border-[var(--green)] bg-[var(--green-bg)]' : 'border-[var(--line)] bg-[var(--surface)]'
                      }`}
                    >
                      <span
                        className="text-xs font-bold px-2 py-1 rounded-full border shrink-0"
                        style={{
                          color: LEVEL_COLORS[l],
                          backgroundColor: `${LEVEL_COLORS[l]}15`,
                          borderColor: `${LEVEL_COLORS[l]}40`,
                        }}
                      >
                        Lv.{l}
                      </span>
                      <span className="text-sm text-[var(--ink-sub)]">{LEVEL_DETAILS[l]}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <FormLabel required>連絡先（1つ以上）</FormLabel>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-[var(--ink-mute)] mb-1">メールアドレス</label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="team@example.com"
                      className={inputClass()}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--ink-mute)] mb-1">電話番号</label>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="090-0000-0000"
                      className={inputClass()}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--ink-mute)] mb-1">その他</label>
                    <input
                      type="text"
                      value={contactOther}
                      onChange={(e) => setContactOther(e.target.value)}
                      placeholder="LINEオープンチャット、メッセージフォームのURL など"
                      className={inputClass()}
                    />
                  </div>
                </div>
              </div>

              <div>
                <FormLabel>SNSアカウントURL（任意）</FormLabel>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-[var(--ink-mute)] mb-1">X（旧Twitter）のアカウントURL</label>
                    <input
                      type="url"
                      value={snsX}
                      onChange={(e) => setSnsX(e.target.value)}
                      placeholder="https://x.com/your_team"
                      className={inputClass()}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--ink-mute)] mb-1">Instagram のアカウントURL</label>
                    <input
                      type="url"
                      value={snsInstagram}
                      onChange={(e) => setSnsInstagram(e.target.value)}
                      placeholder="https://instagram.com/your_team"
                      className={inputClass()}
                    />
                  </div>
                </div>
              </div>

              <div>
                <FormLabel>募集コメント（任意）</FormLabel>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  placeholder="チームの雰囲気、希望する試合形式、人数、その他ご要望などを自由にご記入ください。"
                  className={inputClass()}
                />
              </div>

              <div className="bg-[#F1EEE4] rounded-xl p-4 text-sm space-y-1">
                <p className="font-bold text-[var(--ink)]">{title || '（タイトル未入力）'}</p>
                <p className="text-[var(--ink-sub)]">{[prefecture, areaDetail].filter(Boolean).join(' ')}</p>
                <p className="text-[var(--ink-sub)]">{gameDate}</p>
                {level && <p className="text-[var(--ink-sub)]">Lv.{level}</p>}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 下部固定バー */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-[var(--surface)] border-t border-[var(--line)] p-4">
        <div className="max-w-2xl mx-auto flex gap-3">
          <button
            type="button"
            onClick={goBack}
            className="flex-1 bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] font-semibold py-3 rounded-xl"
          >
            戻る
          </button>
          {step < 3 ? (
            <button
              type="button"
              onClick={goNext}
              className="flex-[2] bg-[var(--green)] hover:opacity-90 text-white font-bold py-3 rounded-xl transition-opacity"
            >
              次へ（{step === 1 ? '試合の条件' : '連絡先'}）
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-[2] bg-[var(--green)] hover:opacity-90 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-opacity"
            >
              {submitting ? (mode === 'edit' ? '保存中...' : '投稿中...') : mode === 'edit' ? '修正を保存する' : '募集を投稿する'}
            </button>
          )}
        </div>
      </div>

      <BottomSheet open={showLevelSheet} onClose={() => setShowLevelSheet(false)}>
        <p className="font-bold text-[var(--ink)] mb-4">レベル定義</p>
        <div className="space-y-3">
          {LEVELS.map((l) => (
            <div key={l} className="flex items-start gap-3">
              <span
                className="text-xs font-bold px-2 py-1 rounded-full border shrink-0"
                style={{
                  color: LEVEL_COLORS[l],
                  backgroundColor: `${LEVEL_COLORS[l]}15`,
                  borderColor: `${LEVEL_COLORS[l]}40`,
                }}
              >
                Lv.{l}
              </span>
              <span className="text-sm text-[var(--ink-sub)]">{LEVEL_DETAILS[l]}</span>
            </div>
          ))}
        </div>
      </BottomSheet>
    </div>
  )
}
