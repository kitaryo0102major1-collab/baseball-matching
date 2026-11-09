import { POST_TYPE_LABELS, type PostType } from '@/lib/types'

const COLORS: Record<PostType, string> = {
  match: 'bg-[var(--green)] text-white border-[var(--green)]',
  helper: 'bg-[var(--clay)] text-white border-[var(--clay)]',
  member: 'bg-[#1177dd] text-white border-[#1177dd]',
}

const SIZES = {
  xs: 'text-[11px] px-1.5 py-1 rounded-md',
  md: 'text-sm px-2.5 py-1 rounded-full',
}

interface Props {
  type: PostType
  size?: keyof typeof SIZES
}

export default function PostTypeBadge({ type, size = 'md' }: Props) {
  return <span className={`font-bold border ${COLORS[type]} ${SIZES[size]}`}>{POST_TYPE_LABELS[type]}</span>
}
