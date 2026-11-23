// ゲストの試合の編集用トークンを、試合IDとセットで端末（localStorage）に保存する。
// localStorage が使えない環境（プライベートモードなど）では読み書きを諦め、空として扱う。

const STORAGE_KEY = 'guest_games'

export interface StoredGuestGame {
  id: string
  token: string
  savedAt: string
}

const ID_PATTERN = /^[0-9a-f-]{36}$/
const TOKEN_PATTERN = /^[0-9a-f]{64}$/

export function isValidGuestToken(token: string | null | undefined): token is string {
  return !!token && TOKEN_PATTERN.test(token)
}

export function readGuestGames(): StoredGuestGame[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const list = JSON.parse(raw)
    if (!Array.isArray(list)) return []
    return list.filter(
      (g): g is StoredGuestGame =>
        !!g && typeof g.id === 'string' && ID_PATTERN.test(g.id) && isValidGuestToken(g.token) && typeof g.savedAt === 'string'
    )
  } catch {
    return []
  }
}

function writeGuestGames(list: StoredGuestGame[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
    return true
  } catch {
    return false
  }
}

// 保存できたら true（同じ試合はトークンを上書きする）
export function saveGuestGame(id: string, token: string) {
  const list = readGuestGames().filter((g) => g.id !== id)
  return writeGuestGames([{ id, token, savedAt: new Date().toISOString() }, ...list])
}

export function getGuestToken(id: string): string | null {
  return readGuestGames().find((g) => g.id === id)?.token ?? null
}

export function removeGuestGame(id: string) {
  writeGuestGames(readGuestGames().filter((g) => g.id !== id))
}

// 編集用リンク。トークンは # の後ろに入れて、サーバーへ送られないようにする
export function guestEditUrl(origin: string, id: string, token: string) {
  return `${origin}/scores/${id}/edit#${token}`
}
