'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { PostStatus } from '@/lib/types'

interface Props {
  postId: string
  initialStatus: PostStatus
}

const OPTIONS: { value: PostStatus; label: string; desc: string }[] = [
  { value: '募集中', label: '募集中', desc: '相手を探しています' },
  { value: '決定済み', label: '決定済み', desc: '対戦相手が決まりました' },
]

export default function MatchStatusSegment({ postId, initialStatus }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState<PostStatus>(initialStatus)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState(false)

  async function handleSelect(next: PostStatus) {
    if (next === status || updating) return

    const previous = status
    setStatus(next)
    setUpdating(true)
    setError(false)

    const { error: updateError } = await supabase.from('match_posts').update({ status: next }).eq('id', postId)

    if (updateError) {
      setStatus(previous)
      setError(true)
      setUpdating(false)
      return
    }
    setUpdating(false)
    router.refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold text-[var(--ink)]">募集の状態</h2>
        <span className="text-xs text-[var(--ink-mute)]">いつでも切り替えられます</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map((opt) => {
          const selected = status === opt.value
          const selectedBg = opt.value === '募集中' ? 'bg-[var(--clay)]' : 'bg-[#5C5A52]'
          return (
            <button
              key={opt.value}
              type="button"
              disabled={updating}
              onClick={() => handleSelect(opt.value)}
              className={`rounded-xl p-3 text-center transition-colors disabled:opacity-60 ${
                selected
                  ? `${selectedBg} text-white`
                  : 'bg-[var(--surface)] border-[1.5px] border-[var(--line)] text-[var(--ink-sub)]'
              }`}
            >
              <p className="font-bold text-sm">{opt.label}</p>
              <p className={`text-xs mt-0.5 ${selected ? 'text-white/80' : 'text-[var(--ink-mute)]'}`}>{opt.desc}</p>
            </button>
          )
        })}
      </div>
      {error && <p className="text-xs text-red-500 mt-2">更新に失敗しました。もう一度お試しください。</p>}
    </div>
  )
}
