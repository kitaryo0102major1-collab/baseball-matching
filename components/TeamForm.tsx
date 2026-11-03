'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PREFECTURES, POPULAR_PREFECTURES } from '@/lib/prefectures'
import {
  ACTIVITY_DAYS,
  ACTIVITY_TIMES,
  AGE_RANGES,
  type ActivityDay,
  type ActivityTime,
  type AgeRange,
  type Level,
  type Team,
  type TeamInput,
} from '@/lib/types'
import TeamAvatar from './TeamAvatar'

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

const MAX_LOGO_BYTES = 2 * 1024 * 1024
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const CURRENT_YEAR = new Date().getFullYear()

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 space-y-5">
      <h2 className="text-base font-bold text-[var(--ink)]">{title}</h2>
      {children}
    </section>
  )
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

function parseOptionalInt(value: string): number | null {
  if (!value.trim()) return null
  const n = Number(value)
  return Number.isInteger(n) ? n : NaN
}

function isHttpUrl(value: string) {
  return /^https?:\/\/\S+$/i.test(value)
}

interface Props {
  userId: string
  initialTeam: Team | null
}

export default function TeamForm({ userId, initialTeam }: Props) {
  const router = useRouter()
  const isEdit = !!initialTeam

  const [name, setName] = useState(initialTeam?.name ?? '')
  const [level, setLevel] = useState<Level | ''>(initialTeam?.level ?? '')
  const [description, setDescription] = useState(initialTeam?.description ?? '')
  const [prefecture, setPrefecture] = useState(initialTeam?.prefecture ?? '')
  const [areaDetail, setAreaDetail] = useState(initialTeam?.area_detail ?? '')
  const [activityDays, setActivityDays] = useState<ActivityDay[]>(initialTeam?.activity_days ?? [])
  const [activityTimes, setActivityTimes] = useState<ActivityTime[]>(initialTeam?.activity_times ?? [])
  const [homeGround, setHomeGround] = useState(initialTeam?.home_ground ?? '')
  const [memberCount, setMemberCount] = useState(initialTeam?.member_count?.toString() ?? '')
  const [ageRange, setAgeRange] = useState<AgeRange | ''>(initialTeam?.age_range ?? '')
  const [foundedYear, setFoundedYear] = useState(initialTeam?.founded_year?.toString() ?? '')
  const [league, setLeague] = useState(initialTeam?.league ?? '')
  const [snsX, setSnsX] = useState(initialTeam?.sns_x ?? '')
  const [snsInstagram, setSnsInstagram] = useState(initialTeam?.sns_instagram ?? '')
  const [contactEmail, setContactEmail] = useState(initialTeam?.contact_email ?? '')
  const [contactPhone, setContactPhone] = useState(initialTeam?.contact_phone ?? '')
  const [contactOther, setContactOther] = useState(initialTeam?.contact_other ?? '')
  const [contactPublic, setContactPublic] = useState(initialTeam?.contact_public ?? false)

  const [logoUrl, setLogoUrl] = useState<string | null>(initialTeam?.logo_url ?? null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null)
      return
    }
    const url = URL.createObjectURL(logoFile)
    setLogoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [logoFile])

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!LOGO_TYPES.includes(file.type)) {
      setErrors((prev) => ({ ...prev, logo: 'ロゴは PNG・JPEG・WebP・GIF の画像を選んでください' }))
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      setErrors((prev) => ({ ...prev, logo: 'ロゴ画像は2MB以下にしてください' }))
      return
    }
    setErrors(({ logo: _removed, ...rest }) => rest)
    setLogoFile(file)
  }

  function handleLogoRemove() {
    setLogoFile(null)
    setLogoUrl(null)
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'チーム名を入力してください'
    else if (name.trim().length > 50) e.name = 'チーム名は50文字以内にしてください'
    if (!level) e.level = 'レベルを選択してください'
    if (!prefecture) e.prefecture = '活動している都道府県を選択してください'
    if (description.length > 500) e.description = '紹介文は500文字以内にしてください'

    const members = parseOptionalInt(memberCount)
    if (members !== null && (Number.isNaN(members) || members < 1 || members > 999)) {
      e.memberCount = 'メンバー数は1〜999の数字で入力してください'
    }
    const year = parseOptionalInt(foundedYear)
    if (year !== null && (Number.isNaN(year) || year < 1900 || year > CURRENT_YEAR)) {
      e.foundedYear = `結成年は1900〜${CURRENT_YEAR}の西暦で入力してください`
    }
    if (snsX.trim() && !isHttpUrl(snsX.trim())) e.snsX = 'X のURLは https:// から入力してください'
    if (snsInstagram.trim() && !isHttpUrl(snsInstagram.trim())) {
      e.snsInstagram = 'Instagram のURLは https:// から入力してください'
    }
    return e
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setSaving(true)
    setErrors({})
    const supabase = createClient()

    let nextLogoUrl = logoUrl
    if (logoFile) {
      const path = `${userId}/logo`
      const { error: uploadError } = await supabase.storage
        .from('team-logos')
        .upload(path, logoFile, { upsert: true, contentType: logoFile.type, cacheControl: '3600' })
      if (uploadError) {
        setSaving(false)
        setErrors({ submit: 'ロゴ画像のアップロードに失敗しました。画像を変えるか、もう一度お試しください。' })
        return
      }
      const { data } = supabase.storage.from('team-logos').getPublicUrl(path)
      // 同じパスに上書きするため、URLを変えてブラウザ・CDNのキャッシュを避ける
      nextLogoUrl = `${data.publicUrl}?v=${Date.now()}`
    } else if (!logoUrl && initialTeam?.logo_url) {
      await supabase.storage.from('team-logos').remove([`${userId}/logo`])
    }

    const payload: TeamInput = {
      owner_id: userId,
      name: name.trim(),
      logo_url: nextLogoUrl,
      description: description.trim() || null,
      prefecture,
      area_detail: areaDetail.trim() || null,
      level: level as Level,
      activity_days: ACTIVITY_DAYS.filter((d) => activityDays.includes(d)),
      activity_times: ACTIVITY_TIMES.filter((t) => activityTimes.includes(t)),
      home_ground: homeGround.trim() || null,
      member_count: parseOptionalInt(memberCount),
      age_range: ageRange || null,
      founded_year: parseOptionalInt(foundedYear),
      league: league.trim() || null,
      sns_x: snsX.trim() || null,
      sns_instagram: snsInstagram.trim() || null,
      contact_email: contactEmail.trim() || null,
      contact_phone: contactPhone.trim() || null,
      contact_other: contactOther.trim() || null,
      contact_public: contactPublic,
    }

    const { error } = isEdit
      ? await supabase.from('teams').update(payload).eq('id', initialTeam.id)
      : await supabase.from('teams').insert(payload)

    if (error) {
      setSaving(false)
      setErrors({
        submit:
          error.code === '23505'
            ? 'このアカウントではすでにチームが登録されています。ページを再読み込みしてください。'
            : '保存に失敗しました。もう一度お試しください。',
      })
      return
    }

    router.push('/mypage')
    router.refresh()
  }

  const shownLogo = logoPreview ?? logoUrl

  return (
    <form onSubmit={handleSubmit} className="pb-28">
      <div className="max-w-2xl mx-auto px-4 pt-8 space-y-5">
        <div>
          <h1 className="text-xl font-black text-[var(--ink)]">{isEdit ? 'チーム情報を編集' : 'チームを登録する'}</h1>
          <p className="text-sm text-[var(--ink-mute)] mt-1">
            {isEdit ? '変更した内容はチームページにすぐ反映されます。' : '必須は3項目だけ。ほかは後からいつでも追加できます。'}
          </p>
        </div>

        {Object.keys(errors).length > 0 && (
          <div className="bg-[#FBEDE8] border border-[#EBC9BC] text-[#A3462B] rounded-xl p-4 text-sm space-y-1">
            {Object.values(errors).map((msg, i) => (
              <p key={i}>{msg}</p>
            ))}
          </div>
        )}

        <Section title="基本情報">
          <div>
            <FormLabel>チームロゴ（任意）</FormLabel>
            <div className="flex items-center gap-4">
              <TeamAvatar name={name || '?'} logoUrl={shownLogo} size={72} />
              <div className="space-y-2">
                <label className="inline-block cursor-pointer text-sm font-bold text-[var(--green)] border border-[var(--green)]/40 rounded-lg px-3 py-2 hover:bg-[var(--green-bg)] transition-colors">
                  画像を選ぶ
                  <input type="file" accept={LOGO_TYPES.join(',')} onChange={handleLogoChange} className="sr-only" />
                </label>
                {shownLogo && (
                  <button type="button" onClick={handleLogoRemove} className="block text-xs text-[var(--ink-mute)] underline">
                    ロゴを外す
                  </button>
                )}
                <p className="text-xs text-[var(--ink-mute)]">PNG・JPEG・WebP・GIF／2MBまで</p>
              </div>
            </div>
          </div>

          <div>
            <FormLabel required>チーム名</FormLabel>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              placeholder="例：〇〇ベースボールクラブ"
              className={inputClass(!!errors.name)}
            />
          </div>

          <div>
            <FormLabel required>チームレベル</FormLabel>
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

          <div>
            <FormLabel>紹介文（任意）</FormLabel>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={5}
              placeholder="チームの雰囲気、活動の様子、こんな相手と試合したい など"
              className={inputClass(!!errors.description)}
            />
            <p className="text-right text-xs text-[var(--ink-mute)] mt-0.5">{description.length}/500</p>
          </div>
        </Section>

        <Section title="活動エリア">
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
            <FormLabel>市区町村・最寄り駅など（任意）</FormLabel>
            <input
              type="text"
              value={areaDetail}
              onChange={(e) => setAreaDetail(e.target.value)}
              placeholder="例：船橋市・津田沼駅周辺"
              className={inputClass()}
            />
          </div>

          <div>
            <FormLabel>ホームグラウンド（任意）</FormLabel>
            <input
              type="text"
              value={homeGround}
              onChange={(e) => setHomeGround(e.target.value)}
              placeholder="例：〇〇運動公園野球場"
              className={inputClass()}
            />
          </div>
        </Section>

        <Section title="活動日・メンバー">
          <div>
            <FormLabel>活動日（複数選択可）</FormLabel>
            <div className="flex flex-wrap gap-2">
              {ACTIVITY_DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={activityDays.includes(d)}
                  onClick={() => setActivityDays((prev) => toggle(prev, d))}
                  className={`${chipClass(activityDays.includes(d))} w-11 px-0 text-center`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <FormLabel>時間帯（複数選択可）</FormLabel>
            <div className="flex flex-wrap gap-2">
              {ACTIVITY_TIMES.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={activityTimes.includes(t)}
                  onClick={() => setActivityTimes((prev) => toggle(prev, t))}
                  className={chipClass(activityTimes.includes(t))}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FormLabel>メンバー数（任意）</FormLabel>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={999}
                  value={memberCount}
                  onChange={(e) => setMemberCount(e.target.value)}
                  placeholder="15"
                  className={inputClass(!!errors.memberCount)}
                />
                <span className="text-sm text-[var(--ink-sub)] shrink-0">人</span>
              </div>
            </div>
            <div>
              <FormLabel>結成年（任意）</FormLabel>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1900}
                  max={CURRENT_YEAR}
                  value={foundedYear}
                  onChange={(e) => setFoundedYear(e.target.value)}
                  placeholder="2015"
                  className={inputClass(!!errors.foundedYear)}
                />
                <span className="text-sm text-[var(--ink-sub)] shrink-0">年</span>
              </div>
            </div>
          </div>

          <div>
            <FormLabel>年齢層（任意）</FormLabel>
            <div className="flex flex-wrap gap-2">
              {AGE_RANGES.map((a) => (
                <button
                  key={a}
                  type="button"
                  aria-pressed={ageRange === a}
                  onClick={() => setAgeRange((prev) => (prev === a ? '' : a))}
                  className={chipClass(ageRange === a)}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div>
            <FormLabel>所属リーグ・大会（任意）</FormLabel>
            <input
              type="text"
              value={league}
              onChange={(e) => setLeague(e.target.value)}
              placeholder="例：〇〇市軟式野球連盟 2部"
              className={inputClass()}
            />
          </div>
        </Section>

        <Section title="SNS">
          <div>
            <label className="block text-xs text-[var(--ink-mute)] mb-1">X（旧Twitter）のアカウントURL</label>
            <input
              type="url"
              value={snsX}
              onChange={(e) => setSnsX(e.target.value)}
              placeholder="https://x.com/your_team"
              className={inputClass(!!errors.snsX)}
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--ink-mute)] mb-1">Instagram のアカウントURL</label>
            <input
              type="url"
              value={snsInstagram}
              onChange={(e) => setSnsInstagram(e.target.value)}
              placeholder="https://instagram.com/your_team"
              className={inputClass(!!errors.snsInstagram)}
            />
          </div>
        </Section>

        <Section title="連絡先">
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
                placeholder="LINEオープンチャットのURL など"
                className={inputClass()}
              />
            </div>
          </div>

          <div className="border-t border-[var(--line)] pt-4">
            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <span className="text-sm font-semibold text-[var(--ink)]">連絡先をチームページに公開する</span>
              <span className="relative inline-flex shrink-0">
                <input
                  type="checkbox"
                  role="switch"
                  checked={contactPublic}
                  onChange={(e) => setContactPublic(e.target.checked)}
                  className="peer sr-only"
                />
                <span className="w-12 h-7 rounded-full bg-[var(--line)] peer-checked:bg-[var(--green)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--green)]/40 transition-colors" />
                <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
              </span>
            </label>
            <p className="text-xs text-[#A3462B] mt-2">公開すると誰でも見られる状態になります</p>
            <p className="text-xs text-[var(--ink-mute)] mt-1">オフのままなら、連絡先はあなた以外には表示されません。</p>
          </div>
        </Section>
      </div>

      <div className="fixed bottom-0 inset-x-0 z-40 bg-[var(--surface)] border-t border-[var(--line)] p-4">
        <div className="max-w-2xl mx-auto flex gap-3">
          <button
            type="button"
            onClick={() => router.push(isEdit ? '/mypage' : '/')}
            className="flex-1 bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] font-semibold py-3 rounded-xl"
          >
            戻る
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-[2] bg-[var(--green)] hover:opacity-90 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-opacity"
          >
            {saving ? '保存中...' : isEdit ? '変更を保存する' : 'チームを登録する'}
          </button>
        </div>
      </div>
    </form>
  )
}
