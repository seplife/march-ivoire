// assets/js/config.js - Configuration MarchéIvoire

/**
 * Configuration principale de l'application MarchéIvoire
 * ⚠️ IMPORTANT: Changez ces valeurs pour votre environnement de production
 */

const CONFIG = {
    // === INFORMATIONS GÉNÉRALES ===
    APP: {
        NAME: 'MarchéIvoire',
        VERSION: '1.0.0',
        ENVIRONMENT: 'production', // 'development', 'staging', 'production'
        DEBUG: false, // Activer pour voir les logs de débogage
        MAINTENANCE_MODE: false
    },

    // === URLs ET DOMAINES ===
    API: {
        BASE_URL: window.location.origin + '/admin/api.php',
        TIMEOUT: 30000, // 30 secondes
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000 // 1 seconde
    },

    // === CONFIGURATION CINETPAY ===
    CINETPAY: {
        // 🔥 REMPLACEZ CES VALEURS PAR VOS VRAIES CLÉS CINETPAY
        API_KEY: 'votre_api_key_cinetpay_ici', 
        SITE_ID: 'votre_site_id_cinetpay_ici',
        MODE: 'PRODUCTION', // 'TEST' ou 'PRODUCTION'
        
        // URLs de retour
        RETURN_URL: window.location.origin + '/order-confirmation.html',
        CANCEL_URL: window.location.origin + '/checkout.html',
        NOTIFY_URL: window.location.origin + '/admin/webhook.php',
        
        // Configuration des méthodes de paiement
        PAYMENT_METHODS: {
            ORANGE_MONEY: {
                code: 'ORANGE_MONEY_CI',
                name: 'Orange Money',
                icon: '🟠',
                enabled: true
            },
            MTN_MONEY: {
                code: 'MTN_MONEY_CI',
                name: 'MTN Money', 
                icon: '🟡',
                enabled: true
            },
            MOOV_MONEY: {
                code: 'MOOV_MONEY_CI',
                name: 'Moov Money',
                icon: '🔵', 
                enabled: true
            },
            WAVE: {
                code: 'WAVE_CI',
                name: 'Wave',
                icon: '🌊',
                enabled: true
            }
        },
        
        // Paramètres de paiement
        CURRENCY: 'XOF',
        LANG: 'fr',
        CHANNELS: 'MOBILE_MONEY',
        
        // URLs de l'API CinetPay
        CHECKOUT_URL: 'https://api-checkout.cinetpay.com/v2/payment',
        VERIFY_URL: 'https://api-checkout.cinetpay.com/v2/payment/check'
    },

    // === PARAMÈTRES E-COMMERCE ===
    ECOMMERCE: {
        // Devise et formatage
        CURRENCY: 'XOF',
        CURRENCY_SYMBOL: 'FCFA',
        CURRENCY_POSITION: 'after', // 'before' ou 'after'
        DECIMAL_PLACES: 0,
        THOUSANDS_SEPARATOR: ' ',
        DECIMAL_SEPARATOR: ',',
        
        // Livraison
        DEFAULT_SHIPPING_COST: 2000,
        FREE_SHIPPING_THRESHOLD: 50000,
        
        // Taxes
        TAX_RATE: 0.18, // 18% (si applicable)
        PRICE_INCLUDES_TAX: true,
        
        // Panier
        CART_SESSION_TIMEOUT: 3600000, // 1 heure en ms
        MAX_QUANTITY_PER_ITEM: 99,
        MIN_ORDER_AMOUNT: 500,
        MAX_ORDER_AMOUNT: 1000000,
        
        // Produits
        PRODUCTS_PER_PAGE: 12,
        MAX_PRODUCTS_PER_PAGE: 50,
        ENABLE_PRODUCT_REVIEWS: true,
        ENABLE_PRODUCT_RATINGS: true,
        
        // Images
        IMAGE_QUALITY: 85,
        LAZY_LOADING: true,
        WEBP_SUPPORT: true,
        PLACEHOLDER_IMAGE: '/assets/images/placeholder-product.png'
    },

    // === ZONES DE LIVRAISON ===
    SHIPPING_ZONES: [
        {
            name: 'Abidjan',
            cities: ['Abidjan'],
            cost: 2000,
            delivery_time: '1-2 jours',
            description: 'Livraison rapide dans le Grand Abidjan'
        },
        {
            name: 'Grandes villes',
            cities: ['Bouaké', 'Yamoussoukro', 'Daloa', 'Korhogo', 'San-Pédro', 'Man'],
            cost: 3000,
            delivery_time: '2-3 jours',
            description: 'Livraison dans les principales villes'
        },
        {
            name: 'Autres villes',
            cities: ['Autres'],
            cost: 5000,
            delivery_time: '3-5 jours',
            description: 'Livraison dans toute la Côte d\'Ivoire'
        }
    ],

    // === CONTACT ET SUPPORT ===
    CONTACT: {
        EMAIL: 'contact@marcheiivoire.com',
        SUPPORT_EMAIL: 'support@marcheiivoire.com',
        PHONE: '+225 27 22 XX XX XX',
        WHATSAPP: '+225 01 02 03 04 05',
        
        // Réseaux sociaux
        SOCIAL_MEDIA: {
            FACEBOOK: 'https://facebook.com/marcheiivoire',
            INSTAGRAM: 'https://instagram.com/marcheiivoire',
            TWITTER: 'https://twitter.com/marcheiivoire',
            LINKEDIN: 'https://linkedin.com/company/marcheiivoire'
        },
        
        // Heures d'ouverture
        BUSINESS_HOURS: {
            MONDAY: '08:00-18:00',
            TUESDAY: '08:00-18:00',
            WEDNESDAY: '08:00-18:00',
            THURSDAY: '08:00-18:00',
            FRIDAY: '08:00-18:00',
            SATURDAY: '09:00-16:00',
            SUNDAY: 'Fermé'
        }
    },

    // === SEO ET ANALYTICS ===
    SEO: {
        SITE_NAME: 'MarchéIvoire',
        SITE_DESCRIPTION: 'Marketplace ivoirienne - Achetez des produits locaux avec Mobile Money',
        DEFAULT_IMAGE: '/assets/images/logo-512.png',
        TWITTER_HANDLE: '@marcheiivoire',
        
        // Analytics
        GOOGLE_ANALYTICS_ID: 'G-XXXXXXXXXX', // Remplacez par votre ID
        GOOGLE_TAG_MANAGER_ID: 'GTM-XXXXXXX', // Remplacez par votre ID
        FACEBOOK_PIXEL_ID: '123456789012345', // Remplacez par votre ID
        
        // Tracking des événements
        TRACK_EVENTS: true,
        TRACK_PURCHASES: true,
        TRACK_PAGE_VIEWS: true
    },

    // === NOTIFICATIONS ===
    NOTIFICATIONS: {
        // Durée d'affichage des notifications (en ms)
        SUCCESS_DURATION: 3000,
        ERROR_DURATION: 5000,
        WARNING_DURATION: 4000,
        INFO_DURATION: 3000,
        
        // Sons de notification
        ENABLE_SOUNDS: false,
        
        // Notifications push (PWA)
        PUSH_NOTIFICATIONS: {
            ENABLED: false,
            VAPID_PUBLIC_KEY: 'votre_vapid_public_key'
        }
    },

    // === SÉCURITÉ ===
    SECURITY: {
        // Protection CSRF
        CSRF_TOKEN_NAME: '_token',
        
        // Validation
        MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
        ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
        
        // Rate limiting côté client
        MAX_REQUESTS_PER_MINUTE: 60,
        
        // Sessions
        SESSION_TIMEOUT: 3600000 // 1 heure
    },

    // === PERFORMANCE ===
    PERFORMANCE: {
        // Cache
        ENABLE_CACHE: true,
        CACHE_DURATION: 300000, // 5 minutes
        
        // Lazy loading
        LAZY_LOADING_OFFSET: 100, // pixels
        
        // Debounce delays
        SEARCH_DEBOUNCE: 300, // ms
        SCROLL_DEBOUNCE: 100, // ms
        RESIZE_DEBOUNCE: 250, // ms
        
        // Images
        PROGRESSIVE_LOADING: true,
        BLUR_PLACEHOLDER: true
    },

    // === EXPÉRIENCE UTILISATEUR ===
    UX: {
        // Animations
        ENABLE_ANIMATIONS: true,
        ANIMATION_DURATION: 300, // ms
        
        // Préférences utilisateur
        REMEMBER_PREFERENCES: true,
        
        // Accessibilité
        HIGH_CONTRAST_MODE: false,
        REDUCE_MOTION: false,
        
        // Mobile
        SWIPE_GESTURES: true,
        HAPTIC_FEEDBACK: true
    },

    // === INTERNATIONALISATION ===
    I18N: {
        DEFAULT_LANGUAGE: 'fr',
        AVAILABLE_LANGUAGES: ['fr', 'en'],
        FALLBACK_LANGUAGE: 'fr',
        
        // Format de date et heure
        DATE_FORMAT: 'DD/MM/YYYY',
        TIME_FORMAT: 'HH:mm',
        TIMEZONE: 'Africa/Abidjan',
        
        // Textes par défaut
        MESSAGES: {
            FR: {
                LOADING: 'Chargement...',
                ERROR: 'Une erreur s\'est produite',
                SUCCESS: 'Opération réussie',
                CONFIRM: 'Êtes-vous sûr ?',
                CANCEL: 'Annuler',
                OK: 'OK',
                ADD_TO_CART: 'Ajouter au panier',
                VIEW_CART: 'Voir le panier',
                CHECKOUT: 'Commander',
                OUT_OF_STOCK: 'Rupture de stock',
                FREE_SHIPPING: 'Livraison gratuite'
            },
            EN: {
                LOADING: 'Loading...',
                ERROR: 'An error occurred',
                SUCCESS: 'Operation successful',
                CONFIRM: 'Are you sure?',
                CANCEL: 'Cancel',
                OK: 'OK',
                ADD_TO_CART: 'Add to cart',
                VIEW_CART: 'View cart',
                CHECKOUT: 'Checkout',
                OUT_OF_STOCK: 'Out of stock',
                FREE_SHIPPING: 'Free shipping'
            }
        }
    },

    // === FEATURES FLAGS ===
    FEATURES: {
        ENABLE_REVIEWS: true,
        ENABLE_WISHLIST: true,
        ENABLE_COMPARISON: true,
        ENABLE_QUICK_VIEW: true,
        ENABLE_ZOOM: true,
        ENABLE_SHARE: true,
        ENABLE_GUEST_CHECKOUT: true,
        ENABLE_NEWSLETTER: true,
        ENABLE_LIVE_CHAT: false,
        ENABLE_SEARCH_SUGGESTIONS: true,
        ENABLE_PRODUCT_RECOMMENDATIONS: true,
        ENABLE_RECENTLY_VIEWED: true
    },

    // === URLS IMPORTANTES ===
    URLS: {
        TERMS: '/terms.html',
        PRIVACY: '/privacy.html',
        RETURNS: '/returns.html',
        SHIPPING: '/shipping.html',
        FAQ: '/faq.html',
        ABOUT: '/about.html',
        CONTACT: '/contact.html'
    }
};

