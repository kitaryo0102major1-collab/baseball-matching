'use client'

import Link from 'next/link'
import { useState } from 'react'
import { toLineupRow } from '@/lib/lineup'
import type { PlateAppearance, RunnerEvent } from '@/lib/scoring/types'
import { GUEST_GAME_MESSAGES, saveScoreGame, useGuestGame } from '@/lib/useGuestGame'
import ScoreInput from './ScoreInput'

// ゲストの試合の打席入力。保存は save_guest_game（打席・走者の動きを丸ごと送る）
export default function GuestScoreInput({ gameId }: { gameId: string }) {
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
  const rows = data.lineups.map(toLineupRow)
  const rowById = new Map(rows.map((r) => [r.id, r]))

  async function saveAll(allPas: PlateAppearance[], allEvents: RunnerEvent[], message: string) {
    if (state.status !== 'ready') return message
    const result = await saveScoreGame(gameId, token, state.data, { plate_appearances: allPas, runner_events: allEvents })
    if (result.error) return message
    setConflict(!!result.conflict)
    await refresh()
    return null
  }

  return (
    <>
      {conflict && (
        <p className="mb-3 text-sm text-[#7A5500] bg-[#FFF4D6] border border-[#F0DDA0] rounded-xl px-4 py-3" role="status">
          ほかの端末でも保存されていました。今保存した内容で上書きしています。
        </p>
      )}
      <ScoreInput
        game={data.game}
        ourName={data.game.guest_team_name || '自チーム'}
        opponentName={data.game.opponent_name}
        rows={rows}
        initialPas={data.plate_appearances as unknown as PlateAppearance[]}
        initialEvents={data.runner_events as unknown as RunnerEvent[]}
        nameOf={(id) => (id ? rowById.get(id)?.guest_name ?? '—' : '—')}
        batsOf={(row) => row.guest_bats}
        lineupHref={`/scores/${gameId}/lineup`}
        onRecord={(_pa, _events, allPas, allEvents) =>
          saveAll(allPas, allEvents, '記録できませんでした。通信状態を確認して、もう一度お試しください。')
        }
        onUndo={(_pa, allPas, allEvents) => saveAll(allPas, allEvents, '取り消せませんでした。もう一度お試しください。')}
      />
    </>
  )
}
