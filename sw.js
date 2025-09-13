// sw.js - Service Worker pour MarchéIvoire

const CACHE_NAME = 'marche-ivoire-v1.0.0';
const STATIC_CACHE = 'marche-ivoire-static-v1';
const DYNAMIC_CACHE = 'marche-ivoire-dynamic-v1';
const IMAGE_CACHE = 'marche-ivoire-images-v1';

// Fichiers essentiels à mettre en cache
const STATIC_FILES = [
    '/',
    '/index.html',
    '/checkout.html',
    '/order-confirmation.html',
    '/privacy.html',
    '/assets/css/main.css',
    '/assets/js/main.js',
    '/assets/js/cart.js',
    '/assets/js/products.js',
    '/assets/js/utils.js',
    '/assets/js/config.js',
    '/manifest.json',
    '/assets/images/favicon.ico',
    '/assets/images/logo-192.png',
    '/assets/images/logo-512.png'
];

// URLs à toujours récupérer du réseau
const NETWORK_FIRST = [
    '/data/products.json',
    '/data/orders.json',
    '/admin/',
    '/api/'
];

// Installation du Service Worker
self.addEventListener('install', event => {
    console.log('[SW] Installation du Service Worker');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('[SW] Mise en cache des fichiers statiques');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('[SW] Installation terminée');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('[SW] Erreur lors de l\'installation:', error);
            })
    );
});

// Activation du Service Worker
self.addEventListener('activate', event => {
    console.log('[SW] Activation du Service Worker');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        // Supprimer les anciens caches
                        if (cacheName !== STATIC_CACHE && 
                            cacheName !== DYNAMIC_CACHE && 
                            cacheName !== IMAGE_CACHE) {
                            console.log('[SW] Suppression de l\'ancien cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[SW] Activation terminée');
                return self.clients.claim();
            })
    );
});

// Interception des requêtes
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    
    // Ignorer les requêtes non-HTTP/HTTPS
    if (!request.url.startsWith('http')) {
        return;
    }
    
    // Ignorer les requêtes POST, PUT, DELETE
    if (request.method !== 'GET') {
        return;
    }
    
    // Stratégie pour les images
    if (request.destination === 'image') {
        event.respondWith(handleImageRequest(request));
        return;
    }
    
    // Stratégie Network First pour certaines URLs
    if (NETWORK_FIRST.some(path => url.pathname.startsWith(path))) {
        event.respondWith(handleNetworkFirst(request));
        return;
    }
    
    // Stratégie Cache First pour les fichiers statiques
    if (STATIC_FILES.includes(url.pathname) || 
        url.pathname.includes('/assets/')) {
        event.respondWith(handleCacheFirst(request));
        return;
    }
    
    // Stratégie par défaut : Cache First avec fallback Network
    event.respondWith(handleDefault(request));
});

// Gestion des images - Cache First avec fallback
async function handleImageRequest(request) {
    try {
        const cache = await caches.open(IMAGE_CACHE);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        
        if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[SW] Erreur image, fallback vers placeholder');
        return createPlaceholderImage();
    }
}

// Stratégie Network First
async function handleNetworkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[SW] Network failed, trying cache for:', request.url);
        const cache = await caches.open(DYNAMIC_CACHE);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        throw error;
    }
}

// Stratégie Cache First
async function handleCacheFirst(request) {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('[SW] Erreur réseau et pas de cache pour:', request.url);
        throw error;
    }
}

// Stratégie par défaut
async function handleDefault(request) {
    try {
        // Essayer le cache d'abord
        const cache = await caches.open(DYNAMIC_CACHE);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            // Mettre à jour en arrière-plan
            fetch(request).then(networkResponse => {
                if (networkResponse && networkResponse.status === 200) {
                    cache.put(request, networkResponse.clone());
                }
            }).catch(() => {
                // Ignorer les erreurs de mise à jour en arrière-plan
            });
            
            return cachedResponse;
        }
        
        // Si pas en cache, essayer le réseau
        const networkResponse = await fetch(request);
        
        if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[SW] Erreur par défaut pour:', request.url);
        
        // Fallback vers page hors ligne pour les pages HTML
        if (request.headers.get('accept').includes('text/html')) {
            return createOfflinePage();
        }
        
        throw error;
    }
}

// Créer une image placeholder
function createPlaceholderImage() {
    const svg = `
        <svg width="200" height="150" xmlns="http://www.w3.org/2000/svg">
            <rect width="200" height="150" fill="#f0f0f0"/>
            <text x="100" y="75" text-anchor="middle" fill="#999" font-family="Arial" font-size="14">
                Image non disponible
            </text>
        </svg>
    `;
    
    return new Response(svg, {
        headers: {
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'no-cache'
        }
    });
}