// === FONCTIONS UTILITAIRES DE CONFIGURATION ===

/**
 * Obtenir une valeur de configuration avec un chemin
 * @param {string} path - Chemin vers la valeur (ex: 'CINETPAY.API_KEY')
 * @param {*} defaultValue - Valeur par défaut si non trouvée
 * @returns {*} La valeur de configuration
 */
function getConfig(path, defaultValue = null) {
    try {
        const keys = path.split('.');
        let value = CONFIG;
        
        for (const key of keys) {
            value = value[key];
            if (value === undefined) {
                return defaultValue;
            }
        }
        
        return value;
    } catch (error) {
        console.warn('Erreur lors de la récupération de la config:', path, error);
        return defaultValue;
    }
}

/**
 * Vérifier si une fonctionnalité est activée
 * @param {string} feature - Nom de la fonctionnalité
 * @returns {boolean}
 */
function isFeatureEnabled(feature) {
    return getConfig(`FEATURES.${feature}`, false);
}

/**
 * Obtenir le texte localisé
 * @param {string} key - Clé du message
 * @param {string} lang - Langue (optionnel)
 * @returns {string}
 */
function getMessage(key, lang = null) {
    const currentLang = lang || getConfig('I18N.DEFAULT_LANGUAGE', 'fr');
    const langKey = currentLang.toUpperCase();
    return getConfig(`I18N.MESSAGES.${langKey}.${key}`, key);
}

