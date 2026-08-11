'use client'

import { useState } from 'react'
import type { MatchPost } from '@/lib/types'
import ContactSheet from './ContactSheet'

interface Props {
  post: MatchPost
}

export default function DetailContactCta({ post }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* モバイル: 下部固定バー */}
      <div className="h-24 lg:hidden" />
      <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-[var(--surface)] border-t border-[var(--line)] p-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full bg-[var(--green)] text-white font-bold py-3 rounded-xl"
        >
          このチームに連絡する
        </button>
        <p className="text-center text-xs text-[var(--ink-mute)] mt-1.5">メール・電話・SNSから選べます</p>
      </div>

      {/* PC: サイドバーカード */}
      <div className="hidden lg:block lg:sticky lg:top-20 bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full bg-[var(--green)] text-white font-bold py-3 rounded-xl"
        >
          このチームに連絡する
        </button>
        <p className="text-center text-xs text-[var(--ink-mute)] mt-1.5">メール・電話・SNSから選べます</p>
      </div>

      <ContactSheet open={open} onClose={() => setOpen(false)} post={post} />
    </>
  )
}
