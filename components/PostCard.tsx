import Link from 'next/link'
import type { MatchPost } from '@/lib/types'
import FieldBadge from './FieldBadge'
import LevelBadge from './LevelBadge'
import MatchStatus from './MatchStatus'

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

function formatTime(t: string | null) {
  if (!t) return null
  return t.slice(0, 5)
}

interface Props {
  post: MatchPost
}

export default function PostCard({ post }: Props) {
  const isDecided = post.status === '決定済み'

  const d = new Date(post.game_date)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const weekday = WEEKDAY_LABELS[d.getDay()]

  const startTime = formatTime(post.start_time)
  const endTime = formatTime(post.end_time)
  const timePart = startTime ? `${startTime}〜${endTime ?? '?'}` : '時間未定'

  const areaPart = [post.prefecture, post.area_detail].filter(Boolean).join(' ')
  const locationPart = [areaPart, post.venue_name].filter(Boolean).join('／')
  const metaLine = [timePart, locationPart].filter(Boolean).join(' ・ ')

  return (
    <Link href={`/posts/${post.id}`} className="block group">
      <div
        className={`grid grid-cols-[56px_1fr] gap-3.5 p-3.5 rounded-2xl border transition-all hover:shadow-md ${
          isDecided ? 'bg-[#F2EFE6] border-[var(--line)] opacity-[0.62]' : 'bg-[var(--surface)] border-[var(--line)] hover:border-[var(--green)]/40'
        }`}
      >
        <div className="text-center border-r border-[#EDE7D8] pr-1.5">
          <p className="text-[11px] text-[var(--ink-mute)]">{month}月</p>
          <p className={`text-2xl font-black leading-none ${isDecided ? 'text-[var(--ink-mute)]' : 'text-[var(--green)]'}`}>
            {day}
          </p>
          <p className={`text-[11px] font-bold ${isDecided ? 'text-[var(--ink-mute)]' : 'text-[var(--clay)]'}`}>
            {weekday}
          </p>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <MatchStatus postId={post.id} initialStatus={post.status} size="xs" />
            <FieldBadge status={post.field_status} size="xs" />
            <LevelBadge level={post.level} size="xs" />
          </div>
          <h3 className="text-[15px] font-bold leading-relaxed line-clamp-2 text-[var(--ink)]">{post.title}</h3>
          <p className="text-xs text-[var(--ink-sub)] mt-1">{metaLine}</p>
        </div>
      </div>
    </Link>
  )
}
