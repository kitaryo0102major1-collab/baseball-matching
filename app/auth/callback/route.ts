import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=1`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=1`)
  }

  const { data: team } = await supabase.from('teams').select('id').eq('owner_id', data.user.id).maybeSingle()

  return NextResponse.redirect(`${origin}${team ? '/mypage' : '/mypage/team'}`)
}
