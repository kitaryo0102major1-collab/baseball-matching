import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SELECTED_TEAM_COOKIE } from '@/lib/selectedTeam'
import type { Team } from '@/lib/types'

export async function requireMyTeams() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect('/login')

  const { data } = await supabase.from('teams').select('*').order('created_at', { ascending: true })
  const teams = (data ?? []) as Team[]

  const cookieStore = await cookies()
  const selectedId = cookieStore.get(SELECTED_TEAM_COOKIE)?.value
  const selectedTeam = teams.find((t) => t.id === selectedId) ?? teams[0] ?? null

  return { supabase, user: auth.user, teams, selectedTeam }
}
