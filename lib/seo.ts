import type { Metadata } from 'next'

export const SITE_URL = 'https://baseball-matching-eight.vercel.app'
export const SITE_NAME = '草野球マッチ'
export const SITE_TITLE = '草野球マッチ | 対戦相手マッチングサービス'
export const SITE_DESCRIPTION =
  '草野球マッチは、草野球チームの対戦相手マッチングサービスです。グラウンドの有無で相手を探したり、練習試合の募集を無料・登録不要で投稿できます。'

const OG_IMAGE = '/opengraph-image'

interface PageMetadataOptions {
  // 省略するとサイト共通のタイトル（トップページ用）
  title?: string
  description?: string
  path: string
  noindex?: boolean
}

// Next.js は openGraph / twitter を親から丸ごと置き換えるので、画像も含めて毎回すべて指定する
export function pageMetadata({ title, description = SITE_DESCRIPTION, path, noindex }: PageMetadataOptions): Metadata {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_TITLE

  return {
    title: title ?? { absolute: SITE_TITLE },
    description,
    alternates: { canonical: path },
    ...(noindex ? { robots: { index: false } } : {}),
    openGraph: {
      type: 'website',
      locale: 'ja_JP',
      siteName: SITE_NAME,
      url: path,
      title: fullTitle,
      description,
      images: [OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [OG_IMAGE],
    },
  }
}

export function truncateText(text: string, max: number) {
  const singleLine = text.replace(/\s+/g, ' ').trim()
  return singleLine.length > max ? `${singleLine.slice(0, max)}…` : singleLine
}
