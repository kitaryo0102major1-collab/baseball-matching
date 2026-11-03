'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ConfirmDialog from './ConfirmDialog'

interface Props {
  postId: string
}

export default function DeletePostButton({ postId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setBusy(true)
    setError(null)
    const { data, error } = await createClient().from('match_posts').delete().eq('id', postId).select('id')
    if (error || !data?.length) {
      setBusy(false)
      setError('削除できませんでした。もう一度お試しください。')
      return
    }
    router.push('/mypage')
    router.refresh()
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-[13px] font-bold text-[#A32D2D]">
        削除する
      </button>
      <ConfirmDialog
        open={open}
        title="この募集を削除しますか？"
        description="募集と公開メッセージが一覧・詳細から消え、元に戻せません。"
        confirmLabel="削除する"
        busy={busy}
        error={error}
        onConfirm={handleDelete}
        onClose={() => {
          setOpen(false)
          setError(null)
        }}
      />
    </>
  )
}
