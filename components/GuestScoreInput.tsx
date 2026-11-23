'use client'

import type { ScoreGame } from '@/lib/useGuestGame'
import GuestGameGate, { useGuestRecords } from './GuestGameGate'
import ScoreInput from './ScoreInput'
import SyncStatus, { ConflictNotice } from './SyncStatus'

// ゲストの試合の打席入力。記録は端末に保存し、裏で save_guest_game でまとめて送る
export default function GuestScoreInput({ gameId }: { gameId: string }) {
  return <GuestGameGate gameId={gameId}>{(token, data) => <GuestRecordsInput gameId={gameId} token={token} data={data} />}</GuestGameGate>
}

function GuestRecordsInput({ gameId, token, data }: { gameId: string; token: string; data: ScoreGame }) {
  const store = useGuestRecords(gameId, token, data)

  if (!store.ready) return <div className="text-center py-16 text-sm text-[var(--ink-mute)]">読み込み中...</div>

  const rowById = new Map(store.records.lineups.map((r) => [r.id, r]))

  return (
    <>
      {store.conflict && (
        <div className="mb-3">
          <ConflictNotice onClose={store.dismissConflict} />
        </div>
      )}
      <ScoreInput
        game={data.game}
        ourName={data.game.guest_team_name || '自チーム'}
        opponentName={data.game.opponent_name}
        rows={store.records.lineups}
        initialPas={store.records.pas}
        initialEvents={store.records.events}
        nameOf={(id) => (id ? rowById.get(id)?.guest_name ?? '—' : '—')}
        batsOf={(row) => row.guest_bats}
        lineupHref={`/scores/${gameId}/lineup`}
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
