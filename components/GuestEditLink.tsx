'use client'

import { useEffect, useState } from 'react'
import { guestEditUrl } from '@/lib/guestGames'

interface Props {
  gameId: string
  token: string
  compact?: boolean
}

// 編集用リンクのコピーと注意書き
export default function GuestEditLink({ gameId, token, compact }: Props) {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(false)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  async function copy() {
    setError(false)
    try {
      await navigator.clipboard.writeText(guestEditUrl(origin || window.location.origin, gameId, token))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError(true)
    }
  }

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
      <button
        type="button"
        onClick={copy}
        className="w-full min-h-11 border border-[var(--green)]/40 text-[var(--green)] font-bold rounded-xl text-sm hover:bg-[var(--green-bg)] transition-colors"
      >
        {copied ? 'コピーしました' : '編集用リンクをコピー'}
      </button>
      <p className="text-xs text-[#9A6B00] leading-relaxed">
        このリンクを知っている人は誰でも編集できます。一緒に入力する人や、別の端末で開くときだけに使ってください。
      </p>
      {error && (
        <p className="text-xs text-[#A3462B] break-all">
          コピーできませんでした。次のリンクを長押ししてコピーしてください：{origin && guestEditUrl(origin, gameId, token)}
        </p>
      )}
    </div>
  )
}
