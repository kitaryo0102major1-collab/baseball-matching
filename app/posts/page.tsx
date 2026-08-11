'use client'

import { useCallback, useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { MatchPost, FieldStatus, Level } from '@/lib/types'
import { PREFECTURES } from '@/lib/prefectures'
import PostCard from '@/components/PostCard'
import PostMethodSheet from '@/components/PostMethodSheet'

const LEVELS: Level[] = ['A+', 'A', 'B', 'C']

function chipClass(active: boolean) {
  return `text-[13px] px-3 py-1.5 rounded-full border transition-colors ${
    active
      ? 'bg-[var(--green)] text-[var(--bg)] font-bold border-[var(--green)]'
      : 'bg-[var(--surface)] text-[var(--ink-sub)] border-[var(--line)]'
  }`
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function PostsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [prefecture, setPrefecture] = useState(searchParams.get('prefecture') ?? '')
  const [date, setDate] = useState(searchParams.get('date') ?? '')
  const [field, setField] = useState<'' | FieldStatus>((searchParams.get('field') as FieldStatus) ?? '')
  const [level, setLevel] = useState<'' | Level>((searchParams.get('level') as Level) ?? '')
  const [weekend, setWeekend] = useState(searchParams.get('weekend') === '1')
  const [showDecided, setShowDecided] = useState(searchParams.get('decided') === '1')
  const [moreOpen, setMoreOpen] = useState(false)
  const [sort, setSort] = useState<'date' | 'new'>('date')
  const [methodSheetOpen, setMethodSheetOpen] = useState(false)

  const [posts, setPosts] = useState<MatchPost[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    const today = todayISO()
    const floor = date && date > today ? date : today

    let query = supabase.from('match_posts').select('*').gte('game_date', floor)
    if (prefecture) query = query.eq('prefecture', prefecture)
    if (field) query = query.eq('field_status', field)
    if (level) query = query.eq('level', level)
    if (!showDecided) query = query.neq('status', '決定済み')

    const { data, error } = await query
    if (!error && data) setPosts(data as MatchPost[])
    setLoading(false)
  }, [prefecture, date, field, level, showDecided])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  useEffect(() => {
    const params = new URLSearchParams()
    if (prefecture) params.set('prefecture', prefecture)
    if (date) params.set('date', date)
    if (field) params.set('field', field)
    if (level) params.set('level', level)
    if (weekend) params.set('weekend', '1')
    if (showDecided) params.set('decided', '1')
    const qs = params.toString()
    router.replace(qs ? `/posts?${qs}` : '/posts')
  }, [prefecture, date, field, level, weekend, showDecided, router])

  function resetAll() {
    setPrefecture('')
    setDate('')
    setField('')
    setLevel('')
    setWeekend(false)
    setShowDecided(false)
  }

  const weekendFiltered = weekend
    ? posts.filter((p) => [0, 6].includes(new Date(`${p.game_date}T00:00:00`).getDay()))
    : posts

  const sorted = [...weekendFiltered].sort((a, b) => {
    const aDecided = a.status === '決定済み'
    const bDecided = b.status === '決定済み'
    if (aDecided !== bDecided) return aDecided ? 1 : -1
    if (sort === 'new') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    return a.game_date.localeCompare(b.game_date)
  })

  const dateLabel = date
    ? new Date(`${date}T00:00:00`).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })
    : ''

  const appliedChips: { key: string; label: string; onRemove: () => void }[] = []
  if (prefecture) appliedChips.push({ key: 'prefecture', label: prefecture, onRemove: () => setPrefecture('') })
  if (date) appliedChips.push({ key: 'date', label: `${dateLabel}以降`, onRemove: () => setDate('') })
  if (field) {
    appliedChips.push({
      key: 'field',
      label: field === 'ok' ? 'グラウンドあり' : 'グラウンドなし',
      onRemove: () => setField(''),
    })
  }
  if (level) appliedChips.push({ key: 'level', label: `Lv.${level}`, onRemove: () => setLevel('') })
  if (weekend) appliedChips.push({ key: 'weekend', label: '土日のみ', onRemove: () => setWeekend(false) })
  if (showDecided) appliedChips.push({ key: 'decided', label: '決定済みも表示', onRemove: () => setShowDecided(false) })

  function renderPrefectureSelect(className: string) {
    return (
      <select value={prefecture} onChange={(e) => setPrefecture(e.target.value)} className={className}>
        <option value="">都道府県 すべて</option>
        {PREFECTURES.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
    )
  }

  function renderDateInput(className: string) {
    return (
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        title="この日以降"
        className={className}
      />
    )
  }

  function renderFieldChips() {
    const options: { value: '' | FieldStatus; label: string }[] = [
      { value: '', label: 'すべて' },
      { value: 'ok', label: 'グラウンドあり' },
      { value: 'ng', label: 'グラウンドなし' },
    ]
    return (
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value || 'all'}
            type="button"
            onClick={() => setField(opt.value)}
            className={chipClass(field === opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    )
  }

  function renderLevelChips() {
    return (
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setLevel('')} className={chipClass(level === '')}>
          レベル指定なし
        </button>
        {LEVELS.map((l) => (
          <button key={l} type="button" onClick={() => setLevel(l)} className={chipClass(level === l)}>
            Lv.{l}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-lg font-bold text-[var(--ink)] px-4 pt-4 lg:pt-8 lg:px-0 lg:mb-2">募集一覧</h1>

      {/* モバイル用フィルターバー */}
      <div className="lg:hidden bg-[var(--surface)] border-b border-[var(--line)] px-4 pt-2.5 pb-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {renderPrefectureSelect(
            'rounded-[10px] px-3 py-2.5 text-sm font-bold bg-[var(--bg)] border border-[var(--line)]'
          )}
          {renderDateInput('rounded-[10px] px-3 py-2.5 text-sm font-bold bg-[var(--bg)] border border-[var(--line)]')}
        </div>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {renderFieldChips()}
          <button
            type="button"
            onClick={() => setMoreOpen((o) => !o)}
            className="text-[13px] font-semibold text-[var(--ink-sub)]"
          >
            もっと絞り込む {moreOpen ? '▴' : '▾'}
          </button>
        </div>
        {moreOpen && (
          <div className="pt-2 space-y-2 border-t border-[var(--line)]">
            {renderLevelChips()}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setWeekend((w) => !w)} className={chipClass(weekend)}>
                土日のみ
              </button>
              <button type="button" onClick={() => setShowDecided((v) => !v)} className={chipClass(showDecided)}>
                決定済みも表示
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-6 lg:flex lg:gap-6 lg:items-start">
        {/* PC用サイドバー */}
        <aside className="hidden lg:block lg:sticky lg:top-20 lg:w-64 shrink-0 space-y-4">
          <div>
            <p className="text-[13px] text-[var(--ink-mute)] mb-1">都道府県</p>
            {renderPrefectureSelect(
              'w-full rounded-[10px] px-3 py-2.5 text-sm font-bold bg-[var(--bg)] border border-[var(--line)]'
            )}
          </div>
          <div>
            <p className="text-[13px] text-[var(--ink-mute)] mb-1">日付</p>
            {renderDateInput(
              'w-full rounded-[10px] px-3 py-2.5 text-sm font-bold bg-[var(--bg)] border border-[var(--line)]'
            )}
          </div>
          <div>
            <p className="text-[13px] text-[var(--ink-mute)] mb-1">グラウンド</p>
            {renderFieldChips()}
          </div>
          <div>
            <p className="text-[13px] text-[var(--ink-mute)] mb-1">レベル</p>
            {renderLevelChips()}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setWeekend((w) => !w)} className={chipClass(weekend)}>
              土日のみ
            </button>
            <button type="button" onClick={() => setShowDecided((v) => !v)} className={chipClass(showDecided)}>
              決定済みも表示
            </button>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          {/* 結果ヘッダー */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-[var(--ink-sub)]">
              <span className="font-bold text-[var(--ink)]">{sorted.length}</span> 件の募集
            </p>
            <button
              type="button"
              onClick={() => setSort((s) => (s === 'date' ? 'new' : 'date'))}
              className="text-[13px] font-semibold text-[var(--ink-sub)]"
            >
              {sort === 'date' ? '日付が近い順' : '新着順'} ▾
            </button>
          </div>

          {/* 適用中の条件チップ */}
          {appliedChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mb-4">
              {appliedChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.onRemove}
                  className="bg-[var(--green-bg)] text-[var(--green)] text-xs px-2.5 py-1.5 rounded-full inline-flex items-center gap-1"
                >
                  {chip.label} <span aria-hidden>✕</span>
                </button>
              ))}
              <button type="button" onClick={resetAll} className="text-xs text-[var(--ink-mute)] underline px-1">
                すべて解除
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-16 text-[var(--ink-mute)]">読み込み中...</div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-11 h-11 rounded-full border-2 border-dashed border-[var(--line)] mx-auto mb-4" />
              <p className="text-[var(--ink-sub)] text-sm mb-1">この条件の募集はまだありません。</p>
              <p className="text-[var(--ink-mute)] text-xs mb-6">次のどれかを試してみてください。</p>
              <div className="max-w-xs mx-auto space-y-2.5">
                {prefecture && (
                  <button
                    type="button"
                    onClick={() => setPrefecture('')}
                    className="w-full bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] text-sm font-semibold py-2.5 rounded-xl"
                  >
                    エリアを全国に広げて見る
                  </button>
                )}
                <button
                  type="button"
                  onClick={resetAll}
                  className="w-full bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] text-sm font-semibold py-2.5 rounded-xl"
                >
                  絞り込みをすべて解除する
                </button>
                <button
                  type="button"
                  onClick={() => setMethodSheetOpen(true)}
                  className="w-full bg-[var(--green-bg)] border-[1.5px] border-[var(--green)] text-[var(--green)] text-sm font-bold py-2.5 rounded-xl"
                >
                  この条件で自分の募集を出す
                </button>
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

      <PostMethodSheet open={methodSheetOpen} onClose={() => setMethodSheetOpen(false)} />
    </div>
  )
}

export default function PostsPage() {
  return (
    <Suspense fallback={<div className="text-center py-16 text-[var(--ink-mute)]">読み込み中...</div>}>
      <PostsContent />
    </Suspense>
  )
}