// Créer une page hors ligne
function createOfflinePage() {
    const html = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Hors ligne - MarchéIvoire</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    text-align: center;
                    padding: 50px;
                    background: #f8f9fa;
                }
                .offline-container {
                    max-width: 500px;
                    margin: 0 auto;
                    padding: 40px;
                    background: white;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .offline-icon {
                    font-size: 4rem;
                    margin-bottom: 20px;
                }
                h1 {
                    color: #FF6B35;
                    margin-bottom: 20px;
                }
                p {
                    color: #666;
                    line-height: 1.6;
                    margin-bottom: 30px;
                }
                .retry-btn {
                    background: #FF6B35;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 16px;
                }
                .retry-btn:hover {
                    background: #E55A2B;
                }
            </style>
        </head>
        <body>
            <div class="offline-container">
                <div class="offline-icon">📱</div>
                <h1>Vous êtes hors ligne</h1>
                <p>
                    Il semble que vous n'ayez pas de connexion internet. 
                    Vérifiez votre connexion et réessayez.
                </p>
                <p>
                    Certaines fonctionnalités peuvent être disponibles hors ligne 
                    grâce aux données mises en cache.
                </p>
                <button class="retry-btn" onclick="window.location.reload()">
                    Réessayer
                </button>
            </div>
        </body>
        </html>
    `;
    
    return new Response(html, {
        headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache'
        }
    });
}

// Gestion des messages du client
self.addEventListener('message', event => {
    console.log('[SW] Message reçu:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_CACHE_SIZE') {
        getCacheSize().then(size => {
            event.ports[0].postMessage({ size });
        });
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        clearOldCaches().then(() => {
            event.ports[0].postMessage({ success: true });
        });
    }
});

// Obtenir la taille du cache
async function getCacheSize() {
    const cacheNames = await caches.keys();
    let totalSize = 0;
    
    for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        
        for (const request of requests) {
            const response = await cache.match(request);
            if (response) {
                const blob = await response.blob();
                totalSize += blob.size;
            }
        }
    }
    
    return totalSize;
}

// Nettoyer les anciens caches
async function clearOldCaches() {
    const cacheNames = await caches.keys();
    const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE];
    
    return Promise.all(
        cacheNames.map(cacheName => {
            if (!currentCaches.includes(cacheName)) {
                console.log('[SW] Suppression du cache:', cacheName);
                return caches.delete(cacheName);
            }
        })
    );
}

// Synchronisation en arrière-plan
self.addEventListener('sync', event => {
    console.log('[SW] Sync event:', event.tag);
    
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

// Effectuer la synchronisation en arrière-plan
async function doBackgroundSync() {
    try {
        // Synchroniser les données hors ligne
        const offlineData = await getOfflineData();
        
        if (offlineData.length > 0) {
            console.log('[SW] Synchronisation de', offlineData.length, 'éléments');
            
            for (const data of offlineData) {
                await syncDataToServer(data);
            }
            
            await clearOfflineData();
        }
    } catch (error) {
        console.error('[SW] Erreur lors de la synchronisation:', error);
    }
}

// Récupérer les données hors ligne
async function getOfflineData() {
    // En production, ceci récupérerait les données depuis IndexedDB
    return [];
}

// Synchroniser les données vers le serveur
async function syncDataToServer(data) {
    // En production, ceci enverrait les données vers l'API
    console.log('[SW] Sync data:', data);
}

// Nettoyer les données hors ligne
async function clearOfflineData() {
    // En production, ceci nettoierait IndexedDB
    console.log('[SW] Données hors ligne nettoyées');
}

// Gestion des notifications push
self.addEventListener('push', event => {
    console.log('[SW] Push reçu:', event);
    
    if (event.data) {
        const data = event.data.json();
        
        const options = {
            body: data.body || 'Nouvelle notification de MarchéIvoire',
            icon: '/assets/images/logo-192.png',
            badge: '/assets/images/logo-192.png',
            vibrate: [100, 50, 100],
            data: data.data || {},
            actions: [
                {
                    action: 'view',
                    title: 'Voir',
                    icon: '/assets/images/view-icon.png'
                },
                {
                    action: 'dismiss',
                    title: 'Ignorer',
                    icon: '/assets/images/dismiss-icon.png'
                }
            ]
        };
        
        event.waitUntil(
            self.registration.showNotification(
                data.title || 'MarchéIvoire',
                options
            )
        );
    }
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', event => {
    console.log('[SW] Notification cliquée:', event);
    
    event.notification.close();
    
    if (event.action === 'view') {
        event.waitUntil(
            clients.openWindow(event.notification.data.url || '/')
        );
    } else if (event.action === 'dismiss') {
        // Ne rien faire, juste fermer
    } else {
        // Clic sur la notification elle-même
        event.waitUntil(
            clients.openWindow(event.notification.data.url || '/')
        );
    }
});

// Logging des erreurs
self.addEventListener('error', event => {
    console.error('[SW] Erreur:', event.error);
});

self.addEventListener('unhandledrejection', event => {
    console.error('[SW] Promesse rejetée:', event.reason);
});

console.log('[SW] Service Worker MarchéIvoire chargé');