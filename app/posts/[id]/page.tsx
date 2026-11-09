import type { Metadata } from 'next'
import { cache } from 'react'
import { supabase } from '@/lib/supabase'
import { todayJST } from '@/lib/dates'
import { pageMetadata, truncateText } from '@/lib/seo'
import { getPostPermissions } from '@/lib/postPermissions'
import type { MatchPost, TeamProfile } from '@/lib/types'
import DeletePostButton from '@/components/DeletePostButton'
import PostTeamSection from '@/components/PostTeamSection'
import RegisteredTeamBadge from '@/components/RegisteredTeamBadge'
import TeamAvatar from '@/components/TeamAvatar'
import FieldBadge from '@/components/FieldBadge'
import LevelBadge from '@/components/LevelBadge'
import MatchStatus from '@/components/MatchStatus'
import MatchStatusSegment from '@/components/MatchStatusSegment'
import DetailContactCta from '@/components/DetailContactCta'
import ChatArea from '@/components/ChatArea'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const LEVEL_DESCRIPTIONS: Record<string, string> = {
  'A+': 'ガチ草野球チーム。リーグ・大会出場レベル',
  'A': 'スタメン全員野球経験者',
  'B': '野球未経験者が5人未満',
  'C': '5人以上野球未経験者',
}

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