/**
 * Formater un prix selon la configuration
 * @param {number} price - Prix à formater
 * @returns {string}
 */
function formatPrice(price) {
    const symbol = getConfig('ECOMMERCE.CURRENCY_SYMBOL', 'FCFA');
    const position = getConfig('ECOMMERCE.CURRENCY_POSITION', 'after');
    const thousands = getConfig('ECOMMERCE.THOUSANDS_SEPARATOR', ' ');
    const decimal = getConfig('ECOMMERCE.DECIMAL_SEPARATOR', ',');
    const places = getConfig('ECOMMERCE.DECIMAL_PLACES', 0);
    
    // Formater le nombre
    const formatted = new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: places,
        maximumFractionDigits: places
    }).format(price);
    
    // Ajouter la devise
    return position === 'before' ? `${symbol} ${formatted}` : `${formatted} ${symbol}`;
}

/**
 * Calculer les frais de livraison
 * @param {string} city - Ville de livraison
 * @param {number} subtotal - Sous-total de la commande
 * @returns {number}
 */
function calculateShippingCost(city, subtotal = 0) {
    // Livraison gratuite si seuil atteint
    const freeThreshold = getConfig('ECOMMERCE.FREE_SHIPPING_THRESHOLD', 50000);
    if (subtotal >= freeThreshold) {
        return 0;
    }
    
    // Chercher la zone correspondante
    const zones = getConfig('SHIPPING_ZONES', []);
    for (const zone of zones) {
        if (zone.cities.includes(city) || zone.cities.includes('Autres')) {
            return zone.cost;
        }
    }
    
    // Coût par défaut
    return getConfig('ECOMMERCE.DEFAULT_SHIPPING_COST', 2000);
}

