// assets/js/utils.js - Fonctions utilitaires MarchéIvoire

/**
 * Utilitaires généraux pour MarchéIvoire
 * Fonctions helper, formatage, validation, DOM, etc.
 */

// === FORMATAGE ===

/**
 * Formater un prix selon la configuration locale
 * @param {number} price - Prix à formater
 * @param {boolean} showCurrency - Afficher le symbole de devise
 * @returns {string} Prix formaté
 */
function formatPrice(price, showCurrency = true) {
    if (price == null || isNaN(price)) return '0 FCFA';
    
    const symbol = getConfig('ECOMMERCE.CURRENCY_SYMBOL', 'FCFA');
    const position = getConfig('ECOMMERCE.CURRENCY_POSITION', 'after');
    const thousands = getConfig('ECOMMERCE.THOUSANDS_SEPARATOR', ' ');
    const decimal = getConfig('ECOMMERCE.DECIMAL_SEPARATOR', ',');
    const places = getConfig('ECOMMERCE.DECIMAL_PLACES', 0);
    
    // Formater le nombre
    const formatted = new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: places,
        maximumFractionDigits: places,
        useGrouping: true
    }).format(price);
    
    if (!showCurrency) return formatted;
    
    // Ajouter la devise selon la position
    return position === 'before' ? `${symbol} ${formatted}` : `${formatted} ${symbol}`;
}

/**
 * Formater un nombre avec séparateurs
 * @param {number} number - Nombre à formater
 * @param {number} decimals - Nombre de décimales
 * @returns {string} Nombre formaté
 */
function formatNumber(number, decimals = 0) {
    if (number == null || isNaN(number)) return '0';
    
    return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(number);
}

/**
 * Formater une date selon la locale
 * @param {Date|string} date - Date à formater
 * @param {string} format - Format de sortie ('short', 'medium', 'long', 'full')
 * @returns {string} Date formatée
 */
function formatDate(date, format = 'medium') {
    if (!date) return '';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const options = {
        short: { year: 'numeric', month: '2-digit', day: '2-digit' },
        medium: { year: 'numeric', month: 'short', day: 'numeric' },
        long: { year: 'numeric', month: 'long', day: 'numeric' },
        full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    };
    
    return d.toLocaleDateString('fr-FR', options[format] || options.medium);
}

/**
 * Formater un temps relatif (il y a X minutes/heures/jours)
 * @param {Date|string} date - Date de référence
 * @returns {string} Temps relatif formaté
 */
