'use client'

import { useEffect } from 'react'

// public/score-sw.js と同じ名前
const CACHE = 'score-pages-v1'

// 打席入力・打順の画面で、電波がなくても開き直せるように Service Worker（public/score-sw.js）を登録する。
// Service Worker が効くのは次に開いたときからなので、最初に開いたこの画面とその JS・CSS も、ここでキャッシュに入れておく
export default function OfflineSupport() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('caches' in window)) return
    navigator.serviceWorker.register('/score-sw.js').catch(() => {
      // 登録できなくても、オンラインでの入力には影響しない
    })
    const assets = performance
      .getEntriesByType('resource')
      .map((e) => e.name)
      .filter((u) => u.startsWith(`${location.origin}/_next/static/`))
    caches
      .open(CACHE)
      .then(async (cache) => {
        await cache.add(location.pathname)
        await Promise.all(assets.map((u) => cache.add(u).catch(() => undefined)))
      })
      .catch(() => {
        // キャッシュできなくても、オンラインでの入力には影響しない
      })
  }, [])
  return null
}
