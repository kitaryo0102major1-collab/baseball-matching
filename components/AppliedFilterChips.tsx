export interface AppliedChip {
  key: string
  label: string
  onRemove: () => void
}

interface Props {
  chips: AppliedChip[]
  onResetAll: () => void
}

// 一覧の「適用中の条件」。✕で1つずつ外せる
export default function AppliedFilterChips({ chips, onResetAll }: Props) {
  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-4">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onRemove}
          className="bg-[var(--green-bg)] text-[var(--green)] text-xs px-2.5 py-1.5 rounded-full inline-flex items-center gap-1"
        >
          {chip.label} <span aria-hidden>✕</span>
        </button>
      ))}
      <button type="button" onClick={onResetAll} className="text-xs text-[var(--ink-mute)] underline px-1">
        すべて解除
      </button>
    </div>
  )
}
