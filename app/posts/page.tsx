import { postListPath } from '@/lib/postRules'
import { pageMetadata } from '@/lib/seo'
import PostsPage from '@/components/PostsPage'

const META = {
  match: {
    title: '募集一覧',
    description: '草野球の対戦相手の募集一覧です。都道府県・試合日・グラウンドの有無・レベルから、対戦できるチームを探せます。',
  },
  helper: {
    title: '助っ人募集一覧',
    description: '草野球の助っ人募集の一覧です。都道府県・試合日・ポジションから、参加できる試合を探せます。',
  },
  member: {
    title: 'メンバー募集一覧',
    description: '草野球チームのメンバー募集の一覧です。都道府県・ポジション・未経験OK・体験参加OKから、入りたいチームを探せます。',
  },
} as const

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ searchParams }: Props) {
  const { type } = await searchParams
  const postType = type === 'helper' || type === 'member' ? type : 'match'
  return pageMetadata({ ...META[postType], path: postListPath(postType) })
}

export default function Page() {
  return <PostsPage />
}
