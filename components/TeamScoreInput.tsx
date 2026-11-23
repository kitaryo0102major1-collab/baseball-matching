'use client'

import { useGameRecords } from '@/lib/gameRecords'
import type { LineupRow } from '@/lib/lineup'
import { sendTeamRecords } from '@/lib/recordSenders'
import type { PlateAppearance, RunnerEvent } from '@/lib/scoring/types'
import type { Game, Player } from '@/lib/types'
import ScoreInput from './ScoreInput'
import SyncStatus, { ConflictNotice } from './SyncStatus'

interface Props {
  game: Game
  teamName: string
  rows: LineupRow[]
  players: Player[]
  pas: PlateAppearance[]
  events: RunnerEvent[]
}

// チームの試合の打席入力。記録は端末に保存し、裏でまとめて送る（lib/gameRecords.ts）
export default function TeamScoreInput({ game, teamName, rows, players, pas, events }: Props) {
  const store = useGameRecords({
    gameId: game.id,
    server: { lineups: rows, pas, events, opponentLineup: game.opponent_lineup ?? [] },
    serverUpdatedAt: game.updated_at,
    send: (records, expected) => sendTeamRecords(game.id, records, expected),
  })

  if (!store.ready) return <div className="text-center py-16 text-sm text-[var(--ink-mute)]">読み込み中...</div>

  const playerById = new Map(players.map((p) => [p.id, p]))
  const rowById = new Map(store.records.lineups.map((r) => [r.id, r]))

  function nameOf(lineupId: string | null) {
    const row = lineupId ? rowById.get(lineupId) : null
    if (!row?.player_id) return '—'
    return playerById.get(row.player_id)?.display_name ?? '（名簿から削除された選手）'
  }

  return (
    <>
      {store.conflict && (
        <div className="mb-3">
          <ConflictNotice onClose={store.dismissConflict} />
        </div>
      )}
      <ScoreInput
        game={game}
        ourName={teamName}
        opponentName={game.opponent_name}
        rows={store.records.lineups}
        initialPas={store.records.pas}
        initialEvents={store.records.events}
        nameOf={nameOf}
        batsOf={(row) => (row.player_id ? playerById.get(row.player_id)?.bats ?? null : null)}
        lineupHref={`/mypage/games/${game.id}/lineup`}
        statusSlot={<SyncStatus state={store.syncState} pending={store.pending} />}
        onRecord={async (_pa, _events, allPas, allEvents) => {
          store.commit({ pas: allPas, events: allEvents })
          return null
        }}
        onUndo={async (_op, allPas, allEvents) => {
          store.commit({ pas: allPas, events: allEvents })
          return null
        }}
      />
    </>
  )
}
