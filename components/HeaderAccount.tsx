'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import TeamAvatar from './TeamAvatar'

type AccountState =
  | { status: 'loading' }
  | { status: 'guest' }
  | { status: 'member'; name: string; logoUrl: string | null }

export default function HeaderAccount() {
  const pathname = usePathname()
  const [account, setAccount] = useState<AccountState>({ status: 'loading' })

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    async function load(userId: string | null, email: string | null) {
      if (!userId) {
        if (!cancelled) setAccount({ status: 'guest' })
        return
      }
      const { data } = await supabase.from('teams').select('name, logo_url').eq('owner_id', userId).maybeSingle()
      if (cancelled) return
      setAccount({
        status: 'member',
        name: data?.name ?? email ?? '?',
        logoUrl: data?.logo_url ?? null,
      })
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // コールバック内で Supabase を await するとデッドロックするため、次のタスクに回す
      setTimeout(() => load(session?.user.id ?? null, session?.user.email ?? null), 0)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
    // チーム情報の編集後にロゴ・名前を反映させるため、画面遷移ごとに読み直す
  }, [pathname])

  if (account.status === 'loading') {
    return <span className="w-8 h-8" aria-hidden />
  }

  if (account.status === 'guest') {
    return (
      <Link
        href="/login"
        className="text-sm px-3 py-1.5 rounded-md border border-[var(--line)] text-[var(--ink-sub)] hover:text-[var(--green)] hover:border-[var(--green)]/40 transition-colors"
      >
        ログイン
      </Link>
    )
  }

  return (
    <Link href="/mypage" aria-label="マイページ" className="rounded-full hover:opacity-80 transition-opacity">
      <TeamAvatar name={account.name} logoUrl={account.logoUrl} size={32} />
    </Link>
  )
}
