'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { clearSelectedTeamCookie } from '@/lib/selectedTeam'
import ConfirmDialog from './ConfirmDialog'

interface Props {
  teamId: string
  teamName: string
}

export default function TeamDeleteSection({ teamId, teamName }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setBusy(true)
    setError(null)
    const supabase = createClient()

    // チームを消すと管理者でなくなり Storage を消せなくなるため、先にロゴを消す
    await supabase.storage.from('team-logos').remove([`${teamId}/logo`])

    const { data, error } = await supabase.from('teams').delete().eq('id', teamId).select('id')
    if (error || !data?.length) {
      setBusy(false)
      setError('チームを削除できませんでした。もう一度お試しください。')
      return
    }

    clearSelectedTeamCookie()
    router.push('/mypage')
    router.refresh()
  }

  return (
    <section className="border border-[#EBC9BC] rounded-2xl p-5 space-y-3">
      <h2 className="text-base font-bold text-[#A32D2D]">チームを削除</h2>
      <p className="text-sm text-[var(--ink-sub)] leading-relaxed">
        チームページ、管理者、招待リンク、助っ人・メンバー募集がすべて削除され、元に戻せません。ほかの管理者も管理できなくなります。
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full border border-[#A32D2D]/40 text-[#A32D2D] font-bold py-3 rounded-xl text-sm hover:bg-[#FCEBEB] transition-colors"
      >
        このチームを削除する
      </button>

      <ConfirmDialog
        open={open}
        title="チームを削除しますか？"
        description={
          <>
            「{teamName}」を削除します。チームページ、管理者、招待リンク、助っ人・メンバー募集はすべて消え、元に戻せません。
          </>
        }
        confirmLabel="削除する"
        requireText={teamName}
        busy={busy}
        error={error}
        onConfirm={handleDelete}
        onClose={() => {
          setOpen(false)
          setError(null)
        }}
      />
    </section>
  )
}
