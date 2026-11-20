/* ==========================================================================
   CRB점주용 (CRUNCH'S 점주 포털) — Service Worker
   --------------------------------------------------------------------------
   원칙
   1) 네트워크 우선(network-first): 화면·스크립트는 항상 서버의 최신 파일을 먼저 받습니다.
      → 배포 후 옛 HTML/JS/CSS가 고착되지 않습니다.
   2) Supabase(supabase.co)·외부 도메인 요청은 절대 가로채지 않습니다.
      (로그인·발주·회원 데이터는 항상 실시간 요청)
   3) 캐시는 "오프라인일 때 보여 줄 사본"으로만 씁니다. 온라인에서는 캐시를 먼저 쓰지 않습니다.
   ========================================================================== */
const CACHE_NAME = 'crb-portal-v4';

/* 오프라인 첫 화면용 최소 자산 (상대 경로 — /portal/ 하위 배포 기준) */
const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './data.js',
  './manifest.webmanifest',
  './assets/logo.png',
  './assets/logo-light.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/apple-touch-icon.png',
  './assets/fonts/crunchs-sans.woff2'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    /* 하나라도 실패하면 install 전체가 실패하므로 개별로 담습니다. */
    await Promise.all(CORE_ASSETS.map((url) => cache.add(url).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  /* GET 이외(POST·PATCH 등)와 범위 밖 요청은 브라우저에 그대로 맡깁니다. */
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (err) { return; }

  /* 외부 API(Supabase)·외부 폰트·다른 도메인은 손대지 않습니다. */
  if (url.origin !== self.location.origin) return;

  /* 서비스 워커 파일 자체는 캐시하지 않습니다. */
  if (url.pathname.endsWith('/sw.js')) return;

  /* 화면 이동(HTML)은 network-first, 실패하면 캐시된 index.html
     HTML은 no-store 로 항상 새로 받고, 스크립트·스타일은 ?v= 버전 쿼리로 갱신합니다. */
  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req, './index.html', true));
    return;
  }

  event.respondWith(networkFirst(req, null, false));
});

async function networkFirst(req, fallbackUrl, bypassHttpCache) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(req, bypassHttpCache ? { cache: 'no-store' } : undefined);
    if (fresh && fresh.ok) {
      cache.put(req, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    if (fallbackUrl) {
      const fallback = await cache.match(fallbackUrl, { ignoreSearch: true });
      if (fallback) return fallback;
    }
    throw err;
  }
}
