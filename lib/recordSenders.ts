'use client'

// 試合の記録をまとめてサーバーへ送る（lib/gameRecords.ts から呼ぶ）。どちらも「後から送った方が勝つ」。
import { supabase as anon } from './supabase'
import { createClient } from './supabase/client'
import type { GameRecords, SendResult } from './gameRecords'

// チーム: 端末にない行を消し、ある行を upsert する。送る前の games.updated_at が基準と違えば conflict
export async function sendTeamRecords(gameId: string, records: GameRecords, expected: string | null): Promise<SendResult> {
  const sb = createClient()
  const { data: game, error: readError } = await sb.from('games').select('updated_at').eq('id', gameId).single()
  if (readError || !game) throw readError ?? new Error('game_not_found')
  const conflict = expected !== null && game.updated_at !== expected

  const keep = (ids: string[]) => `(${ids.join(',')})`
  const removeMissing = async (table: 'runner_events' | 'plate_appearances' | 'game_lineups', ids: string[]) => {
    let q = sb.from(table).delete().eq('game_id', gameId)
    if (ids.length) q = q.not('id', 'in', keep(ids))
    const { error } = await q
    if (error) throw error
  }
  // 参照される側を後に消し、先に入れる
  await removeMissing('runner_events', records.events.map((e) => e.id))
  await removeMissing('plate_appearances', records.pas.map((p) => p.id))
  await removeMissing('game_lineups', records.lineups.map((l) => l.id))

  const upsert = async (table: 'game_lineups' | 'plate_appearances' | 'runner_events', rows: object[]) => {
    if (rows.length === 0) return
    const { error } = await sb.from(table).upsert(rows.map((r) => ({ ...r, game_id: gameId })))
    if (error) throw error
  }
  await upsert(
    'game_lineups',
    records.lineups.map((r) => ({ ...r, guest_name: null, guest_bats: null, guest_throws: null }))
  )
  await upsert('plate_appearances', records.pas)
  await upsert('runner_events', records.events)

  // games を更新して updated_at を進める（ほかの端末がこの保存に気づけるように）
  const { data: saved, error } = await sb
    .from('games')
    .update({ opponent_lineup: records.opponentLineup })
    .eq('id', gameId)
    .select('updated_at')
    .single()
  if (error || !saved) throw error ?? new Error('save_failed')
  return { updatedAt: saved.updated_at as string, conflict }
}

// ゲスト: save_guest_game で丸ごと入れ替える。投手成績・勝敗はまだこの画面で扱わないので、読んだものをそのまま送る
export async function sendGuestRecords(
  gameId: string,
  token: string,
  records: GameRecords,
  expected: string | null,
  passthrough: { pitching_summaries: unknown[]; pitching_decisions: unknown[] }
): Promise<SendResult> {
  const { data, error } = await anon.rpc('save_guest_game', {
    p_game_id: gameId,
    p_token: token,
    p_game: { opponent_lineup: records.opponentLineup },
    p_lineups: records.lineups.map((r) => ({ ...r, player_id: null })),
    p_plate_appearances: records.pas,
    p_runner_events: records.events,
    p_pitching_summaries: passthrough.pitching_summaries,
    p_pitching_decisions: passthrough.pitching_decisions,
    p_expected_updated_at: expected,
  })
  if (error) throw error
  const row = (data as { updated_at: string; conflict: boolean }[] | null)?.[0]
  if (!row) throw new Error('save_failed')
  return { updatedAt: row.updated_at, conflict: row.conflict }
}
