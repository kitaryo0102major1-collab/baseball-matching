'use client'

import { useState } from 'react'

interface Props {
  open: boolean
  title: string
  description: React.ReactNode
  confirmLabel: string
  requireText?: string
  busy?: boolean
  error?: string | null
  onConfirm: () => void
  onClose: () => void
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  requireText,
  busy,
  error,
  onConfirm,
  onClose,
}: Props) {
  const [typed, setTyped] = useState('')

  if (!open) return null

  const canConfirm = !busy && (!requireText || typed.trim() === requireText)

  function close() {
    setTyped('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={close}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full sm:max-w-sm bg-[var(--surface)] rounded-t-2xl sm:rounded-2xl border border-[var(--line)] p-5 pb-8 sm:pb-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-bold text-[var(--ink)]">{title}</p>
        <div className="text-sm text-[var(--ink-sub)] leading-relaxed">{description}</div>

        {requireText && (
          <div>
            <label className="block text-xs text-[var(--ink-mute)] mb-1">
              確認のため「<span className="font-bold text-[var(--ink)]">{requireText}</span>」と入力してください
            </label>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="w-full border border-[var(--line)] rounded-lg px-3 py-2.5 text-sm bg-[var(--surface)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[#A32D2D]/30"
            />
          </div>
        )}

        {error && <p className="text-xs text-[#A3462B]">{error}</p>}

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={close}
            className="border border-[var(--line)] text-[var(--ink)] font-semibold py-3 rounded-xl text-sm"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className="bg-[#A32D2D] text-white font-bold py-3 rounded-xl text-sm disabled:opacity-40 transition-opacity"
          >
            {busy ? '処理中...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
