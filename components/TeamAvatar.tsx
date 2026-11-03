interface Props {
  name: string
  logoUrl?: string | null
  size?: number
}

export default function TeamAvatar({ name, logoUrl, size = 32 }: Props) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`${name}のロゴ`}
        width={size}
        height={size}
        className="rounded-full object-cover border border-[var(--line)] bg-[var(--surface)] shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <span
      aria-label={name}
      className="rounded-full bg-[var(--green)] text-[var(--bg)] font-bold flex items-center justify-center shrink-0"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.45) }}
    >
      {Array.from(name.trim())[0] ?? '?'}
    </span>
  )
}
