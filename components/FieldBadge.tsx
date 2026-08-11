import type { FieldStatus } from '@/lib/types'

interface Props {
  status: FieldStatus
  size?: 'xs' | 'sm' | 'md'
}

const SIZE_CLASS = {
  xs: 'text-[11px] font-bold px-1.5 py-1 rounded-md',
  sm: 'text-xs px-2 py-0.5 rounded-full font-medium',
  md: 'text-sm px-2.5 py-1 rounded-full font-medium',
}

export default function FieldBadge({ status, size = 'md' }: Props) {
  const base = SIZE_CLASS[size]

  if (status === 'ok') {
    return (
      <span className={`${base} bg-[var(--green-bg)] text-[var(--green)] border border-[var(--green)]/20`}>
        グラウンドあり
      </span>
    )
  }
  return (
    <span className={`${base} bg-[#FCEBEB] text-[#A32D2D] border border-[#A32D2D]/20`}>
      グラウンドなし
    </span>
  )
}
