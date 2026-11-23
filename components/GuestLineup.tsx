'use client'

import Link from 'next/link'
import { useState } from 'react'
import { rememberNames, toLineupRow, type LineupRow } from '@/lib/lineup'
import { GUEST_GAME_MESSAGES, saveScoreGame, useGuestGame } from '@/lib/useGuestGame'
import LineupEditor from './LineupEditor'

// ゲストの試合の打順と交代。保存は save_guest_game（出場の行を丸ごと入れ替え）
export default function GuestLineup({ gameId }: { gameId: string }) {
  const { state, refresh } = useGuestGame(gameId)
  const [conflict, setConflict] = useState(false)

  if (state.status === 'loading') {
    return <div className="text-center py-16 text-sm text-[var(--ink-mute)]">読み込み中...</div>
  }

  if (state.status !== 'ready') {
    return (
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 space-y-4">
        <p className="text-sm text-[var(--ink-sub)] leading-relaxed">{GUEST_GAME_MESSAGES[state.status]}</p>
        <Link href="/scores" className="block text-center border border-[var(--line)] text-[var(--ink)] font-bold py-3 rounded-xl text-sm">
          この端末で記録した試合へ
        </Link>
      </div>
    )
  }

  const { data, token } = state
  const nextSeq = data.plate_appearances.reduce((max, pa) => Math.max(max, Number(pa.seq) || 0), 0) + 1

  async function save(rows: LineupRow[], opponentLineup: string[]) {
    if (state.status !== 'ready') return null
    const result = await saveScoreGame(gameId, token, state.data, {
      game: { opponent_lineup: opponentLineup },
      // ゲストの試合は名簿の選手を使わない
      lineups: rows.map((r) => ({ ...r, player_id: null })),
    })
    if (result.error) return '保存できませんでした。通信状態を確認して、もう一度お試しください。'
    rememberNames(rows.map((r) => r.guest_name ?? ''))
    setConflict(!!result.conflict)
    await refresh()
    return null
  }

  return (
    <>
      {conflict && (
        <p className="text-sm text-[#7A5500] bg-[#FFF4D6] border border-[#F0DDA0] rounded-xl px-4 py-3" role="status">
          ほかの端末でも保存されていました。今保存した内容で上書きしています。
        </p>
      )}
      <LineupEditor
        game={data.game}
        initialRows={data.lineups.map(toLineupRow)}
        people={{ kind: 'guest' }}
        nextSeq={nextSeq}
        inputHref={`/scores/${gameId}/input`}
        onSave={save}
      />
    </>
  )
}
