'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { todayJST } from '@/lib/dates'
import { PREFECTURES, POPULAR_PREFECTURES } from '@/lib/prefectures'
import {
  EXPERIENCES,
  POSITIONS,
  type Experience,
  type MatchPost,
  type MatchPostInsert,
  type Position,
  type PostContacts,
  type Team,
} from '@/lib/types'
import PostCreatedScreen from './PostCreatedScreen'
import TeamChoice from './TeamChoice'

function FormLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <p className="text-sm font-semibold text-[var(--ink)] mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </p>
  )
}

const INPUT_CLASS =
  'w-full border border-[var(--line)] rounded-lg px-3 py-2.5 text-sm bg-[var(--surface)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--green)]/40 transition'

function chipClass(active: boolean) {
  return `text-[13px] px-3 py-1.5 rounded-full border transition-colors ${
    active
      ? 'bg-[var(--green)] text-[var(--bg)] font-bold border-[var(--green)]'
      : 'bg-[var(--surface)] text-[var(--ink-sub)] border-[var(--line)]'
  }`
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 space-y-5">
      <h2 className="text-base font-bold text-[var(--ink)]">{title}</h2>
      {children}
    </section>
  )
}

function teamActivity(team: Team | undefined) {
  if (!team) return ''
  return [team.activity_days.join('・'), team.activity_times.join('・')].filter(Boolean).join(' ／ ')
}

export type SourcePost = Pick<
  MatchPost,
  'id' | 'title' | 'team_id' | 'game_date' | 'start_time' | 'end_time' | 'prefecture' | 'area_detail' | 'venue_name'
>

interface Props {
  postType: 'helper' | 'member'
  teams: Team[]
  defaultTeamId?: string
  userId?: string
  initialPost?: MatchPost
  initialContacts?: PostContacts | null
  source?: SourcePost | null
}

