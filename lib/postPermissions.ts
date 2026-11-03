import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { MatchPost } from '@/lib/types'

export async function isTeamManager(teamId: string): Promise<boolean> {
  const cookieStore = await cookies()
  const hasAuthCookie = cookieStore.getAll().some((c) => c.name.startsWith('sb-'))
  if (!hasAuthCookie) return false

  const supabase = await createClient()
  const { data } = await supabase.rpc('is_team_member', { p_team_id: teamId })
  return data === true
}

// ゲストの募集は誰でも修正・状態変更できる。チームの募集はそのチームの管理者だけ。
export async function getPostPermissions(post: Pick<MatchPost, 'team_id'>) {
  if (!post.team_id) return { canEdit: true, canDelete: false }
  const manager = await isTeamManager(post.team_id)
  return { canEdit: manager, canDelete: manager }
}
