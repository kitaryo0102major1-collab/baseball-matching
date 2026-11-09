import { pageMetadata } from '@/lib/seo'
import PostsPage from '@/components/PostsPage'

export const metadata = pageMetadata({
  title: '募集一覧',
  description: '草野球の対戦相手の募集一覧です。都道府県・試合日・グラウンドの有無・レベルから、対戦できるチームを探せます。',
  path: '/posts',
})

export default function Page() {
  return <PostsPage />
}
