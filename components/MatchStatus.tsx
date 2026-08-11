import type { PostStatus } from '@/lib/types'

interface Props {
  status: PostStatus
  size?: 'xs' | 'sm' | 'md'
}

const BADGE_SIZE = {
  xs: 'text-[11px] font-bold px-1.5 py-1 rounded-md',
  sm: 'text-xs px-2 py-0.5 rounded-full',
  md: 'text-base px-4 py-1.5 rounded-full',
}

export default function MatchStatus({ status, size = 'sm' }: Props) {
  const isOpenStatus = status === '募集中'

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold border ${BADGE_SIZE[size]} ${
        isOpenStatus
          ? 'bg-[var(--green-bg)] text-[var(--green)] border-[var(--green)]/30'
          : 'bg-[var(--line)] text-[var(--ink-mute)] border-[var(--line)]'
      }`}
    >
      {status}
    </span>
  )
}
