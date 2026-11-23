'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { readLastSeen, writeLastSeen } from '@/lib/lastSeen'
import { fetchViewCounts } from '@/lib/postStats'
import type { MatchPost } from '@/lib/types'
import MemberRenewCard from './MemberRenewCard'
import PostCard from './PostCard'
import PostMethodButton from './PostMethodButton'
import { PostStats, VIEW_COUNT_NOTE } from './PostStats'

export type MyTeamPost = MatchPost & {
  posterName: string
  messageCount: number
  incomingChatTimes: string[]
}

interface Props {
  teamId: string
  renderedAt: string
  needsRenewal: MyTeamPost[]
  open: MyTeamPost[]
  decided: MyTeamPost[]
  past: MyTeamPost[]
}

export default function MyTeamPosts({ teamId, renderedAt, needsRenewal, open, decided, past }: Props) {
  const [lastSeen, setLastSeen] = useState<string | null>(null)
  const handled = useRef(false)

  // 開発時の二重実行で、保存したばかりの時刻を「前回」として読まないようにする
  useEffect(() => {
    if (handled.current) return
    handled.current = true
    const previous = readLastSeen(teamId)
    setLastSeen(previous)
    if (!previous || new Date(renderedAt) > new Date(previous)) writeLastSeen(teamId, renderedAt)
  }, [teamId, renderedAt])

  // 一覧に出す募集の閲覧数をまとめて1回で取得する（気になる数は各カードのボタンと同じ取得を使う）
  const listedIds = [...open, ...decided, ...past].map((p) => p.id).join(',')
  const [viewCounts, setViewCounts] = useState<Map<string, number | null> | null>(null)
  useEffect(() => {
    if (!listedIds) return
    let cancelled = false
    fetchViewCounts(listedIds.split(',')).then((counts) => {
      if (!cancelled) setViewCounts(counts)
    })
    return () => {
      cancelled = true
    }
  }, [listedIds])

  if (needsRenewal.length + open.length + decided.length + past.length === 0) {
    return (
      <section className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 space-y-4 text-center">
        <p className="text-sm font-bold text-[var(--ink)]">まだ募集がありません</p>
        <PostMethodButton />
      </section>
    )
  }

  const sections = [
    { title: '募集中', posts: open },
    { title: '決定済み', posts: decided },
    { title: '過去', posts: past },
  ]

  return (
    <>
      <PostMethodButton />
      {needsRenewal.map((post) => (
        <MemberRenewCard key={post.id} post={post} />
      ))}
      {listedIds && <p className="text-[11px] text-[var(--ink-mute)]">閲覧数は、{VIEW_COUNT_NOTE}</p>}
      {sections.map(
        ({ title, posts }) =>
          posts.length > 0 && (
            <section key={title}>
              <h2 className="text-base font-bold text-[var(--ink)] mb-2">
                {title}（{posts.length}件）
              </h2>
              <div className="space-y-3">
                {posts.map((post) => (
                  <div key={post.id}>
                    <PostCard
                      post={post}
                      footer={
                        <PostMeta
                          post={post}
                          lastSeen={lastSeen}
                          stats={
                            viewCounts?.get(post.id) === null ? null : (
                              <PostStats postId={post.id} views={viewCounts?.get(post.id) ?? undefined} />
                            )
                          }
                        />
                      }
                      ownTeam
                    />
                    {title === '決定済み' && post.post_type === 'match' && (
                      <Link
                        href={`/posts/new/helper?from=${post.id}`}
                        className="block text-center mt-2 border border-[var(--clay)] text-[var(--clay)] font-bold py-2.5 rounded-xl text-sm hover:bg-[var(--bg)] transition-colors"
                      >
                        この試合の助っ人を募集する
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )
      )}
    </>
  )
}

function PostMeta({ post, lastSeen, stats }: { post: MyTeamPost; lastSeen: string | null; stats: React.ReactNode }) {
  const since = lastSeen ? new Date(lastSeen).getTime() : null
  const newCount = since === null ? 0 : post.incomingChatTimes.filter((t) => new Date(t).getTime() > since).length

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md border border-[var(--line)] text-[var(--ink-sub)]">
          メッセージ{post.messageCount}件
        </span>
        {newCount > 0 && (
          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--clay)] text-white">新着{newCount}件</span>
        )}
        {stats}
      </div>
      <p className="text-[11px] text-[var(--ink-mute)] truncate">投稿：{post.posterName}</p>
    </div>
  )
}
