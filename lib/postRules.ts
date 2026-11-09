import { todayJST } from '@/lib/dates'
import type { MatchPost } from '@/lib/types'

const DAY_MS = 24 * 60 * 60 * 1000
const MEMBER_LISTED_DAYS = 60
const MEMBER_KEPT_DAYS = 365

// listed: 通常掲載 / unlisted: 一覧から外して確認待ち / expired: マイページからも消して終了扱い
export type MemberVisibility = 'listed' | 'unlisted' | 'expired'

export function memberVisibility(post: Pick<MatchPost, 'renewed_at'>): MemberVisibility {
  const ageDays = (Date.now() - new Date(post.renewed_at).getTime()) / DAY_MS
  if (ageDays > MEMBER_KEPT_DAYS) return 'expired'
  if (ageDays > MEMBER_LISTED_DAYS) return 'unlisted'
  return 'listed'
}

export function memberListingCutoff() {
  return new Date(Date.now() - MEMBER_LISTED_DAYS * DAY_MS).toISOString()
}

// 「募集中で掲載期間内」の条件。status='募集中' と組み合わせて PostgREST の or() に渡す
export function openPostsOrFilter() {
  return `and(post_type.in.(match,helper),game_date.gte.${todayJST()}),and(post_type.eq.member,renewed_at.gte."${memberListingCutoff()}")`
}

// 絞り込み条件を URL に反映する。router.replace だとサーバーへ再取得が走り、
// /posts は動的配信なので再描画 → 再度 replace の無限ループになる。
export function syncListUrl(params: URLSearchParams) {
  const qs = params.toString()
  const next = qs ? `/posts?${qs}` : '/posts'
  if (next !== `${window.location.pathname}${window.location.search}`) {
    window.history.replaceState(null, '', next)
  }
}

export function postListPath(type: MatchPost['post_type']) {
  return type === 'match' ? '/posts' : `/posts?type=${type}`
}
