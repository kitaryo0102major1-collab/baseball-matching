'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { MatchPost, FieldStatus, Level } from '@/lib/types'
import PostCard from '@/components/PostCard'
import Link from 'next/link'

const AREAS = ['北海道', '東北', '関東', '東海', '北陸', '近畿', '中国', '四国', '九州・沖縄']
const LEVELS: Level[] = ['A+', 'A', 'B', 'C']

const LEVEL_LABELS: Record<Level, string> = {
  'A+': 'A+ ガチ草野球',
  'A': 'A スタメン全員経験者',
  'B': 'B 未経験5人未満',
  'C': 'C 未経験5人以上',
}

export default function PostsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [posts, setPosts] = useState<MatchPost[]>([])
  const [loading, setLoading] = useState(true)
  const [filterOpen, setFilterOpen] = useState(true)

  const [field, setField] = useState<'' | FieldStatus>(
    (searchParams.get('field') as FieldStatus) ?? ''
  )
  const [area, setArea] = useState(searchParams.get('area') ?? '')
  const [date, setDate] = useState(searchParams.get('date') ?? '')
  const [level, setLevel] = useState<'' | Level>(
    (searchParams.get('level') as Level) ?? ''
  )

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('match_posts')
      .select('*')
      .order('created_at', { ascending: false })

    if (field) query = query.eq('field_status', field)
    if (area) query = query.eq('area', area)
    if (date) query = query.eq('game_date', date)
    if (level) query = query.eq('level', level)

    const { data, error } = await query
    if (!error && data) setPosts(data as MatchPost[])
    setLoading(false)
  }, [field, area, date, level])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  function applyFilter() {
    const params = new URLSearchParams()
    if (field) params.set('field', field)
    if (area) params.set('area', area)
    if (date) params.set('date', date)
    if (level) params.set('level', level)
    router.replace(`/posts?${params.toString()}`)
    fetchPosts()
  }

  function resetFilter() {
    setField('')
    setArea('')
    setDate('')
    setLevel('')
    router.replace('/posts')
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">募集一覧</h1>
        <Link
          href="/posts/new"
          className="bg-[#1D9E75] hover:bg-[#0F6E56] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          ＋ 募集を投稿
        </Link>
      </div>

      {/* 絞り込みバー */}
      <div className="bg-white rounded-xl border border-gray-200 mb-6 overflow-hidden">
        <button
          onClick={() => setFilterOpen(!filterOpen)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <span>🔍</span> 絞り込み
          </span>
          <span className="text-gray-400">{filterOpen ? '▲' : '▼'}</span>
        </button>

        {filterOpen && (
          <div className="px-5 pb-4 border-t border-gray-100">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {/* グラウンド */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">グラウンド</label>
                <select
                  value={field}
                  onChange={(e) => setField(e.target.value as '' | FieldStatus)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40"
                >
                  <option value="">すべて</option>
                  <option value="ok">あり</option>
                  <option value="ng">なし</option>
                </select>
              </div>

              {/* エリア */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">エリア</label>
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40"
                >
                  <option value="">すべて</option>
                  {AREAS.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              {/* 日付 */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">日付</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40"
                />
              </div>

              {/* レベル */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">レベル</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value as '' | Level)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40"
                >
                  <option value="">すべて</option>
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>{LEVEL_LABELS[l]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={applyFilter}
                className="bg-[#1D9E75] hover:bg-[#0F6E56] text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
              >
                絞り込む
              </button>
              <button
                onClick={resetFilter}
                className="border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                リセット
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 投稿一覧 */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">読み込み中...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">⚾</div>
          <p className="text-gray-500">条件に合う募集が見つかりませんでした。</p>
          <button onClick={resetFilter} className="mt-3 text-sm text-[#1D9E75] underline">
            絞り込みをリセット
          </button>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-400 mb-4">{posts.length}件の募集</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
