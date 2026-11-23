// スコア入力の画面を、電波がないときも開き直せるようにする Service Worker。
// 対象は打席入力・打順の画面（とその JS・CSS）だけ。ほかのページには触れない。
// 画面: ネットワーク優先で取り、取れたらキャッシュに入れる。取れないときはキャッシュを返す
// /_next/static: ファイル名にハッシュが付いているので、キャッシュ優先
const CACHE = 'score-pages-v1'

const PAGE_PATTERNS = [/^\/scores\/[0-9a-f-]{36}\/(input|lineup)$/, /^\/mypage\/games\/[0-9a-f-]{36}\/(input|lineup)$/]

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('score-pages-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone()
              caches.open(CACHE).then((c) => c.put(req, copy))
            }
            return res
          })
      )
    )
    return
  }

  if (req.mode === 'navigate' && PAGE_PATTERNS.some((p) => p.test(url.pathname))) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(url.pathname, copy))
          }
          return res
        })
        .catch(() =>
          caches.match(url.pathname).then(
            (hit) =>
              hit ||
              new Response('<!doctype html><meta charset="utf-8"><title>オフライン</title><p style="font-family:sans-serif;padding:24px">通信できません。電波のよい場所で開き直してください。入力した記録は端末に残っています。</p>', {
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
              })
          )
        )
    )
  }
})
