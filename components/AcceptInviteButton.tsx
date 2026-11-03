'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { setSelectedTeamCookie } from '@/lib/selectedTeam'

type Props = { mode: 'accept'; token: string } | { mode: 'open'; teamId: string }

export default function AcceptInviteButton(props: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function goToTeam(teamId: string) {
    setSelectedTeamCookie(teamId)
    router.push('/mypage')
    router.refresh()
  }

  async function handleClick() {
    if (props.mode === 'open') {
      goToTeam(props.teamId)
      return
    }
    setBusy(true)
    setError(null)
    const { data, error } = await createClient().rpc('accept_team_invite', { p_token: props.token })
    if (error || !data) {
      setBusy(false)
      setError(
        error?.message.includes('invalid_invite')
          ? 'この招待リンクは使えません。チームの管理者に新しいリンクをもらってください。'
          : '参加できませんでした。もう一度お試しください。'
      )
      return
    }
    goToTeam(data as string)
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="w-full bg-[var(--green)] hover:opacity-90 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-opacity"
      >
        {props.mode === 'open' ? 'マイページを開く' : busy ? '参加しています...' : 'このチームの管理者になる'}
      </button>
      {error && <p className="text-xs text-[#A3462B] mt-2 text-center">{error}</p>}
    </div>
  )
}
