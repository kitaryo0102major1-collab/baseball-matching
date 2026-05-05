import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/Header'

export const metadata: Metadata = {
  title: '草野球マッチング | 対戦相手を見つけよう',
  description: '草野球チームの対戦相手マッチングサービス。登録不要・無料で使えます。',
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
