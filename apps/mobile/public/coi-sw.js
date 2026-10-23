/* Cross-origin isolation for static hosting. SQLite on the web needs SharedArrayBuffer, which
 * browsers only allow when the page is served with COOP and COEP headers. GitHub Pages cannot set
 * headers, so this file runs twice: as a page script it registers itself, as a service worker it
 * re-serves every response with the two headers added. The first visit reloads once. */
if (typeof window === 'undefined') {
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
  self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') return;
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 0) return response;
          const headers = new Headers(response.headers);
          headers.set('Cross-Origin-Embedder-Policy', 'credentialless');
          headers.set('Cross-Origin-Opener-Policy', 'same-origin');
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
          });
        })
        .catch((e) => console.error(e)),
    );
  });
} else if (!window.crossOriginIsolated && window.isSecureContext && 'serviceWorker' in navigator) {
  const reloaded = window.sessionStorage.getItem('coi-reloaded');
  navigator.serviceWorker
    .register(document.currentScript.src)
    .then((registration) => {
      registration.addEventListener('updatefound', () => window.location.reload());
      if (registration.active && !navigator.serviceWorker.controller && !reloaded) {
        window.sessionStorage.setItem('coi-reloaded', '1');
        window.location.reload();
      }
    })
    .catch((e) => console.error('coi-sw registration failed', e));
}
