// 「気になる」の数と押した状態のクライアント側ストア（LikeButton から使う）。
// 同じタイミングで表示されたボタンの分をまとめて get_post_like_counts 1回（200件ごと）で取得する。
import { supabase } from '@/lib/supabase'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateVisitorId, getVisitorId } from '@/lib/visitor'

export interface LikeState {
  count: number
  liked: boolean
}

const BATCH_SIZE = 200 // get_post_like_counts が一度に受け付ける上限

const states = new Map<string, LikeState>()
const requested = new Set<string>()
const pending: string[] = []
const busy = new Set<string>()
const listeners = new Set<() => void>()
let flushTimer: ReturnType<typeof setTimeout> | null = null

function emit() {
  listeners.forEach((listener) => listener())
}

export function subscribeLikes(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getLikeState(postId: string) {
  return states.get(postId)
}

// 取得を予約する。同じ描画で予約された分は次のタイミングでまとめて取得する
export function requestLikeState(postId: string) {
  if (requested.has(postId)) return
  requested.add(postId)
  pending.push(postId)
  if (!flushTimer) flushTimer = setTimeout(flush, 0)
}

async function flush() {
  flushTimer = null
  const ids = pending.splice(0)
  // まだ端末IDがない人は何も押していないので、作らずに null で問い合わせる
  const visitorId = getVisitorId()
  const chunks: string[][] = []
  for (let i = 0; i < ids.length; i += BATCH_SIZE) chunks.push(ids.slice(i, i + BATCH_SIZE))

  await Promise.all(
    chunks.map(async (chunk) => {
      const { data, error } = await supabase.rpc('get_post_like_counts', {
        p_post_ids: chunk,
        p_visitor_id: visitorId,
      })
      const rows = (error ? [] : (data ?? [])) as { post_id: string; like_count: number; liked: boolean }[]
      // 1件もない募集は行が返らないので 0 にする（取得に失敗したときも 0 として表示する）
      for (const id of chunk) states.set(id, { count: 0, liked: false })
      for (const row of rows) states.set(row.post_id, { count: Number(row.like_count), liked: row.liked })
    })
  )
  emit()
}

export type ToggleResult = 'ok' | 'unavailable' | 'busy'

// 押した状態を切り替える。見た目はすぐ変え、失敗したら元に戻す。送信中の連打は無視する
export async function toggleLike(postId: string): Promise<ToggleResult> {
  const current = states.get(postId)
  if (!current || busy.has(postId)) return 'busy'
  const visitorId = getOrCreateVisitorId()
  if (!visitorId) return 'unavailable'

  busy.add(postId)
  states.set(postId, { count: Math.max(0, current.count + (current.liked ? -1 : 1)), liked: !current.liked })
  emit()

  let failed = false
  try {
    // ログイン中なら user_id も残るよう、ログイン状態を持つクライアントで呼ぶ
    const { error } = await createClient().rpc(current.liked ? 'unlike_post' : 'like_post', {
      p_post_id: postId,
      p_visitor_id: visitorId,
    })
    failed = !!error
  } catch {
    failed = true
  }
  if (failed) {
    states.set(postId, current)
    emit()
  }
  busy.delete(postId)
  return 'ok'
}
