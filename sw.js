// O게임 서비스 워커 — 앱 설치(홈 화면 아이콘)용.
// 게임은 항상 최신 파일을 받아야 해서 캐시하지 않고 네트워크로만 가져와요.
// 인터넷이 끊겼을 때만 "연결 없음" 화면을 보여줘요.
const OFFLINE = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>O게임</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#140d2b;color:#fff;font-family:sans-serif;text-align:center">
<div><img src="/img/app/icon-192.png" width="96" height="96" style="border-radius:22px"><h2>인터넷 연결이 없어요</h2>
<p style="opacity:.75">연결된 뒤 다시 시도해 주세요.</p><button onclick="location.reload()" style="padding:10px 22px;border-radius:99px;border:0;background:#ff4fa0;color:#fff;font-size:16px;font-weight:700">다시 시도</button></div>`;
self.addEventListener('install', (e) => { e.waitUntil(caches.open('og-v1').then((c) => c.add('/img/app/icon-192.png')).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  if (e.request.mode !== 'navigate') {
    if (e.request.url.endsWith('/img/app/icon-192.png')) e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(fetch(e.request).catch(() => new Response(OFFLINE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })));
});
