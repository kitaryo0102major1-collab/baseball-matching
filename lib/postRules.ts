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

// 受付中か（募集中で、試合日が今日以降・メンバー募集は60日以内）。気になるを押せるかの判定に使う
export function isPostOpen(post: Pick<MatchPost, 'status' | 'post_type' | 'game_date' | 'renewed_at'>) {
  if (post.status !== '募集中') return false
  if (post.post_type === 'member') return memberVisibility(post) === 'listed'
  return !!post.game_date && post.game_date >= todayJST()
}

export function memberListingCutoff() {
  return new Date(Date.now() - MEMBER_LISTED_DAYS * DAY_MS).toISOString()
}

// 「募集中で掲載期間内」の条件。status='募集中' と組み合わせて PostgREST の or() に渡す
export function openPostsOrFilter() {
  return `and(post_type.in.(match,helper),game_date.gte.${todayJST()}),and(post_type.eq.member,renewed_at.gte."${memberListingCutoff()}")`
}

// 市区町村の絞り込み。同じ都道府県で市区町村が未設定の募集も取得し、表示側で分けて出す（PostgREST の or() に渡す）
export function cityOrUnsetFilter(city: string) {
  return `city.eq."${city.replace(/"/g, '')}",city.is.null`
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

// 場所の表示「都道府県 市区町村 ・ 移動範囲」。市区町村がない既存の募集は都道府県だけ（移動範囲も出さない）
export function postPlaceLabel(post: Pick<MatchPost, 'prefecture' | 'city' | 'travel_range'>) {
  if (!post.city) return post.prefecture ?? ''
  const place = [post.prefecture, post.city].filter(Boolean).join(' ')
  return post.travel_range ? `${place} ・ ${post.travel_range}` : place
}

export function postListPath(type: MatchPost['post_type']) {
  return type === 'match' ? '/posts' : `/posts?type=${type}`
}