/**
 * Vérifier si l'environnement est en développement
 * @returns {boolean}
 */
function isDevelopment() {
    return getConfig('APP.ENVIRONMENT') === 'development';
}

/**
 * Vérifier si le mode debug est activé
 * @returns {boolean}
 */
function isDebugMode() {
    return getConfig('APP.DEBUG', false);
}

/**
 * Logger avec vérification du mode debug
 * @param {...any} args - Arguments à logger
 */
function debugLog(...args) {
    if (isDebugMode()) {
        console.log('[DEBUG]', ...args);
    }
}

// === VALIDATION DE LA CONFIGURATION ===

/**
 * Valider la configuration au chargement
 */
function validateConfig() {
    const warnings = [];
    
    // Vérifier les clés CinetPay
    if (getConfig('CINETPAY.API_KEY') === 'votre_api_key_cinetpay_ici') {
        warnings.push('⚠️ Clé API CinetPay non configurée');
    }
    
    if (getConfig('CINETPAY.SITE_ID') === 'votre_site_id_cinetpay_ici') {
        warnings.push('⚠️ Site ID CinetPay non configuré');
    }
    
    // Vérifier les URLs
    const baseUrl = getConfig('API.BASE_URL');
    if (!baseUrl || baseUrl.includes('localhost')) {
        warnings.push('⚠️ URL de base API non configurée pour la production');
    }
    
    // Afficher les avertissements
    if (warnings.length > 0 && (isDevelopment() || isDebugMode())) {
        console.warn('Avertissements de configuration:');
        warnings.forEach(warning => console.warn(warning));
    }
}

// === INITIALISATION ===

// Valider la configuration au chargement
document.addEventListener('DOMContentLoaded', validateConfig);

// Exposer la configuration globalement si en mode debug
if (isDebugMode()) {
    window.MARCHE_IVOIRE_CONFIG = CONFIG;
    window.getConfig = getConfig;
    window.isFeatureEnabled = isFeatureEnabled;
    window.formatPrice = formatPrice;
    console.log('🛒 MarchéIvoire Config loaded:', CONFIG);
}

// Export pour les modules ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CONFIG,
        getConfig,
        isFeatureEnabled,
        getMessage,
        formatPrice,
        calculateShippingCost,
        isDevelopment,
        isDebugMode,
        debugLog
    };
}