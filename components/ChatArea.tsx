'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Chat, ChatInsert } from '@/lib/types'

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
  const [chats, setChats] = useState<Chat[]>([])
  const [teamName, setTeamName] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // 初回ロード
  useEffect(() => {
    const fetchChats = async () => {
      const { data } = await supabase
        .from('chats')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
      if (data) setChats(data as Chat[])
    }
    fetchChats()

    // リアルタイム購読
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
        (payload) => {
          setChats((prev) => [...prev, payload.new as Chat])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [postId])

  // 新着メッセージへスクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
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
    const { error: err } = await supabase.from('chats').insert(payload)
    if (err) {
      setError('送信に失敗しました。もう一度お試しください。')
    } else {
      setMessage('')
    }
    setSending(false)
  }

  return (
    <div className="mt-8">
      <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <span className="w-1 h-5 bg-[#1D9E75] rounded-full inline-block"></span>
        チャット
      </h2>

      {/* メッセージ一覧 */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-4">
        {chats.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            まだメッセージはありません。最初に話しかけてみましょう！
          </div>
        ) : (
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {chats.map((chat) => (
              <div key={chat.id} className="px-5 py-4">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="font-semibold text-sm text-[#1D9E75]">
                    ⚾ {chat.team_name}
                  </span>
                  <span className="text-xs text-gray-400">{formatTime(chat.created_at)}</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {chat.message}
                </p>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* 送信フォーム */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">メッセージを送る</h3>

        {error && (
          <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div>
          <label className="block text-xs text-gray-500 mb-1">チーム名 <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="例：〇〇ベースボールクラブ"
            maxLength={50}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40 transition"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">メッセージ <span className="text-red-500">*</span></label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="対戦希望の日程や人数など、気軽にメッセージしてみましょう！"
            rows={3}
            maxLength={500}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40 transition resize-none"
          />
          <p className="text-right text-xs text-gray-300 mt-0.5">{message.length}/500</p>
        </div>

        <button
          type="submit"
          disabled={sending}
          className="w-full bg-[#1D9E75] hover:bg-[#0F6E56] disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
        >
          {sending ? '送信中...' : '送信する'}
        </button>

        <p className="text-center text-xs text-gray-400">登録不要・無料で送れます</p>
      </form>
    </div>
  )
}
