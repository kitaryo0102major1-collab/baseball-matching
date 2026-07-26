'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { MatchPost, PostStatus } from '@/lib/types'
import FieldBadge from './FieldBadge'
import LevelBadge from './LevelBadge'
import MatchStatus from './MatchStatus'

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
}

function formatTime(t: string | null) {
  if (!t) return null
  return t.slice(0, 5)
}

interface Props {
  post: MatchPost
}

export default function PostCard({ post }: Props) {
  const [status, setStatus] = useState<PostStatus>(post.status)
  const isDecided = status === '決定済み'

  const timeRange =
    post.start_time || post.end_time
      ? `${formatTime(post.start_time) ?? '?'}〜${formatTime(post.end_time) ?? '?'}`
      : null

  return (
    <Link href={`/posts/${post.id}`} className="block group">
      <div
        className={`bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-[#1D9E75]/40 transition-all ${
          isDecided ? 'opacity-60' : ''
        }`}
      >
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          <MatchStatus postId={post.id} initialStatus={status} size="sm" onStatusChange={setStatus} />
          <FieldBadge status={post.field_status} size="sm" />
          <LevelBadge level={post.level} size="sm" />
        </div>
        <h3 className="font-semibold text-gray-900 group-hover:text-[#1D9E75] transition-colors line-clamp-2 mb-2">
          {post.title}
        </h3>
        <div className="space-y-1 text-sm text-gray-500">
          <div className="flex items-center gap-1.5">
            <span>📅</span>
            <span>{formatDate(post.game_date)}</span>
            {timeRange && <span className="text-gray-400">｜ {timeRange}</span>}
          </div>
          {(post.prefecture || post.area || post.venue_name) && (
            <div className="flex items-center gap-1.5">
              <span>📍</span>
              <span>{[post.prefecture, post.area, post.venue_name].filter(Boolean).join(' / ')}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
