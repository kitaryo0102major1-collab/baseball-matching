'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateVisitorId } from '@/lib/visitor'

const BOT_USER_AGENT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse/i

// このページの読み込み中に記録済みの募集。React の開発モードの二重実行や再描画で二重に呼ばない
// （同じ端末の閲覧は DB 側でも1日1回にまとめている）
const recorded = new Set<string>()

// 募集詳細の閲覧を記録する。表示には何も出さない。
// チームの管理者・ゲスト募集を投稿した端末の閲覧は record_post_view の中で除外する
export default function RecordPostView({ postId }: { postId: string }) {
  useEffect(() => {
    if (recorded.has(postId) || BOT_USER_AGENT.test(navigator.userAgent)) return
    recorded.add(postId)

    // 表示が落ち着いてから送る（ページの表示を遅くしない）
    const run = () => {
      const visitorId = getOrCreateVisitorId()
      if (!visitorId) return
      // 管理者の判定にログイン状態が要るので、ログイン状態を持つクライアントで呼ぶ。失敗しても何もしない
      createClient()
        .rpc('record_post_view', { p_post_id: postId, p_visitor_id: visitorId })
        .then(
          () => undefined,
          () => undefined
        )
    }
    if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 3000 })
    else setTimeout(run, 1000)
  }, [postId])

  return null
}
