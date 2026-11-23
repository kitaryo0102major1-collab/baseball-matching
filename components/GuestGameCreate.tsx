'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { DEFAULT_INNINGS } from '@/lib/games'
import { saveGuestGame } from '@/lib/guestGames'
import { getOrCreateVisitorId } from '@/lib/visitor'
import type { GameInfoInput } from '@/lib/types'
import GameInfoForm from './GameInfoForm'

export default function GuestGameCreate() {
  const router = useRouter()

  async function create(values: GameInfoInput): Promise<string | null> {
    const visitorId = getOrCreateVisitorId()
    if (!visitorId) {
      return 'この端末（ブラウザ）では記録を保存できません。プライベートブラウズをオフにするか、別のブラウザでお試しください。'
    }

    const { data, error } = await supabase.rpc('create_guest_game', { p_visitor_id: visitorId, p_game: values })
    if (error) {
      if (error.message.includes('guest_game_daily_limit')) {
        return '同じ端末から作成できる試合は1日10試合までです。明日またお試しください。'
      }
      return '試合を作成できませんでした。通信状態を確認して、もう一度お試しください。'
    }
    const row = (data as { game_id: string; edit_token: string }[] | null)?.[0]
    if (!row) return '試合を作成できませんでした。もう一度お試しください。'

    // トークンはこの時しか受け取れない。端末に保存できなければ、編集用リンクで開いてもらう
    const saved = saveGuestGame(row.game_id, row.edit_token)
    router.push(saved ? `/scores/${row.game_id}/edit` : `/scores/${row.game_id}/edit#${row.edit_token}`)
    return null
  }

  return <GameInfoForm isGuest defaultInnings={DEFAULT_INNINGS} submitLabel="試合を作成する" busyLabel="作成中..." onSubmit={create} />
}
