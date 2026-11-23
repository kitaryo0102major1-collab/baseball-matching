'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { DEFAULT_INNINGS } from '@/lib/games'
import { getGuestToken, isValidGuestToken, removeGuestGame, saveGuestGame } from '@/lib/guestGames'
import type { Game, GameInfoInput } from '@/lib/types'
import ConfirmDialog from './ConfirmDialog'
import GameInfoForm from './GameInfoForm'
import GameInfoSummary, { GameStatusBadge, NextStepPending } from './GameInfoSummary'
import GuestEditLink from './GuestEditLink'

// get_score_game の戻り値。子の行は保存時にそのまま送り返す（save_guest_game は丸ごと入れ替えるため）
interface ScoreGame {
  game: Game & { team_name: string | null }
  lineups: Record<string, unknown>[]
  plate_appearances: Record<string, unknown>[]
  runner_events: Record<string, unknown>[]
  pitching_summaries: Record<string, unknown>[]
  pitching_decisions: Record<string, unknown>[]
}

type State =
  | { status: 'loading' }
  | { status: 'no-token' }
  | { status: 'invalid' }
  | { status: 'not-found' }
  | { status: 'error' }
  | { status: 'ready'; data: ScoreGame; token: string; stored: boolean }

async function fetchGame(id: string) {
  const { data, error } = await supabase.rpc('get_score_game', { p_game_id: id })
  if (error) throw error
  return data as ScoreGame | null
}

export default function GuestGameEditor({ gameId }: { gameId: string }) {
  const router = useRouter()
  const [state, setState] = useState<State>({ status: 'loading' })
  const [editing, setEditing] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = useCallback(async () => {
    // 編集用リンク（#token）で開いたときは、トークンを端末に保存してから URL から消す
    const hashToken = window.location.hash.slice(1)
    let token: string | null = null
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
      const data = await fetchGame(gameId)
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

  async function saveInfo(values: GameInfoInput): Promise<string | null> {
    if (state.status !== 'ready') return null
    const { data, token } = state
    const { data: result, error } = await supabase.rpc('save_guest_game', {
      p_game_id: gameId,
      p_token: token,
      p_game: values,
      p_lineups: data.lineups,
      p_plate_appearances: data.plate_appearances,
      p_runner_events: data.runner_events,
      p_pitching_summaries: data.pitching_summaries,
      p_pitching_decisions: data.pitching_decisions,
      p_expected_updated_at: data.game.updated_at,
    })
    if (error) return '保存できませんでした。通信状態を確認して、もう一度お試しください。'

    const conflict = (result as { conflict: boolean }[] | null)?.[0]?.conflict
    try {
      const fresh = await fetchGame(gameId)
      if (fresh) setState({ ...state, data: fresh })
    } catch {
      // 保存はできているので、表示の更新に失敗しても次に開いたときに反映される
    }
    setEditing(false)
    setNotice(conflict ? 'ほかの端末でも保存されていました。今保存した内容で上書きしています。' : '試合情報を保存しました。')
    return null
  }

  async function deleteGame() {
    if (state.status !== 'ready') return
    setDeleteBusy(true)
    setDeleteError(null)
    const { error } = await supabase.rpc('delete_guest_game', { p_game_id: gameId, p_token: state.token })
    if (error) {
      setDeleteBusy(false)
      setDeleteError('削除できませんでした。もう一度お試しください。')
      return
    }
    removeGuestGame(gameId)
    router.push('/scores')
  }

  if (state.status === 'loading') {
    return <div className="text-center py-16 text-sm text-[var(--ink-mute)]">読み込み中...</div>
  }

  if (state.status !== 'ready') {
    const message = {
      'no-token': 'この試合を編集するには、編集用リンクが必要です。試合を作った端末で開くか、作った人から編集用リンクをもらってください。',
      invalid: '編集用リンクが正しくないか、この試合はチームに取り込まれたため、ここからは編集できません。',
      'not-found': '試合が見つかりません。削除されたか、チームに取り込まれた可能性があります。',
      error: '読み込めませんでした。通信状態を確認して、ページを開き直してください。',
    }[state.status]
    return (
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 space-y-4">
        <p className="text-sm text-[var(--ink-sub)] leading-relaxed">{message}</p>
        <Link href="/scores" className="block text-center border border-[var(--line)] text-[var(--ink)] font-bold py-3 rounded-xl text-sm">
          この端末で記録した試合へ
        </Link>
      </div>
    )
  }

  const { data, token, stored } = state
  const game = data.game

  return (
    <>
      {notice && (
        <p className="text-sm text-[var(--green)] bg-[var(--green-bg)] border border-[var(--green)]/30 rounded-xl px-4 py-3" role="status">
          {notice}
        </p>
      )}

      <section className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-[var(--ink)]">試合情報</h2>
          <GameStatusBadge status={game.status} />
        </div>
        {editing ? (
          <GameInfoForm
            isGuest
            initial={game}
            defaultInnings={DEFAULT_INNINGS}
            submitLabel="保存する"
            onSubmit={saveInfo}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            <GameInfoSummary game={game} teamName={game.guest_team_name} />
            <button
              type="button"
              onClick={() => {
                setEditing(true)
                setNotice(null)
              }}
              className="w-full min-h-11 border border-[var(--line)] text-[var(--ink)] font-bold rounded-xl text-sm hover:border-[var(--green)]/40 transition-colors"
            >
              試合情報を編集
            </button>
          </>
        )}
      </section>

      <NextStepPending />

      <section className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 space-y-3">
        <h2 className="text-base font-bold text-[var(--ink)]">編集用リンク</h2>
        {!stored && (
          <p className="text-xs text-[#A3462B] leading-relaxed">
            この端末（ブラウザ）には保存できませんでした。次に編集するときも、編集用リンクから開いてください。
          </p>
        )}
        <GuestEditLink gameId={gameId} token={token} />
      </section>

      <button
        type="button"
        onClick={() => {
          setDeleteError(null)
          setDeleteOpen(true)
        }}
        className="w-full text-sm font-bold text-[#A32D2D] py-2 min-h-11"
      >
        この試合を削除する
      </button>

      <ConfirmDialog
        open={deleteOpen}
        title="試合を削除しますか？"
        description={<>「{game.opponent_name}」との試合を削除します。打順や入力した記録もすべて消え、元に戻せません。編集用リンクを知っている人も開けなくなります。</>}
        confirmLabel="削除する"
        busy={deleteBusy}
        error={deleteError}
        onConfirm={deleteGame}
        onClose={() => setDeleteOpen(false)}
      />
    </>
  )
}
