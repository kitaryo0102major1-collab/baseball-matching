import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/Header'

const SITE_URL = 'https://baseball-matching-eight.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: '草野球マッチング | 対戦相手を見つけよう',
    template: '%s | 草野球マッチング',
  },
  description: '草野球チームの対戦相手マッチングサービス。グラウンドの有無で相手を探したり、練習試合の募集を無料・登録不要で投稿できます。',
  keywords: ['草野球', '対戦相手', 'マッチング', '練習試合', '野球', 'チーム募集'],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: SITE_URL,
    siteName: '草野球マッチング',
    title: '草野球マッチング | 対戦相手を見つけよう',
    description: '草野球チームの対戦相手マッチングサービス。グラウンドの有無で相手を探したり、練習試合の募集を無料・登録不要で投稿できます。',
  },
  twitter: {
    card: 'summary',
    title: '草野球マッチング | 対戦相手を見つけよう',
    description: '草野球チームの対戦相手マッチングサービス。グラウンドの有無で相手を探したり、練習試合の募集を無料・登録不要で投稿できます。',
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
      <body className="min-h-full flex flex-col bg-slate-50">
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="bg-gray-800 text-gray-400 text-center py-6 text-sm mt-auto">
          © 2025 草野球マッチング
        </footer>
      </body>
    </html>
  )
}
