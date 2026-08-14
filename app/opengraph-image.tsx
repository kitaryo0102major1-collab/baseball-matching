import { ImageResponse } from 'next/og'

export const alt = '草野球マッチ | 対戦相手マッチングサービス'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const GREEN = '#14664A'
const BG = '#F7F4EC'
const INK = '#1B1D1A'

async function loadJapaneseFont(text: string) {
  const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700;900&text=${encodeURIComponent(text)}`
  const css = await (await fetch(cssUrl)).text()
  const blocks = [...css.matchAll(/font-weight:\s*(\d+);[\s\S]*?src: url\(([^)]+)\) format\('(?:opentype|truetype)'\)/g)]
  const fonts = await Promise.all(
    blocks.map(async ([, weight, url]) => {
      const res = await fetch(url)
      return { weight: Number(weight) as 700 | 900, data: await res.arrayBuffer() }
    })
  )
  return fonts
}

export default async function OpengraphImage() {
  const headline = '草野球マッチ'
  const tagline = '草野球の対戦相手を、ここで見つける。'
  const badge = '登録不要・無料で使える'
  const fonts = await loadJapaneseFont(headline + tagline + badge)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          backgroundColor: BG,
          padding: '80px',
          fontFamily: 'Noto Sans JP',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 44 }}>
          <svg width="110" height="110" viewBox="0 0 26 26" style={{ marginRight: 28 }}>
            <circle cx="13" cy="13" r="12" fill={GREEN} />
            <path
              d="M6.2 3.6 C9.6 7.4 9.6 18.6 6.2 22.4"
              fill="none"
              stroke={BG}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d="M19.8 3.6 C16.4 7.4 16.4 18.6 19.8 22.4"
              fill="none"
              stroke={BG}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          <div style={{ display: 'flex', fontSize: 64, fontWeight: 900, color: INK }}>{headline}</div>
        </div>
        <div style={{ display: 'flex', fontSize: 40, fontWeight: 700, color: INK }}>{tagline}</div>
        <div
          style={{
            display: 'flex',
            marginTop: 48,
            fontSize: 28,
            fontWeight: 700,
            color: BG,
            backgroundColor: GREEN,
            padding: '14px 32px',
            borderRadius: 999,
          }}
        >
          {badge}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fonts.map(({ weight, data }) => ({
        name: 'Noto Sans JP',
        data,
        style: 'normal' as const,
        weight,
      })),
    }
  )
}
