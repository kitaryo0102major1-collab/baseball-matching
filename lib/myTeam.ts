import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Team } from '@/lib/types'

export async function requireUserWithTeam() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect('/login')

  const { data: team } = await supabase.from('teams').select('*').eq('owner_id', auth.user.id).maybeSingle()

  return { user: auth.user, team: team as Team | null }
}
