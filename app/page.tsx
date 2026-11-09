import { pageMetadata } from '@/lib/seo'
import TopPage from '@/components/TopPage'

export const metadata = pageMetadata({ path: '/' })

export default function Page() {
  return <TopPage />
}
