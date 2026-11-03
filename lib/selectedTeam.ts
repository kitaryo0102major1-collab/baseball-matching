export const SELECTED_TEAM_COOKIE = 'selected_team_id'
export const AUTH_NEXT_COOKIE = 'auth_next'

export function setSelectedTeamCookie(teamId: string) {
  document.cookie = `${SELECTED_TEAM_COOKIE}=${encodeURIComponent(teamId)}; path=/; max-age=31536000; samesite=lax`
}

export function clearSelectedTeamCookie() {
  document.cookie = `${SELECTED_TEAM_COOKIE}=; path=/; max-age=0; samesite=lax`
}

export function readSelectedTeamCookie(): string | null {
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${SELECTED_TEAM_COOKIE}=`))
  return match ? decodeURIComponent(match.split('=')[1]) : null
}

// OAuth のリダイレクト先にクエリを付けると Supabase の許可リストと一致しなくなるため、戻り先は Cookie で渡す
export function setAuthNextCookie(path: string) {
  document.cookie = `${AUTH_NEXT_COOKIE}=${encodeURIComponent(path)}; path=/; max-age=600; samesite=lax`
}

export function isSafeNextPath(path: string | undefined | null): path is string {
  return !!path && path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\')
}
