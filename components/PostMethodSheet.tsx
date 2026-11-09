'use client'

import Link from 'next/link'
import BottomSheet from './BottomSheet'

interface Props {
  open: boolean
  onClose: () => void
  // チームの管理者向けの画面では、助っ人・メンバー募集も選べるようにする
  showTeamTypes?: boolean
}

export default function PostMethodSheet({ open, onClose, showTeamTypes }: Props) {
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
        {showTeamTypes && (
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/posts/new/helper"
              className="block text-center bg-[var(--surface)] border border-[var(--clay)] text-[var(--clay)] font-bold rounded-2xl p-3 text-sm"
              onClick={onClose}
            >
              助っ人を募集
            </Link>
            <Link
              href="/posts/new/member"
              className="block text-center bg-[var(--surface)] border border-[#1177dd] text-[#1177dd] font-bold rounded-2xl p-3 text-sm"
              onClick={onClose}
            >
              メンバーを募集
            </Link>
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
