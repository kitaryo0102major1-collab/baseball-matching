'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Logo from './Logo'

export default function Header() {
  const pathname = usePathname()

  return (
    <header className="bg-[var(--surface)] border-b border-[var(--line)] sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-[var(--green)]">
          <Logo />
          <span className="hidden sm:block">草野球マッチ</span>
        </Link>
        <nav className="hidden sm:flex items-center gap-3">
          <Link
            href="/posts"
            className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
              pathname === '/posts'
                ? 'bg-[var(--green-bg)] text-[var(--green)] font-medium'
                : 'text-[var(--ink-sub)] hover:text-[var(--green)]'
            }`}
          >
            相手を探す
          </Link>
          <Link
            href="/posts/new"
            className={`text-sm px-4 py-1.5 rounded-md font-medium transition-colors ${
              pathname === '/posts/new'
                ? 'bg-[var(--green-bg)] text-[var(--green)]'
                : 'bg-[var(--green)] hover:opacity-90 text-white'
            }`}
          >
            募集する
          </Link>
        </nav>
      </div>
    </header>
  )
}
