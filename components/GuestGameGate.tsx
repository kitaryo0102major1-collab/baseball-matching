'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { readDraft, useGameRecords } from '@/lib/gameRecords'
import { getGuestToken } from '@/lib/guestGames'
import { toLineupRow } from '@/lib/lineup'
import { sendGuestRecords } from '@/lib/recordSenders'
import type { PlateAppearance, RunnerEvent } from '@/lib/scoring/types'
import { GUEST_GAME_MESSAGES, useGuestGame, type ScoreGame } from '@/lib/useGuestGame'

// 端末に残す、画面を開くのに必要な試合情報
interface GuestMeta {
  game: ScoreGame['game']
  pitching_summaries: ScoreGame['pitching_summaries']
  pitching_decisions: ScoreGame['pitching_decisions']
}

// ゲストの試合を開く。サーバーに届かないとき（電波がないなど）は、端末に残した記録で開く
export default function GuestGameGate({
  gameId,
  children,
}: {
  gameId: string
  children: (token: string, data: ScoreGame) => React.ReactNode
}) {
  const { state } = useGuestGame(gameId)
  const [offline, setOffline] = useState<{ token: string; data: ScoreGame } | null | undefined>(undefined)

  useEffect(() => {
    if (state.status !== 'error') return
    const draft = readDraft(gameId)
    const token = getGuestToken(gameId)
    const meta = draft?.meta as GuestMeta | undefined
    if (!draft || !meta?.game || !token) {
      setOffline(null)
      return
    }
    setOffline({
      token,
      data: {
        game: meta.game,
        lineups: draft.records.lineups as unknown as Record<string, unknown>[],
        plate_appearances: draft.records.pas as unknown as Record<string, unknown>[],
        runner_events: draft.records.events as unknown as Record<string, unknown>[],
        pitching_summaries: meta.pitching_summaries ?? [],
        pitching_decisions: meta.pitching_decisions ?? [],
      },
    })
  }, [state.status, gameId])

  if (state.status === 'loading' || (state.status === 'error' && offline === undefined)) {
    return <div className="text-center py-16 text-sm text-[var(--ink-mute)]">読み込み中...</div>
  }
  if (state.status === 'ready') return <>{children(state.token, state.data)}</>
  if (state.status === 'error' && offline) {
    return (
      <>
        <p className="mb-3 text-xs text-[#9A6B00] bg-[#FFF4D6] border border-[#F0DDA0] rounded-xl px-3 py-2">
          通信できないため、この端末の記録を表示しています。つながったら自動で送ります。
        </p>
        {children(offline.token, offline.data)}
      </>
    )
  }
  return (
    <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 space-y-4">
      <p className="text-sm text-[var(--ink-sub)] leading-relaxed">{GUEST_GAME_MESSAGES[state.status]}</p>
      <Link href="/scores" className="block text-center border border-[var(--line)] text-[var(--ink)] font-bold py-3 rounded-xl text-sm">
        この端末で記録した試合へ
      </Link>
    </div>
  )
}

// ゲストの試合の記録（端末に保存し、裏で save_guest_game で送る）
export function useGuestRecords(gameId: string, token: string, data: ScoreGame) {
  const meta: GuestMeta = {
    game: data.game,
    pitching_summaries: data.pitching_summaries,
    pitching_decisions: data.pitching_decisions,
  }
  return useGameRecords({
    gameId,
    server: {
      lineups: data.lineups.map(toLineupRow),
      pas: data.plate_appearances as unknown as PlateAppearance[],
      events: data.runner_events as unknown as RunnerEvent[],
      opponentLineup: data.game.opponent_lineup ?? [],
    },
    serverUpdatedAt: data.game.updated_at,
    meta,
    send: (records, expected) =>
      sendGuestRecords(gameId, token, records, expected, {
        pitching_summaries: data.pitching_summaries,
        pitching_decisions: data.pitching_decisions,
      }),
  })
}
