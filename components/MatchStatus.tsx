'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { PostStatus } from '@/lib/types'

const STATUS_OPTIONS: PostStatus[] = ['募集中', '決定済み']

interface Props {
  postId: string
  initialStatus: PostStatus
  size?: 'sm' | 'md'
  interactive?: boolean
}

const BADGE_SIZE = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-base px-4 py-1.5',
}

export default function MatchStatus({ postId, initialStatus, size = 'sm', interactive = false }: Props) {
  const [status, setStatus] = useState<PostStatus>(initialStatus)
  const [open, setOpen] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const isOpenStatus = status === '募集中'

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function handleBadgeClick(e: React.MouseEvent) {
    if (!interactive) return
    e.preventDefault()
    e.stopPropagation()
    setOpen((o) => !o)
  }

  async function handleSelect(next: PostStatus, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setOpen(false)
    if (next === status || updating) return

    setUpdating(true)
    setError(false)
    const { error: updateError } = await supabase
      .from('match_posts')
      .update({ status: next })
      .eq('id', postId)

    if (updateError) {
      setError(true)
      setUpdating(false)
      return
    }
    setStatus(next)
    setUpdating(false)
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <span
        onClick={handleBadgeClick}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        className={`inline-flex items-center gap-1 rounded-full font-bold border ${BADGE_SIZE[size]} ${
          isOpenStatus
            ? 'bg-[#E1F5EE] text-[#0F6E56] border-[#0F6E56]/30'
            : 'bg-gray-100 text-gray-500 border-gray-300'
        } ${interactive ? 'cursor-pointer select-none hover:opacity-80 transition-opacity' : ''}`}
      >
        {updating ? '更新中...' : status}
        {interactive && <span className="text-[10px]">▼</span>}
      </span>

      {interactive && open && (
        <div className="absolute left-0 top-full mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={(e) => handleSelect(opt, e)}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                opt === status ? 'font-semibold text-[#1D9E75]' : 'text-gray-700'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-1">更新に失敗しました</p>}
    </div>
  )
}
