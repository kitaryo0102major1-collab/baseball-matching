'use client'

import { referencedLineupError, rememberNames } from '@/lib/lineup'
import type { ScoreGame } from '@/lib/useGuestGame'
import GuestGameGate, { useGuestRecords } from './GuestGameGate'
import LineupEditor from './LineupEditor'
import SyncStatus, { ConflictNotice } from './SyncStatus'

// ゲストの試合の打順と交代。記録は打席入力と同じく端末に保存し、裏で save_guest_game でまとめて送る
export default function GuestLineup({ gameId }: { gameId: string }) {
  return <GuestGameGate gameId={gameId}>{(token, data) => <GuestLineupInner gameId={gameId} token={token} data={data} />}</GuestGameGate>
}

function GuestLineupInner({ gameId, token, data }: { gameId: string; token: string; data: ScoreGame }) {
  const store = useGuestRecords(gameId, token, data)

  if (!store.ready) return <div className="text-center py-16 text-sm text-[var(--ink-mute)]">読み込み中...</div>

  const nextSeq = store.records.pas.reduce((m, p) => Math.max(m, p.seq), 0) + 1

  return (
    <>
      {store.conflict && <ConflictNotice onClose={store.dismissConflict} />}
      <LineupEditor
        game={{ ...data.game, opponent_lineup: store.records.opponentLineup }}
        initialRows={store.records.lineups}
        people={{ kind: 'guest' }}
        nextSeq={nextSeq}
        inputHref={`/scores/${gameId}/input`}
        statusSlot={<SyncStatus state={store.syncState} pending={store.pending} />}
        onSave={async (rows, opponentLineup) => {
          const error = referencedLineupError(store.records, rows)
          if (error) return error
          rememberNames(rows.map((r) => r.guest_name ?? ''))
          store.commit({ lineups: rows, opponentLineup })
          return null
        }}
      />
    </>
  )
}
