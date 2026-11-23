import type { MatchPostWithTeam } from '@/lib/types'
import PostCard from './PostCard'

// 市区町村で絞り込むと、同じ都道府県で市区町村が未設定の募集も一緒に取得している。表示用に分ける
export function splitByCity(posts: MatchPostWithTeam[], city: string) {
  if (!city) return { matched: posts, unset: [] as MatchPostWithTeam[] }
  return {
    matched: posts.filter((p) => p.city === city),
    unset: posts.filter((p) => !p.city),
  }
}

export function PostCount({ matched, unset, city }: { matched: number; unset: number; city: string }) {
  if (!city) {
    return (
      <>
        <span className="font-bold text-[var(--ink)]">{matched}</span> 件の募集
      </>
    )
  }
  return (
    <>
      <span className="font-bold text-[var(--ink)]">{matched}</span>件（＋市区町村未設定{unset}件）
    </>
  )
}

interface Props {
  matched: MatchPostWithTeam[]
  unset: MatchPostWithTeam[]
  city: string
  prefecture: string
}

export default function CityGroupedPosts({ matched, unset, city, prefecture }: Props) {
  return (
    <>
      {matched.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {matched.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--ink-sub)] py-4">{city}の募集はまだありません。</p>
      )}

      {unset.length > 0 && (
        <section className="mt-8 pt-6 border-t border-[var(--line)]">
          <h2 className="text-sm font-bold text-[var(--ink-sub)] mb-3">市区町村が未設定の{prefecture}の募集</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {unset.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}
    </>
  )
}
