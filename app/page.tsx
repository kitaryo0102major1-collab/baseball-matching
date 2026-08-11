'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { MatchPost } from '@/lib/types'
import PostCard from '@/components/PostCard'
import { POPULAR_PREFECTURES } from '@/lib/prefectures'

const HOW_TO_STEPS = [
  {
    step: '1',
    title: '募集を探す',
    desc: '「グラウンドあり」「グラウンドなし」で絞り込んで、エリアや日程が合う対戦相手を見つけましょう。',
  },
  {
    step: '2',
    title: '連絡を取る',
    desc: '募集詳細ページに記載のメール・電話・SNSで直接チームに連絡してください。',
  },
  {
    step: '3',
    title: '試合を楽しむ',
    desc: '日程・場所などを相談して、練習試合を楽しみましょう！',
  },
]

function HowToAccordion() {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-[var(--line)] rounded-xl overflow-hidden bg-[var(--surface)]">
      <button
        onClick={() => setOpen(!open)}
        className="sm:hidden w-full flex items-center justify-between px-6 py-4 text-left font-semibold text-[var(--ink)] hover:bg-[var(--bg)] transition-colors"
      >
        <span>使い方を見る</span>
        <span
          className="text-[var(--green)] text-xl inline-block transition-transform duration-200"
          style={{ transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}
        >
          ＋
        </span>
      </button>
      <div className="hidden sm:block px-6 pt-5 font-semibold text-[var(--ink)]">使い方</div>
      <div
        className={`${open ? 'grid' : 'hidden'} sm:grid px-6 pb-6 grid-cols-1 sm:grid-cols-3 gap-4 border-t border-[var(--line)] sm:border-t-0 sm:mt-1`}
      >
        {HOW_TO_STEPS.map((s) => (
          <div key={s.step} className="pt-5">
            <div className="w-9 h-9 rounded-full bg-[var(--green)] text-white font-bold flex items-center justify-center mb-3 text-sm">
              {s.step}
            </div>
            <p className="font-semibold text-[var(--ink)] mb-1">{s.title}</p>
            <p className="text-sm text-[var(--ink-sub)] leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TopPage() {
  const [prefectureCounts, setPrefectureCounts] = useState<Record<string, number>>({})
  const [recentPosts, setRecentPosts] = useState<MatchPost[]>([])

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)

    async function loadCounts() {
      const { data } = await supabase
        .from('match_posts')
        .select('prefecture')
        .eq('status', '募集中')
        .gte('game_date', today)
        .in('prefecture', POPULAR_PREFECTURES)

      if (data) {
        const tally: Record<string, number> = {}
        for (const row of data) {
          if (row.prefecture) tally[row.prefecture] = (tally[row.prefecture] ?? 0) + 1
        }
        setPrefectureCounts(tally)
      }
    }

    async function loadRecent() {
      const { data } = await supabase
        .from('match_posts')
        .select('*')
        .eq('status', '募集中')
        .gte('game_date', today)
        .order('created_at', { ascending: false })
        .limit(2)

      if (data) setRecentPosts(data as MatchPost[])
    }

    loadCounts()
    loadRecent()
  }, [])

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
      <div className="lg:grid lg:grid-cols-[1.1fr_1fr] lg:gap-8 lg:items-start">
        {/* ヒーロー */}
        <section className="space-y-3">
          <div className="inline-block bg-[var(--green-bg)] text-[var(--green)] text-xs font-semibold px-4 py-1 rounded-full border border-[var(--green)]/20">
            登録なしで、すぐ使えます
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-[var(--ink)] leading-[1.25]">
            草野球の対戦相手を、
            <br />
            ここで見つける。
          </h1>
          <p className="text-[var(--ink-sub)] text-base sm:text-lg leading-[1.7]">
            エリア・レベルで絞って対戦相手を探す。
            <br />
            募集の投稿は1分でできます
          </p>
        </section>

        <div className="mt-8 lg:mt-0 space-y-4">
          {/* 相手を探すカード */}
          <section className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--green)]" />
              <h2 className="font-bold text-[var(--ink)]">相手を探す</h2>
            </div>

            {POPULAR_PREFECTURES.some((p) => prefectureCounts[p]) && (
              <div className="flex flex-wrap gap-2 mb-4">
                {POPULAR_PREFECTURES.filter((p) => prefectureCounts[p]).map((p) => (
                  <Link
                    key={p}
                    href={`/posts?prefecture=${encodeURIComponent(p)}`}
                    className="text-sm px-3 py-1.5 rounded-full border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] hover:border-[var(--green)] transition-colors"
                  >
                    {p} <span className="text-[var(--ink-mute)]">{prefectureCounts[p]}</span>
                  </Link>
                ))}
              </div>
            )}

            <Link
              href="/posts"
              className="block text-center border-2 border-[var(--green)] text-[var(--green)] font-semibold py-2.5 rounded-xl hover:bg-[var(--green-bg)] transition-colors"
            >
              すべての募集を見る
            </Link>
          </section>

          {/* 募集するカード */}
          <section className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--clay)]" />
              <h2 className="font-bold text-[var(--ink)]">募集する</h2>
            </div>

            <div className="space-y-3">
              <Link
                href="/posts/quick"
                className="block bg-[var(--green-bg)] border-2 border-[var(--green)] rounded-xl p-4"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-[var(--green)]">かんたん募集</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--green)] text-white">
                    おすすめ
                  </span>
                </div>
                <p className="text-sm text-[var(--ink-sub)] mt-1">チャットに答えるだけ・1分で終わります</p>
              </Link>

              <Link href="/posts/new" className="block px-1 py-1">
                <p className="font-semibold text-[var(--ink)]">くわしく募集</p>
                <p className="text-sm text-[var(--ink-sub)] mt-0.5">コメントや連絡先まで入力する・3ステップ</p>
              </Link>
            </div>
          </section>
        </div>
      </div>

      {/* 直近の募集 */}
      {recentPosts.length > 0 && (
        <section className="mt-10">
          <h2 className="font-bold text-[var(--ink)] mb-3">直近の募集</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}

      {/* 使い方アコーディオン */}
      <section className="mt-10">
        <HowToAccordion />
      </section>
    </div>
  )
}
