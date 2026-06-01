import { supabase } from '@/lib/supabase'
import type { MatchPost } from '@/lib/types'
import FieldBadge from '@/components/FieldBadge'
import LevelBadge from '@/components/LevelBadge'
import ChatArea from '@/components/ChatArea'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const LEVEL_DESCRIPTIONS: Record<string, string> = {
  'A+': 'ガチ草野球チーム。リーグ・大会出場レベル',
  'A': 'スタメン全員野球経験者',
  'B': '野球未経験者が5人未満',
  'C': '5人以上野球未経験者',
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

function formatTime(t: string | null) {
  if (!t) return null
  return t.slice(0, 5)
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function PostDetailPage({ params }: Props) {
  const { id } = await params
  const { data, error } = await supabase
    .from('match_posts')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  const post = data as MatchPost
  const startTime = formatTime(post.start_time)
  const endTime = formatTime(post.end_time)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/posts" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1D9E75] mb-6 transition-colors">
        ← 一覧に戻る
      </Link>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* ヘッダー */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex flex-wrap gap-2 mb-3">
            <FieldBadge status={post.field_status} />
            <LevelBadge level={post.level} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{post.title}</h1>
          <p className="text-xs text-gray-400 mt-2">
            投稿日：{new Date(post.created_at).toLocaleDateString('ja-JP')}
          </p>
        </div>

        {/* 基本情報 */}
        <div className="px-6 py-5 border-b border-gray-100 space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">基本情報</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoRow icon="📅" label="試合日">
              {formatDate(post.game_date)}
            </InfoRow>
            {(startTime || endTime) && (
              <InfoRow icon="🕐" label="時間">
                {startTime ?? '?'}〜{endTime ?? '?'}
              </InfoRow>
            )}
            {post.area && (
              <InfoRow icon="🗾" label="エリア">
                {post.area}
              </InfoRow>
            )}
            {post.venue_name && (
              <InfoRow icon="🏟️" label="グラウンド名">
                {post.venue_name}
              </InfoRow>
            )}
            <InfoRow icon="⭐" label="レベル">
              <span className="font-medium">{post.level}</span>
              <span className="text-gray-400 text-sm ml-2">— {LEVEL_DESCRIPTIONS[post.level]}</span>
            </InfoRow>
          </div>
        </div>

        {/* コメント */}
        {post.description && (
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">募集内容</h2>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{post.description}</p>
          </div>
        )}

        {/* 連絡先 */}
        {(post.contact_email || post.contact_phone || post.contact_other) && (
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">連絡先</h2>
            <div className="space-y-2">
              {post.contact_email && (
                <ContactRow icon="✉️" label="メール">
                  <a href={`mailto:${post.contact_email}`} className="text-[#1D9E75] hover:underline">
                    {post.contact_email}
                  </a>
                </ContactRow>
              )}
              {post.contact_phone && (
                <ContactRow icon="📞" label="電話">
                  <a href={`tel:${post.contact_phone}`} className="text-[#1D9E75] hover:underline">
                    {post.contact_phone}
                  </a>
                </ContactRow>
              )}
              {post.contact_other && (
                <ContactRow icon="💬" label="その他">
                  {post.contact_other}
                </ContactRow>
              )}
            </div>
          </div>
        )}

        {/* SNS */}
        {(post.sns_x || post.sns_instagram) && (
          <div className="px-6 py-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">チームSNS</h2>
            <div className="space-y-2">
              {post.sns_x && (
                <ContactRow icon="𝕏" label="X (Twitter)">
                  <a
                    href={`https://x.com/${post.sns_x.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#1D9E75] hover:underline"
                  >
                    @{post.sns_x.replace(/^@/, '')}
                  </a>
                </ContactRow>
              )}
              {post.sns_instagram && (
                <ContactRow icon="📸" label="Instagram">
                  <a
                    href={`https://instagram.com/${post.sns_instagram.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#1D9E75] hover:underline"
                  >
                    @{post.sns_instagram.replace(/^@/, '')}
                  </a>
                </ContactRow>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 text-center">
        <Link href="/posts" className="text-sm text-gray-500 hover:text-[#1D9E75] transition-colors">
          ← 一覧に戻る
        </Link>
      </div>

      {/* チャット */}
      <ChatArea postId={post.id} />
    </div>
  )
}

function InfoRow({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-lg w-6 shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <div className="text-gray-800 text-sm">{children}</div>
      </div>
    </div>
  )
}

function ContactRow({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-base w-6 text-center">{icon}</span>
      <span className="text-gray-400 w-16 shrink-0">{label}</span>
      <div className="text-gray-800">{children}</div>
    </div>
  )
}
