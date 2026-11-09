import { pageMetadata } from '@/lib/seo'
import QuickPostPage from '@/components/QuickPostPage'

export const metadata = pageMetadata({
  title: 'かんたん募集',
  description: '質問に答えるだけで、草野球の対戦相手を1分で募集できます。登録不要・無料です。',
  path: '/posts/quick',
})

export default function Page() {
  return <QuickPostPage />
}
