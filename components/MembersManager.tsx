'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { clearSelectedTeamCookie } from '@/lib/selectedTeam'
import type { TeamInvite, TeamMember } from '@/lib/types'
import ConfirmDialog from './ConfirmDialog'
import TeamAvatar from './TeamAvatar'

interface Props {
  teamId: string
  teamName: string
  currentUserId: string
  members: TeamMember[]
  activeInvite: TeamInvite | null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function MembersManager({ teamId, teamName, currentUserId, members, activeInvite }: Props) {
  const router = useRouter()
  const [invite, setInvite] = useState<TeamInvite | null>(activeInvite)
  const [origin, setOrigin] = useState('')
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [target, setTarget] = useState<TeamMember | null>(null)
  const [removeBusy, setRemoveBusy] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const isLastMember = members.length <= 1
  const inviteUrl = invite && origin ? `${origin}/invite/${invite.token}` : ''

  async function issueInvite() {
    setInviteBusy(true)
    setInviteError(null)
    setCopied(false)
    const { data, error } = await createClient().rpc('create_team_invite', { p_team_id: teamId })
    setInviteBusy(false)
    if (error || !data) {
      setInviteError('招待リンクを発行できませんでした。もう一度お試しください。')
      return
    }
    setInvite(data as TeamInvite)
  }

  async function revokeInvite() {
    if (!invite) return
    setInviteBusy(true)
    setInviteError(null)
    const { error } = await createClient()
      .from('team_invites')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', invite.id)
    setInviteBusy(false)
    if (error) {
      setInviteError('招待リンクを無効にできませんでした。もう一度お試しください。')
      return
    }
    setInvite(null)
    setCopied(false)
  }

  async function copyInvite() {
    if (!inviteUrl) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
    } catch {
      setInviteError('コピーできませんでした。リンクを長押しして手動でコピーしてください。')
    }
  }

  const lineShareUrl = inviteUrl
    ? `https://line.me/R/share?text=${encodeURIComponent(
        `草野球マッチで「${teamName}」の管理者に招待しました。下のリンクから参加してください（${formatDateTime(invite!.expires_at)}まで有効）\n${inviteUrl}`
      )}`
    : ''

  async function removeMember() {
    if (!target) return
    setRemoveBusy(true)
    setRemoveError(null)
    const { data, error } = await createClient()
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', target.user_id)
      .select('user_id')

    if (error || !data?.length) {
      setRemoveBusy(false)
      setRemoveError(
        error?.message.includes('last_member')
          ? 'チームには少なくとも1人の管理者が必要です。'
          : '処理できませんでした。もう一度お試しください。'
      )
      return
    }

    if (target.user_id === currentUserId) {
      clearSelectedTeamCookie()
      router.push('/mypage')
    } else {
      setRemoveBusy(false)
      setTarget(null)
    }
    router.refresh()
  }

  const isSelf = target?.user_id === currentUserId

  return (
    <>
      <section className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="text-base font-bold text-[var(--ink)]">管理者を招待</h2>
          <p className="text-xs text-[var(--ink-mute)] mt-1 leading-relaxed">
            リンクを開いてGoogleでログインした人が管理者になります。管理者は全員、チーム情報の編集や募集の投稿・修正、管理者の招待・削除ができます。
          </p>
        </div>

        {invite ? (
          <div className="space-y-3">
            <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl px-3 py-2.5 text-xs text-[var(--ink)] break-all select-all">
              {inviteUrl || '…'}
            </div>
            <p className="text-xs text-[var(--ink-sub)]">
              有効期限：<span className="font-bold">{formatDateTime(invite.expires_at)}</span> まで（何人でも使えます）
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={copyInvite}
                className="bg-[var(--green)] text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 transition-opacity"
              >
                {copied ? 'コピーしました' : 'リンクをコピー'}
              </button>
              <a
                href={lineShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-center bg-[#06C755] text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 transition-opacity"
              >
                LINEで送る
              </a>
            </div>
            <div className="flex justify-between gap-3 text-xs">
              <button type="button" onClick={issueInvite} disabled={inviteBusy} className="text-[var(--green)] underline disabled:opacity-50">
                新しいリンクを発行（今のリンクは無効になります）
              </button>
              <button type="button" onClick={revokeInvite} disabled={inviteBusy} className="text-[#A32D2D] underline shrink-0 disabled:opacity-50">
                無効にする
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={issueInvite}
            disabled={inviteBusy}
            className="w-full bg-[var(--green)] text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {inviteBusy ? '発行中...' : '招待リンクを発行する'}
          </button>
        )}

        {inviteError && <p className="text-xs text-[#A3462B]">{inviteError}</p>}
      </section>

      <section className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5">
        <h2 className="text-base font-bold text-[var(--ink)] mb-3">管理者（{members.length}人）</h2>
        <ul className="divide-y divide-[var(--line)]">
          {members.map((m) => {
            const self = m.user_id === currentUserId
            const name = m.display_name ?? '名前未設定'
            return (
              <li key={m.user_id} className="flex items-center gap-3 py-3">
                {m.avatar_url ? (
                  <img
                    src={m.avatar_url}
                    alt=""
                    width={40}
                    height={40}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full object-cover border border-[var(--line)] shrink-0"
                  />
                ) : (
                  <TeamAvatar name={name} size={40} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[var(--ink)] truncate">
                    {name}
                    {self && <span className="ml-1.5 text-xs font-normal text-[var(--ink-mute)]">（あなた）</span>}
                  </p>
                  <p className="text-xs text-[var(--ink-mute)]">{formatDate(m.created_at)}から管理者</p>
                </div>
                {!isLastMember && (
                  <button
                    type="button"
                    onClick={() => {
                      setTarget(m)
                      setRemoveError(null)
                    }}
                    className="shrink-0 text-xs font-bold text-[#A32D2D] border border-[#A32D2D]/30 rounded-lg px-3 py-1.5 hover:bg-[#FCEBEB] transition-colors"
                  >
                    {self ? 'チームを抜ける' : '外す'}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
        {isLastMember && (
          <p className="text-xs text-[var(--ink-mute)] mt-3 leading-relaxed">
            管理者があなた1人のため、チームを抜けることはできません。チームが不要な場合は、チーム情報の編集画面の一番下から削除できます。
          </p>
        )}
      </section>

      <ConfirmDialog
        open={!!target}
        title={isSelf ? 'このチームを抜けますか？' : '管理者から外しますか？'}
        description={
          isSelf ? (
            <>「{teamName}」の管理者ではなくなり、編集できなくなります。もう一度参加するには、ほかの管理者から招待リンクをもらう必要があります。</>
          ) : (
            <>{target?.display_name ?? 'この人'}さんを「{teamName}」の管理者から外します。</>
          )
        }
        confirmLabel={isSelf ? '抜ける' : '外す'}
        busy={removeBusy}
        error={removeError}
        onConfirm={removeMember}
        onClose={() => setTarget(null)}
      />
    </>
  )
}
