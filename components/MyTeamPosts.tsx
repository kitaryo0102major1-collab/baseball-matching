'use client'

import { useEffect, useRef, useState } from 'react'
import type { MatchPost } from '@/lib/types'
import PostCard from './PostCard'
import PostMethodButton from './PostMethodButton'

export type MyTeamPost = MatchPost & {
  posterName: string
  messageCount: number
  incomingChatTimes: string[]
}

interface Props {
  teamId: string
  renderedAt: string
  open: MyTeamPost[]
  decided: MyTeamPost[]
  past: MyTeamPost[]
}

function storageKey(teamId: string) {
  return `mypage_last_seen_${teamId}`
}

function readLastSeen(teamId: string): string | null {
  try {
    return window.localStorage.getItem(storageKey(teamId))
  } catch {
    return null
  }
}

function writeLastSeen(teamId: string, value: string) {
  try {
    window.localStorage.setItem(storageKey(teamId), value)
  } catch {}
}

export default function MyTeamPosts({ teamId, renderedAt, open, decided, past }: Props) {
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

  if (open.length + decided.length + past.length === 0) {
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
      {sections.map(
        ({ title, posts }) =>
          posts.length > 0 && (
            <section key={title}>
              <h2 className="text-base font-bold text-[var(--ink)] mb-2">
                {title}（{posts.length}件）
              </h2>
              <div className="space-y-3">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    footer={<PostMeta post={post} lastSeen={lastSeen} />}
                  />
                ))}
              </div>
            </section>
          )
      )}
    </>
  )
}

function PostMeta({ post, lastSeen }: { post: MyTeamPost; lastSeen: string | null }) {
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
      </div>
      <p className="text-[11px] text-[var(--ink-mute)] truncate">投稿：{post.posterName}</p>
    </div>
  )
}
