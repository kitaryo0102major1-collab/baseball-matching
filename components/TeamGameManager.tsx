'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Game, GameInfoInput } from '@/lib/types'
import ConfirmDialog from './ConfirmDialog'
import GameInfoForm from './GameInfoForm'
import GameInfoSummary, { GameStatusBadge, NextStepLink } from './GameInfoSummary'

interface Props {
  game: Game
  teamName: string
  defaultInnings: number
}

// チームの試合の情報表示・編集・削除
export default function TeamGameManager({ game: initialGame, teamName, defaultInnings }: Props) {
  const router = useRouter()
  const [game, setGame] = useState(initialGame)
  const [editing, setEditing] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function save(values: GameInfoInput): Promise<string | null> {
    const { data, error } = await createClient()
      .from('games')
      .update({ ...values, guest_team_name: null })
      .eq('id', game.id)
      .select('*')
      .single()
    if (error || !data) return '保存できませんでした。通信状態を確認して、もう一度お試しください。'
    setGame(data as Game)
    setEditing(false)
    setNotice('試合情報を保存しました。')
    router.refresh()
    return null
  }

  async function remove() {
    setDeleteBusy(true)
    setDeleteError(null)
    const { data, error } = await createClient().from('games').delete().eq('id', game.id).select('id')
    if (error || !data?.length) {
      setDeleteBusy(false)
      setDeleteError('削除できませんでした。もう一度お試しください。')
      return
    }
    router.push('/mypage/games')
    router.refresh()
  }

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
            isGuest={false}
            initial={game}
            defaultInnings={defaultInnings}
            submitLabel="保存する"
            onSubmit={save}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            <GameInfoSummary game={game} teamName={teamName} />
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

      <NextStepLink href={`/mypage/games/${game.id}/lineup`} />

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
        description={<>「{game.opponent_name}」との試合を削除します。打順や入力した記録もすべて消え、元に戻せません。</>}
        confirmLabel="削除する"
        busy={deleteBusy}
        error={deleteError}
        onConfirm={remove}
        onClose={() => setDeleteOpen(false)}
      />
    </>
  )
}
