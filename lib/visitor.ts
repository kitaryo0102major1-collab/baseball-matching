// 端末ごとのランダムID。閲覧数・気になるの重複防止と、ゲスト募集を投稿した端末の判定に使う。
// localStorage が使えない（プライベートモード・ブロック等）ときは null を返し、呼び出し側は記録を省く。
const VISITOR_ID_KEY = 'visitor_id'
const VISITOR_ID_PATTERN = /^[0-9a-f-]{36}$/

function randomId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // randomUUID がない環境（http の開発環境など）向け。同じ形式の UUID v4 を作る
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

// 保存済みの ID を返す。まだないとき・読めないときは null
export function getVisitorId(): string | null {
  try {
    const id = window.localStorage.getItem(VISITOR_ID_KEY)
    return id && VISITOR_ID_PATTERN.test(id) ? id : null
  } catch {
    return null
  }
}

// 保存済みの ID を返し、なければ作って保存する。保存できなかったときは null
// （毎回別の ID になると、閲覧数の重複防止や投稿した端末の判定ができないため）
export function getOrCreateVisitorId(): string | null {
  const existing = getVisitorId()
  if (existing) return existing
  try {
    const id = randomId()
    window.localStorage.setItem(VISITOR_ID_KEY, id)
    return window.localStorage.getItem(VISITOR_ID_KEY) === id ? id : null
  } catch {
    return null
  }
}
