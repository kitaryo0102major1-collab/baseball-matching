'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { MatchPost } from '@/lib/types'

interface Props {
  post: Pick<MatchPost, 'id' | 'title'>
}

export default function MemberRenewCard({ post }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  async function update(changes: { renewed_at: string } | { status: '募集終了' }) {
    setBusy(true)
    setError(false)
    const { data, error } = await createClient().from('match_posts').update(changes).eq('id', post.id).select('id')
    if (error || !data?.length) {
      setBusy(false)
      setError(true)
      return
    }
    router.refresh()
  }

  return (
    <div className="bg-[var(--surface)] border-2 border-[var(--clay)] rounded-2xl p-4 space-y-3">
      <div>
        <p className="text-sm font-bold text-[var(--ink)]">まだ募集中ですか？</p>
        <Link href={`/posts/${post.id}`} className="block text-sm text-[var(--ink-sub)] underline break-words mt-0.5">
          {post.title}
        </Link>
        <p className="text-xs text-[var(--ink-mute)] mt-1">更新から60日を過ぎたため、一覧には表示されていません。</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => update({ renewed_at: new Date().toISOString() })}
          className="bg-[var(--green)] text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50"
        >
          まだ募集中
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => update({ status: '募集終了' })}
          className="border border-[var(--line)] text-[var(--ink)] font-bold py-2.5 rounded-xl text-sm disabled:opacity-50"
        >
          募集を終了する
        </button>
      </div>
      {error && <p className="text-xs text-[#A3462B]">更新できませんでした。もう一度お試しください。</p>}
    </div>
  )
}
