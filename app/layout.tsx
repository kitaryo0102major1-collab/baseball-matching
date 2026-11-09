import type { Metadata } from 'next'
import { Zen_Kaku_Gothic_New } from 'next/font/google'
import Link from 'next/link'
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from '@/lib/seo'
import './globals.css'
import Header from '@/components/Header'
import BottomTabBar from '@/components/BottomTabBar'

const zenKaku = Zen_Kaku_Gothic_New({
  weight: ['400', '500', '700', '900'],
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: ['草野球マッチ', '草野球', '対戦相手', 'マッチング', '練習試合', '野球', 'チーム募集'],
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" className="h-full">
      <body className={`${zenKaku.className} min-h-full flex flex-col`}>
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="bg-[var(--bg)] text-[var(--ink-mute)] text-center py-4 text-xs mt-auto space-y-1">
          <p>
            <Link href="/privacy" className="hover:text-[var(--green)] underline">
              プライバシーポリシー
            </Link>
          </p>
          <p>© 2025 草野球マッチ</p>
        </footer>
        <BottomTabBar />
      </body>
    </html>
  )
}
