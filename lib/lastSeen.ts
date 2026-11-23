// マイページを最後に開いた時刻（チームごと、localStorage）。新着メッセージの判定に使う。
// 書き込むのはマイページだけ。チームホームは読むだけ（マイページで確認するまで新着のまま）
function storageKey(teamId: string) {
  return `mypage_last_seen_${teamId}`
}

export function readLastSeen(teamId: string): string | null {
  try {
    return window.localStorage.getItem(storageKey(teamId))
  } catch {
    return null
  }
}

export function writeLastSeen(teamId: string, value: string) {
  try {
    window.localStorage.setItem(storageKey(teamId), value)
  } catch {}
}

// 前回確認した時刻より後に、ほかのチーム・ゲストから届いたメッセージの時刻だけを返す（前回がなければ0件）
export function newChatTimes(chats: { created_at: string; team_id: string | null }[], teamId: string, lastSeen: string | null) {
  if (!lastSeen) return []
  const since = new Date(lastSeen).getTime()
  return chats.filter((c) => c.team_id !== teamId && new Date(c.created_at).getTime() > since).map((c) => c.created_at)
}
