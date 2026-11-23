'use client'

import { useGameRecords } from '@/lib/gameRecords'
import { referencedLineupError, type LineupRow } from '@/lib/lineup'
import { sendTeamRecords } from '@/lib/recordSenders'
import type { PlateAppearance, RunnerEvent } from '@/lib/scoring/types'
import { createClient } from '@/lib/supabase/client'
import type { Game, Player } from '@/lib/types'
import LineupEditor from './LineupEditor'
import SyncStatus, { ConflictNotice } from './SyncStatus'

interface Props {
  game: Game
  teamId: string
  initialRows: LineupRow[]
  players: Player[]
  pas: PlateAppearance[]
  events: RunnerEvent[]
}

// チームの試合の打順と交代。記録は打席入力と同じく端末に保存し、裏でまとめて送る
export default function TeamLineup({ game, teamId, initialRows, players, pas, events }: Props) {
  const store = useGameRecords({
    gameId: game.id,
    server: { lineups: initialRows, pas, events, opponentLineup: game.opponent_lineup ?? [] },
    serverUpdatedAt: game.updated_at,
    send: (records, expected) => sendTeamRecords(game.id, records, expected),
  })

  // 名簿への助っ人の追加は、記録とは別にすぐ保存する（つながっているときだけ）
  async function addHelper(displayName: string): Promise<Player | null> {
    const { data, error } = await createClient()
      .from('players')
      .insert({ team_id: teamId, display_name: displayName, is_helper: true })
      .select('*')
      .single()
    return error || !data ? null : (data as Player)
  }

  if (!store.ready) return <div className="text-center py-16 text-sm text-[var(--ink-mute)]">読み込み中...</div>

  const nextSeq = store.records.pas.reduce((m, p) => Math.max(m, p.seq), 0) + 1

  return (
    <>
      {store.conflict && <ConflictNotice onClose={store.dismissConflict} />}
      <LineupEditor
        game={{ ...game, opponent_lineup: store.records.opponentLineup }}
        initialRows={store.records.lineups}
        people={{ kind: 'team', players, addHelper }}
        nextSeq={nextSeq}
        inputHref={`/mypage/games/${game.id}/input`}
        statusSlot={<SyncStatus state={store.syncState} pending={store.pending} />}
        onSave={async (rows, opponentLineup) => {
          const error = referencedLineupError(store.records, rows)
          if (error) return error
          store.commit({ lineups: rows, opponentLineup })
          return null
        }}
      />
    </>
  )
}
