// created_at などの時刻を、日本時間の月・日で取り出す
export function jstMonthDay(iso: string) {
  const d = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000)
  return { month: d.getUTCMonth() + 1, day: d.getUTCDate() }
}

// サーバーは UTC で動くため、「今日」は日本時間で判定する
export function todayJST() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}
