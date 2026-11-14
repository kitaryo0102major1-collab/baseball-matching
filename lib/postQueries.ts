import type { SupabaseClient } from '@supabase/supabase-js'
import type { PostContacts } from '@/lib/types'

// 連絡先3列は anon / authenticated から読めないので、select('*') は使えない
export const POST_COLUMNS =
  'id, title, post_type, field_status, venue_name, area_detail, prefecture, level, status, game_date, start_time, end_time, positions, headcount, experience, fee, opponent_name, age_condition, activity_note, trial_ok, renewed_at, source_post_id, description, sns_x, sns_instagram, team_id, created_by, created_at, city, travel_range'

export const POST_WITH_TEAM_SELECT = `${POST_COLUMNS}, team:team_profiles(id, name, logo_url)`

// 管理者の判定があるので、ログイン状態を持つクライアントを渡す。見られない募集は null
export async function getPostContacts(client: SupabaseClient, postId: string) {
  const { data, error } = await client.rpc('get_post_contacts', { post_id: postId })
  if (error) throw error
  return data as PostContacts | null
}
