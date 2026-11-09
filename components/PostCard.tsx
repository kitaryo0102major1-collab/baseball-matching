import Link from 'next/link'
import { jstMonthDay } from '@/lib/dates'
import type { MatchPost, PostTeamBadge } from '@/lib/types'
import FieldBadge from './FieldBadge'
import LevelBadge from './LevelBadge'
import MatchStatus from './MatchStatus'
import PostTypeBadge from './PostTypeBadge'
import TeamAvatar from './TeamAvatar'
import RegisteredTeamBadge from './RegisteredTeamBadge'

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

function formatTime(t: string | null) {
  if (!t) return null
  return t.slice(0, 5)
}

interface Props {
  post: MatchPost & { team?: PostTeamBadge | null }
  footer?: React.ReactNode
}

export default function PostCard({ post, footer }: Props) {
  const isClosed = post.status !== '募集中'
  const isMember = post.post_type === 'member'

  const areaPart = [post.prefecture, post.area_detail].filter(Boolean).join(' ')
  const locationPart = [areaPart, post.venue_name].filter(Boolean).join('／')

  let metaLine: string
  if (isMember) {
    metaLine = [areaPart, post.activity_note].filter(Boolean).join(' ・ ')
  } else {
    const startTime = formatTime(post.start_time)
    const endTime = formatTime(post.end_time)
    const timePart = startTime ? `${startTime}〜${endTime ?? '?'}` : '時間未定'
    metaLine = [timePart, locationPart].filter(Boolean).join(' ・ ')
  }

  const conditions =
    post.post_type === 'match'
      ? null
      : [
          post.positions?.join('・'),
          post.headcount ? (post.post_type === 'helper' ? `${post.headcount}人` : post.headcount) : null,
          post.experience,
        ]
          .filter(Boolean)
          .join(' ／ ')

  return (
    <Link href={`/posts/${post.id}`} className="block group">
      <div
        className={`grid grid-cols-[56px_1fr] gap-3.5 p-3.5 rounded-2xl border transition-all hover:shadow-md ${
          isClosed ? 'bg-[#F2EFE6] border-[var(--line)] opacity-[0.62]' : 'bg-[var(--surface)] border-[var(--line)] hover:border-[var(--green)]/40'
        }`}
      >
        <DateColumn post={post} isClosed={isClosed} />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <PostTypeBadge type={post.post_type} size="xs" />
            <MatchStatus status={post.status} size="xs" />
            {post.field_status && <FieldBadge status={post.field_status} size="xs" />}
            <LevelBadge level={post.level} size="xs" />
          </div>
          <h3 className="text-[15px] font-bold leading-relaxed line-clamp-2 text-[var(--ink)]">{post.title}</h3>
          {post.team && (
            <div className="flex items-center gap-1.5 mt-1 min-w-0">
              <TeamAvatar name={post.team.name} logoUrl={post.team.logo_url} size={18} />
              <span className="text-xs font-bold text-[var(--ink)] truncate">{post.team.name}</span>
              <RegisteredTeamBadge size="xs" />
            </div>
          )}
          <p className="text-xs text-[var(--ink-sub)] mt-1">{metaLine}</p>
          {conditions && <p className="text-xs font-medium text-[var(--ink-sub)] mt-0.5">{conditions}</p>}
          {footer}
        </div>
      </div>
    </Link>
  )
}

function DateColumn({ post, isClosed }: { post: MatchPost; isClosed: boolean }) {
  const dayClass = `text-2xl font-black leading-none ${isClosed ? 'text-[var(--ink-mute)]' : 'text-[var(--green)]'}`

  // メンバー募集には試合日がないので、投稿日を出す
  if (post.post_type === 'member' || !post.game_date) {
    const { month, day } = jstMonthDay(post.created_at)
    return (
      <div className="text-center border-r border-[#EDE7D8] pr-1.5">
        <p className="text-[11px] text-[var(--ink-mute)]">{month}月</p>
        <p className={dayClass}>{day}</p>
        <p className="text-[11px] font-bold text-[var(--ink-mute)]">投稿</p>
      </div>
    )
  }

  const d = new Date(post.game_date)
  return (
    <div className="text-center border-r border-[#EDE7D8] pr-1.5">
      <p className="text-[11px] text-[var(--ink-mute)]">{d.getMonth() + 1}月</p>
      <p className={dayClass}>{d.getDate()}</p>
      <p className={`text-[11px] font-bold ${isClosed ? 'text-[var(--ink-mute)]' : 'text-[var(--clay)]'}`}>
        {WEEKDAY_LABELS[d.getDay()]}
      </p>
    </div>
  )
}
