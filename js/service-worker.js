const CACHE_NAME = 'barberpro-v3';
const BASE_PATH = '/ClineteMax';

const urlsToCache = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/css/style.css`,
  `${BASE_PATH}/js/app.js`,
  `${BASE_PATH}/js/utils.js`,
  `${BASE_PATH}/js/database.js`,
  `${BASE_PATH}/js/clientes.js`,
  `${BASE_PATH}/js/atendimento.js`,
  `${BASE_PATH}/js/agenda.js`,
  `${BASE_PATH}/js/servicos.js`,
  `${BASE_PATH}/js/produtos.js`,
  `${BASE_PATH}/js/backup.js`,
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/croppie/2.6.5/croppie.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/croppie/2.6.5/croppie.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

// Instalação - Cache inicial
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
    .then(cache => {
      console.log('✅ Cache aberto');
      return cache.addAll(urlsToCache);
    })
    .then(() => self.skipWaiting())
  );
});

// Ativação - Limpa caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('🗑️ Cache antigo removido:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intercepta requisições
self.addEventListener('fetch', event => {
  // Não intercepta requisições de API ou analytics
  if (event.request.url.includes('google-analytics') ||
    event.request.url.includes('chrome-extension')) {
    return;
  }
  
  const url = event.request.url;
  
  // CSS e fonts: network-first, com fallback para cache
  if (url.includes('.css') || url.includes('font-awesome') || url.includes('fonts')) {
    event.respondWith(
      fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
    );
    return;
  }
  
  // Padrão: cache-first
  event.respondWith(
    caches.match(event.request)
    .then(response => {
      if (response) {
        return response;
      }
      
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        var responseToCache = response.clone();
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, responseToCache);
          });
        
        return response;
      });
    })
    .catch(() => {
      if (event.request.mode === 'navigate') {
        return caches.match(`${BASE_PATH}/index.html`);
      }
    })
  );
});