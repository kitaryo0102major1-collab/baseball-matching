export type FieldStatus = 'ok' | 'ng'
export type Level = 'A+' | 'A' | 'B' | 'C'

export interface MatchPost {
  id: string
  title: string
  field_status: FieldStatus
  venue_name: string | null
  area: string | null
  level: Level
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
  area?: string | null
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
