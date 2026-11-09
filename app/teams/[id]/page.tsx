import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { supabase } from '@/lib/supabase'
import { openPostsOrFilter } from '@/lib/postRules'
import { pageMetadata, truncateText } from '@/lib/seo'
import { POST_COLUMNS } from '@/lib/postQueries'
import type { MatchPost, TeamProfile } from '@/lib/types'
import PostCard from '@/components/PostCard'
import TeamAvatar from '@/components/TeamAvatar'
import LevelBadge from '@/components/LevelBadge'

const LEVEL_DESCRIPTIONS: Record<string, string> = {
  'A+': 'ガチ草野球チーム。リーグ・大会出場レベル',
  'A': 'スタメン全員野球経験者',
  'B': '野球未経験者が5人未満',
  'C': '5人以上野球未経験者',
}

const getTeam = cache(async (id: string) => {
  const { data } = await supabase.from('team_profiles').select('*').eq('id', id).maybeSingle()
  return data as TeamProfile | null
})

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const team = await getTeam(id)
  if (!team) return { title: 'チームが見つかりません', robots: { index: false } }

  const area = [team.prefecture, team.area_detail].filter(Boolean).join(' ')
  const days = team.activity_days.length ? `活動日は${team.activity_days.join('・')}。` : ''
  const summary = `${area}で活動する草野球チーム「${team.name}」（Lv.${team.level}）のチームページです。${days}`
  const description = team.description ? `${summary}${truncateText(team.description, 60)}` : summary

  return pageMetadata({ title: team.name, description, path: `/teams/${team.id}` })
}

export default async function TeamPage({ params }: Props) {
  const { id } = await params
  const team = await getTeam(id)
  if (!team) notFound()

  const area = [team.prefecture, team.area_detail].filter(Boolean).join(' ')
  const schedule = [team.activity_days.join('・'), team.activity_times.join('・')].filter(Boolean).join(' ／ ')
  const members = [team.member_count ? `${team.member_count}人` : null, team.age_range].filter(Boolean).join(' ／ ')
  const hasContact = team.contact_email || team.contact_phone || team.contact_other

  const { data: postsData } = await supabase
    .from('match_posts')
    .select(POST_COLUMNS)
    .eq('team_id', team.id)
    .eq('status', '募集中')
    .or(openPostsOrFilter())
    .order('game_date', { ascending: true, nullsFirst: false })
  const openPosts = (postsData ?? []) as MatchPost[]

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5">
        <div className="flex items-center gap-4">
          <TeamAvatar name={team.name} logoUrl={team.logo_url} size={72} />
          <div className="min-w-0">
            <h1 className="text-[22px] font-black leading-snug text-[var(--ink)] break-words">{team.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--green-bg)] text-[var(--green)] border border-[var(--green)]/20">
                <CheckIcon />
                登録チーム
              </span>
              <LevelBadge level={team.level} size="sm" />
            </div>
          </div>
        </div>

        {team.description && (
          <p className="mt-4 text-sm text-[var(--ink-sub)] leading-relaxed whitespace-pre-wrap">{team.description}</p>
        )}
      </div>

      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl px-5 py-2">
        <InfoRow label="活動エリア">{area}</InfoRow>
        {schedule && <InfoRow label="活動日">{schedule}</InfoRow>}
        {team.home_ground && <InfoRow label="ホーム">{team.home_ground}</InfoRow>}
        {members && <InfoRow label="メンバー">{members}</InfoRow>}
        <InfoRow label="レベル">
          <span className="font-medium">{team.level}</span>
          <span className="text-[var(--ink-mute)] text-sm ml-2">— {LEVEL_DESCRIPTIONS[team.level]}</span>
        </InfoRow>
        {team.league && <InfoRow label="所属リーグ">{team.league}</InfoRow>}
        {team.founded_year && <InfoRow label="結成">{team.founded_year}年</InfoRow>}
        {(team.sns_x || team.sns_instagram) && (
          <InfoRow label="SNS">
            <div className="space-y-1">
              {team.sns_x && (
                <a href={team.sns_x} target="_blank" rel="noopener noreferrer" className="block text-[var(--green)] hover:underline break-all">
                  X：{team.sns_x}
                </a>
              )}
              {team.sns_instagram && (
                <a
                  href={team.sns_instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-[var(--green)] hover:underline break-all"
                >
                  Instagram：{team.sns_instagram}
                </a>
              )}
            </div>
          </InfoRow>
        )}
      </div>

      {hasContact && (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--line)] overflow-hidden">
          <div className="bg-[var(--green)] px-5 py-3">
            <p className="text-white font-bold text-sm">このチームに連絡する</p>
          </div>
          <div className="px-5 py-4 space-y-3">
            {team.contact_email && (
              <ContactItem label="メール" href={`mailto:${team.contact_email}`} text={team.contact_email} />
            )}
            {team.contact_phone && <ContactItem label="電話" href={`tel:${team.contact_phone}`} text={team.contact_phone} />}
            {team.contact_other && <ContactItem label="その他" text={team.contact_other} />}
          </div>
        </div>
      )}

      <section>
        <h2 className="text-base font-bold text-[var(--ink)] mb-3">このチームの募集（{openPosts.length}件）</h2>
        {openPosts.length > 0 ? (
          <div className="space-y-3">
            {openPosts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--ink-mute)] bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 text-center">
            現在募集中の試合はありません
          </p>
        )}
      </section>

      <div className="text-center">
        <Link href="/posts" className="text-sm text-[var(--ink-mute)] hover:text-[var(--green)] transition-colors">
          ほかの募集を見る →
        </Link>
      </div>
    </div>
  )
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[84px_1fr] gap-2 py-3 border-b border-[var(--line)] last:border-b-0">
      <span className="text-[13px] text-[var(--ink-mute)]">{label}</span>
      <span className="text-sm text-[var(--ink)] break-words">{children}</span>
    </div>
  )
}

function ContactItem({ label, href, text }: { label: string; href?: string; text: string }) {
  return (
    <div>
      <p className="text-[11px] text-[var(--ink-mute)] mb-0.5">{label}</p>
      {href ? (
        <a href={href} className="text-sm font-medium text-[var(--green)] hover:underline break-all">
          {text}
        </a>
      ) : (
        <p className="text-sm text-[var(--ink)] break-all">{text}</p>
      )}
    </div>
  )
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 20 20" aria-hidden>
      <circle cx="10" cy="10" r="10" fill="currentColor" />
      <path d="M5.5 10.5l3 3 6-6.5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
