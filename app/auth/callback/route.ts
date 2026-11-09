import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AUTH_NEXT_COOKIE, isSafeNextPath } from '@/lib/selectedTeam'

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

  const cookieStore = await cookies()
  const next = cookieStore.get(AUTH_NEXT_COOKIE)?.value
  cookieStore.delete(AUTH_NEXT_COOKIE)
  const nextPath = next ? decodeURIComponent(next) : null

  const { count } = await supabase.from('teams').select('id', { count: 'exact', head: true })

  // 助っ人・メンバー募集の案内から来た人は、チームがまだなければ先に登録してもらう
  if (isSafeNextPath(nextPath) && (count || !nextPath.startsWith('/posts/new/'))) {
    return NextResponse.redirect(`${origin}${nextPath}`)
  }

  return NextResponse.redirect(`${origin}${count ? '/mypage' : '/mypage/team/new'}`)
}
