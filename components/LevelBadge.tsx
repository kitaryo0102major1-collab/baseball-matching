import type { Level } from '@/lib/types'

interface Props {
  level: Level
  size?: 'sm' | 'md'
}

const LEVEL_CONFIG: Record<Level, { color: string; bg: string; label: string }> = {
  'A+': { color: '#c9960f', bg: '#fef9ee', label: 'A+' },
  'A':  { color: '#d4307a', bg: '#fdf0f6', label: 'A' },
  'B':  { color: '#1177dd', bg: '#eef4fd', label: 'B' },
  'C':  { color: '#00aa44', bg: '#edfaf3', label: 'C' },
}

export default function LevelBadge({ level, size = 'md' }: Props) {
  const cfg = LEVEL_CONFIG[level]
  const base = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'

  return (
    <span
      className={`${base} rounded-full font-bold border`}
      style={{
        color: cfg.color,
        backgroundColor: cfg.bg,
        borderColor: `${cfg.color}40`,
      }}
    >
      Lv.{cfg.label}
    </span>
  )
}
