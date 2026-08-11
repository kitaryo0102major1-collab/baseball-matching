'use client'

import Link from 'next/link'
import BottomSheet from './BottomSheet'

interface Props {
  open: boolean
  onClose: () => void
}

export default function PostMethodSheet({ open, onClose }: Props) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      <p className="text-sm font-semibold text-[var(--ink-mute)] mb-3">募集方法を選んでください</p>
      <div className="space-y-3">
        <Link
          href="/posts/quick"
          className="block bg-[var(--green-bg)] border-2 border-[var(--green)] rounded-2xl p-4"
          onClick={onClose}
        >
          <p className="font-bold text-[var(--green)]">かんたん募集</p>
          <p className="text-sm text-[var(--ink-sub)] mt-0.5">チャットに答えるだけ・1分で終わります</p>
        </Link>
        <Link
          href="/posts/new"
          className="block bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-4"
          onClick={onClose}
        >
          <p className="font-bold text-[var(--ink)]">くわしく募集</p>
          <p className="text-sm text-[var(--ink-sub)] mt-0.5">コメントや連絡先まで入力する・3ステップ</p>
        </Link>
      </div>
    </BottomSheet>
  )
}
