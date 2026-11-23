'use client'

import { useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { LineupRow } from '@/lib/lineup'
import type { Game, Player } from '@/lib/types'
import LineupEditor from './LineupEditor'

interface Props {
  game: Game
  teamId: string
  initialRows: LineupRow[]
  players: Player[]
  nextSeq: number
}

// チームの試合の打順と交代。保存は RLS でテーブルに直接（消した行を削除し、残りを upsert）
export default function TeamLineup({ game, teamId, initialRows, players, nextSeq }: Props) {
  // DB にある行の id（保存のたびに更新し、消した行だけを削除する）
  const savedIds = useRef(new Set(initialRows.map((r) => r.id)))
  const savedOpponent = useRef(JSON.stringify(game.opponent_lineup ?? []))

  async function addHelper(displayName: string): Promise<Player | null> {
    const { data, error } = await createClient()
      .from('players')
      .insert({ team_id: teamId, display_name: displayName, is_helper: true })
      .select('*')
      .single()
    return error || !data ? null : (data as Player)
  }

  async function save(rows: LineupRow[], opponentLineup: string[]) {
    const supabase = createClient()
    const removed = [...savedIds.current].filter((id) => !rows.some((r) => r.id === id))
    if (removed.length > 0) {
      const { error } = await supabase.from('game_lineups').delete().in('id', removed)
      if (error) {
        return error.code === '23503'
          ? '打席の記録がある出場は取り消せません。'
          : '保存できませんでした。通信状態を確認して、もう一度お試しください。'
      }
    }
    if (rows.length > 0) {
      const { error } = await supabase.from('game_lineups').upsert(
        rows.map((r) => ({ ...r, game_id: game.id, guest_name: null, guest_bats: null, guest_throws: null }))
      )
      if (error) return '保存できませんでした。通信状態を確認して、もう一度お試しください。'
    }
    if (JSON.stringify(opponentLineup) !== savedOpponent.current) {
      const { error } = await supabase.from('games').update({ opponent_lineup: opponentLineup }).eq('id', game.id)
      if (error) return '相手の打順を保存できませんでした。もう一度お試しください。'
      savedOpponent.current = JSON.stringify(opponentLineup)
    }
    savedIds.current = new Set(rows.map((r) => r.id))
    return null
  }

  return (
    <LineupEditor
      game={game}
      initialRows={initialRows}
      people={{ kind: 'team', players, addHelper }}
      nextSeq={nextSeq}
      inputHref={`/mypage/games/${game.id}/input`}
      onSave={save}
    />
  )
}
