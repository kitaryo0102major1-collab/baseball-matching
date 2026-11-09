import { pageMetadata } from '@/lib/seo'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireMyTeams } from '@/lib/myTeam'
import { todayJST } from '@/lib/dates'
import { memberVisibility } from '@/lib/postRules'
import type { MatchPost, TeamMember } from '@/lib/types'
import MyTeamPosts, { type MyTeamPost } from '@/components/MyTeamPosts'
import TeamAvatar from '@/components/TeamAvatar'
import TeamSwitcher from '@/components/TeamSwitcher'
import LevelBadge from '@/components/LevelBadge'
import LogoutButton from '@/components/LogoutButton'

export const metadata = pageMetadata({ title: 'マイページ', path: '/mypage', noindex: true })

export default async function MyPage() {
  const { supabase, user, teams, selectedTeam: team } = await requireMyTeams()
  if (!team) redirect('/mypage/team/new')

  // 取得より前の時刻を「前回開いた時刻」にする（取得中に届いたメッセージを次回の新着から漏らさない）
  const renderedAt = new Date().toISOString()

  const [{ data: membersData }, { data: postsData }] = await Promise.all([
    supabase.from('team_members').select('user_id, display_name').eq('team_id', team.id),
    supabase
      .from('match_posts')
      .select('*, chats(created_at, team_id)')
      .eq('team_id', team.id)
      .order('game_date', { ascending: true, nullsFirst: false }),
  ])

  const members = (membersData ?? []) as Pick<TeamMember, 'user_id' | 'display_name'>[]
  const today = todayJST()
  const posts: MyTeamPost[] = (
    (postsData ?? []) as (MatchPost & { chats: { created_at: string; team_id: string | null }[] })[]
  ).map(({ chats, ...post }) => ({
    ...post,
    posterName: members.find((m) => m.user_id === post.created_by)?.display_name ?? '元の管理者',
    messageCount: chats.length,
    // 自分たちのチームとして送ったメッセージは新着に数えない
    incomingChatTimes: chats.filter((c) => c.team_id !== team.id).map((c) => c.created_at),
  }))
  const needsRenewal: MyTeamPost[] = []
  const open: MyTeamPost[] = []
  const decided: MyTeamPost[] = []
  const past: MyTeamPost[] = []
  for (const post of posts) {
    if (post.post_type === 'member') {
      const visibility = memberVisibility(post)
      if (visibility === 'expired') continue
      if (post.status === '募集終了') past.push(post)
      else if (visibility === 'unlisted') needsRenewal.push(post)
      else open.push(post)
    } else if ((post.game_date ?? '') < today) {
      past.push(post)
    } else if (post.status === '募集中') {
      open.push(post)
    } else {
      decided.push(post)
    }
  }
  // メンバー募集には試合日がないので、投稿日で並べる
  const sortDate = (p: MyTeamPost) => p.game_date ?? p.created_at.slice(0, 10)
  past.sort((a, b) => sortDate(b).localeCompare(sortDate(a)))

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
            <span className="font-bold text-[var(--ink-sub)]">{members.length}人</span>
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

      <MyTeamPosts
        key={team.id}
        teamId={team.id}
        renderedAt={renderedAt}
        needsRenewal={needsRenewal}
        open={open}
        decided={decided}
        past={past}
      />

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
