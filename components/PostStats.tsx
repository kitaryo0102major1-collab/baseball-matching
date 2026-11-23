'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { getLikeState, requestLikeState, subscribeLikes } from '@/lib/likes'
import { fetchViewCounts } from '@/lib/postStats'
import { getVisitorId } from '@/lib/visitor'

export const VIEW_COUNT_NOTE = '同じ人は1日1回まで数えます'

// 「閲覧◯回・気になる◯件」。気になる数は LikeButton と同じストアから読む（取得もまとめて1回）。
// views が undefined の間は読み込み中として、同じ高さで「–」を出す
export function PostStats({ postId, views }: { postId: string; views: number | undefined }) {
  const like = useSyncExternalStore(
    subscribeLikes,
    () => getLikeState(postId),
    () => undefined
  )

  useEffect(() => {
    requestLikeState(postId)
  }, [postId])

  return (
    <span className="text-[11px] font-bold text-[var(--ink-sub)]">
      閲覧{views ?? '–'}回・気になる{like?.count ?? '–'}件
    </span>
  )
}

// 募集詳細用。そのチームの管理者か、ゲスト募集を投稿した端末で見たときだけ表示する
export function OwnerPostStats({ postId, isManager, isGuestPost }: { postId: string; isManager: boolean; isGuestPost: boolean }) {
  const [views, setViews] = useState<number | null | undefined>(undefined)

  useEffect(() => {
    // チームの募集は管理者だけ、ゲスト募集は端末IDがあるときだけ問い合わせる（ほかの人には通信もしない）
    if (!isManager && !(isGuestPost && getVisitorId())) {
      setViews(null)
      return
    }
    let cancelled = false
    fetchViewCounts([postId]).then((counts) => {
      if (!cancelled) setViews(counts.get(postId) ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [postId, isManager, isGuestPost])

  if (views === null || views === undefined) return null

  return (
    <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
      <PostStats postId={postId} views={views} />
      <span className="text-[11px] text-[var(--ink-mute)]">{VIEW_COUNT_NOTE}</span>
    </p>
  )
}
