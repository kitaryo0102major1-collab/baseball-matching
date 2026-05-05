import type { FieldStatus } from '@/lib/types'

interface Props {
  status: FieldStatus
  size?: 'sm' | 'md'
}

export default function FieldBadge({ status, size = 'md' }: Props) {
  const base = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'

  if (status === 'ok') {
    return (
      <span className={`${base} rounded-full font-medium bg-[#E1F5EE] text-[#0F6E56] border border-[#0F6E56]/20`}>
        ⚾ グラウンドあり
      </span>
    )
  }
  return (
    <span className={`${base} rounded-full font-medium bg-[#FCEBEB] text-[#A32D2D] border border-[#A32D2D]/20`}>
      📍 グラウンドなし
    </span>
  )
}
