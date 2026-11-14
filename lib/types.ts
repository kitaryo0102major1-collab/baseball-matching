export type FieldStatus = 'ok' | 'ng'
export type Level = 'A+' | 'A' | 'B' | 'C'
export type PostStatus = '募集中' | '決定済み' | '募集終了'
export type PostType = 'match' | 'helper' | 'member'

export const POST_TYPE_LABELS: Record<PostType, string> = {
  match: '対戦相手',
  helper: '助っ人',
  member: 'メンバー',
}

export const POSITIONS = ['投手', '捕手', '内野手', '外野手', 'どこでも'] as const
export const EXPERIENCES = ['経験者のみ', '未経験OK', '問わない'] as const
export const TRAVEL_RANGES = ['市内のみ', '30分圏内', '1時間圏内', '県内どこでも'] as const

export type Position = (typeof POSITIONS)[number]
export type Experience = (typeof EXPERIENCES)[number]
export type TravelRange = (typeof TRAVEL_RANGES)[number]

export interface MatchPost {
  id: string
  title: string
  post_type: PostType
  field_status: FieldStatus | null
  venue_name: string | null
  area_detail: string | null
  prefecture: string | null
  level: Level
  status: PostStatus
  game_date: string | null
  positions: Position[] | null
  headcount: string | null
  experience: Experience | null
  fee: string | null
  opponent_name: string | null
  age_condition: string | null
  activity_note: string | null
  trial_ok: boolean | null
  renewed_at: string
  source_post_id: string | null
  start_time: string | null
  end_time: string | null
  description: string | null
  sns_x: string | null
  sns_instagram: string | null
  team_id: string | null
  created_by: string | null
  created_at: string
  city: string | null
  travel_range: TravelRange | null
}

export interface PostContacts {
  contact_email: string | null
  contact_phone: string | null
  contact_other: string | null
}

export interface PostTeamBadge {
  id: string
  name: string
  logo_url: string | null
}

export type MatchPostWithTeam = MatchPost & { team: PostTeamBadge | null }

export const ACTIVITY_DAYS = ['月', '火', '水', '木', '金', '土', '日', '祝'] as const
export const ACTIVITY_TIMES = ['午前', '午後', '夕方以降', '不定'] as const
export const AGE_RANGES = ['10代', '20代', '30代', '40代', '50代以上', '幅広い'] as const

export type ActivityDay = (typeof ACTIVITY_DAYS)[number]
export type ActivityTime = (typeof ACTIVITY_TIMES)[number]
export type AgeRange = (typeof AGE_RANGES)[number]

export interface TeamProfile {
  id: string
  name: string
  logo_url: string | null
  description: string | null
  prefecture: string
  area_detail: string | null
  level: Level
  activity_days: ActivityDay[]
  activity_times: ActivityTime[]
  home_ground: string | null
  member_count: number | null
  age_range: AgeRange | null
  founded_year: number | null
  league: string | null
  sns_x: string | null
  sns_instagram: string | null
  contact_email: string | null
  contact_phone: string | null
  contact_other: string | null
  created_at: string
  updated_at: string
  city: string | null
  travel_range: TravelRange | null
}

export interface Team extends TeamProfile {
  created_by: string | null
  contact_public: boolean
}

// city / travel_range はまだフォームで扱わないので、保存時に送らない（既存の値を消さない）
export type TeamInput = Omit<Team, 'id' | 'created_by' | 'created_at' | 'updated_at' | 'city' | 'travel_range'>

export type TeamSummary = Pick<Team, 'id' | 'name' | 'logo_url'>

export interface TeamMember {
  team_id: string
  user_id: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
}

export interface TeamInvite {
  id: string
  team_id: string
  token: string
  created_by: string | null
  expires_at: string
  revoked_at: string | null
  created_at: string
}

export interface Chat {
  id: string
  post_id: string
  team_name: string
  message: string
  team_id: string | null
  created_at: string
}

export interface ChatInsert {
  post_id: string
  team_name: string
  message: string
  team_id?: string | null
}

// 募集フォームで自動入力に使う、管理中チームの情報（本人は RLS で全項目を読める）
export type MyTeamForPost = Pick<
  Team,
  | 'id'
  | 'name'
  | 'logo_url'
  | 'prefecture'
  | 'area_detail'
  | 'level'
  | 'contact_email'
  | 'contact_phone'
  | 'contact_other'
  | 'sns_x'
  | 'sns_instagram'
  | 'city'
  | 'travel_range'
>

export interface MatchPostInsert {
  title: string
  post_type?: PostType
  field_status?: FieldStatus | null
  venue_name?: string | null
  area_detail?: string | null
  prefecture: string
  level: Level
  game_date?: string | null
  positions?: Position[]
  headcount?: string | null
  experience?: Experience
  fee?: string | null
  opponent_name?: string | null
  age_condition?: string | null
  activity_note?: string | null
  trial_ok?: boolean | null
  renewed_at?: string
  source_post_id?: string | null
  start_time?: string | null
  end_time?: string | null
  description?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  contact_other?: string | null
  sns_x?: string | null
  sns_instagram?: string | null
  team_id?: string | null
  created_by?: string | null
  city?: string | null
  travel_range?: TravelRange | null
}
