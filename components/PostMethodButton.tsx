'use client'

import { useState } from 'react'
import PostMethodSheet from './PostMethodSheet'

export default function PostMethodButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full bg-[var(--green)] text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 transition-opacity"
      >
        募集する（チーム情報を自動入力）
      </button>
      <PostMethodSheet open={open} onClose={() => setOpen(false)} />
    </>
  )
}
