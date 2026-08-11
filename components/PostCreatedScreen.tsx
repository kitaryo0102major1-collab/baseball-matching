import Link from 'next/link'

interface Props {
  postId: string
}

export default function PostCreatedScreen({ postId }: Props) {
  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-[var(--green-bg)] border-2 border-[var(--green)] flex items-center justify-center mx-auto mb-5">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M5 13l4 4L19 7"
            stroke="var(--green)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h1 className="text-xl font-black text-[var(--ink)] mb-2">募集を投稿しました</h1>
      <p className="text-sm text-[var(--ink-sub)] leading-relaxed mb-8">
        一覧に掲載されました。対戦相手が決まったら、募集詳細から「決定済み」に切り替えてください。
      </p>
      <div className="space-y-3">
        <Link
          href={`/posts/${postId}`}
          className="block w-full bg-[var(--green)] hover:opacity-90 text-white font-bold py-3.5 rounded-xl transition-colors"
        >
          投稿した募集を見る
        </Link>
        <Link
          href="/posts"
          className="block w-full bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] font-semibold py-3.5 rounded-xl transition-colors"
        >
          募集一覧へ
        </Link>
      </div>
    </div>
  )
}
