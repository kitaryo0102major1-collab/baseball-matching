'use client'

import type { SyncState } from '@/lib/gameRecords'

// 保存状態の小さな表示（打席入力・打順の画面の上部）
export default function SyncStatus({ state, pending }: { state: SyncState; pending: number }) {
  const [label, cls] =
    state === 'error'
      ? ['送信できませんでした（再試行します）', 'text-[#A3462B]']
      : state === 'pending' || pending > 0
        ? [`端末に保存中（未送信${pending}件）`, 'text-[#9A6B00]']
        : ['保存済み', 'text-[var(--ink-mute)]']
  return (
    <p className={`text-[11px] ${cls}`} role="status" aria-live="polite">
      {label}
    </p>
  )
}

// ほかの端末でも入力されていたときの警告（後から送った方が勝つ）
export function ConflictNotice({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-start gap-3 text-sm text-[#7A5500] bg-[#FFF4D6] border border-[#F0DDA0] rounded-xl px-4 py-3" role="alert">
      <p className="flex-1">ほかの端末でも入力されています。最新の内容に置き換えました。</p>
      <button type="button" onClick={onClose} aria-label="警告を閉じる" className="shrink-0 w-8 h-8 -m-1 text-[#7A5500]">
        ×
      </button>
    </div>
  )
}
