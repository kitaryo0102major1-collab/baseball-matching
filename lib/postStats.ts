// 募集を出した人向けの閲覧数の取得（クライアント用）
import { createClient } from '@/lib/supabase/client'
import { getVisitorId } from '@/lib/visitor'

const BATCH_SIZE = 200 // get_post_view_counts が一度に受け付ける上限

// 閲覧数をまとめて取得する。見られない募集・取得に失敗した募集は null。
// 管理者の判定にログイン状態が要るので、ログイン状態を持つクライアントで呼ぶ
export async function fetchViewCounts(postIds: string[]): Promise<Map<string, number | null>> {
  const result = new Map<string, number | null>(postIds.map((id) => [id, null]))
  const visitorId = getVisitorId()
  const supabase = createClient()
  const chunks: string[][] = []
  for (let i = 0; i < postIds.length; i += BATCH_SIZE) chunks.push(postIds.slice(i, i + BATCH_SIZE))

  await Promise.all(
    chunks.map(async (chunk) => {
      const { data, error } = await supabase.rpc('get_post_view_counts', {
        p_post_ids: chunk,
        p_visitor_id: visitorId,
      })
      if (error || !data) return
      for (const row of data as { post_id: string; view_count: number | null }[]) {
        result.set(row.post_id, row.view_count === null ? null : Number(row.view_count))
      }
    })
  )
  return result
}
