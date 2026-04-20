// ===== 背单词 PWA Service Worker =====
// 缓存策略：优先网络，离线时使用缓存

const CACHE_NAME = 'vocab-app-v2';
const ASSETS_TO_CACHE = [
  './',
  './vocab-app.html',
  './manifest.json',
  './icon-192.jpg',
  './icon-512.jpg'
];

// 安装：预缓存核心资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// 激活：清理旧版本缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// 请求拦截：网络优先，离线回退缓存
self.addEventListener('fetch', event => {
  // 跳过非 GET 请求
  if (event.request.method !== 'GET') return;

  // 对于 API 请求（词典、语音等），直接走网络
  if (event.request.url.includes('dictionaryapi.dev') ||
      event.request.url.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 成功获取网络响应后，更新缓存
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // 网络失败，从缓存读取
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) return cachedResponse;
          // 如果是导航请求（HTML页面），返回离线页面
          if (event.request.mode === 'navigate') {
            return caches.match('./vocab-app.html');
          }
          return new Response('离线状态', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});
