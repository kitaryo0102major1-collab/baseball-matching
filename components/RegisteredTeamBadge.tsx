interface Props {
  size?: 'xs' | 'sm'
}

export default function RegisteredTeamBadge({ size = 'sm' }: Props) {
  const cls =
    size === 'xs' ? 'text-[10px] px-1.5 py-0.5 gap-0.5' : 'text-xs px-2 py-0.5 gap-1'
  const icon = size === 'xs' ? 10 : 12
  return (
    <span
      className={`inline-flex items-center shrink-0 font-bold rounded-full bg-[var(--green-bg)] text-[var(--green)] border border-[var(--green)]/20 ${cls}`}
    >
      <svg width={icon} height={icon} viewBox="0 0 20 20" aria-hidden>
        <circle cx="10" cy="10" r="10" fill="currentColor" />
        <path d="M5.5 10.5l3 3 6-6.5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      登録チーム
    </span>
  )
}
