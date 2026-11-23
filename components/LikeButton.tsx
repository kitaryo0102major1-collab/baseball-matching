'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { getLikeState, requestLikeState, subscribeLikes, toggleLike } from '@/lib/likes'

interface Props {
  postId: string
  // 受付が終わった募集・自分のチームの募集では押せない（数は表示する）
  disabled?: boolean
  disabledReason?: string
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <path
        d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.5 4.5 7 4.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.5 0 5.6 3.5 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"
        fill={filled ? 'var(--clay)' : 'none'}
        stroke={filled ? 'var(--clay)' : 'currentColor'}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function LikeButton({ postId, disabled = false, disabledReason }: Props) {
  const state = useSyncExternalStore(
    subscribeLikes,
    () => getLikeState(postId),
    () => undefined
  )
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    requestLikeState(postId)
  }, [postId])

  useEffect(() => {
    if (!unavailable) return
    const timer = setTimeout(() => setUnavailable(false), 3000)
    return () => clearTimeout(timer)
  }, [unavailable])

  // 取得が終わるまでは場所だけ確保して、レイアウトがずれないようにする
  if (!state) return <span className="block w-11 h-11" aria-hidden />

  async function handleClick(e: React.MouseEvent) {
    // カードのリンクに移動しないようにする
    e.preventDefault()
    e.stopPropagation()
    if (disabled) return
    const result = await toggleLike(postId)
    if (result === 'unavailable') setUnavailable(true)
  }

  return (
    <span className="relative block">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-pressed={state.liked}
        aria-label={`気になる${state.count > 0 ? `（${state.count}件）` : ''}`}
        title={disabled ? disabledReason : undefined}
        className={`min-w-11 h-11 px-2 inline-flex items-center justify-center gap-1 rounded-full text-sm font-bold transition-colors ${
          state.liked ? 'text-[var(--clay)]' : 'text-[var(--ink-mute)]'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--bg)]'}`}
      >
        <HeartIcon filled={state.liked} />
        {state.count > 0 && <span>{state.count}</span>}
      </button>
      {unavailable && (
        <span
          role="status"
          className="absolute right-0 top-full z-10 whitespace-nowrap text-[11px] text-[var(--ink-sub)] bg-[var(--surface)] border border-[var(--line)] rounded-md px-2 py-1 shadow-sm"
        >
          この端末では使えません
        </span>
      )}
    </span>
  )
}
