'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Header() {
  const pathname = usePathname()

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-[#1D9E75]">
          <span className="text-2xl">⚾</span>
          <span className="hidden sm:block">草野球マッチング</span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link
            href="/posts"
            className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
              pathname === '/posts'
                ? 'bg-[#E1F5EE] text-[#0F6E56] font-medium'
                : 'text-gray-600 hover:text-[#1D9E75]'
            }`}
          >
            募集一覧
          </Link>
          <Link
            href="/posts/new"
            className="text-sm bg-[#1D9E75] hover:bg-[#0F6E56] text-white font-medium px-4 py-1.5 rounded-md transition-colors"
          >
            募集する
          </Link>
        </nav>
      </div>
    </header>
  )
}
