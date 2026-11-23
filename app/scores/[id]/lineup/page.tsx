import Link from 'next/link'
import { notFound } from 'next/navigation'
import { pageMetadata } from '@/lib/seo'
import GuestLineup from '@/components/GuestLineup'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  return pageMetadata({ title: '打順と交代', path: `/scores/${id}/lineup`, noindex: true })
}

// 編集用トークンは端末に保存したもの（または URL の # の後ろ）をブラウザ側で読む
export default async function GuestLineupPage({ params }: Props) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-5">
      <div>
        <Link href={`/scores/${id}/edit`} className="text-sm text-[var(--ink-mute)] hover:text-[var(--green)] transition-colors">
          ← 試合情報に戻る
        </Link>
        <h1 className="text-xl font-black text-[var(--ink)] mt-3">打順と交代</h1>
      </div>
      <GuestLineup gameId={id} />
    </div>
  )
}
