import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireUserWithTeam } from '@/lib/myTeam'
import TeamAvatar from '@/components/TeamAvatar'
import LevelBadge from '@/components/LevelBadge'
import LogoutButton from '@/components/LogoutButton'

export const metadata: Metadata = {
  title: 'マイページ',
  robots: { index: false },
}

export default async function MyPage() {
  const { user, team } = await requireUserWithTeam()
  if (!team) redirect('/mypage/team')

  const area = [team.prefecture, team.area_detail].filter(Boolean).join(' ')

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-5">
      <h1 className="text-xl font-black text-[var(--ink)]">マイページ</h1>

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

        <div className="mt-4 pt-4 border-t border-[var(--line)] text-sm flex justify-between gap-3">
          <span className="text-[var(--ink-mute)]">連絡先の公開</span>
          <span className={`font-bold ${team.contact_public ? 'text-[var(--green)]' : 'text-[var(--ink-sub)]'}`}>
            {team.contact_public ? '公開中' : '非公開'}
          </span>
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
      </div>

      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 space-y-3">
        <p className="text-xs text-[var(--ink-mute)]">ログイン中のアカウント</p>
        <p className="text-sm text-[var(--ink)] break-all">{user.email}</p>
        <LogoutButton />
      </div>
    </div>
  )
}
