'use client'

import { useState } from 'react'
import type { MatchPost } from '@/lib/types'
import ContactSheet from './ContactSheet'

interface Props {
  post: MatchPost
}

export default function PostApplyCta({ post }: Props) {
  const [open, setOpen] = useState(false)
  const label = post.post_type === 'helper' ? '助っ人に応募する' : '体験・入部を申し込む'

  return (
    <aside className="mt-8 lg:mt-0 lg:sticky lg:top-20">
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--line)] p-5 space-y-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full bg-[var(--clay)] hover:opacity-90 text-white font-bold py-3.5 rounded-xl transition-opacity"
        >
          {label}
        </button>
        <p className="text-xs text-[var(--ink-mute)] text-center">
          連絡先を確認して直接ご連絡ください。下の公開メッセージからも送れます。
        </p>
      </div>
      <ContactSheet open={open} onClose={() => setOpen(false)} post={post} />
    </aside>
  )
}