function formatDateWithWeekday(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${WEEKDAY_LABELS[d.getDay()]}）`
}

function formatTime(t: string | null) {
  if (!t) return null
  return t.slice(0, 5)
}

const getPost = cache(async (id: string) => {
  const { data } = await supabase.from('match_posts').select('*').eq('id', id).maybeSingle()
  return data as MatchPost | null
})

const getPostTeam = cache(async (teamId: string) => {
  const { data } = await supabase.from('team_profiles').select('*').eq('id', teamId).maybeSingle()
  return data as TeamProfile | null
})

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const post = await getPost(id)
  if (!post) return { title: '募集が見つかりません', robots: { index: false } }

  const team = post.team_id ? await getPostTeam(post.team_id) : null
  const place = [post.prefecture, post.area_detail, post.venue_name].filter(Boolean).join(' ')
  const startTime = formatTime(post.start_time)
  const summary = [
    `${formatDateWithWeekday(post.game_date)}${startTime ? ` ${startTime}〜` : ''}`,
    place,
    team?.name,
    post.status === '決定済み' ? '対戦相手は決定済み' : '草野球の対戦相手を募集中',
    `グラウンド${post.field_status === 'ok' ? 'あり' : 'なし'}`,
    `Lv.${post.level}`,
  ]
    .filter(Boolean)
    .join('・')
  const description = post.description ? `${summary}。${truncateText(post.description, 60)}` : `${summary}。`

  return pageMetadata({ title: post.title, description, path: `/posts/${post.id}` })
}

export default async function PostDetailPage({ params }: Props) {
  const { id } = await params
  const post = await getPost(id)

  if (!post) notFound()

  const [permissions, team] = await Promise.all([
    getPostPermissions(post),
    post.team_id ? getPostTeam(post.team_id) : Promise.resolve(null),
  ])

  const startTime = formatTime(post.start_time)
  const endTime = formatTime(post.end_time)
  const timeText = startTime ? `${startTime}〜${endTime ?? '?'}` : '時間未定'

  const isPastDate = post.game_date < todayJST()

  const placeLine = [post.prefecture, post.area_detail].filter(Boolean).join(' ')

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 lg:grid lg:grid-cols-[1fr_320px] lg:gap-8 lg:items-start">
      <div className="max-w-2xl lg:max-w-none">
        <Link
          href="/posts"
          className="inline-flex items-center gap-1 text-sm text-[var(--ink-mute)] hover:text-[var(--green)] mb-6 transition-colors"
        >
          ← 一覧に戻る
        </Link>

        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--line)] overflow-hidden">
          {/* ヘッダー */}
          <div className="px-6 pt-6 pb-4 border-b border-[var(--line)]">
            <div className="flex flex-wrap gap-2 mb-3">
              <MatchStatus status={post.status} size="md" />
              <FieldBadge status={post.field_status} />
              <LevelBadge level={post.level} />
            </div>
            <h1 className="text-[22px] font-black leading-relaxed text-[var(--ink)]">{post.title}</h1>
            {team && (
              <Link href={`/teams/${team.id}`} className="inline-flex items-center gap-1.5 mt-1 max-w-full">
                <TeamAvatar name={team.name} logoUrl={team.logo_url} size={22} />
                <span className="text-sm font-bold text-[var(--ink)] truncate hover:underline">{team.name}</span>
                <RegisteredTeamBadge size="xs" />
              </Link>
            )}
          </div>

          {/* 状態切り替え（ゲストの募集は誰でも、チームの募集はそのチームの管理者だけ） */}
          {permissions.canEdit && (
            <div className="px-6 py-5 border-b border-[var(--line)]">
              <MatchStatusSegment postId={post.id} initialStatus={post.status} />
              <div className="flex items-center justify-between gap-3 mt-3">
                <Link href={`/posts/${post.id}/edit`} className="text-[13px] font-bold text-[var(--clay)]">
                  募集内容を修正する →
                </Link>
                {permissions.canDelete && <DeletePostButton postId={post.id} />}
              </div>
            </div>
          )}

          {/* 基本情報 */}
          <div className="px-6 py-2">
            {isPastDate && (
              <InfoRow label="状態">
                <span className="font-bold text-[#A32D2D]">試合日を過ぎたため一覧には表示されていません</span>
              </InfoRow>
            )}
            <InfoRow label="日時">
              {formatDateWithWeekday(post.game_date)} {timeText}
            </InfoRow>
            {(placeLine || post.venue_name) && (
              <InfoRow label="場所">
                {placeLine}
                {post.venue_name && (
                  <>
                    <br />
                    {post.venue_name}
                  </>
                )}
              </InfoRow>
            )}
            <InfoRow label="レベル">
              <span className="font-medium">{post.level}</span>
              <span className="text-[var(--ink-mute)] text-sm ml-2">— {LEVEL_DESCRIPTIONS[post.level]}</span>
            </InfoRow>
            {(post.sns_x || post.sns_instagram) && (
              <InfoRow label="SNS">
                <div className="space-y-1">
                  {post.sns_x && (
                    <a
                      href={post.sns_x}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-[var(--green)] hover:underline break-all"
                    >
                      X：{post.sns_x}
                    </a>
                  )}
                  {post.sns_instagram && (
                    <a
                      href={post.sns_instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-[var(--green)] hover:underline break-all"
                    >
                      Instagram：{post.sns_instagram}
                    </a>
                  )}
                </div>
              </InfoRow>
            )}
          </div>

          {/* コメント */}
          {post.description && (
            <div className="px-6 pb-6">
              <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-4">
                <h2 className="text-sm font-bold text-[var(--ink)] mb-2">募集コメント</h2>
                <p className="text-[var(--ink-sub)] whitespace-pre-wrap leading-relaxed text-sm">
                  {post.description}
                </p>
              </div>
            </div>
          )}
        </div>

        {team && <PostTeamSection team={team} />}

        {/* 連絡先（モバイルのみ） */}
        <div className="lg:hidden">
          <DetailContactCta post={post} />
        </div>

        {/* チャット */}
        <ChatArea postId={post.id} />
      </div>

      {/* 連絡先（PC サイドバー） */}
      <div className="hidden lg:block">
        <DetailContactCta post={post} />
      </div>
    </div>
  )
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[76px_1fr] gap-2 py-3 border-b border-[var(--line)] last:border-b-0">
      <span className="text-[13px] text-[var(--ink-mute)]">{label}</span>
      <span className="text-sm text-[var(--ink)]">{children}</span>
    </div>
  )
}
