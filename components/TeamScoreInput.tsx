'use client'

import { createClient } from '@/lib/supabase/client'
import type { LineupRow } from '@/lib/lineup'
import type { LastOperation } from '@/lib/scoring/between'
import type { PlateAppearance, RunnerEvent } from '@/lib/scoring/types'
import type { Game, Player } from '@/lib/types'
import ScoreInput from './ScoreInput'

interface Props {
  game: Game
  teamName: string
  rows: LineupRow[]
  players: Player[]
  pas: PlateAppearance[]
  events: RunnerEvent[]
}

const SAVE_ERROR = '記録できませんでした。通信状態を確認して、もう一度お試しください。'

// チームの試合の打席入力。保存は RLS でテーブルに直接
export default function TeamScoreInput({ game, teamName, rows, players, pas, events }: Props) {
  const playerById = new Map(players.map((p) => [p.id, p]))
  const rowById = new Map(rows.map((r) => [r.id, r]))

  function nameOf(lineupId: string | null) {
    const row = lineupId ? rowById.get(lineupId) : null
    if (!row?.player_id) return '—'
    return playerById.get(row.player_id)?.display_name ?? '（名簿から削除された選手）'
  }

  // pa が null なら打席の間のプレー（走者の動きだけ）
  async function record(pa: PlateAppearance | null, newEvents: RunnerEvent[]) {
    const supabase = createClient()
    if (pa) {
      const { error } = await supabase.from('plate_appearances').insert({ ...pa, game_id: game.id })
      if (error) return SAVE_ERROR
    }
    const { error: eventsError } = await supabase.from('runner_events').insert(newEvents.map((e) => ({ ...e, game_id: game.id })))
    if (eventsError) {
      // 走者の動きが保存できなければ、打席も取り消して記録を半端にしない
      if (pa) await supabase.from('plate_appearances').delete().eq('id', pa.id)
      return SAVE_ERROR
    }
    return null
  }

  async function undo(op: LastOperation) {
    const supabase = createClient()
    // 打席を消すと、その走者の動きも一緒に消える（外部キーの on delete cascade）
    const { error } =
      op.kind === 'pa'
        ? await supabase.from('plate_appearances').delete().eq('id', op.pa.id)
        : await supabase.from('runner_events').delete().in('id', op.events.map((e) => e.id))
    return error ? '取り消せませんでした。もう一度お試しください。' : null
  }

  return (
    <ScoreInput
      game={game}
      ourName={teamName}
      opponentName={game.opponent_name}
      rows={rows}
      initialPas={pas}
      initialEvents={events}
      nameOf={nameOf}
      batsOf={(row) => (row.player_id ? playerById.get(row.player_id)?.bats ?? null : null)}
      lineupHref={`/mypage/games/${game.id}/lineup`}
      onRecord={record}
      onUndo={undo}
    />
  )
}
