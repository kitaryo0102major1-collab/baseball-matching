'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { readSelectedTeamCookie, setSelectedTeamCookie } from '@/lib/selectedTeam'
import type { TeamSummary } from '@/lib/types'
import TeamAvatar from './TeamAvatar'

type AccountState =
  | { status: 'loading' }
  | { status: 'guest' }
  | { status: 'member'; email: string; teams: TeamSummary[]; selectedId: string | null }

export default function HeaderAccount() {
  const pathname = usePathname()
  const router = useRouter()
  const [account, setAccount] = useState<AccountState>({ status: 'loading' })
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    async function load(userId: string | null, email: string | null) {
      if (!userId) {
        if (!cancelled) setAccount({ status: 'guest' })
        return
      }
      const { data } = await supabase.from('teams').select('id, name, logo_url').order('created_at', { ascending: true })
      if (cancelled) return
      const teams = (data ?? []) as TeamSummary[]
      const cookieId = readSelectedTeamCookie()
      const selectedId = teams.find((t) => t.id === cookieId)?.id ?? teams[0]?.id ?? null
      setAccount({ status: 'member', email: email ?? '?', teams, selectedId })
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // コールバック内で Supabase を await するとデッドロックするため、次のタスクに回す
      setTimeout(() => load(session?.user.id ?? null, session?.user.email ?? null), 0)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
    // チームの切替・編集後に反映させるため、画面遷移ごとに読み直す
  }, [pathname])

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!menuOpen) return
    function onPointerDown(e: PointerEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

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

  const selected = account.teams.find((t) => t.id === account.selectedId)

  function selectTeam(teamId: string) {
    setMenuOpen(false)
    if (account.status !== 'member' || teamId === account.selectedId) return
    setSelectedTeamCookie(teamId)
    setAccount({ ...account, selectedId: teamId })
    router.refresh()
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label="アカウントメニュー"
        className="rounded-full hover:opacity-80 transition-opacity block"
      >
        <TeamAvatar name={selected?.name ?? account.email} logoUrl={selected?.logo_url} size={32} />
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-11 w-64 max-w-[calc(100vw-2rem)] bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-lg py-2 z-50"
        >
          {account.teams.length > 1 && (
            <>
              <p className="px-4 pt-1 pb-2 text-xs text-[var(--ink-mute)]">管理中のチーム</p>
              {account.teams.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={t.id === account.selectedId}
                  onClick={() => selectTeam(t.id)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-[var(--ink)] hover:bg-[var(--green-bg)]"
                >
                  <TeamAvatar name={t.name} logoUrl={t.logo_url} size={28} />
                  <span className="flex-1 truncate">{t.name}</span>
                  {t.id === account.selectedId && <CheckMark />}
                </button>
              ))}
              <div className="my-2 border-t border-[var(--line)]" />
            </>
          )}
          {account.teams.length === 1 && selected && (
            <>
              <div className="flex items-center gap-3 px-4 py-2">
                <TeamAvatar name={selected.name} logoUrl={selected.logo_url} size={28} />
                <span className="flex-1 truncate text-sm font-bold text-[var(--ink)]">{selected.name}</span>
              </div>
              <div className="my-2 border-t border-[var(--line)]" />
            </>
          )}
          <Link href="/mypage/team/new" role="menuitem" className="block px-4 py-2 text-sm text-[var(--ink)] hover:bg-[var(--green-bg)]">
            ＋ 新しいチームを登録
          </Link>
          <Link href="/mypage" role="menuitem" className="block px-4 py-2 text-sm text-[var(--ink)] hover:bg-[var(--green-bg)]">
            マイページ
          </Link>
        </div>
      )}
    </div>
  )
}

function CheckMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" aria-label="選択中" className="text-[var(--green)] shrink-0">
      <path d="M4.5 10.5l3.5 3.5 7.5-8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
