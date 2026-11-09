// サーバーは UTC で動くため、「今日」は日本時間で判定する
export function todayJST() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}
