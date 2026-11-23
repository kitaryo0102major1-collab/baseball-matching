'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { createClient } from '@/lib/supabase/client'
import { newChatTimes, readLastSeen } from '@/lib/lastSeen'
import { POST_COLUMNS, POST_WITH_TEAM_SELECT } from '@/lib/postQueries'
import { isPostOpen, openPostsOrFilter } from '@/lib/postRules'
import { fetchViewCounts } from '@/lib/postStats'
import { SELECTED_TEAM_EVENT } from '@/lib/selectedTeam'
import { useMyTeams } from '@/lib/useMyTeams'
import { POST_TYPE_LABELS, type MatchPost, type MatchPostWithTeam, type MyTeamForPost, type PostType } from '@/lib/types'
import LevelBadge from './LevelBadge'
import PostCard from './PostCard'
import PostMethodSheet from './PostMethodSheet'
import { PostStats, VIEW_COUNT_NOTE } from './PostStats'
import TeamAvatar from './TeamAvatar'
import TeamSwitcher from './TeamSwitcher'

const NEARBY_LIMIT = 6
const STATUS_LIST_LIMIT = 5

const CARD_CLASS = 'bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5'

type OwnPost = MatchPost & { chats: { created_at: string; team_id: string | null; message: string }[] }

// ログイン中のトップ（選択中チームの「チームホーム」）。app/page.tsx で .home-member の中に置き、
// 未ログインのときは CSS で隠れる（通信もしない）。管理チームがないときは登録を促し、通常のトップを出させる
export default function TeamHome() {
  const myTeams = useMyTeams()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const teams = myTeams.status === 'member' ? myTeams.teams : []
  const noTeam = myTeams.status === 'member' && teams.length === 0
  const teamId = selectedId ?? (myTeams.status === 'member' ? myTeams.defaultTeamId : null)
  const team = teams.find((t) => t.id === teamId) ?? null

  // 管理チームがないときは、通常のトップも見せる（app/globals.css の data-no-team）
  useEffect(() => {
    const html = document.documentElement
    if (noTeam) html.dataset.noTeam = '1'
    else delete html.dataset.noTeam
    return () => {
      delete html.dataset.noTeam
    }
  }, [noTeam])

  // ヘッダーのメニューでチームを切り替えたときも追従する
  useEffect(() => {
    function onChange(e: Event) {
      setSelectedId((e as CustomEvent<string>).detail)
    }
    window.addEventListener(SELECTED_TEAM_EVENT, onChange)
    return () => window.removeEventListener(SELECTED_TEAM_EVENT, onChange)
  }, [])

  if (myTeams.status === 'guest') return null
  if (noTeam) return <RegisterTeamCard />
  if (!team) return <HomeSkeleton />

  return <TeamHomeContent key={team.id} team={team} teams={teams} onSelect={setSelectedId} />
}

