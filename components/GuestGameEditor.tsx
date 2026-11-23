'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { DEFAULT_INNINGS } from '@/lib/games'
import { removeGuestGame } from '@/lib/guestGames'
import { GUEST_GAME_MESSAGES, saveScoreGame, useGuestGame } from '@/lib/useGuestGame'
import type { GameInfoInput } from '@/lib/types'
import ConfirmDialog from './ConfirmDialog'
import GameInfoForm from './GameInfoForm'
import GameInfoSummary, { GameStatusBadge, NextStepLink } from './GameInfoSummary'
import GuestEditLink from './GuestEditLink'

export default function GuestGameEditor({ gameId }: { gameId: string }) {
  const router = useRouter()
  const { state, refresh } = useGuestGame(gameId)
  const [editing, setEditing] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function saveInfo(values: GameInfoInput): Promise<string | null> {
    if (state.status !== 'ready') return null
    const result = await saveScoreGame(gameId, state.token, state.data, { game: values })
    if (result.error) return '保存できませんでした。通信状態を確認して、もう一度お試しください。'
    await refresh()
    setEditing(false)
    setNotice(result.conflict ? 'ほかの端末でも保存されていました。今保存した内容で上書きしています。' : '試合情報を保存しました。')
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
    const message = GUEST_GAME_MESSAGES[state.status]
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

      <NextStepLink href={`/scores/${gameId}/lineup`} />

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
