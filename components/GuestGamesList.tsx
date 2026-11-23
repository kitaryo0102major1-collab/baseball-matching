'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { gameDateLabel } from '@/lib/games'
import { readGuestGames, type StoredGuestGame } from '@/lib/guestGames'
import { GameStatusBadge } from './GameInfoSummary'
import GuestEditLink from './GuestEditLink'

interface ListedGame {
  id: string
  imported: boolean
  game_date: string | null
  guest_team_name: string | null
  opponent_name: string | null
  status: '入力中' | '確定' | null
  our_runs: number | null
  opponent_runs: number | null
  updated_at: string
}

type State =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error' }
  | { status: 'ready'; games: (ListedGame & { token: string })[] }

function StartButton() {
  return (
    <Link
      href="/scores/new"
      className="block text-center bg-[var(--green)] text-white font-bold py-3.5 rounded-xl text-base hover:opacity-90 transition-opacity"
    >
      スコアをつける
    </Link>
  )
}

// 「この端末で記録した試合」。端末（localStorage）にある試合だけを list_guest_games で取得する
export default function GuestGamesList() {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    const stored: StoredGuestGame[] = readGuestGames()
    if (stored.length === 0) {
      setState({ status: 'empty' })
      return
    }

    supabase
      .rpc('list_guest_games', { p_game_ids: stored.slice(0, 50).map((g) => g.id) })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setState({ status: 'error' })
          return
        }
        const rows = (data ?? []) as ListedGame[]
        // 削除済み・期限切れで返ってこない試合は出さない。並びは新しい日付順
        const games = stored
          .map((s) => {
            const row = rows.find((r) => r.id === s.id)
            return row ? { ...row, token: s.token } : null
          })
          .filter((g): g is ListedGame & { token: string } => g !== null)
          .sort((a, b) => (b.game_date ?? '').localeCompare(a.game_date ?? '') || b.updated_at.localeCompare(a.updated_at))
        setState(games.length ? { status: 'ready', games } : { status: 'empty' })
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (state.status === 'loading') {
    return <div className="text-center py-10 text-sm text-[var(--ink-mute)]">読み込み中...</div>
  }

  if (state.status === 'empty') return <StartButton />

  if (state.status === 'error') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[#A3462B] text-center">この端末の試合を読み込めませんでした。通信状態を確認して、ページを開き直してください。</p>
        <StartButton />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <StartButton />
      <section className="space-y-3">
        <h2 className="text-base font-bold text-[var(--ink)]">この端末で記録した試合</h2>
        <ul className="space-y-3">
          {state.games.map((g) => (
            <li key={g.id} className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-4 space-y-3">
              {g.imported ? (
                <p className="text-sm text-[var(--ink-sub)]">チームに取り込み済みの試合です。チームの試合一覧から開いてください。</p>
              ) : (
                <>
                  <Link href={`/scores/${g.id}/edit`} className="block group">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-[var(--ink-mute)]">
                        {g.game_date ? `${g.game_date.slice(0, 4)}年 ${gameDateLabel(g.game_date)}` : ''}
                      </span>
                      {g.status && <GameStatusBadge status={g.status} />}
                    </div>
                    <div className="flex items-center justify-between gap-3 mt-1.5">
                      <p className="text-sm font-bold text-[var(--ink)] min-w-0 break-words group-hover:underline">
                        {g.guest_team_name || '自チーム'} <span className="text-[var(--ink-mute)] font-normal">vs</span> {g.opponent_name}
                      </p>
                      <p className="text-lg font-black text-[var(--ink)] shrink-0 tabular-nums">
                        {g.our_runs ?? 0} - {g.opponent_runs ?? 0}
                      </p>
                    </div>
                  </Link>
                  <GuestEditLink gameId={g.id} token={g.token} compact />
                </>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