export default function TeamPostForm({ postType, teams, defaultTeamId, userId, initialPost, initialContacts, source }: Props) {
  const router = useRouter()
  const isEdit = !!initialPost
  const isHelper = postType === 'helper'

  const initialTeamId = source?.team_id ?? defaultTeamId ?? teams[0]?.id ?? ''
  const initialTeam = teams.find((t) => t.id === initialTeamId)

  const [teamId, setTeamId] = useState(initialPost?.team_id ?? initialTeamId)
  const [title, setTitle] = useState(initialPost?.title ?? '')
  const [gameDate, setGameDate] = useState(initialPost?.game_date ?? source?.game_date ?? '')
  const [startTime, setStartTime] = useState((initialPost?.start_time ?? source?.start_time ?? '').slice(0, 5))
  const [endTime, setEndTime] = useState((initialPost?.end_time ?? source?.end_time ?? '').slice(0, 5))
  const [prefecture, setPrefecture] = useState(
    initialPost?.prefecture ?? source?.prefecture ?? initialTeam?.prefecture ?? ''
  )
  const [areaDetail, setAreaDetail] = useState(
    initialPost?.area_detail ?? source?.area_detail ?? initialTeam?.area_detail ?? ''
  )
  const [venueName, setVenueName] = useState(initialPost?.venue_name ?? source?.venue_name ?? '')
  const [positions, setPositions] = useState<Position[]>(initialPost?.positions ?? [])
  const [headcount, setHeadcount] = useState(initialPost?.headcount ?? '')
  const [experience, setExperience] = useState<Experience | ''>(initialPost?.experience ?? '')
  const [fee, setFee] = useState(initialPost?.fee ?? '')
  const [opponentName, setOpponentName] = useState(initialPost?.opponent_name ?? '')
  const [ageCondition, setAgeCondition] = useState(initialPost?.age_condition ?? '')
  const [activityNote, setActivityNote] = useState(initialPost?.activity_note ?? teamActivity(initialTeam))
  const [trialOk, setTrialOk] = useState<boolean | null>(initialPost?.trial_ok ?? null)
  const [description, setDescription] = useState(initialPost?.description ?? '')
  const [contactEmail, setContactEmail] = useState(initialContacts?.contact_email ?? initialTeam?.contact_email ?? '')
  const [contactPhone, setContactPhone] = useState(initialContacts?.contact_phone ?? initialTeam?.contact_phone ?? '')
  const [contactOther, setContactOther] = useState(initialContacts?.contact_other ?? initialTeam?.contact_other ?? '')

  const [errors, setErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [createdId, setCreatedId] = useState<string | null>(null)

  if (createdId) return <PostCreatedScreen postId={createdId} postType={postType} />

  // 別のチームに切り替えたら、引き継ぎ元の試合とは結びつけない
  const activeSource = source && source.team_id === teamId ? source : null

  function chooseTeam(id: string) {
    setTeamId(id)
    const team = teams.find((t) => t.id === id)
    if (!team) return
    setPrefecture(team.prefecture)
    setAreaDetail(team.area_detail ?? '')
    setActivityNote(teamActivity(team))
    setContactEmail(team.contact_email ?? '')
    setContactPhone(team.contact_phone ?? '')
    setContactOther(team.contact_other ?? '')
  }

  function togglePosition(position: Position) {
    setPositions((prev) =>
      POSITIONS.filter((p) => (p === position ? !prev.includes(p) : prev.includes(p)))
    )
  }

  function validate() {
    const e: string[] = []
    if (!isEdit && !teamId) e.push('チームを選択してください')
    if (!title.trim()) e.push('タイトルは必須です')
    if (isHelper && !gameDate) e.push('試合日は必須です')
    if (isHelper && !isEdit && gameDate && gameDate < todayJST()) e.push('試合日は今日以降を選んでください')
    if (!prefecture) e.push('都道府県を選択してください')
    if (positions.length === 0) e.push('ポジションを1つ以上選んでください')
    if (isHelper && !headcount) e.push('人数を選んでください')
    if (!experience) e.push('経験を選んでください')
    if (!contactEmail.trim() && !contactPhone.trim() && !contactOther.trim()) e.push('連絡先を1つ以上入力してください')
    return e
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    const validationErrors = validate()
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setSubmitting(true)
    setErrors([])
    const supabase = createClient()

    const common = {
      title: title.trim(),
      prefecture,
      area_detail: areaDetail.trim() || null,
      positions,
      headcount: headcount.trim() || null,
      experience: experience as Experience,
      fee: fee.trim() || null,
      description: description.trim() || null,
      contact_email: contactEmail.trim() || null,
      contact_phone: contactPhone.trim() || null,
      contact_other: contactOther.trim() || null,
    }
    const typeFields = isHelper
      ? {
          game_date: gameDate,
          start_time: startTime || null,
          end_time: endTime || null,
          venue_name: venueName.trim() || null,
          opponent_name: opponentName.trim() || null,
        }
      : {
          age_condition: ageCondition.trim() || null,
          activity_note: activityNote.trim() || null,
          trial_ok: trialOk,
        }

    if (isEdit) {
      const { data, error } = await supabase
        .from('match_posts')
        .update({ ...common, ...typeFields, renewed_at: new Date().toISOString() })
        .eq('id', initialPost.id)
        .select('id')
      setSubmitting(false)
      if (error || !data?.length) {
        setErrors(['保存に失敗しました。もう一度お試しください。'])
        return
      }
      router.push(`/posts/${initialPost.id}`)
      router.refresh()
      return
    }

    const team = teams.find((t) => t.id === teamId)
    const payload: MatchPostInsert = {
      ...common,
      ...typeFields,
      post_type: postType,
      level: team!.level,
      team_id: teamId,
      created_by: userId,
      source_post_id: activeSource?.id ?? null,
    }
    const { data, error } = await supabase.from('match_posts').insert(payload).select('id').single()
    setSubmitting(false)
    if (error || !data) {
      setErrors(['投稿に失敗しました。もう一度お試しください。'])
      return
    }
    setCreatedId(data.id)
  }

  const heading = isHelper ? '助っ人を募集する' : 'メンバーを募集する'
  const selectedTeamLevel = teams.find((t) => t.id === teamId)?.level ?? initialPost?.level

  return (
    <form onSubmit={handleSubmit} className="pb-28">
      <div className="max-w-2xl mx-auto px-4 pt-8 space-y-5">
        <h1 className="text-xl font-black text-[var(--ink)]">{isEdit ? '募集内容を修正する' : heading}</h1>

        {errors.length > 0 && (
          <div className="bg-[#FBEDE8] border border-[#EBC9BC] text-[#A3462B] rounded-xl p-4 text-sm space-y-1">
            {errors.map((msg) => (
              <p key={msg}>{msg}</p>
            ))}
          </div>
        )}

        {!isEdit && (
          <Section title="募集するチーム">
            <TeamChoice label="どのチームとして募集しますか？" teams={teams} value={teamId} onChange={chooseTeam} />
            {selectedTeamLevel && (
              <p className="text-xs text-[var(--ink-mute)]">
                チームの都道府県・エリア・連絡先{isHelper ? '' : '・活動'}を入力しました（変更できます）。レベルはチームの Lv.{selectedTeamLevel} を使います。チームページで非公開にしている連絡先も、この募集には表示されます。
              </p>
            )}
            {activeSource && (
              <p className="text-xs font-bold text-[var(--clay)] bg-[var(--bg)] rounded-lg px-3 py-2">
                「{activeSource.title}」の試合日・時間・場所を引き継ぎました
              </p>
            )}
          </Section>
        )}

        <Section title="募集内容">
          <div>
            <FormLabel required>タイトル</FormLabel>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isHelper ? '例：12/20の練習試合で投手を募集します' : '例：週末に一緒に野球をするメンバーを募集'}
              className={INPUT_CLASS}
            />
          </div>

          {isHelper && (
            <>
              <div>
                <FormLabel required>試合日</FormLabel>
                <input type="date" value={gameDate} onChange={(e) => setGameDate(e.target.value)} className={INPUT_CLASS} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FormLabel>開始時間</FormLabel>
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={INPUT_CLASS} />
                </div>
                <div>
                  <FormLabel>終了時間</FormLabel>
                  <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={INPUT_CLASS} />
                </div>
              </div>
            </>
          )}

          <div>
            <FormLabel required>都道府県</FormLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {POPULAR_PREFECTURES.map((p) => (
                <button key={p} type="button" onClick={() => setPrefecture(p)} className={chipClass(prefecture === p)}>
                  {p}
                </button>
              ))}
            </div>
            <select value={prefecture} onChange={(e) => setPrefecture(e.target.value)} className={INPUT_CLASS}>
              <option value="">都道府県を選択</option>
              {PREFECTURES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FormLabel>エリア詳細</FormLabel>
            <input
              type="text"
              value={areaDetail}
              onChange={(e) => setAreaDetail(e.target.value)}
              placeholder="例：船橋市・津田沼駅周辺"
              className={INPUT_CLASS}
            />
          </div>

          {isHelper && (
            <div>
              <FormLabel>グラウンド名</FormLabel>
              <input
                type="text"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="例：〇〇球場 第2グラウンド"
                className={INPUT_CLASS}
              />
            </div>
          )}

          <div>
            <FormLabel required>ポジション（複数選択可）</FormLabel>
            <div className="flex flex-wrap gap-2">
              {POSITIONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={positions.includes(p)}
                  onClick={() => togglePosition(p)}
                  className={chipClass(positions.includes(p))}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <FormLabel required={isHelper}>人数</FormLabel>
            {isHelper ? (
              <select value={headcount} onChange={(e) => setHeadcount(e.target.value)} className={INPUT_CLASS}>
                <option value="">人数を選択</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <option key={n} value={String(n)}>
                    {n}人
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={headcount}
                onChange={(e) => setHeadcount(e.target.value)}
                placeholder="例：若干名、2〜3人"
                className={INPUT_CLASS}
              />
            )}
          </div>

          <div>
            <FormLabel required>経験</FormLabel>
            <div className="flex flex-wrap gap-2">
              {EXPERIENCES.map((x) => (
                <button
                  key={x}
                  type="button"
                  aria-pressed={experience === x}
                  onClick={() => setExperience(x)}
                  className={chipClass(experience === x)}
                >
                  {x}
                </button>
              ))}
            </div>
          </div>

          {!isHelper && (
            <>
              <div>
                <FormLabel>年齢</FormLabel>
                <input
                  type="text"
                  value={ageCondition}
                  onChange={(e) => setAgeCondition(e.target.value)}
                  placeholder="例：20〜40代"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <FormLabel>活動</FormLabel>
                <input
                  type="text"
                  value={activityNote}
                  onChange={(e) => setActivityNote(e.target.value)}
                  placeholder="例：土・日 ／ 午前"
                  className={INPUT_CLASS}
                />
              </div>
            </>
          )}

          <div>
            <FormLabel>{isHelper ? '参加費・謝礼' : '会費'}</FormLabel>
            <input
              type="text"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              placeholder={isHelper ? '例：参加費1,000円、謝礼なし' : '例：月1,000円'}
              className={INPUT_CLASS}
            />
          </div>

          {isHelper ? (
            <div>
              <FormLabel>対戦相手</FormLabel>
              <input
                type="text"
                value={opponentName}
                onChange={(e) => setOpponentName(e.target.value)}
                placeholder="例：〇〇ベースボールクラブ"
                className={INPUT_CLASS}
              />
            </div>
          ) : (
            <div>
              <FormLabel>体験参加</FormLabel>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: true, label: 'OK' },
                  { value: false, label: 'NG' },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    aria-pressed={trialOk === opt.value}
                    onClick={() => setTrialOk(trialOk === opt.value ? null : opt.value)}
                    className={chipClass(trialOk === opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <FormLabel>コメント</FormLabel>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="チームの雰囲気、当日の流れ、持ち物など"
              className={INPUT_CLASS}
            />
          </div>
        </Section>

        <Section title="連絡先（1つ以上）">
          <div>
            <label className="block text-xs text-[var(--ink-mute)] mb-1">メールアドレス</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="team@example.com"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--ink-mute)] mb-1">電話番号</label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="090-0000-0000"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--ink-mute)] mb-1">その他</label>
            <input
              type="text"
              value={contactOther}
              onChange={(e) => setContactOther(e.target.value)}
              placeholder="LINEオープンチャットのURL など"
              className={INPUT_CLASS}
            />
          </div>
        </Section>
      </div>

      <div className="fixed bottom-0 inset-x-0 z-40 bg-[var(--surface)] border-t border-[var(--line)] p-4">
        <div className="max-w-2xl mx-auto flex gap-3">
          <button
            type="button"
            onClick={() => (isEdit ? router.push(`/posts/${initialPost.id}`) : router.back())}
            className="flex-1 bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] font-semibold py-3 rounded-xl"
          >
            戻る
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-[2] bg-[var(--green)] hover:opacity-90 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-opacity"
          >
            {submitting ? (isEdit ? '保存中...' : '投稿中...') : isEdit ? '修正を保存する' : '募集を投稿する'}
          </button>
        </div>
      </div>
    </form>
  )
}