function TeamHomeContent({
  team,
  teams,
  onSelect,
}: {
  team: MyTeamForPost
  teams: MyTeamForPost[]
  onSelect: (teamId: string) => void
}) {
  const [ownPosts, setOwnPosts] = useState<OwnPost[] | null>(null)
  const [nearby, setNearby] = useState<MatchPostWithTeam[] | null>(null)
  const [viewCounts, setViewCounts] = useState<Map<string, number | null> | null>(null)
  const [lastSeen, setLastSeen] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLastSeen(readLastSeen(team.id))

    async function load() {
      const [own, near] = await Promise.all([
        createClient()
          .from('match_posts')
          .select(`${POST_COLUMNS}, chats(created_at, team_id, message)`)
          .eq('team_id', team.id)
          .order('created_at', { ascending: false }),
        // 自分のチームの募集は画面側で除く（PostgREST の or() は openPostsOrFilter で使っているため）
        supabase
          .from('match_posts')
          .select(POST_WITH_TEAM_SELECT)
          .eq('prefecture', team.prefecture)
          .eq('status', '募集中')
          .or(openPostsOrFilter())
          .order('created_at', { ascending: false })
          .limit(30),
      ])
      if (cancelled) return

      const posts = (own.data ?? []) as unknown as OwnPost[]
      const others = ((near.data ?? []) as unknown as MatchPostWithTeam[]).filter((p) => p.team_id !== team.id)
      // 同じ市区町村を先に（それぞれの中は新しい順のまま）
      const sorted = team.city
        ? [...others.filter((p) => p.city === team.city), ...others.filter((p) => p.city !== team.city)]
        : others
      // 同じ描画で出すと、気になる数（自分の募集＋近くの募集）が1回の取得にまとまる
      setOwnPosts(posts)
      setNearby(sorted.slice(0, NEARBY_LIMIT))

      const openIds = posts.filter(isPostOpen).map((p) => p.id)
      const counts = openIds.length ? await fetchViewCounts(openIds) : new Map<string, number | null>()
      if (!cancelled) setViewCounts(counts)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [team.id, team.prefecture, team.city])

  const openPosts = (ownPosts ?? []).filter(isPostOpen)
  const typeCounts = (['match', 'helper', 'member'] as PostType[]).map((t) => ({
    type: t,
    count: openPosts.filter((p) => p.post_type === t).length,
  }))

  // 新着メッセージ（マイページと同じ判定。新しいものがある募集を、最新のメッセージ順に）
  const newMessages = (ownPosts ?? [])
    .map((post) => {
      const times = newChatTimes(post.chats, team.id, lastSeen)
      if (times.length === 0) return null
      const latest = [...post.chats]
        .filter((c) => c.team_id !== team.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
      return { post, count: times.length, latest }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.latest.created_at.localeCompare(a.latest.created_at))

  const area = [team.prefecture, team.city].filter(Boolean).join(' ')
  const morePath = `/posts?${new URLSearchParams({ prefecture: team.prefecture, ...(team.city ? { city: team.city } : {}) })}`

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* 1. チーム */}
      <section className={CARD_CLASS}>
        <div className="flex items-center gap-4">
          <TeamAvatar name={team.name} logoUrl={team.logo_url} size={56} />
          <div className="min-w-0">
            <p className="text-lg font-black text-[var(--ink)] break-words">{team.name}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <LevelBadge level={team.level} size="sm" />
              <span className="text-xs text-[var(--ink-sub)]">{area}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <Link
            href={`/teams/${team.id}`}
            className="text-center border border-[var(--line)] text-[var(--ink)] font-bold py-2.5 rounded-xl text-sm hover:border-[var(--green)]/40 transition-colors"
          >
            チームページ
          </Link>
          <Link
            href="/mypage/team"
            className="text-center border border-[var(--line)] text-[var(--ink)] font-bold py-2.5 rounded-xl text-sm hover:border-[var(--green)]/40 transition-colors"
          >
            チーム情報を編集
          </Link>
        </div>
      </section>
      <TeamSwitcher teams={teams} selectedId={team.id} onSelect={onSelect} />

      {/* 2. 新着メッセージ */}
      <section className={CARD_CLASS}>
        <h2 className="text-base font-bold text-[var(--ink)] mb-3">新着メッセージ</h2>
        {ownPosts === null ? (
          <SkeletonLines count={2} />
        ) : newMessages.length === 0 ? (
          <p className="text-sm text-[var(--ink-mute)]">マイページを前回開いてから、新しいメッセージはありません。</p>
        ) : (
          <ul className="space-y-2">
            {newMessages.map(({ post, count, latest }) => (
              <li key={post.id}>
                <Link
                  href={`/posts/${post.id}`}
                  className="block rounded-xl border border-[var(--line)] px-3 py-2.5 hover:border-[var(--green)]/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-[var(--ink)] truncate">{post.title}</p>
                    <span className="shrink-0 text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--clay)] text-white">
                      新着{count}件
                    </span>
                  </div>
                  <p className="text-xs text-[var(--ink-sub)] mt-1 truncate">{latest.message}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 3. 自分の募集の状況 */}
      <section className={CARD_CLASS}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-[var(--ink)]">自分の募集の状況</h2>
          <Link href="/mypage" className="text-[13px] font-bold text-[var(--green)]">
            すべて見る →
          </Link>
        </div>
        {ownPosts === null ? (
          <SkeletonLines count={3} />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {typeCounts.map(({ type, count }) => (
                <div key={type} className="text-center rounded-xl bg-[var(--bg)] py-2">
                  <p className="text-[11px] text-[var(--ink-mute)]">{POST_TYPE_LABELS[type]}</p>
                  <p className="text-lg font-black text-[var(--ink)]">
                    {count}
                    <span className="text-xs font-bold ml-0.5">件</span>
                  </p>
                </div>
              ))}
            </div>
            {openPosts.length === 0 ? (
              <p className="text-sm text-[var(--ink-mute)]">募集中の募集はありません。</p>
            ) : (
              <>
                <ul className="divide-y divide-[var(--line)]">
                  {openPosts.slice(0, STATUS_LIST_LIMIT).map((post) => (
                    <li key={post.id} className="py-2">
                      <Link href={`/posts/${post.id}`} className="block text-sm font-bold text-[var(--ink)] truncate hover:underline">
                        {post.title}
                      </Link>
                      {viewCounts?.get(post.id) !== null && (
                        <PostStats postId={post.id} views={viewCounts?.get(post.id) ?? undefined} />
                      )}
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-[var(--ink-mute)] mt-2">閲覧数は、{VIEW_COUNT_NOTE}</p>
              </>
            )}
          </>
        )}
      </section>

      {/* 4. 募集する */}
      <section className={CARD_CLASS}>
        <h2 className="text-base font-bold text-[var(--ink)] mb-1">募集する</h2>
        <p className="text-xs text-[var(--ink-mute)] mb-3">チーム情報を自動で入力します</p>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="text-center bg-[var(--green)] text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 transition-opacity"
          >
            対戦相手
          </button>
          <Link
            href="/posts/new/helper"
            className="text-center border border-[var(--clay)] text-[var(--clay)] font-bold py-3 rounded-xl text-sm hover:bg-[var(--bg)] transition-colors"
          >
            助っ人
          </Link>
          <Link
            href="/posts/new/member"
            className="text-center border border-[#1177dd] text-[#1177dd] font-bold py-3 rounded-xl text-sm hover:bg-[var(--bg)] transition-colors"
          >
            メンバー
          </Link>
        </div>
        <PostMethodSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
      </section>

      {/* 5. 近くの新着募集 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-[var(--ink)]">近くの新着募集（{area}）</h2>
          <Link href={morePath} className="text-[13px] font-bold text-[var(--green)] shrink-0">
            もっと見る →
          </Link>
        </div>
        {nearby === null ? (
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="h-28 rounded-2xl bg-[var(--line)]/40 animate-pulse" />
            <div className="h-28 rounded-2xl bg-[var(--line)]/40 animate-pulse" />
          </div>
        ) : nearby.length === 0 ? (
          <p className={`${CARD_CLASS} text-sm text-[var(--ink-mute)]`}>{team.prefecture}の受付中の募集はまだありません。</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {nearby.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>

      {/* 6. チーム一覧 */}
      <Link
        href="/teams"
        className={`${CARD_CLASS} flex items-center justify-between hover:border-[var(--green)]/40 transition-colors`}
      >
        <span>
          <span className="block text-base font-bold text-[var(--ink)]">チームを探す</span>
          <span className="block text-xs text-[var(--ink-mute)] mt-0.5">登録しているチームを、地域やレベルで探せます</span>
        </span>
        <span className="text-[var(--green)] font-bold" aria-hidden>
          →
        </span>
      </Link>
    </div>
  )
}

function RegisterTeamCard() {
  return (
    <div className="max-w-2xl mx-auto px-4 pt-6">
      <section className={`${CARD_CLASS} text-center space-y-3`}>
        <p className="text-base font-bold text-[var(--ink)]">チームを登録しましょう</p>
        <p className="text-sm text-[var(--ink-sub)]">
          チームを登録すると、募集の自動入力や、届いたメッセージ・閲覧数の確認ができます。
        </p>
        <Link
          href="/mypage/team/new"
          className="inline-block bg-[var(--green)] text-white font-bold px-6 py-3 rounded-xl text-sm hover:opacity-90 transition-opacity"
        >
          チームを登録する
        </Link>
      </section>
    </div>
  )
}

function SkeletonLines({ count }: { count: number }) {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="h-10 rounded-xl bg-[var(--line)]/40 animate-pulse" />
      ))}
    </div>
  )
}

// 読み込み中の枠（未ログイン用のトップを一瞬見せないため、同じ並びの枠だけを出す）
function HomeSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5" aria-busy="true" aria-label="チームホームを読み込み中">
      <div className={`${CARD_CLASS} flex items-center gap-4`}>
        <div className="w-14 h-14 rounded-full bg-[var(--line)]/60 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-40 rounded bg-[var(--line)]/60 animate-pulse" />
          <div className="h-4 w-24 rounded bg-[var(--line)]/40 animate-pulse" />
        </div>
      </div>
      {[2, 3, 1].map((n, i) => (
        <div key={i} className={CARD_CLASS}>
          <div className="h-5 w-32 rounded bg-[var(--line)]/60 animate-pulse mb-3" />
          <SkeletonLines count={n} />
        </div>
      ))}
    </div>
  )
}
