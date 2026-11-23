import Link from 'next/link'
import { pageMetadata } from '@/lib/seo'
import GuestGameCreate from '@/components/GuestGameCreate'

export const metadata = pageMetadata({ title: '試合を作成', path: '/scores/new', noindex: true })

export default function NewGuestGamePage() {
  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-5">
      <div>
        <Link href="/scores" className="text-sm text-[var(--ink-mute)] hover:text-[var(--green)] transition-colors">
          ← スコアに戻る
        </Link>
        <h1 className="text-xl font-black text-[var(--ink)] mt-3">試合を作成</h1>
        <p className="text-sm text-[var(--ink-sub)] mt-1">登録なしで記録できます。試合はこの端末に保存されます。</p>
      </div>
      <section className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5">
        <GuestGameCreate />
      </section>
    </div>
  )
}
