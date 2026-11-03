export type FieldStatus = 'ok' | 'ng'
export type Level = 'A+' | 'A' | 'B' | 'C'
export type PostStatus = '募集中' | '決定済み'

export interface MatchPost {
  id: string
  title: string
  field_status: FieldStatus
  venue_name: string | null
  area_detail: string | null
  prefecture: string | null
  level: Level
  status: PostStatus
  game_date: string
  start_time: string | null
  end_time: string | null
  description: string | null
  contact_email: string | null
  contact_phone: string | null
  contact_other: string | null
  sns_x: string | null
  sns_instagram: string | null
  created_at: string
}

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
}

export interface Team extends TeamProfile {
  owner_id: string
  contact_public: boolean
}

export type TeamInput = Omit<Team, 'id' | 'created_at' | 'updated_at'>

export interface Chat {
  id: string
  post_id: string
  team_name: string
  message: string
  created_at: string
}

export interface ChatInsert {
  post_id: string
  team_name: string
  message: string
}

export interface MatchPostInsert {
  title: string
  field_status: FieldStatus
  venue_name?: string | null
  area_detail?: string | null
  prefecture: string
  level: Level
  game_date: string
  start_time?: string | null
  end_time?: string | null
  description?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  contact_other?: string | null
  sns_x?: string | null
  sns_instagram?: string | null
}
