import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireMyTeams } from '@/lib/myTeam'
import TeamAvatar from '@/components/TeamAvatar'
import TeamSwitcher from '@/components/TeamSwitcher'
import LevelBadge from '@/components/LevelBadge'
import LogoutButton from '@/components/LogoutButton'

export const metadata: Metadata = {
  title: 'マイページ',
  robots: { index: false },
}

export default async function MyPage() {
  const { supabase, user, teams, selectedTeam: team } = await requireMyTeams()
  if (!team) redirect('/mypage/team/new')

  const { count: memberCount } = await supabase
    .from('team_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('team_id', team.id)

  const area = [team.prefecture, team.area_detail].filter(Boolean).join(' ')

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-5">
      <h1 className="text-xl font-black text-[var(--ink)]">マイページ</h1>

      <TeamSwitcher teams={teams} selectedId={team.id} />

      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5">
        <div className="flex items-center gap-4">
          <TeamAvatar name={team.name} logoUrl={team.logo_url} size={64} />
          <div className="min-w-0">
            <p className="text-lg font-black text-[var(--ink)] break-words">{team.name}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <LevelBadge level={team.level} size="sm" />
              <span className="text-xs text-[var(--ink-sub)]">{area}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-[var(--line)] text-sm space-y-2">
          <div className="flex justify-between gap-3">
            <span className="text-[var(--ink-mute)]">連絡先の公開</span>
            <span className={`font-bold ${team.contact_public ? 'text-[var(--green)]' : 'text-[var(--ink-sub)]'}`}>
              {team.contact_public ? '公開中' : '非公開'}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-[var(--ink-mute)]">管理者</span>
            <span className="font-bold text-[var(--ink-sub)]">{memberCount ?? 1}人</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <Link
            href={`/teams/${team.id}`}
            className="text-center border border-[var(--line)] text-[var(--ink)] font-bold py-3 rounded-xl text-sm hover:border-[var(--green)]/40 transition-colors"
          >
            チームページを見る
          </Link>
          <Link
            href="/mypage/team"
            className="text-center bg-[var(--green)] text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 transition-opacity"
          >
            チーム情報を編集
          </Link>
        </div>
        <Link
          href="/mypage/team/members"
          className="block text-center mt-3 border border-[var(--line)] text-[var(--ink)] font-bold py-3 rounded-xl text-sm hover:border-[var(--green)]/40 transition-colors"
        >
          管理者を管理（招待リンク）
        </Link>
      </div>

      <Link
        href="/mypage/team/new"
        className="block text-center border border-dashed border-[var(--green)]/50 text-[var(--green)] font-bold py-3 rounded-2xl text-sm hover:bg-[var(--green-bg)] transition-colors"
      >
        ＋ 新しいチームを登録
      </Link>

      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 space-y-3">
        <p className="text-xs text-[var(--ink-mute)]">ログイン中のアカウント</p>
        <p className="text-sm text-[var(--ink)] break-all">{user.email}</p>
        <LogoutButton />
      </div>
    </div>
  )
}
