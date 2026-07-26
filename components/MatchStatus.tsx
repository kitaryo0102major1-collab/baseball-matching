'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { PostStatus } from '@/lib/types'

interface Props {
  postId: string
  initialStatus: PostStatus
  size?: 'sm' | 'md'
  onStatusChange?: (status: PostStatus) => void
}

const BADGE_SIZE = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-base px-4 py-1.5',
}

const BUTTON_SIZE = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-4 py-2',
}

export default function MatchStatus({ postId, initialStatus, size = 'sm', onStatusChange }: Props) {
  const [status, setStatus] = useState<PostStatus>(initialStatus)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState(false)

  const isOpen = status === '募集中'

  async function handleDecide(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (updating) return

    setUpdating(true)
    setError(false)
    const { error: updateError } = await supabase
      .from('match_posts')
      .update({ status: '決定済み' })
      .eq('id', postId)

    if (updateError) {
      setError(true)
      setUpdating(false)
      return
    }
    setStatus('決定済み')
    onStatusChange?.('決定済み')
    setUpdating(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`inline-flex items-center gap-1 rounded-full font-bold border ${BADGE_SIZE[size]} ${
          isOpen
            ? 'bg-[#E1F5EE] text-[#0F6E56] border-[#0F6E56]/30'
            : 'bg-gray-100 text-gray-500 border-gray-300'
        }`}
      >
        {isOpen ? '募集中' : '決定済み'}
      </span>
      {isOpen && (
        <button
          type="button"
          onClick={handleDecide}
          disabled={updating}
          className={`font-semibold bg-[#1D9E75] hover:bg-[#0F6E56] disabled:opacity-50 text-white rounded-full transition-colors ${BUTTON_SIZE[size]}`}
        >
          {updating ? '更新中...' : '試合が決まりました'}
        </button>
      )}
      {error && <span className="text-xs text-red-500">更新に失敗しました</span>}
    </div>
  )
}
