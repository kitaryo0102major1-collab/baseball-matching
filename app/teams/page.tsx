import { pageMetadata } from '@/lib/seo'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { openPostsOrFilter } from '@/lib/postRules'
import { PREFECTURES } from '@/lib/prefectures'
import { ACTIVITY_DAYS, type ActivityDay, type Level, type TeamProfile } from '@/lib/types'
import LevelBadge from '@/components/LevelBadge'
import TeamAvatar from '@/components/TeamAvatar'
import TeamFilters from '@/components/TeamFilters'

const LEVELS: Level[] = ['A+', 'A', 'B', 'C']

export const metadata = pageMetadata({
  title: 'チームを探す',
  description: '草野球マッチに登録しているチームを、都道府県・レベル・活動曜日から探せます。',
  path: '/teams',
})

type TeamListItem = Pick<
  TeamProfile,
  | 'id'
  | 'name'
  | 'logo_url'
  | 'prefecture'
  | 'area_detail'
  | 'level'
  | 'activity_days'
  | 'activity_times'
  | 'age_range'
  | 'created_at'
>

// 公開してよい項目だけを読む（連絡先はこのページに不要なので取得しない）
const TEAM_LIST_SELECT =
  'id, name, logo_url, prefecture, area_detail, level, activity_days, activity_times, age_range, created_at'

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function TeamsPage({ searchParams }: Props) {
  const params = await searchParams

  const prefectureParam = firstValue(params.prefecture) ?? ''
  const prefecture = (PREFECTURES as readonly string[]).includes(prefectureParam) ? prefectureParam : ''
  const levelParam = firstValue(params.level) ?? ''
  const level = LEVELS.find((l) => l === levelParam) ?? ''
  const requestedDays = (firstValue(params.days) ?? '').split(',')
  const days: ActivityDay[] = ACTIVITY_DAYS.filter((d) => requestedDays.includes(d))
  const hasFilter = !!(prefecture || level || days.length)

  let teamsQuery = supabase.from('team_profiles').select(TEAM_LIST_SELECT)
  if (prefecture) teamsQuery = teamsQuery.eq('prefecture', prefecture)
  if (level) teamsQuery = teamsQuery.eq('level', level)
  if (days.length) teamsQuery = teamsQuery.overlaps('activity_days', days)

  const [teamsResult, postsResult] = await Promise.all([
    teamsQuery,
    supabase
      .from('match_posts')
      .select('team_id')
      .not('team_id', 'is', null)
      .eq('status', '募集中')
      .or(openPostsOrFilter()),
  ])
  // 取得に失敗したのに「0件」と表示しないよう、エラー画面に任せる
  if (teamsResult.error) throw teamsResult.error
  if (postsResult.error) throw postsResult.error

  const openCounts = new Map<string, number>()
  for (const { team_id } of postsResult.data as { team_id: string }[]) {
    openCounts.set(team_id, (openCounts.get(team_id) ?? 0) + 1)
  }

  const teams = [...(teamsResult.data as TeamListItem[])].sort(
    (a, b) =>
      (openCounts.get(b.id) ?? 0) - (openCounts.get(a.id) ?? 0) ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
      <h1 className="text-xl font-black text-[var(--ink)]">チームを探す</h1>

      <TeamFilters prefecture={prefecture} level={level} days={days} />

      {teams.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-8 text-center space-y-4">
          <p className="text-sm font-bold text-[var(--ink)]">この条件のチームはまだありません</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            {hasFilter && (
              <Link
                href="/teams"
                className="border border-[var(--line)] text-[var(--ink)] font-bold px-5 py-2.5 rounded-xl text-sm hover:border-[var(--green)]/40 transition-colors"
              >
                絞り込みを解除
              </Link>
            )}
            <Link
              href="/mypage/team/new"
              className="bg-[var(--green)] text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:opacity-90 transition-opacity"
            >
              チームを登録する
            </Link>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-[var(--ink-mute)]">{teams.length}チーム</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {teams.map((team) => (
              <TeamCard key={team.id} team={team} openCount={openCounts.get(team.id) ?? 0} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function TeamCard({ team, openCount }: { team: TeamListItem; openCount: number }) {
  const area = [team.prefecture, team.area_detail].filter(Boolean).join(' ')
  const schedule = [team.activity_days.join('・'), team.activity_times.join('・')].filter(Boolean).join(' ／ ')

  return (
    <Link
      href={`/teams/${team.id}`}
      className="block bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-4 hover:border-[var(--green)]/40 hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-3">
        <TeamAvatar name={team.name} logoUrl={team.logo_url} size={48} />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-[var(--ink)] truncate">{team.name}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <LevelBadge level={team.level} size="xs" />
            {openCount > 0 && (
              <span className="text-[11px] font-bold px-1.5 py-1 rounded-md bg-[var(--clay)] text-white">
                募集中 {openCount}件
              </span>
            )}
          </div>
        </div>
      </div>
      <dl className="mt-3 space-y-1 text-xs">
        <Row label="エリア" value={area} />
        {schedule && <Row label="活動" value={schedule} />}
        {team.age_range && <Row label="年齢層" value={team.age_range} />}
      </dl>
    </Link>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-12 shrink-0 text-[var(--ink-mute)]">{label}</dt>
      <dd className="text-[var(--ink-sub)] min-w-0 break-words">{value}</dd>
    </div>
  )
}
