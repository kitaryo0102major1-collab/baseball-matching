'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import BottomSheet from './BottomSheet'

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

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        <p className="text-sm font-semibold text-[var(--ink-mute)] mb-3">募集方法を選んでください</p>
        <div className="space-y-3">
          <Link
            href="/posts/quick"
            className="block bg-[var(--green-bg)] border-2 border-[var(--green)] rounded-2xl p-4"
            onClick={() => setSheetOpen(false)}
          >
            <p className="font-bold text-[var(--green)]">かんたん募集</p>
            <p className="text-sm text-[var(--ink-sub)] mt-0.5">チャットに答えるだけ・1分で終わります</p>
          </Link>
          <Link
            href="/posts/new"
            className="block bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-4"
            onClick={() => setSheetOpen(false)}
          >
            <p className="font-bold text-[var(--ink)]">くわしく募集</p>
            <p className="text-sm text-[var(--ink-sub)] mt-0.5">コメントや連絡先まで入力する・3ステップ</p>
          </Link>
        </div>
      </BottomSheet>
    </>
  )
}
