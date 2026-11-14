import { MUNICIPALITIES } from '@/lib/municipalities'
import type { Prefecture } from '@/lib/prefectures'

// 北方領土の6村（色丹村・泊村・留夜別村・留別村・紗那村・蘂取村）は団体コードがあるが、選択肢には出さない
const EXCLUDED_CODES = new Set(['016951', '016969', '016977', '016985', '016993', '017001'])

export function cityOptions(prefecture: string): string[] {
  const list = MUNICIPALITIES[prefecture as Prefecture] ?? []
  return list.filter((m) => !EXCLUDED_CODES.has(m.code)).map((m) => m.name)
}

interface Props {
  prefecture: string
  value: string
  onChange: (city: string) => void
  className?: string
}

// 都道府県を選ぶまでは表示しない。値は市区町村名（政令指定都市は市単位）
export default function CitySelect({ prefecture, value, onChange, className }: Props) {
  if (!prefecture) return null

  const options = cityOptions(prefecture)
  // 保存済みの値が一覧にない場合（市町村合併などで名前が変わったとき）も、そのまま表示して選び直せるようにする
  if (value && !options.includes(value)) options.unshift(value)

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={className} aria-label="市区町村">
      <option value="">市区町村を選択</option>
      {options.map((city) => (
        <option key={city} value={city}>
          {city}
        </option>
      ))}
    </select>
  )
}
