import { pageMetadata } from '@/lib/seo'
import TeamHome from '@/components/TeamHome'
import TopPage from '@/components/TopPage'

export const metadata = pageMetadata({ path: '/' })

// 事前に作っておくページのまま、ログイン状態で出し分ける（CSS の .home-member / .home-guest、app/globals.css）
export default function Page() {
  return (
    <>
      <div className="home-member">
        <TeamHome />
      </div>
      <div className="home-guest">
        <TopPage />
      </div>
    </>
  )
}
