'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { GameInfoInput } from '@/lib/types'
import GameInfoForm from './GameInfoForm'

interface Props {
  teamId: string
  // チーム設定のイニング数
  defaultInnings: number
}

export default function TeamGameCreate({ teamId, defaultInnings }: Props) {
  const router = useRouter()

  async function create(values: GameInfoInput): Promise<string | null> {
    const { data, error } = await createClient()
      .from('games')
      .insert({ ...values, guest_team_name: null, team_id: teamId })
      .select('id')
      .single()
    if (error || !data) return '試合を作成できませんでした。通信状態を確認して、もう一度お試しください。'
    router.push(`/mypage/games/${data.id}`)
    return null
  }

  return (
    <GameInfoForm isGuest={false} defaultInnings={defaultInnings} submitLabel="試合を作成する" busyLabel="作成中..." onSubmit={create} />
  )
}
