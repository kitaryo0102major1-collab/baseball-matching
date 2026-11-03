import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // 未ログインの訪問者（大半）は Supabase に問い合わせずにそのまま通す
  const hasAuthCookie = request.cookies.getAll().some((c) => c.name.startsWith('sb-'))
  if (!hasAuthCookie) return NextResponse.next()

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value))
        },
      },
    }
  )

  // 期限切れのアクセストークンをここで更新し、Cookie に書き戻す
  await supabase.auth.getClaims()

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|html|xml|txt)$).*)'],
}
