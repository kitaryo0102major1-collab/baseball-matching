import Link from 'next/link'
import { notFound } from 'next/navigation'
import { pageMetadata } from '@/lib/seo'
import GuestGameEditor from '@/components/GuestGameEditor'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  return pageMetadata({ title: '試合の編集', path: `/scores/${id}/edit`, noindex: true })
}

// 編集用トークンは URL の # の後ろ（サーバーには届かない）か端末に保存したものを、ブラウザ側で読む
export default async function GuestGameEditPage({ params }: Props) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-5">
      <div>
        <Link href="/scores" className="text-sm text-[var(--ink-mute)] hover:text-[var(--green)] transition-colors">
          ← この端末で記録した試合
        </Link>
        <h1 className="text-xl font-black text-[var(--ink)] mt-3">試合の編集</h1>
      </div>
      <GuestGameEditor gameId={id} />
    </div>
  )
}
