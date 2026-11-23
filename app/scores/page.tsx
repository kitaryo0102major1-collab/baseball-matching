import { pageMetadata } from '@/lib/seo'
import GuestGamesList from '@/components/GuestGamesList'

// 後のタスクで紹介ページにする。今は「この端末で記録した試合」だけ
export const metadata = pageMetadata({
  title: 'スコア',
  description: '登録なしで草野球のスコアをつけられます。この端末で記録した試合の一覧です。',
  path: '/scores',
  noindex: true,
})

export default function ScoresPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-5">
      <div>
        <h1 className="text-xl font-black text-[var(--ink)]">スコア</h1>
        <p className="text-sm text-[var(--ink-sub)] mt-1">登録なしで、1試合ずつスコアをつけられます。</p>
      </div>
      <GuestGamesList />
    </div>
  )
}
