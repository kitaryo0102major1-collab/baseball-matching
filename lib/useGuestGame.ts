'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { getGuestToken, isValidGuestToken, saveGuestGame } from './guestGames'
import type { Game } from './types'

// get_score_game の戻り値。子の行は保存時にそのまま送り返す（save_guest_game は丸ごと入れ替えるため）
export interface ScoreGame {
  game: Game & { team_name: string | null }
  lineups: Record<string, unknown>[]
  plate_appearances: Record<string, unknown>[]
  runner_events: Record<string, unknown>[]
  pitching_summaries: Record<string, unknown>[]
  pitching_decisions: Record<string, unknown>[]
}

export type GuestGameState =
  | { status: 'loading' }
  | { status: 'no-token' }
  | { status: 'invalid' }
  | { status: 'not-found' }
  | { status: 'error' }
  | { status: 'ready'; data: ScoreGame; token: string; stored: boolean }

export const GUEST_GAME_MESSAGES = {
  'no-token': 'この試合を編集するには、編集用リンクが必要です。試合を作った端末で開くか、作った人から編集用リンクをもらってください。',
  invalid: '編集用リンクが正しくないか、この試合はチームに取り込まれたため、ここからは編集できません。',
  'not-found': '試合が見つかりません。削除されたか、チームに取り込まれた可能性があります。',
  error: '読み込めませんでした。通信状態を確認して、ページを開き直してください。',
} as const

export async function fetchScoreGame(id: string) {
  const { data, error } = await supabase.rpc('get_score_game', { p_game_id: id })
  if (error) throw error
  return data as ScoreGame | null
}

// 保存。試合の項目は変えたいものだけ、子の行は変えたいものだけ渡し、ほかは読んだときのものを送り返す
export async function saveScoreGame(
  id: string,
  token: string,
  data: ScoreGame,
  changes: {
    game?: Record<string, unknown>
    lineups?: Record<string, unknown>[]
    plate_appearances?: object[]
    runner_events?: object[]
  }
) {
  const { data: result, error } = await supabase.rpc('save_guest_game', {
    p_game_id: id,
    p_token: token,
    p_game: changes.game ?? {},
    p_lineups: changes.lineups ?? data.lineups,
    p_plate_appearances: changes.plate_appearances ?? data.plate_appearances,
    p_runner_events: changes.runner_events ?? data.runner_events,
    p_pitching_summaries: data.pitching_summaries,
    p_pitching_decisions: data.pitching_decisions,
    p_expected_updated_at: data.game.updated_at,
  })
  if (error) return { error }
  const row = (result as { conflict: boolean; updated_at: string }[] | null)?.[0]
  return { error: null, conflict: !!row?.conflict, updatedAt: row?.updated_at ?? null }
}

// ゲストの試合を、編集用トークンを確かめてから読む。
// 編集用リンク（#token）で開いたときは、トークンを端末に保存してから URL から消す
export function useGuestGame(gameId: string) {
  const [state, setState] = useState<GuestGameState>({ status: 'loading' })

  const load = useCallback(async () => {
    const hashToken = window.location.hash.slice(1)
    let token: string | null
    let stored = false
    if (isValidGuestToken(hashToken)) {
      token = hashToken
    } else {
      token = getGuestToken(gameId)
      stored = token !== null
    }
    if (!token) {
      setState({ status: 'no-token' })
      return
    }

    try {
      const { data: ok, error } = await supabase.rpc('check_guest_game_token', { p_game_id: gameId, p_token: token })
      if (error) throw error
      if (!ok) {
        setState({ status: 'invalid' })
        return
      }
      if (!stored) {
        stored = saveGuestGame(gameId, token)
        if (stored) window.history.replaceState(null, '', window.location.pathname)
      }
      const data = await fetchScoreGame(gameId)
      if (!data || data.game.team_id !== null) {
        setState({ status: 'not-found' })
        return
      }
      setState({ status: 'ready', data, token, stored })
    } catch {
      setState({ status: 'error' })
    }
  }, [gameId])

  useEffect(() => {
    load()
  }, [load])

  // 保存のあとに読み直す（失敗しても今の表示のまま）
  const refresh = useCallback(async () => {
    try {
      const data = await fetchScoreGame(gameId)
      if (data) setState((s) => (s.status === 'ready' ? { ...s, data } : s))
    } catch {
      // 保存はできているので、次に開いたときに反映される
    }
  }, [gameId])

  return { state, refresh }
}
