'use client'

import { useRouter } from 'next/navigation'
import { setSelectedTeamCookie } from '@/lib/selectedTeam'
import type { TeamSummary } from '@/lib/types'
import TeamAvatar from './TeamAvatar'

interface Props {
  teams: TeamSummary[]
  selectedId: string
}

export default function TeamSwitcher({ teams, selectedId }: Props) {
  const router = useRouter()

  if (teams.length < 2) return null

  function select(teamId: string) {
    if (teamId === selectedId) return
    setSelectedTeamCookie(teamId)
    router.refresh()
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-3">
      <p className="text-xs text-[var(--ink-mute)] px-1 mb-2">管理中のチーム</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {teams.map((t) => {
          const active = t.id === selectedId
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => select(t.id)}
              aria-pressed={active}
              className={`flex items-center gap-2 shrink-0 rounded-full border pl-1 pr-3 py-1 text-[13px] transition-colors ${
                active
                  ? 'border-[var(--green)] bg-[var(--green-bg)] text-[var(--green)] font-bold'
                  : 'border-[var(--line)] text-[var(--ink-sub)]'
              }`}
            >
              <TeamAvatar name={t.name} logoUrl={t.logo_url} size={24} />
              <span className="max-w-[10rem] truncate">{t.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