function formatRelativeTime(date) {
    if (!date) return '';
    
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    
    if (years > 0) return `il y a ${years} an${years > 1 ? 's' : ''}`;
    if (months > 0) return `il y a ${months} mois`;
    if (weeks > 0) return `il y a ${weeks} semaine${weeks > 1 ? 's' : ''}`;
    if (days > 0) return `il y a ${days} jour${days > 1 ? 's' : ''}`;
    if (hours > 0) return `il y a ${hours} heure${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
    return 'à l\'instant';
}

/**
 * Formater un numéro de téléphone ivoirien
 * @param {string} phone - Numéro de téléphone
 * @returns {string} Numéro formaté
 */
function formatPhone(phone) {
    if (!phone) return '';
    
    // Nettoyer le numéro
    const cleaned = phone.replace(/\D/g, '');
    
    // Format ivoirien: +225 XX XX XX XX XX
    if (cleaned.length === 10) {
        return `+225 ${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8, 10)}`;
    }
    
    if (cleaned.length === 13 && cleaned.startsWith('225')) {
        const local = cleaned.slice(3);
        return `+225 ${local.slice(0, 2)} ${local.slice(2, 4)} ${local.slice(4, 6)} ${local.slice(6, 8)} ${local.slice(8, 10)}`;
    }
    
    return phone; // Retourner tel quel si format non reconnu
}

/**
 * Formater une taille de fichier
 * @param {number} bytes - Taille en octets
 * @param {number} decimals - Nombre de décimales
 * @returns {string} Taille formatée
 */
function formatFileSize(bytes, decimals = 2) {
    if (bytes === 0) return '0 octets';
    
    const k = 1024;
    const sizes = ['octets', 'Ko', 'Mo', 'Go', 'To'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

// === VALIDATION ===

/**
 * Valider une adresse email
 * @param {string} email - Email à valider
 * @returns {boolean} True si valide
 */
function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

/**
 * Valider un numéro de téléphone ivoirien
 * @param {string} phone - Numéro à valider
 * @returns {boolean} True si valide
 */
function isValidPhone(phone) {
    if (!phone || typeof phone !== 'string') return false;
    
    const cleaned = phone.replace(/\D/g, '');
    
    // Format ivoirien: 10 chiffres ou +225 + 10 chiffres
    if (cleaned.length === 10) {
        return /^[0-9]{2}[0-9]{8}$/.test(cleaned);
    }
    
    if (cleaned.length === 13) {
        return cleaned.startsWith('225') && /^225[0-9]{10}$/.test(cleaned);
    }
    
    return false;
}

/**
 * Valider un mot de passe
 * @param {string} password - Mot de passe à valider
 * @param {Object} options - Options de validation
 * @returns {Object} Résultat de validation
 */
function validatePassword(password, options = {}) {
    const {
        minLength = 8,
        requireUppercase = true,
        requireLowercase = true,
        requireNumbers = true,
        requireSpecialChars = false
    } = options;
    
    const errors = [];
    
    if (!password || password.length < minLength) {
        errors.push(`Le mot de passe doit contenir au moins ${minLength} caractères`);
    }
    
    if (requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('Le mot de passe doit contenir au moins une majuscule');
    }
    
    if (requireLowercase && !/[a-z]/.test(password)) {
        errors.push('Le mot de passe doit contenir au moins une minuscule');
    }
    
    if (requireNumbers && !/[0-9]/.test(password)) {
        errors.push('Le mot de passe doit contenir au moins un chiffre');
    }
    
    if (requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Le mot de passe doit contenir au moins un caractère spécial');
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors,
        strength: calculatePasswordStrength(password)
    };
}

/**
 * Calculer la force d'un mot de passe
 * @param {string} password - Mot de passe
 * @returns {string} Force du mot de passe ('weak', 'medium', 'strong', 'very-strong')
 */
function calculatePasswordStrength(password) {
    if (!password) return 'weak';
    
    let score = 0;
    
    // Longueur
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    
    // Caractères variés
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;
    
    // Patterns
    if (!/(.)\1{2,}/.test(password)) score += 1; // Pas de répétition
    if (!/123|abc|qwe|password/i.test(password)) score += 1; // Pas de patterns communs
    
    if (score >= 7) return 'very-strong';
    if (score >= 5) return 'strong';
    if (score >= 3) return 'medium';
    return 'weak';
}

/**
 * Valider un formulaire
 * @param {HTMLFormElement} form - Formulaire à valider
 * @param {Object} rules - Règles de validation
 * @returns {Object} Résultat de validation
 */
function validateForm(form, rules = {}) {
    const errors = {};
    const formData = new FormData(form);
    
    for (const [field, rule] of Object.entries(rules)) {
        const value = formData.get(field);
        const fieldErrors = [];
        
        // Requis
        if (rule.required && (!value || value.trim() === '')) {
            fieldErrors.push(`Le champ ${rule.label || field} est requis`);
            continue;
        }
        
        if (value && value.trim() !== '') {
            // Type email
            if (rule.type === 'email' && !isValidEmail(value)) {
                fieldErrors.push('Format d\'email invalide');
            }
            
            // Type téléphone
            if (rule.type === 'phone' && !isValidPhone(value)) {
                fieldErrors.push('Format de téléphone invalide');
            }
            
            // Longueur minimum
            if (rule.minLength && value.length < rule.minLength) {
                fieldErrors.push(`Minimum ${rule.minLength} caractères requis`);
            }
            
            // Longueur maximum
            if (rule.maxLength && value.length > rule.maxLength) {
                fieldErrors.push(`Maximum ${rule.maxLength} caractères autorisés`);
            }
            
            // Pattern personnalisé
            if (rule.pattern && !rule.pattern.test(value)) {
                fieldErrors.push(rule.message || 'Format invalide');
            }
            
            // Validation personnalisée
            if (rule.validator && typeof rule.validator === 'function') {
                const result = rule.validator(value);
                if (result !== true) {
                    fieldErrors.push(result || 'Valeur invalide');
                }
            }
        }
        
        if (fieldErrors.length > 0) {
            errors[field] = fieldErrors;
        }
    }
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors: errors
    };
}

// === MANIPULATION DOM ===

/**
 * Échapper les caractères HTML
 * @param {string} text - Texte à échapper
 * @returns {string} Texte échappé
 */
function escapeHtml(text) {
    if (!text) return '';
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Supprimer les balises HTML
 * @param {string} html - HTML à nettoyer
 * @returns {string} Texte sans HTML
 */
function stripHtml(html) {
    if (!html) return '';
    
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
}

/**
 * Tronquer un texte
 * @param {string} text - Texte à tronquer
 * @param {number} maxLength - Longueur maximum
 * @param {string} suffix - Suffixe à ajouter
 * @returns {string} Texte tronqué
 */
function truncateText(text, maxLength, suffix = '...') {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + suffix;
}

/**
 * Capitaliser la première lettre
 * @param {string} str - Chaîne à capitaliser
 * @returns {string} Chaîne capitalisée
 */
function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convertir en slug (URL friendly)
 * @param {string} text - Texte à convertir
 * @returns {string} Slug généré
 */
function slugify(text) {
    if (!text) return '';
    
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
        .replace(/[^a-z0-9\s-]/g, '') // Garder seulement lettres, chiffres, espaces, tirets
        .trim()
        .replace(/\s+/g, '-') // Remplacer espaces par tirets
        .replace(/-+/g, '-'); // Éviter les tirets multiples
}

/**
 * Créer un élément DOM avec attributs
 * @param {string} tagName - Nom de la balise
 * @param {Object} attributes - Attributs à définir
 * @param {string} content - Contenu textuel
 * @returns {HTMLElement} Élément créé
 */
function createElement(tagName, attributes = {}, content = '') {
    const element = document.createElement(tagName);
    
    for (const [key, value] of Object.entries(attributes)) {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'dataset') {
            for (const [dataKey, dataValue] of Object.entries(value)) {
                element.dataset[dataKey] = dataValue;
            }
        } else {
            element.setAttribute(key, value);
        }
    }
    
    if (content) {
        element.textContent = content;
    }
    
    return element;
}

/**
 * Vérifier si un élément est visible dans le viewport
 * @param {HTMLElement} element - Élément à vérifier
 * @param {number} threshold - Pourcentage de visibilité requis (0-1)
 * @returns {boolean} True si visible
 */
function isElementVisible(element, threshold = 0.1) {
    if (!element || !element.getBoundingClientRect) return false;
    
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const windowWidth = window.innerWidth || document.documentElement.clientWidth;
    
    const verticalVisible = (rect.top <= windowHeight) && ((rect.top + rect.height) >= 0);
    const horizontalVisible = (rect.left <= windowWidth) && ((rect.left + rect.width) >= 0);
    
    if (!verticalVisible || !horizontalVisible) return false;
    
    // Vérifier le seuil de visibilité
    const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
    const visibleWidth = Math.min(rect.right, windowWidth) - Math.max(rect.left, 0);
    const visibleArea = visibleHeight * visibleWidth;
    const totalArea = rect.height * rect.width;
    
    return (visibleArea / totalArea) >= threshold;
}

/**
 * Faire défiler vers un élément
 * @param {HTMLElement|string} target - Élément cible ou sélecteur
 * @param {Object} options - Options de défilement
 */
function scrollToElement(target, options = {}) {
    const element = typeof target === 'string' ? document.querySelector(target) : target;
    if (!element) return;
    
    const {
        behavior = 'smooth',
        block = 'start',
        inline = 'nearest',
        offset = 0
    } = options;
    
    if (offset !== 0) {
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        const targetPosition = elementPosition - offset;
        
        window.scrollTo({
            top: targetPosition,
            behavior: behavior
        });
    } else {
        element.scrollIntoView({
            behavior: behavior,
            block: block,
            inline: inline
        });
    }
}

// === UTILITAIRES ASYNC ===

/**
 * Fonction debounce - Retarder l'exécution
 * @param {Function} func - Fonction à debouncer
 * @param {number} wait - Délai d'attente en ms
 * @param {boolean} immediate - Exécuter immédiatement
 * @returns {Function} Fonction debouncée
 */
function debounce(func, wait, immediate = false) {
    let timeout;
    
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        
        const callNow = immediate && !timeout;
        
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        
        if (callNow) func(...args);
    };
}

/**
 * Fonction throttle - Limiter la fréquence d'exécution
 * @param {Function} func - Fonction à throttler
 * @param {number} limit - Limite de temps en ms
 * @returns {Function} Fonction throttlée
 */
function throttle(func, limit) {
    let inThrottle;
    
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Créer une Promise avec délai
 * @param {number} ms - Délai en millisecondes
 * @returns {Promise} Promise qui se résout après le délai
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry une fonction avec backoff exponentiel
 * @param {Function} fn - Fonction à réessayer
 * @param {Object} options - Options de retry
 * @returns {Promise} Promise du résultat
 */
async function retry(fn, options = {}) {
    const {
        retries = 3,
        delay: initialDelay = 1000,
        backoff = 2,
        onRetry = null
    } = options;
    
    let lastError;
    
    for (let i = 0; i <= retries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            if (i === retries) break;
            
            const delayMs = initialDelay * Math.pow(backoff, i);
            
            if (onRetry) {
                onRetry(error, i + 1, delayMs);
            }
            
            await delay(delayMs);
        }
    }
    
    throw lastError;
}

// === STOCKAGE LOCAL ===

/**
 * Sauvegarder dans localStorage avec gestion d'erreur
 * @param {string} key - Clé de stockage
 * @param {*} value - Valeur à sauvegarder
 * @param {number} ttl - Durée de vie en ms (optionnel)
 * @returns {boolean} Success
 */
function saveToStorage(key, value, ttl = null) {
    try {
        const item = {
            value: value,
            timestamp: Date.now(),
            ttl: ttl
        };
        
        localStorage.setItem(key, JSON.stringify(item));
        return true;
    } catch (error) {
        console.warn('Erreur sauvegarde localStorage:', error);
        return false;
    }
}

/**
 * Lire depuis localStorage avec vérification TTL
 * @param {string} key - Clé de stockage
 * @param {*} defaultValue - Valeur par défaut
 * @returns {*} Valeur lue ou valeur par défaut
 */
function loadFromStorage(key, defaultValue = null) {
    try {
        const stored = localStorage.getItem(key);
        if (!stored) return defaultValue;
        
        const item = JSON.parse(stored);
        
        // Vérifier TTL si défini
        if (item.ttl && (Date.now() - item.timestamp) > item.ttl) {
            localStorage.removeItem(key);
            return defaultValue;
        }
        
        return item.value;
    } catch (error) {
        console.warn('Erreur lecture localStorage:', error);
        return defaultValue;
    }
}

/**
 * Supprimer du localStorage
 * @param {string} key - Clé à supprimer
 */
function removeFromStorage(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.warn('Erreur suppression localStorage:', error);
    }
}

/**
 * Nettoyer les éléments expirés du localStorage
 */
function cleanExpiredStorage() {
    try {
        const keys = Object.keys(localStorage);
        
        for (const key of keys) {
            const stored = localStorage.getItem(key);
            if (!stored) continue;
            
            try {
                const item = JSON.parse(stored);
                if (item.ttl && (Date.now() - item.timestamp) > item.ttl) {
                    localStorage.removeItem(key);
                }
            } catch (e) {
                // Ignorer les items qui ne sont pas dans notre format
            }
        }
    } catch (error) {
        console.warn('Erreur nettoyage localStorage:', error);
    }
}

// === UTILITAIRES RÉSEAU ===

/**
 * Effectuer une requête HTTP avec timeout et retry
 * @param {string} url - URL de la requête
 * @param {Object} options - Options de la requête
 * @returns {Promise} Promise de la réponse
 */
async function fetchWithTimeout(url, options = {}) {
    const {
        timeout = getConfig('API.TIMEOUT', 30000),
        retries = getConfig('API.RETRY_ATTEMPTS', 3),
        ...fetchOptions
    } = options;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await retry(async () => {
            const res = await fetch(url, {
                ...fetchOptions,
                signal: controller.signal
            });
            
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            
            return res;
        }, { retries });
        
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

/**
 * Vérifier la connectivité réseau
 * @returns {boolean} True si en ligne
 */
function isOnline() {
    return navigator.onLine;
}

/**
 * Attendre la reconnexion réseau
 * @param {number} timeout - Timeout en ms
 * @returns {Promise<boolean>} True si reconnecté
 */
function waitForOnline(timeout = 30000) {
    return new Promise((resolve) => {
        if (navigator.onLine) {
            resolve(true);
            return;
        }
        
        const timeoutId = setTimeout(() => {
            window.removeEventListener('online', onlineHandler);
            resolve(false);
        }, timeout);
        
        const onlineHandler = () => {
            clearTimeout(timeoutId);
            window.removeEventListener('online', onlineHandler);
            resolve(true);
        };
        
        window.addEventListener('online', onlineHandler);
    });
}

// === UTILITAIRES MATH ===

/**
 * Générer un nombre aléatoire entre min et max
 * @param {number} min - Valeur minimum
 * @param {number} max - Valeur maximum
 * @returns {number} Nombre aléatoire
 */
function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Arrondir à N décimales
 * @param {number} number - Nombre à arrondir
 * @param {number} decimals - Nombre de décimales
 * @returns {number} Nombre arrondi
 */
function roundToDecimals(number, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.round(number * factor) / factor;
}

/**
 * Calculer un pourcentage
 * @param {number} value - Valeur
 * @param {number} total - Total
 * @returns {number} Pourcentage
 */
function percentage(value, total) {
    if (total === 0) return 0;
    return roundToDecimals((value / total) * 100, 2);
}

/**
 * Calculer une réduction
 * @param {number} originalPrice - Prix original
 * @param {number} salePrice - Prix en promotion
 * @returns {number} Pourcentage de réduction
 */
function calculateDiscount(originalPrice, salePrice) {
    if (originalPrice <= salePrice) return 0;
    return percentage(originalPrice - salePrice, originalPrice);
}

// === DÉTECTION DEVICE ===

/**
 * Détecter si sur mobile
 * @returns {boolean} True si mobile
 */
function isMobile() {
    return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Détecter si sur tablette
 * @returns {boolean} True si tablette
 */
function isTablet() {
    return window.innerWidth > 768 && window.innerWidth <= 1024;
}

/**
 * Détecter si sur desktop
 * @returns {boolean} True si desktop
 */
function isDesktop() {
    return window.innerWidth > 1024;
}

/**
 * Détecter si tactile
 * @returns {boolean} True si tactile
 */
function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Obtenir les informations du device
 * @returns {Object} Informations du device
 */
function getDeviceInfo() {
    return {
        isMobile: isMobile(),
        isTablet: isTablet(),
        isDesktop: isDesktop(),
        isTouch: isTouchDevice(),
        isOnline: isOnline(),
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight
    };
}

// === NOTIFICATIONS ===

/**
 * Afficher une notification toast
 * @param {string} message - Message à afficher
 * @param {string} type - Type de notification ('success', 'error', 'warning', 'info')
 * @param {number} duration - Durée d'affichage en ms
 */
function showNotification(message, type = 'info', duration = null) {
    // Supprimer les notifications existantes du même type
    const existing = document.querySelectorAll(`.notification.${type}`);
    existing.forEach(notif => notif.remove());
    
    // Créer la notification
    const notification = createElement('div', {
        className: `notification ${type}`,
        'aria-live': 'polite',
        'role': 'alert'
    });
    
    // Ajouter l'icône selon le type
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    notification.innerHTML = `
        <span class="notification-icon">${icons[type] || 'ℹ️'}</span>
        <span class="notification-message">${escapeHtml(message)}</span>
        <button class="notification-close" aria-label="Fermer">×</button>
    `;
    
    // Ajouter au DOM
    document.body.appendChild(notification);
    
    // Gestionnaire de fermeture
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        hideNotification(notification);
    });
    
    // Afficher avec animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Masquer automatiquement
    const autoDuration = duration || getConfig(`NOTIFICATIONS.${type.toUpperCase()}_DURATION`, 3000);
    setTimeout(() => {
        hideNotification(notification);
    }, autoDuration);
    
    return notification;
}

/**
 * Masquer une notification
 * @param {HTMLElement} notification - Élément notification
 */
function hideNotification(notification) {
    if (!notification || !notification.parentNode) return;
    
    notification.classList.remove('show');
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300);
}

// === COOKIES ===

/**
 * Définir un cookie
 * @param {string} name - Nom du cookie
 * @param {string} value - Valeur du cookie
 * @param {number} days - Durée de vie en jours
 */
function setCookie(name, value, days = 30) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

/**
 * Lire un cookie
 * @param {string} name - Nom du cookie
 * @returns {string|null} Valeur du cookie ou null
 */
function getCookie(name) {
    const nameEQ = name + "=";
    const cookies = document.cookie.split(';');
    
    for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.indexOf(nameEQ) === 0) {
            return cookie.substring(nameEQ.length);
        }
    }
    
    return null;
}

/**
 * Supprimer un cookie
 * @param {string} name - Nom du cookie
 */
function deleteCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
}

// === ANALYTICS HELPERS ===

/**
 * Tracker un événement (abstraction pour différents providers)
 * @param {string} event - Nom de l'événement
 * @param {Object} parameters - Paramètres de l'événement
 */
function trackEvent(event, parameters = {}) {
    if (!getConfig('SEO.TRACK_EVENTS', true)) return;
    
    try {
        // Google Analytics 4
        if (typeof gtag === 'function') {
            gtag('event', event, parameters);
        }
        
        // Facebook Pixel
        if (typeof fbq === 'function') {
            fbq('trackCustom', event, parameters);
        }
        
        // Console log en mode debug
        if (isDebugMode()) {
            console.log('Analytics Event:', event, parameters);
        }
    } catch (error) {
        debugLog('Erreur tracking event:', error);
    }
}

/**
 * Tracker une page vue
 * @param {string} page - URL de la page
 * @param {string} title - Titre de la page
 */
function trackPageView(page, title) {
    if (!getConfig('SEO.TRACK_PAGE_VIEWS', true)) return;
    
    try {
        // Google Analytics 4
        if (typeof gtag === 'function') {
            gtag('config', getConfig('SEO.GOOGLE_ANALYTICS_ID'), {
                page_title: title,
                page_location: page
            });
        }
        
        // Facebook Pixel
        if (typeof fbq === 'function') {
            fbq('track', 'PageView');
        }
    } catch (error) {
        debugLog('Erreur tracking page view:', error);
    }
}

// === INITIALISATION ===

// Nettoyer le localStorage au chargement
document.addEventListener('DOMContentLoaded', () => {
    cleanExpiredStorage();
});

// Écouter les changements de connectivité
window.addEventListener('online', () => {
    showNotification('Connexion rétablie', 'success');
});

window.addEventListener('offline', () => {
    showNotification('Connexion perdue - Mode hors ligne', 'warning');
});

// Export pour les modules ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        // Formatage
        formatPrice,
        formatNumber,
        formatDate,
        formatRelativeTime,
        formatPhone,
        formatFileSize,
        
        // Validation
        isValidEmail,
        isValidPhone,
        validatePassword,
        calculatePasswordStrength,
        validateForm,
        
        // DOM
        escapeHtml,
        stripHtml,
        truncateText,
        capitalize,
        slugify,
        createElement,
        isElementVisible,
        scrollToElement,
        
        // Async
        debounce,
        throttle,
        delay,
        retry,
        
        // Stockage
        saveToStorage,
        loadFromStorage,
        removeFromStorage,
        cleanExpiredStorage,
        
        // Réseau
        fetchWithTimeout,
        isOnline,
        waitForOnline,
        
        // Math
        randomBetween,
        roundToDecimals,
        percentage,
        calculateDiscount,
        
        // Device
        isMobile,
        isTablet,
        isDesktop,
        isTouchDevice,
        getDeviceInfo,
        
        // UI
        showNotification,
        hideNotification,
        
        // Cookies
        setCookie,
        getCookie,
        deleteCookie,
        
        // Analytics
        trackEvent,
        trackPageView
    };
}