'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import PostMethodSheet from './PostMethodSheet'

export default function BottomTabBar() {
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = useState(false)

  if (pathname !== '/' && pathname !== '/posts') return null

  return (
    <>
      {/* 固定バーに隠れないためのスペーサー */}
      <div className="h-16 sm:hidden" />

      <div className="fixed bottom-0 inset-x-0 z-40 sm:hidden bg-[var(--surface)] border-t border-[var(--line)]">
        <div className="grid grid-cols-2 h-16">
          <Link
            href="/posts"
            className="flex flex-col items-center justify-center gap-0.5 text-sm font-semibold text-[var(--ink)]"
          >
            相手を探す
          </Link>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 text-sm font-semibold text-[var(--green)]"
          >
            募集する
          </button>
        </div>
      </div>

      <PostMethodSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  )
}
