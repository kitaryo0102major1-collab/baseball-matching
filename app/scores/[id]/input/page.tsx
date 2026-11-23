import Link from 'next/link'
import { notFound } from 'next/navigation'
import { pageMetadata } from '@/lib/seo'
import GuestScoreInput from '@/components/GuestScoreInput'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  return pageMetadata({ title: '打席の入力', path: `/scores/${id}/input`, noindex: true })
}

// 試合中に入力する画面。案内のバナーは出さない
export default async function GuestInputPage({ params }: Props) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()

  return (
    <div className="max-w-md mx-auto px-4 pt-4 pb-8">
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <Link href={`/scores/${id}/edit`} className="text-[var(--ink-mute)] hover:text-[var(--green)] transition-colors">
          ← 試合情報
        </Link>
        <Link href={`/scores/${id}/lineup`} className="text-[var(--green)] font-bold">
          打順と交代
        </Link>
      </div>
      <h1 className="sr-only">打席の入力</h1>
      <GuestScoreInput gameId={id} />
    </div>
  )
}
