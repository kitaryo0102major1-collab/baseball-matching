import { pageMetadata } from '@/lib/seo'
import PostForm from '@/components/PostForm'

export const metadata = pageMetadata({
  title: 'くわしく募集',
  description: '試合の条件・連絡先・コメントまで入力して、草野球の対戦相手を募集できます。登録不要・無料です。',
  path: '/posts/new',
})

export default function NewPostPage() {
  return <PostForm mode="create" />
}
