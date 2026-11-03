'use client'

import type { PostTeamBadge } from '@/lib/types'
import TeamAvatar from './TeamAvatar'

interface Props {
  label?: string
  teams: PostTeamBadge[]
  value: string
  onChange: (teamId: string) => void
  guestLabel: string
  hint?: string
  compact?: boolean
}

// value が '' のときは「チームとしてではなく」
export default function TeamChoice({ label, teams, value, onChange, guestLabel, hint, compact }: Props) {
  const options = [...teams.map((t) => ({ id: t.id, name: t.name, logo: t.logo_url })), { id: '', name: guestLabel, logo: null }]

  return (
    <div>
      {label && <p className="block text-sm font-semibold text-[var(--ink)] mb-1.5">{label}</p>}
      <div role="radiogroup" aria-label={label ?? guestLabel} className={compact ? 'flex flex-wrap gap-2' : 'space-y-2'}>
        {options.map((o) => {
          const active = value === o.id
          return (
            <button
              key={o.id || 'guest'}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.id)}
              className={
                compact
                  ? `flex items-center gap-1.5 rounded-full border pl-1 pr-3 py-1 text-[13px] transition-colors ${
                      active
                        ? 'border-[var(--green)] bg-[var(--green-bg)] text-[var(--green)] font-bold'
                        : 'border-[var(--line)] bg-[var(--surface)] text-[var(--ink-sub)]'
                    } ${o.id ? '' : 'pl-3'}`
                  : `w-full flex items-center gap-3 border-2 rounded-xl p-3 text-left transition-all ${
                      active ? 'border-[var(--green)] bg-[var(--green-bg)]' : 'border-[var(--line)] bg-[var(--surface)]'
                    }`
              }
            >
              {o.id && <TeamAvatar name={o.name} logoUrl={o.logo} size={compact ? 22 : 32} />}
              <span className={compact ? 'max-w-[10rem] truncate' : `text-sm ${o.id ? 'font-bold text-[var(--ink)]' : 'text-[var(--ink-sub)]'}`}>
                {o.name}
              </span>
            </button>
          )
        })}
      </div>
      {hint && <p className="text-xs text-[var(--ink-mute)] mt-1.5">{hint}</p>}
    </div>
  )
}
