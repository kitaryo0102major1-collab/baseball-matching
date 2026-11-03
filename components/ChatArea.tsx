'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { createClient } from '@/lib/supabase/client'
import { useMyTeams } from '@/lib/useMyTeams'
import type { Chat, ChatInsert, PostTeamBadge } from '@/lib/types'
import Logo from './Logo'
import TeamAvatar from './TeamAvatar'
import TeamChoice from './TeamChoice'
import RegisteredTeamBadge from './RegisteredTeamBadge'

type ChatWithTeam = Chat & { team: PostTeamBadge | null }

const CHAT_SELECT = '*, team:team_profiles(id, name, logo_url)'

interface Props {
  postId: string
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ChatArea({ postId }: Props) {
  const [chats, setChats] = useState<ChatWithTeam[]>([])
  const [teamName, setTeamName] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const myTeams = useMyTeams()
  const teams = myTeams.status === 'member' ? myTeams.teams : []
  const [chatTeamId, setChatTeamId] = useState('')

  // ログイン中は選択中チームを既定にし、チーム名を自動入力する
  useEffect(() => {
    if (myTeams.status !== 'member' || !myTeams.defaultTeamId) return
    const team = myTeams.teams.find((t) => t.id === myTeams.defaultTeamId)
    setChatTeamId(myTeams.defaultTeamId)
    if (team) setTeamName(team.name)
  }, [myTeams])

  function chooseChatTeam(id: string) {
    setChatTeamId(id)
    const team = teams.find((t) => t.id === id)
    setTeamName(team ? team.name : '')
  }

  useEffect(() => {
    const fetchChats = async () => {
      const { data } = await supabase
        .from('chats')
        .select(CHAT_SELECT)
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
      if (data) setChats(data as ChatWithTeam[])
    }
    fetchChats()

    const channel = supabase
      .channel(`chats:${postId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chats',
          filter: `post_id=eq.${postId}`,
        },
        async (payload) => {
          const chat = payload.new as Chat
          let team: PostTeamBadge | null = null
          if (chat.team_id) {
            const { data } = await supabase
              .from('team_profiles')
              .select('id, name, logo_url')
              .eq('id', chat.team_id)
              .maybeSingle()
            team = (data as PostTeamBadge | null) ?? null
          }
          setChats((prev) => (prev.some((c) => c.id === chat.id) ? prev : [...prev, { ...chat, team }]))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [postId])

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [chats])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!teamName.trim()) { setError('チーム名を入力してください'); return }
    if (!message.trim()) { setError('メッセージを入力してください'); return }

    setSending(true)
    const payload: ChatInsert = {
      post_id: postId,
      team_name: teamName.trim(),
      message: message.trim(),
    }
    if (chatTeamId) payload.team_id = chatTeamId
    const { error: err } = await createClient().from('chats').insert(payload)
    if (err) {
      setError('送信に失敗しました。もう一度お試しください。')
    } else {
      setMessage('')
    }
    setSending(false)
  }

  return (
    <div className="mt-8">
      <h2 className="text-lg font-bold text-[var(--ink)] mb-4 flex items-center gap-2">
        <span className="w-1 h-5 bg-[var(--green)] rounded-full inline-block"></span>
        このチームへの公開メッセージ
      </h2>

      {/* メッセージ一覧 */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--line)] overflow-hidden mb-4">
        {chats.length === 0 ? (
          <div className="text-center py-10 text-[var(--ink-mute)] text-sm">
            まだメッセージはありません。最初に話しかけてみましょう！
          </div>
        ) : (
          <div ref={containerRef} className="divide-y divide-[var(--line)] max-h-96 overflow-y-auto">
            {chats.map((chat) => (
              <div key={chat.id} className="px-5 py-4">
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  {chat.team ? (
                    <Link
                      href={`/teams/${chat.team.id}`}
                      className="font-semibold text-sm text-[var(--green)] flex items-center gap-1.5 min-w-0 hover:underline"
                    >
                      <TeamAvatar name={chat.team.name} logoUrl={chat.team.logo_url} size={18} />
                      <span className="truncate">{chat.team.name}</span>
                      <RegisteredTeamBadge size="xs" />
                    </Link>
                  ) : (
                    <span className="font-semibold text-sm text-[var(--green)] flex items-center gap-1.5 min-w-0">
                      <Logo size={16} />
                      <span className="truncate">{chat.team_name}</span>
                    </span>
                  )}
                  <span className="text-xs text-[var(--ink-mute)] shrink-0">{formatTime(chat.created_at)}</span>
                </div>
                <p className="text-sm text-[var(--ink-sub)] leading-relaxed whitespace-pre-wrap">
                  {chat.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 送信フォーム */}
      <form onSubmit={handleSubmit} className="bg-[var(--surface)] rounded-2xl border border-[var(--line)] p-5 space-y-3">
        <h3 className="text-sm font-semibold text-[var(--ink-sub)]">メッセージを送る</h3>

        {error && (
          <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {teams.length > 0 && (
          <TeamChoice
            label="どのチームとして送りますか？"
            teams={teams}
            value={chatTeamId}
            onChange={chooseChatTeam}
            guestLabel="チームとしてではなく送る"
            compact
          />
        )}

        {!chatTeamId && (
          <div>
            <label className="block text-xs text-[var(--ink-mute)] mb-1">チーム名 <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="例：〇〇ベースボールクラブ"
              maxLength={50}
              className="w-full border border-[var(--line)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--green)]/40 transition"
            />
          </div>
        )}

        <div>
          <label className="block text-xs text-[var(--ink-mute)] mb-1">メッセージ <span className="text-red-500">*</span></label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="対戦希望の日程や人数など、気軽にメッセージしてみましょう！"
            rows={3}
            maxLength={500}
            className="w-full border border-[var(--line)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--green)]/40 transition resize-none"
          />
          <p className="text-right text-xs text-[var(--ink-mute)] mt-0.5">{message.length}/500</p>
        </div>

        <button
          type="submit"
          disabled={sending}
          className="w-full bg-[var(--green)] hover:opacity-90 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
        >
          {sending ? '送信中...' : '送信する'}
        </button>

        <p className="text-center text-xs text-[var(--ink-mute)]">登録不要・無料で送れます</p>
      </form>
    </div>
  )
}
