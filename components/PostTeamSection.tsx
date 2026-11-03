import Link from 'next/link'
import type { TeamProfile } from '@/lib/types'
import TeamAvatar from './TeamAvatar'
import LevelBadge from './LevelBadge'
import RegisteredTeamBadge from './RegisteredTeamBadge'

interface Props {
  team: TeamProfile
}

export default function PostTeamSection({ team }: Props) {
  const area = [team.prefecture, team.area_detail].filter(Boolean).join(' ')
  const schedule = [team.activity_days.join('・'), team.activity_times.join('・')].filter(Boolean).join(' ／ ')
  const excerpt =
    team.description && team.description.length > 80 ? `${team.description.slice(0, 80)}…` : team.description

  return (
    <section className="mt-6 bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5">
      <h2 className="text-sm font-bold text-[var(--ink)] mb-3">このチームについて</h2>
      <div className="flex items-center gap-3">
        <TeamAvatar name={team.name} logoUrl={team.logo_url} size={52} />
        <div className="min-w-0">
          <p className="font-black text-[var(--ink)] break-words">{team.name}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <RegisteredTeamBadge size="xs" />
            <LevelBadge level={team.level} size="xs" />
          </div>
        </div>
      </div>

      <dl className="mt-4 space-y-1.5 text-sm">
        <div className="flex gap-3">
          <dt className="w-16 shrink-0 text-[var(--ink-mute)]">エリア</dt>
          <dd className="text-[var(--ink)]">{area}</dd>
        </div>
        {schedule && (
          <div className="flex gap-3">
            <dt className="w-16 shrink-0 text-[var(--ink-mute)]">活動日</dt>
            <dd className="text-[var(--ink)]">{schedule}</dd>
          </div>
        )}
      </dl>

      {excerpt && <p className="mt-3 text-sm text-[var(--ink-sub)] leading-relaxed whitespace-pre-wrap">{excerpt}</p>}

      <Link
        href={`/teams/${team.id}`}
        className="block text-center mt-4 border border-[var(--line)] text-[var(--ink)] font-bold py-2.5 rounded-xl text-sm hover:border-[var(--green)]/40 transition-colors"
      >
        チームページを見る
      </Link>
    </section>
  )
}
