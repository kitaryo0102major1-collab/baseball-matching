import type { Metadata } from 'next'
import { Zen_Kaku_Gothic_New } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'
import BottomTabBar from '@/components/BottomTabBar'

const zenKaku = Zen_Kaku_Gothic_New({
  weight: ['400', '500', '700', '900'],
  subsets: ['latin'],
  display: 'swap',
})

const SITE_URL = 'https://baseball-matching-eight.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: '草野球マッチ | 対戦相手マッチングサービス',
    template: '%s | 草野球マッチ',
  },
  description: '草野球マッチは、草野球チームの対戦相手マッチングサービスです。グラウンドの有無で相手を探したり、練習試合の募集を無料・登録不要で投稿できます。',
  keywords: ['草野球マッチ', '草野球', '対戦相手', 'マッチング', '練習試合', '野球', 'チーム募集'],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: SITE_URL,
    siteName: '草野球マッチ',
    title: '草野球マッチ | 対戦相手マッチングサービス',
    description: '草野球マッチは、草野球チームの対戦相手マッチングサービスです。グラウンドの有無で相手を探したり、練習試合の募集を無料・登録不要で投稿できます。',
  },
  twitter: {
    card: 'summary',
    title: '草野球マッチ | 対戦相手マッチングサービス',
    description: '草野球マッチは、草野球チームの対戦相手マッチングサービスです。グラウンドの有無で相手を探したり、練習試合の募集を無料・登録不要で投稿できます。',
  },
  alternates: {
    canonical: SITE_URL,
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
        <footer className="bg-[var(--bg)] text-[var(--ink-mute)] text-center py-4 text-xs mt-auto">
          © 2025 草野球マッチ
        </footer>
        <BottomTabBar />
      </body>
    </html>
  )
}
