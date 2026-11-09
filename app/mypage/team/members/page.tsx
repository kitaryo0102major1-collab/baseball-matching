import { pageMetadata } from '@/lib/seo'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireMyTeams } from '@/lib/myTeam'
import type { TeamInvite, TeamMember } from '@/lib/types'
import MembersManager from '@/components/MembersManager'

export const metadata = pageMetadata({ title: '管理者の管理', path: '/mypage/team/members', noindex: true })

export default async function TeamMembersPage() {
  const { supabase, user, selectedTeam: team } = await requireMyTeams()
  if (!team) redirect('/mypage/team/new')

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase.from('team_members').select('*').eq('team_id', team.id).order('created_at', { ascending: true }),
    supabase
      .from('team_invites')
      .select('*')
      .eq('team_id', team.id)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1),
  ])

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-5">
      <div>
        <Link href="/mypage" className="text-sm text-[var(--ink-mute)] hover:text-[var(--green)] transition-colors">
          ← マイページに戻る
        </Link>
        <h1 className="text-xl font-black text-[var(--ink)] mt-3">管理者の管理</h1>
        <p className="text-sm text-[var(--ink-sub)] mt-1 break-words">{team.name}</p>
      </div>

      <MembersManager
        key={team.id}
        teamId={team.id}
        teamName={team.name}
        currentUserId={user.id}
        members={(members ?? []) as TeamMember[]}
        activeInvite={((invites ?? [])[0] as TeamInvite | undefined) ?? null}
      />
    </div>
  )
}
