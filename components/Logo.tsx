interface Props {
  size?: number
}

export default function Logo({ size = 26 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" aria-label="草野球マッチ">
      <circle cx="13" cy="13" r="12" fill="#14664A" />
      <path
        d="M6.2 3.6 C9.6 7.4 9.6 18.6 6.2 22.4"
        fill="none"
        stroke="#F7F4EC"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M19.8 3.6 C16.4 7.4 16.4 18.6 19.8 22.4"
        fill="none"
        stroke="#F7F4EC"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}
