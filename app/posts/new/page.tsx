'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { FieldStatus, Level, MatchPostInsert } from '@/lib/types'

const AREAS = ['北海道', '東北', '関東', '東海', '北陸', '近畿', '中国', '四国', '九州・沖縄']
const LEVELS: Level[] = ['A+', 'A', 'B', 'C']

const LEVEL_DETAILS: Record<Level, string> = {
  'A+': 'ガチ草野球チーム。リーグ・大会出場レベル',
  'A':  'スタメン全員野球経験者',
  'B':  '野球未経験者が5人未満',
  'C':  '5人以上野球未経験者',
}

const LEVEL_COLORS: Record<Level, string> = {
  'A+': '#c9960f',
  'A':  '#d4307a',
  'B':  '#1177dd',
  'C':  '#00aa44',
}

function LevelPopup({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold text-lg mb-4">レベル定義</h3>
        <div className="space-y-3">
          {LEVELS.map((l) => (
            <div key={l} className="flex items-start gap-3">
              <span
                className="text-xs font-bold px-2 py-1 rounded-full border shrink-0"
                style={{ color: LEVEL_COLORS[l], backgroundColor: `${LEVEL_COLORS[l]}15`, borderColor: `${LEVEL_COLORS[l]}40` }}
              >
                Lv.{l}
              </span>
              <span className="text-sm text-gray-600">{LEVEL_DETAILS[l]}</span>
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-5 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 rounded-lg text-sm transition-colors"
        >
          閉じる
        </button>
      </div>
    </div>
  )
}

function FormLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  )
}

function inputClass(error?: boolean) {
  return `w-full border ${error ? 'border-red-400' : 'border-gray-200'} rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40 transition`
}

export default function NewPostPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [showLevelPopup, setShowLevelPopup] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [title, setTitle] = useState('')
  const [fieldStatus, setFieldStatus] = useState<FieldStatus | ''>('')
  const [venueName, setVenueName] = useState('')
  const [area, setArea] = useState('')
  const [level, setLevel] = useState<Level | ''>('')
  const [gameDate, setGameDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [description, setDescription] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactOther, setContactOther] = useState('')
  const [snsX, setSnsX] = useState('')
  const [snsInstagram, setSnsInstagram] = useState('')

  function validate() {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = 'タイトルは必須です'
    if (!fieldStatus) e.fieldStatus = 'グラウンドの有無を選択してください'
    if (fieldStatus === 'ok' && !venueName.trim()) e.venueName = 'グラウンド名は必須です（グラウンドありの場合）'
    if (!gameDate) e.gameDate = '試合日は必須です'
    if (!level) e.level = 'レベルを選択してください'
    if (!contactEmail.trim() && !contactPhone.trim() && !contactOther.trim()) {
      e.contact = '連絡先を1つ以上入力してください'
    }
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setSubmitting(true)
    const payload: MatchPostInsert = {
      title: title.trim(),
      field_status: fieldStatus as FieldStatus,
      venue_name: venueName.trim() || null,
      area: area || null,
      level: level as Level,
      game_date: gameDate,
      start_time: startTime || null,
      end_time: endTime || null,
      description: description.trim() || null,
      contact_email: contactEmail.trim() || null,
      contact_phone: contactPhone.trim() || null,
      contact_other: contactOther.trim() || null,
      sns_x: snsX.trim() || null,
      sns_instagram: snsInstagram.trim() || null,
    }

    const { error } = await supabase.from('match_posts').insert(payload)
    if (error) {
      alert('投稿に失敗しました。もう一度お試しください。')
      setSubmitting(false)
      return
    }
    router.push('/posts')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {showLevelPopup && <LevelPopup onClose={() => setShowLevelPopup(false)} />}

      <h1 className="text-2xl font-bold text-gray-900 mb-2">対戦相手を募集する</h1>
      <p className="text-sm text-gray-500 mb-8">登録不要・無料で投稿できます</p>

      {Object.keys(errors).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-red-700 mb-1">入力内容を確認してください</p>
          <ul className="text-sm text-red-600 list-disc list-inside space-y-0.5">
            {Object.values(errors).map((msg, i) => <li key={i}>{msg}</li>)}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* タイトル */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <FormLabel required>タイトル</FormLabel>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例：6月の練習試合募集！東京近郊で対戦できるチームを探しています"
            className={inputClass(!!errors.title)}
          />
          {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
        </div>

        {/* グラウンド */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <FormLabel required>グラウンドの有無</FormLabel>
          {errors.fieldStatus && <p className="text-xs text-red-500 mb-2">{errors.fieldStatus}</p>}
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'ok', label: '🏟️ グラウンドあり', desc: '球場・グラウンドを確保済み', color: '#0F6E56', bg: '#E1F5EE' },
              { value: 'ng', label: '📍 グラウンドなし', desc: '場所を持つ相手を探している', color: '#A32D2D', bg: '#FCEBEB' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFieldStatus(opt.value as FieldStatus)}
                className="border-2 rounded-xl p-4 text-left transition-all"
                style={{
                  borderColor: fieldStatus === opt.value ? opt.color : '#e5e7eb',
                  backgroundColor: fieldStatus === opt.value ? opt.bg : 'white',
                }}
              >
                <p className="font-semibold text-sm" style={{ color: fieldStatus === opt.value ? opt.color : '#374151' }}>
                  {opt.label}
                </p>
                <p className="text-xs text-gray-500 mt-1">{opt.desc}</p>
              </button>
            ))}
          </div>

          {/* グラウンドありの場合 */}
          {fieldStatus === 'ok' && (
            <div className="mt-4 space-y-3 pt-4 border-t border-gray-100">
              <div>
                <FormLabel required>エリア</FormLabel>
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className={inputClass()}
                >
                  <option value="">選択してください</option>
                  {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <FormLabel required>グラウンド名</FormLabel>
                <input
                  type="text"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  placeholder="例：〇〇球場 第2グラウンド"
                  className={inputClass(!!errors.venueName)}
                />
                {errors.venueName && <p className="text-xs text-red-500 mt-1">{errors.venueName}</p>}
              </div>
            </div>
          )}

          {/* グラウンドなしの場合 */}
          {fieldStatus === 'ng' && (
            <div className="mt-4 space-y-3 pt-4 border-t border-gray-100">
              <div>
                <FormLabel>希望エリア（任意）</FormLabel>
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className={inputClass()}
                >
                  <option value="">こだわらない</option>
                  {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* 日付・時間 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <FormLabel required>試合日</FormLabel>
              <input
                type="date"
                value={gameDate}
                onChange={(e) => setGameDate(e.target.value)}
                className={inputClass(!!errors.gameDate)}
              />
              {errors.gameDate && <p className="text-xs text-red-500 mt-1">{errors.gameDate}</p>}
            </div>
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
        </div>

        {/* レベル */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <FormLabel required>チームレベル</FormLabel>
            <button
              type="button"
              onClick={() => setShowLevelPopup(true)}
              className="text-xs text-[#1D9E75] underline"
            >
              レベル定義を見る
            </button>
          </div>
          {errors.level && <p className="text-xs text-red-500 mb-2">{errors.level}</p>}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLevel(l)}
                className="border-2 rounded-xl p-3 text-center transition-all"
                style={{
                  borderColor: level === l ? LEVEL_COLORS[l] : '#e5e7eb',
                  backgroundColor: level === l ? `${LEVEL_COLORS[l]}10` : 'white',
                }}
              >
                <span
                  className="text-base font-extrabold block"
                  style={{ color: level === l ? LEVEL_COLORS[l] : '#6b7280' }}
                >
                  {l}
                </span>
                <span className="text-xs text-gray-400">{LEVEL_DETAILS[l].split('。')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* コメント */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <FormLabel>募集内容コメント（任意）</FormLabel>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="チームの雰囲気、希望する試合形式、人数、その他ご要望などを自由にご記入ください。"
            className={inputClass()}
          />
        </div>

        {/* 連絡先 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <FormLabel required>連絡先（1つ以上）</FormLabel>
          <p className="text-xs text-gray-400 mb-3">対戦希望者が連絡を取るために使います</p>
          {errors.contact && <p className="text-xs text-red-500 mb-2">{errors.contact}</p>}
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">✉️ メールアドレス</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="team@example.com"
                className={inputClass(!!errors.contact && !contactEmail && !contactPhone && !contactOther)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">📞 電話番号</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="090-0000-0000"
                className={inputClass()}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">💬 その他</label>
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

        {/* SNS */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <FormLabel>チームSNS（任意）</FormLabel>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">𝕏 X (Twitter) ユーザー名</label>
              <input
                type="text"
                value={snsX}
                onChange={(e) => setSnsX(e.target.value)}
                placeholder="@username"
                className={inputClass()}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">📸 Instagram ユーザー名</label>
              <input
                type="text"
                value={snsInstagram}
                onChange={(e) => setSnsInstagram(e.target.value)}
                placeholder="@username"
                className={inputClass()}
              />
            </div>
          </div>
        </div>

        {/* 送信 */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[#1D9E75] hover:bg-[#0F6E56] disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-colors text-base"
        >
          {submitting ? '投稿中...' : '募集を投稿する'}
        </button>
        <p className="text-center text-xs text-gray-400">投稿後は募集一覧に表示されます</p>
      </form>
    </div>
  )
}
