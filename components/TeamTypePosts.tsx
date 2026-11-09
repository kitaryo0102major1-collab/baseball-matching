'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { todayJST } from '@/lib/dates'
import { POST_WITH_TEAM_SELECT } from '@/lib/postQueries'
import { memberListingCutoff, syncListUrl } from '@/lib/postRules'
import { PREFECTURES } from '@/lib/prefectures'
import { POSITIONS, type MatchPostWithTeam, type Position } from '@/lib/types'
import PostCard from './PostCard'

// 「どこでも」の募集はどのポジションで絞っても該当するので、絞り込みの選択肢には出さない
const FILTER_POSITIONS = POSITIONS.filter((p) => p !== 'どこでも')

function chipClass(active: boolean) {
  return `text-[13px] px-3 py-1.5 rounded-full border transition-colors ${
    active
      ? 'bg-[var(--green)] text-[var(--bg)] font-bold border-[var(--green)]'
      : 'bg-[var(--surface)] text-[var(--ink-sub)] border-[var(--line)]'
  }`
}

const FIELD_CLASS = 'w-full rounded-[10px] px-3 py-2.5 text-sm font-bold bg-[var(--bg)] border border-[var(--line)]'

interface Props {
  type: 'helper' | 'member'
}

export default function TeamTypePosts({ type }: Props) {
  const searchParams = useSearchParams()
  const isHelper = type === 'helper'

  const positionParam = searchParams.get('position')
  const [prefecture, setPrefecture] = useState(searchParams.get('prefecture') ?? '')
  const [position, setPosition] = useState<Position | ''>(FILTER_POSITIONS.find((p) => p === positionParam) ?? '')
  const [date, setDate] = useState(searchParams.get('date') ?? '')
  const [weekend, setWeekend] = useState(searchParams.get('weekend') === '1')
  const [showDecided, setShowDecided] = useState(searchParams.get('decided') !== '0')
  const [beginnerOk, setBeginnerOk] = useState(searchParams.get('beginner') === '1')
  const [trialOk, setTrialOk] = useState(searchParams.get('trial') === '1')

  const [posts, setPosts] = useState<MatchPostWithTeam[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      let query = supabase.from('match_posts').select(POST_WITH_TEAM_SELECT).eq('post_type', type)
      if (prefecture) query = query.eq('prefecture', prefecture)
      if (position) query = query.overlaps('positions', [position, 'どこでも'])

      if (isHelper) {
        const today = todayJST()
        query = query.gte('game_date', date && date > today ? date : today)
        if (!showDecided) query = query.eq('status', '募集中')
        query = query.order('game_date', { ascending: true })
      } else {
        query = query.eq('status', '募集中').gte('renewed_at', memberListingCutoff())
        if (beginnerOk) query = query.in('experience', ['未経験OK', '問わない'])
        if (trialOk) query = query.eq('trial_ok', true)
        query = query.order('renewed_at', { ascending: false })
      }

      const { data, error } = await query
      if (cancelled) return
      if (!error && data) setPosts(data as MatchPostWithTeam[])
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [type, isHelper, prefecture, position, date, showDecided, beginnerOk, trialOk])

  useEffect(() => {
    const params = new URLSearchParams({ type })
    if (prefecture) params.set('prefecture', prefecture)
    if (position) params.set('position', position)
    if (isHelper) {
      if (date) params.set('date', date)
      if (weekend) params.set('weekend', '1')
      if (!showDecided) params.set('decided', '0')
    } else {
      if (beginnerOk) params.set('beginner', '1')
      if (trialOk) params.set('trial', '1')
    }
    syncListUrl(params)
  }, [type, isHelper, prefecture, position, date, weekend, showDecided, beginnerOk, trialOk])

  function resetAll() {
    setPrefecture('')
    setPosition('')
    setDate('')
    setWeekend(false)
    setShowDecided(true)
    setBeginnerOk(false)
    setTrialOk(false)
  }

  const visible = weekend
    ? posts.filter((p) => p.game_date && [0, 6].includes(new Date(`${p.game_date}T00:00:00`).getDay()))
    : posts
  // 決定済みは一覧の後ろに回す（対戦相手タブと同じ）
  const sorted = [...visible].sort((a, b) => Number(a.status === '決定済み') - Number(b.status === '決定済み'))

  return (
    <div className="px-4 py-6 lg:px-0 lg:flex lg:gap-6 lg:items-start">
      <aside className="lg:sticky lg:top-20 lg:w-64 shrink-0 space-y-3 mb-5 lg:mb-0">
        <div>
          <p className="text-[13px] text-[var(--ink-mute)] mb-1">都道府県</p>
          <select value={prefecture} onChange={(e) => setPrefecture(e.target.value)} className={FIELD_CLASS}>
            <option value="">都道府県 すべて</option>
            {PREFECTURES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {isHelper && (
          <div>
            <p className="text-[13px] text-[var(--ink-mute)] mb-1">日付（この日以降）</p>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={FIELD_CLASS} />
          </div>
        )}

        <div>
          <p className="text-[13px] text-[var(--ink-mute)] mb-1">ポジション</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setPosition('')} className={chipClass(position === '')}>
              すべて
            </button>
            {FILTER_POSITIONS.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={position === p}
                onClick={() => setPosition(p)}
                className={chipClass(position === p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {isHelper ? (
            <>
              <button type="button" aria-pressed={weekend} onClick={() => setWeekend((v) => !v)} className={chipClass(weekend)}>
                土日のみ
              </button>
              <button
                type="button"
                aria-pressed={showDecided}
                onClick={() => setShowDecided((v) => !v)}
                className={chipClass(showDecided)}
              >
                決定済みも表示
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                aria-pressed={beginnerOk}
                onClick={() => setBeginnerOk((v) => !v)}
                className={chipClass(beginnerOk)}
              >
                未経験OK
              </button>
              <button type="button" aria-pressed={trialOk} onClick={() => setTrialOk((v) => !v)} className={chipClass(trialOk)}>
                体験OK
              </button>
            </>
          )}
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--ink-sub)] mb-3">
          <span className="font-bold text-[var(--ink)]">{sorted.length}</span> 件の募集
        </p>

        {loading ? (
          <div className="text-center py-16 text-[var(--ink-mute)]">読み込み中...</div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[var(--ink-sub)] text-sm mb-6">この条件の募集はまだありません。</p>
            <div className="max-w-xs mx-auto space-y-2.5">
              <button
                type="button"
                onClick={resetAll}
                className="w-full bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] text-sm font-semibold py-2.5 rounded-xl"
              >
                絞り込みをすべて解除する
              </button>
              <Link
                href={`/posts/new/${type}`}
                className="block bg-[var(--green-bg)] border-[1.5px] border-[var(--green)] text-[var(--green)] text-sm font-bold py-2.5 rounded-xl"
              >
                {isHelper ? '助っ人を募集する' : 'メンバーを募集する'}
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
