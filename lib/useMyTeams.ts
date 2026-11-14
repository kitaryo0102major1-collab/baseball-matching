'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { readSelectedTeamCookie } from '@/lib/selectedTeam'
import type { MyTeamForPost } from '@/lib/types'

const TEAM_FIELDS =
  'id, name, logo_url, prefecture, area_detail, level, contact_email, contact_phone, contact_other, sns_x, sns_instagram, city, travel_range'

export type MyTeamsState =
  | { status: 'loading' }
  | { status: 'guest' }
  | { status: 'member'; userId: string; teams: MyTeamForPost[]; defaultTeamId: string | null }

export function useMyTeams(): MyTeamsState {
  const [state, setState] = useState<MyTeamsState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    async function load() {
      // getSession は Cookie を読むだけで通信しないため、未ログインの人の表示速度は変わらない
      const { data } = await supabase.auth.getSession()
      const userId = data.session?.user.id
      if (!userId) {
        if (!cancelled) setState({ status: 'guest' })
        return
      }
      const { data: teams } = await supabase.from('teams').select(TEAM_FIELDS).order('created_at', { ascending: true })
      if (cancelled) return
      const list = (teams ?? []) as MyTeamForPost[]
      const cookieId = readSelectedTeamCookie()
      const defaultTeamId = list.find((t) => t.id === cookieId)?.id ?? list[0]?.id ?? null
      setState({ status: 'member', userId, teams: list, defaultTeamId })
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
