'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { PREFECTURES } from '@/lib/prefectures'
import { ACTIVITY_DAYS, type ActivityDay, type Level } from '@/lib/types'

const LEVELS: Level[] = ['A+', 'A', 'B', 'C']

function chipClass(active: boolean) {
  return `text-[13px] px-3 py-1.5 rounded-full border transition-colors ${
    active
      ? 'bg-[var(--green)] text-[var(--bg)] font-bold border-[var(--green)]'
      : 'bg-[var(--surface)] text-[var(--ink-sub)] border-[var(--line)]'
  }`
}

interface Props {
  prefecture: string
  level: Level | ''
  days: ActivityDay[]
}

export default function TeamFilters({ prefecture, level, days }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function apply(next: Partial<Props>) {
    const merged = { prefecture, level, days, ...next }
    const params = new URLSearchParams()
    if (merged.prefecture) params.set('prefecture', merged.prefecture)
    if (merged.level) params.set('level', merged.level)
    if (merged.days.length) params.set('days', merged.days.join(','))
    const qs = params.toString()
    startTransition(() => router.replace(qs ? `/teams?${qs}` : '/teams', { scroll: false }))
  }

  function toggleDay(day: ActivityDay) {
    const selected = days.includes(day) ? days.filter((d) => d !== day) : [...days, day]
    apply({ days: ACTIVITY_DAYS.filter((d) => selected.includes(d)) })
  }

  return (
    <div
      aria-busy={pending}
      className={`bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-4 space-y-3 transition-opacity ${pending ? 'opacity-60' : ''}`}
    >
      <div>
        <label htmlFor="team-prefecture" className="block text-xs text-[var(--ink-mute)] mb-1">
          都道府県
        </label>
        <select
          id="team-prefecture"
          value={prefecture}
          onChange={(e) => apply({ prefecture: e.target.value })}
          className="w-full border border-[var(--line)] rounded-lg px-3 py-2 text-sm bg-[var(--surface)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--green)]/40"
        >
          <option value="">都道府県すべて</option>
          {PREFECTURES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div>
        <p className="text-xs text-[var(--ink-mute)] mb-1">レベル</p>
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={level === l}
              onClick={() => apply({ level: level === l ? '' : l })}
              className={chipClass(level === l)}
            >
              Lv.{l}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-[var(--ink-mute)] mb-1">活動曜日（どれか1つでも活動していれば表示）</p>
        <div className="flex flex-wrap gap-2">
          {ACTIVITY_DAYS.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={days.includes(d)}
              onClick={() => toggleDay(d)}
              className={`${chipClass(days.includes(d))} w-10 px-0 text-center`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
