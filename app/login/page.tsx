import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GoogleLoginButton from '@/components/GoogleLoginButton'
import Logo from '@/components/Logo'

export const metadata: Metadata = {
  title: 'ログイン',
  robots: { index: false },
}

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (data?.claims) redirect('/mypage')

  const { error } = await searchParams

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <div className="inline-block mb-3">
          <Logo size={48} />
        </div>
        <h1 className="text-xl font-black text-[var(--ink)]">チーム登録・ログイン</h1>
        <p className="text-sm text-[var(--ink-sub)] mt-2 leading-relaxed">
          チームを登録すると、チームページを作って
          <br />
          対戦相手にチームのことを知ってもらえます。
        </p>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 space-y-4">
        {error && (
          <p className="text-sm text-[#A3462B] bg-[#FBEDE8] border border-[#EBC9BC] rounded-lg px-3 py-2">
            ログインに失敗しました。もう一度お試しください。
          </p>
        )}
        <GoogleLoginButton />
        <p className="text-xs text-[var(--ink-mute)] text-center">
          はじめての方もこちらから登録できます。
          <br />
          ログインすると
          <Link href="/privacy" className="underline">
            プライバシーポリシー
          </Link>
          に同意したものとみなします。
        </p>
      </div>

      <div className="mt-5 bg-[var(--green-bg)] rounded-2xl p-4 text-sm text-[var(--ink-sub)] leading-relaxed">
        <p className="font-bold text-[var(--green)] mb-1">ログインしなくても募集はできます</p>
        <p>
          対戦相手の募集・検索は、これまでどおり登録不要で使えます。
        </p>
        <div className="flex gap-4 mt-2 text-[13px] font-bold">
          <Link href="/posts/new" className="text-[var(--green)] underline">
            募集する
          </Link>
          <Link href="/posts" className="text-[var(--green)] underline">
            相手を探す
          </Link>
        </div>
      </div>
    </div>
  )
}
