'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  {
    href: '/',
    label: 'ホーム',
    icon: 'M3 11l9-8 9 8M5 9.5V21h5v-6h4v6h5V9.5',
  },
  {
    href: '/posts',
    label: '募集一覧',
    icon: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  },
  {
    href: '/teams',
    label: 'チーム',
    icon: 'M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 20v-2a4 4 0 0 0-3-3.9M16 2.1a4 4 0 0 1 0 7.8',
  },
  {
    href: '/mypage',
    label: 'マイページ',
    icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  },
]

export default function BottomTabBar() {
  const pathname = usePathname()

  if (!TABS.some((tab) => tab.href === pathname)) return null

  return (
    <>
      {/* 固定バーに隠れないためのスペーサー */}
      <div className="h-16 sm:hidden" />

      <nav
        aria-label="メインメニュー"
        className="fixed bottom-0 inset-x-0 z-40 sm:hidden bg-[var(--surface)] border-t border-[var(--line)]"
      >
        <div className="grid grid-cols-4 h-16">
          {TABS.map((tab) => {
            const active = tab.href === pathname
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-1 min-w-0 text-[11px] ${
                  active ? 'font-bold text-[var(--green)]' : 'font-medium text-[var(--ink-mute)]'
                }`}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={active ? 2.4 : 1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d={tab.icon} />
                </svg>
                <span className="whitespace-nowrap">{tab.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
