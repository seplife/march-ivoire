// assets/js/products.js - Gestion des produits MarchéIvoire

/**
 * Gestionnaire des produits - Chargement, affichage, filtrage, recherche
 */
class ProductManager {
    constructor() {
        this.products = [];
        this.categories = [];
        this.filteredProducts = [];
        this.currentPage = 1;
        this.productsPerPage = getConfig('ECOMMERCE.PRODUCTS_PER_PAGE', 12);
        this.isLoading = false;
        this.searchQuery = '';
        this.selectedCategory = '';
        this.selectedPriceRange = '';
        this.sortBy = 'newest';
        this.viewMode = 'grid';
        
        // Cache pour les performances
        this.cache = new Map();
        this.cacheExpiry = getConfig('PERFORMANCE.CACHE_DURATION', 300000); // 5 minutes
        
        this.init();
    }
    
    async init() {
        try {
            await this.loadProducts();
            this.setupEventListeners();
            this.setupIntersectionObserver();
            debugLog('ProductManager initialisé avec succès');
        } catch (error) {
            console.error('Erreur lors de l\'initialisation ProductManager:', error);
            this.showError('Erreur lors du chargement des produits');
        }
    }
    
    // === CHARGEMENT DES DONNÉES ===
    
    async loadProducts() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoading();
        
        try {
            // Vérifier le cache d'abord
            const cachedData = this.getCachedData('products');
            if (cachedData) {
                this.setProductsData(cachedData);
                this.hideLoading();
                return;
            }
            
            const response = await this.fetchWithRetry('/admin/api.php?action=products');
            const data = await response.json();
            
            if (data.products) {
                this.setProductsData(data);
                this.setCachedData('products', data);
                debugLog('Produits chargés depuis l\'API:', data.products.length);
            } else {
                throw new Error('Format de données invalide');
            }
        } catch (error) {
            console.error('Erreur lors du chargement des produits:', error);
            // Fallback vers les données locales si disponibles
            await this.loadFallbackData();
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }
    
    async loadFallbackData() {
        try {
            // Utiliser les données de products.json en fallback
            const response = await fetch('/data/products.json');
            const data = await response.json();
            this.setProductsData(data);
            this.showNotification('Chargement en mode hors ligne', 'info');
        } catch (error) {
            this.generateSampleProducts();
            this.showNotification('Données d\'exemple chargées', 'warning');
        }
    }
    
    setProductsData(data) {
        this.products = data.products || [];
        this.categories = data.categories || [];
        this.filteredProducts = [...this.products];
        
        this.renderProducts();
        this.renderCategories();
        this.populateFilters();
        this.updateProductCount();
    }
    
    // === AFFICHAGE DES PRODUITS ===
    
    renderProducts(reset = false) {
        const container = document.getElementById('productsGrid');
        if (!container) return;
        
        if (reset) {
            container.innerHTML = '';
            this.currentPage = 1;
        }
        
        // Calculer les produits à afficher
        const startIndex = (this.currentPage - 1) * this.productsPerPage;
        const endIndex = startIndex + this.productsPerPage;
        const productsToShow = this.filteredProducts.slice(startIndex, endIndex);
        
        // Appliquer le mode d'affichage
        container.className = `products-grid ${this.viewMode}-view`;
        
        // Afficher les produits
        if (reset) {
            container.innerHTML = '';
        }
        
        if (productsToShow.length === 0 && reset) {
            this.showNoResults();
            return;
        }
        
        const fragment = document.createDocumentFragment();
        productsToShow.forEach(product => {
            const productElement = this.createProductElement(product);
            fragment.appendChild(productElement);
        });
        
        container.appendChild(fragment);
        
        // Mettre à jour le bouton "Charger plus"
        this.updateLoadMoreButton();
        
        // Analytics
        this.trackProductsViewed(productsToShow);
    }
    
    createProductElement(product) {
        const productDiv = document.createElement('div');
        productDiv.className = 'product-card';
        productDiv.setAttribute('data-product-id', product.id);
        productDiv.setAttribute('data-category', product.category);
        productDiv.setAttribute('data-price', product.price);
        
        // Calculer le pourcentage de réduction
        const discountPercentage = product.originalPrice && product.originalPrice > product.price
            ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
            : 0;
        
        productDiv.innerHTML = `
            <div class="product-image-container">
                <img 
                    src="${this.getPlaceholderImage()}" 
                    data-src="${product.image || product.thumbnail}" 
                    alt="${this.escapeHtml(product.title)}" 
                    class="product-image lazy-load"
                    loading="lazy"
                    onerror="this.src='${this.getPlaceholderImage()}'"
                >
                ${this.renderProductBadges(product, discountPercentage)}
                ${this.renderProductActions(product)}
            </div>
            <div class="product-info">
                <div class="product-category">${this.escapeHtml(product.category)}</div>
                <h3 class="product-title">${this.escapeHtml(product.title)}</h3>
                <p class="product-description">${this.escapeHtml(this.truncateText(product.description, 100))}</p>
                ${this.renderProductRating(product)}
                ${this.renderProductPrice(product)}
                ${this.renderProductButtons(product)}
            </div>
        `;
        
        this.setupProductEventListeners(productDiv, product);
        
        return productDiv;
    }
    
    renderProductBadges(product, discountPercentage) {
        let badges = '';
        
        if (discountPercentage > 0) {
            badges += `<span class="product-badge sale">-${discountPercentage}%</span>`;
        }
        
        if (product.badge) {
            const badgeText = this.getBadgeText(product.badge);
            badges += `<span class="product-badge ${product.badge}">${badgeText}</span>`;
        }
        
        if (!product.inStock) {
            badges += `<span class="product-badge out-of-stock">Rupture</span>`;
        }
        
        return badges;
    }
    
    renderProductActions(product) {
        return `
            <div class="product-actions-overlay">
                <button class="action-btn quick-view-btn" data-action="quick-view" title="Aperçu rapide">
                    👁️
                </button>
                ${isFeatureEnabled('ENABLE_WISHLIST') ? `
                    <button class="action-btn wishlist-btn" data-action="wishlist" title="Ajouter aux favoris">
                        🤍
                    </button>
                ` : ''}
                ${isFeatureEnabled('ENABLE_COMPARISON') ? `
                    <button class="action-btn compare-btn" data-action="compare" title="Comparer">
                        ⚖️
                    </button>
                ` : ''}
                ${isFeatureEnabled('ENABLE_SHARE') ? `
                    <button class="action-btn share-btn" data-action="share" title="Partager">
                        📤
                    </button>
                ` : ''}
            </div>
        `;
    }
    
    renderProductRating(product) {
        if (!isFeatureEnabled('ENABLE_REVIEWS') || !product.rating) {
            return '';
        }
        
        const rating = Math.max(0, Math.min(5, product.rating));
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        let starsHtml = '⭐'.repeat(fullStars);
        if (hasHalfStar) starsHtml += '⭐'; // Simplification, en production utiliser une demi-étoile
        starsHtml += '☆'.repeat(emptyStars);
        
        return `
            <div class="product-rating">
                <span class="stars">${starsHtml}</span>
                <span class="rating-count">(${product.reviews || 0})</span>
            </div>
        `;
    }
    
    renderProductPrice(product) {
        let priceHtml = `<div class="product-price">
            <span class="price-current">${formatPrice(product.price)}</span>`;
        
        if (product.originalPrice && product.originalPrice > product.price) {
            priceHtml += `<span class="price-original">${formatPrice(product.originalPrice)}</span>`;
        }
        
        priceHtml += `</div>`;
        
        return priceHtml;
    }
    
    renderProductButtons(product) {
        const inCart = isInCart(product.id);
        const quantity = getProductQuantityInCart(product.id);
        
        return `
            <div class="product-buttons">
                ${product.inStock ? `
                    <button class="btn btn-primary add-to-cart-btn ${inCart ? 'in-cart' : ''}" 
                            data-product-id="${product.id}">
                        ${inCart ? `En panier (${quantity})` : '🛒 Ajouter'}
                    </button>
                ` : `
                    <button class="btn btn-disabled" disabled>
                        Rupture de stock
                    </button>
                `}
                <button class="btn btn-outline quick-view-btn" data-product-id="${product.id}">
                    👁️ Aperçu
                </button>
            </div>
        `;
    }
    
    // === CATÉGORIES ===
    
    renderCategories() {
        const container = document.getElementById('categoriesGrid');
        if (!container || !this.categories.length) return;
        
        container.innerHTML = '';
        
        this.categories.forEach(category => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'category-card';
            categoryDiv.innerHTML = `
                <div class="category-icon">${category.icon || '📦'}</div>
                <h3>${this.escapeHtml(category.name)}</h3>
                <p>${category.productCount || 0} produits</p>
            `;
            
            categoryDiv.addEventListener('click', () => {
                this.filterByCategory(category.name);
                this.scrollToProducts();
            });
            
            container.appendChild(categoryDiv);
        });
    }
    
    // === FILTRES ET RECHERCHE ===
    
    populateFilters() {
        this.populateCategoryFilter();
        this.populatePriceFilter();
        this.populateSortOptions();
    }
    
    populateCategoryFilter() {
        const select = document.getElementById('categoryFilter');
        if (!select) return;
        
        select.innerHTML = '<option value="">Toutes catégories</option>';
        
        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = `${category.icon || ''} ${category.name} (${category.productCount || 0})`;
            select.appendChild(option);
        });
    }
    
    populatePriceFilter() {
        const select = document.getElementById('priceFilter');
        if (!select) return;
        
        const ranges = [
            { value: '', text: 'Tous prix' },
            { value: '0-5000', text: '0 - 5,000 FCFA' },
            { value: '5000-15000', text: '5,000 - 15,000 FCFA' },
            { value: '15000-50000', text: '15,000 - 50,000 FCFA' },
            { value: '50000+', text: '50,000+ FCFA' }
        ];
        
        select.innerHTML = '';
        ranges.forEach(range => {
            const option = document.createElement('option');
            option.value = range.value;
            option.textContent = range.text;
            select.appendChild(option);
        });
    }
    
    populateSortOptions() {
        const select = document.getElementById('sortFilter');
        if (!select) return;
        
        const options = [
            { value: 'newest', text: 'Plus récents' },
            { value: 'oldest', text: 'Plus anciens' },
            { value: 'price-low', text: 'Prix croissant' },
            { value: 'price-high', text: 'Prix décroissant' },
            { value: 'name-asc', text: 'Nom A-Z' },
            { value: 'name-desc', text: 'Nom Z-A' },
            { value: 'rating', text: 'Mieux notés' }
        ];
        
        select.innerHTML = '';
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.text;
            select.appendChild(optionElement);
        });
    }
    
    applyFilters() {
        let filtered = [...this.products];
        
        // Filtre par recherche
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(product => 
                product.title.toLowerCase().includes(query) ||
                product.description.toLowerCase().includes(query) ||
                product.category.toLowerCase().includes(query) ||
                (product.sku && product.sku.toLowerCase().includes(query))
            );
        }
        
        // Filtre par catégorie
        if (this.selectedCategory) {
            filtered = filtered.filter(product => product.category === this.selectedCategory);
        }
        
        // Filtre par prix
        if (this.selectedPriceRange) {
            const [min, max] = this.parsePriceRange(this.selectedPriceRange);
            filtered = filtered.filter(product => {
                const price = product.price;
                return price >= min && (max === Infinity || price <= max);
            });
        }
        
        // Tri
        filtered = this.sortProducts(filtered, this.sortBy);
        
        this.filteredProducts = filtered;
        this.currentPage = 1;
        this.renderProducts(true);
        this.updateProductCount();
        
        // Analytics
        this.trackFilterUsage();
    }
    
    parsePriceRange(range) {
        if (range.includes('+')) {
            return [parseInt(range.replace('+', '')), Infinity];
        }
        return range.split('-').map(Number);
    }
    
    sortProducts(products, sortBy) {
        const sorted = [...products];
        
        switch (sortBy) {
            case 'newest':
                return sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            case 'oldest':
                return sorted.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
            case 'price-low':
                return sorted.sort((a, b) => a.price - b.price);
            case 'price-high':
                return sorted.sort((a, b) => b.price - a.price);
            case 'name-asc':
                return sorted.sort((a, b) => a.title.localeCompare(b.title));
            case 'name-desc':
                return sorted.sort((a, b) => b.title.localeCompare(a.title));
            case 'rating':
                return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            default:
                return sorted;
        }
    }
    
    // === RECHERCHE ===
    
    handleSearch(query) {
        this.searchQuery = query.trim();
        this.applyFilters();
        
        // Sauvegarder dans l'historique de recherche
        this.saveSearchHistory(query);
        
        // Analytics
        this.trackSearch(query, this.filteredProducts.length);
    }
    
    saveSearchHistory(query) {
        if (!query) return;
        
        const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
        
        // Supprimer si existe déjà
        const filtered = history.filter(item => item !== query);
        
        // Ajouter au début
        filtered.unshift(query);
        
        // Garder seulement les 10 dernières
        const limited = filtered.slice(0, 10);
        
        localStorage.setItem('searchHistory', JSON.stringify(limited));
    }
    
    getSearchHistory() {
        return JSON.parse(localStorage.getItem('searchHistory') || '[]');
    }
    
    clearSearchHistory() {
        localStorage.removeItem('searchHistory');
    }
    
    // === PAGINATION ===
    
    loadMoreProducts() {
        if (this.isLoading) return;
        
        const totalProducts = this.filteredProducts.length;
        const loadedProducts = this.currentPage * this.productsPerPage;
        
        if (loadedProducts >= totalProducts) return;
        
        this.currentPage++;
        this.renderProducts(false);
        
        // Analytics
        this.trackPagination(this.currentPage);
    }
    
    updateLoadMoreButton() {
        const button = document.getElementById('loadMoreBtn');
        if (!button) return;
        
        const totalProducts = this.filteredProducts.length;
        const loadedProducts = this.currentPage * this.productsPerPage;
        
        if (loadedProducts >= totalProducts) {
            button.style.display = 'none';
        } else {
            button.style.display = 'block';
            const remaining = totalProducts - loadedProducts;
            button.textContent = `Charger plus (${remaining} restants)`;
        }
    }
    
    // === ÉVÉNEMENTS ===
    
    setupEventListeners() {
        // Recherche
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            const debouncedSearch = debounce((e) => {
                this.handleSearch(e.target.value);
            }, getConfig('PERFORMANCE.SEARCH_DEBOUNCE', 300));
            
            searchInput.addEventListener('input', debouncedSearch);
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleSearch(e.target.value);
                }
            });
        }
        
        // Bouton de recherche
        const searchBtn = document.getElementById('searchBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                const input = document.getElementById('searchInput');
                if (input) this.handleSearch(input.value);
            });
        }
        
        // Filtres
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.selectedCategory = e.target.value;
                this.applyFilters();
            });
        }
        
        const priceFilter = document.getElementById('priceFilter');
        if (priceFilter) {
            priceFilter.addEventListener('change', (e) => {
                this.selectedPriceRange = e.target.value;
                this.applyFilters();
            });
        }
        
        const sortFilter = document.getElementById('sortFilter');
        if (sortFilter) {
            sortFilter.addEventListener('change', (e) => {
                this.sortBy = e.target.value;
                this.applyFilters();
            });
        }
        
        // Boutons de vue
        const viewBtns = document.querySelectorAll('.view-btn');
        viewBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setViewMode(e.target.dataset.view);
            });
        });
        
        // Charger plus
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.loadMoreProducts();
            });
        }
        
        // Clear filters
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearFilters();
            });
        }
    }
    
    setupProductEventListeners(productElement, product) {
        // Ajouter au panier
        const addToCartBtn = productElement.querySelector('.add-to-cart-btn');
        if (addToCartBtn && product.inStock) {
            addToCartBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleAddToCart(product);
            });
        }
        
        // Aperçu rapide
        const quickViewBtns = productElement.querySelectorAll('.quick-view-btn, [data-action="quick-view"]');
        quickViewBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openProductModal(product.id);
            });
        });
        
        // Actions overlay
        const actionBtns = productElement.querySelectorAll('[data-action]');
        actionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleProductAction(e.target.dataset.action, product);
            });
        });
        
        // Clic sur la carte produit
        productElement.addEventListener('click', () => {
            this.openProductModal(product.id);
        });
    }
    
    // === ACTIONS PRODUITS ===
    
    handleAddToCart(product) {
        if (!product.inStock) {
            this.showNotification('Produit en rupture de stock', 'error');
            return;
        }
        
        addToCart(product.id);
        this.updateProductInDOM(product.id);
        
        // Analytics
        this.trackAddToCart(product);
    }
    
    handleProductAction(action, product) {
        switch (action) {
            case 'quick-view':
                this.openProductModal(product.id);
                break;
            case 'wishlist':
                this.toggleWishlist(product.id);
                break;
            case 'compare':
                this.toggleCompare(product.id);
                break;
            case 'share':
                this.shareProduct(product);
                break;
            default:
                debugLog('Action non reconnue:', action);
        }
    }
    
    toggleWishlist(productId) {
        // Implémentation wishlist
        debugLog('Toggle wishlist:', productId);
        this.showNotification('Fonctionnalité bientôt disponible', 'info');
    }
    
    toggleCompare(productId) {
        // Implémentation comparaison
        debugLog('Toggle compare:', productId);
        this.showNotification('Fonctionnalité bientôt disponible', 'info');
    }
    
    shareProduct(product) {
        if (navigator.share) {
            navigator.share({
                title: product.title,
                text: product.description,
                url: `${window.location.origin}?product=${product.id}`
            }).catch(console.error);
        } else {
            // Fallback - copier le lien
            const url = `${window.location.origin}?product=${product.id}`;
            navigator.clipboard.writeText(url).then(() => {
                this.showNotification('Lien copié dans le presse-papiers', 'success');
            }).catch(() => {
                this.showNotification('Impossible de copier le lien', 'error');
            });
        }
        
        // Analytics
        this.trackProductShare(product);
    }
    
    // === UI HELPERS ===
    
    setViewMode(mode) {
        if (!['grid', 'list'].includes(mode)) return;
        
        this.viewMode = mode;
        
        // Mettre à jour les boutons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === mode);
        });
        
        // Appliquer le mode
        const container = document.getElementById('productsGrid');
        if (container) {
            container.className = `products-grid ${mode}-view`;
        }
        
        // Sauvegarder la préférence
        localStorage.setItem('viewMode', mode);
        
        // Analytics
        this.trackViewModeChange(mode);
    }
    
    filterByCategory(categoryName) {
        this.selectedCategory = categoryName;
        
        // Mettre à jour le select
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.value = categoryName;
        }
        
        this.applyFilters();
    }
    
    clearFilters() {
        this.searchQuery = '';
        this.selectedCategory = '';
        this.selectedPriceRange = '';
        this.sortBy = 'newest';
        
        // Réinitialiser les contrôles
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';
        
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) categoryFilter.value = '';
        
        const priceFilter = document.getElementById('priceFilter');
        if (priceFilter) priceFilter.value = '';
        
        const sortFilter = document.getElementById('sortFilter');
        if (sortFilter) sortFilter.value = 'newest';
        
        this.applyFilters();
        
        // Analytics
        this.trackFiltersCleared();
    }
    
    updateProductCount() {
        const countElement = document.getElementById('productCount');
        if (countElement) {
            const total = this.filteredProducts.length;
            const showing = Math.min(this.currentPage * this.productsPerPage, total);
            countElement.textContent = `Affichage de ${showing} sur ${total} produits`;
        }
    }
    
    updateProductInDOM(productId) {
        const productCards = document.querySelectorAll(`[data-product-id="${productId}"]`);
        productCards.forEach(card => {
            const btn = card.querySelector('.add-to-cart-btn');
            if (btn) {
                const quantity = getProductQuantityInCart(productId);
                if (quantity > 0) {
                    btn.classList.add('in-cart');
                    btn.textContent = `En panier (${quantity})`;
                } else {
                    btn.classList.remove('in-cart');
                    btn.textContent = '🛒 Ajouter';
                }
            }
        });
    }
    
    showNoResults() {
        const container = document.getElementById('productsGrid');
        if (!container) return;
        
        container.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">🔍</div>
                <h3>Aucun produit trouvé</h3>
                <p>Essayez de modifier vos critères de recherche ou parcourez nos catégories.</p>
                <button class="btn btn-primary" onclick="productManager.clearFilters()">
                    Effacer les filtres
                </button>
            </div>
        `;
    }
    
    showLoading() {
        const loading = document.getElementById('productsLoading');
        if (loading) loading.classList.add('active');
    }
    
    hideLoading() {
        const loading = document.getElementById('productsLoading');
        if (loading) loading.classList.remove('active');
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showNotification(message, type = 'info') {
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
    
    // === UTILITAIRES ===
    
    getProductById(id) {
        return this.products.find(p => p.id === parseInt(id));
    }
    
    getCategoryProducts(categoryName) {
        return this.products.filter(p => p.category === categoryName);
    }
    
    getRelatedProducts(productId, limit = 4) {
        const product = this.getProductById(productId);
        if (!product) return [];
        
        return this.products
            .filter(p => p.id !== productId && p.category === product.category)
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .slice(0, limit);
    }
    
    searchProducts(query, limit = 5) {
        if (!query || query.length < 2) return [];
        
        const lowerQuery = query.toLowerCase();
        return this.products
            .filter(p => 
                p.title.toLowerCase().includes(lowerQuery) ||
                p.category.toLowerCase().includes(lowerQuery)
            )
            .slice(0, limit);
    }
    
    getPlaceholderImage() {
        return getConfig('ECOMMERCE.PLACEHOLDER_IMAGE', 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjEwMCIgeT0iNzUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTkiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCI+SW1hZ2UgaW5kaXNwb25pYmxlPC90ZXh0Pjwvc3ZnPg==');
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    
    getBadgeText(badge) {
        const badges = {
            'sale': 'Promo',
            'new': 'Nouveau',
            'popular': 'Populaire',
            'featured': 'Vedette',
            'limited': 'Limité'
        };
        return badges[badge] || badge;
    }
    
    scrollToProducts() {
        const element = document.getElementById('produits');
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    
    // === CACHE ===
    
    getCachedData(key) {
        try {
            const item = this.cache.get(key);
            if (item && Date.now() - item.timestamp < this.cacheExpiry) {
                return item.data;
            }
            this.cache.delete(key);
            return null;
        } catch (error) {
            debugLog('Erreur cache get:', error);
            return null;
        }
    }
    
    setCachedData(key, data) {
        try {
            this.cache.set(key, {
                data: data,
                timestamp: Date.now()
            });
        } catch (error) {
            debugLog('Erreur cache set:', error);
        }
    }
    
    clearCache() {
        this.cache.clear();
    }
    
    // === RÉSEAU ===
    
    async fetchWithRetry(url, options = {}) {
        const maxRetries = getConfig('API.RETRY_ATTEMPTS', 3);
        const retryDelay = getConfig('API.RETRY_DELAY', 1000);
        
        for (let i = 0; i < maxRetries; i++) {
            try {
                const response = await fetch(url, {
                    timeout: getConfig('API.TIMEOUT', 30000),
                    ...options
                });
                
                if (response.ok) {
                    return response;
                }
                
                if (response.status >= 500 && i < maxRetries - 1) {
                    await this.delay(retryDelay * Math.pow(2, i));
                    continue;
                }
                
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            } catch (error) {
                if (i === maxRetries - 1) {
                    throw error;
                }
                await this.delay(retryDelay * Math.pow(2, i));
            }
        }
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // === INTERSECTION OBSERVER ===
    
    setupIntersectionObserver() {
        if (!('IntersectionObserver' in window)) return;
        
        // Observer pour lazy loading des images
        this.imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.classList.remove('lazy-load');
                        this.imageObserver.unobserve(img);
                    }
                }
            });
        }, {
            rootMargin: '50px'
        });
        
        // Observer pour le chargement automatique
        this.loadMoreObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.isLoading) {
                    this.loadMoreProducts();
                }
            });
        }, {
            rootMargin: '200px'
        });
        
        // Observer le bouton load more
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            this.loadMoreObserver.observe(loadMoreBtn);
        }
    }
    
    observeImages() {
        if (!this.imageObserver) return;
        
        const lazyImages = document.querySelectorAll('.lazy-load[data-src]');
        lazyImages.forEach(img => {
            this.imageObserver.observe(img);
        });
    }
    
    // === ANALYTICS ===
    
    trackProductsViewed(products) {
        if (!getConfig('SEO.TRACK_EVENTS', true)) return;
        
        try {
            // Google Analytics 4
            if (typeof gtag === 'function') {
                gtag('event', 'view_item_list', {
                    item_list_name: 'Products',
                    items: products.map((product, index) => ({
                        item_id: product.id,
                        item_name: product.title,
                        item_category: product.category,
                        price: product.price,
                        quantity: 1,
                        index: index
                    }))
                });
            }
            
            // Facebook Pixel
            if (typeof fbq === 'function') {
                fbq('track', 'ViewContent', {
                    content_type: 'product_group',
                    contents: products.map(product => ({
                        id: product.id,
                        category: product.category,
                        name: product.title
                    }))
                });
            }
        } catch (error) {
            debugLog('Erreur analytics products viewed:', error);
        }
    }
    
    trackAddToCart(product) {
        if (!getConfig('SEO.TRACK_EVENTS', true)) return;
        
        try {
            // Google Analytics 4
            if (typeof gtag === 'function') {
                gtag('event', 'add_to_cart', {
                    currency: 'XOF',
                    value: product.price,
                    items: [{
                        item_id: product.id,
                        item_name: product.title,
                        item_category: product.category,
                        price: product.price,
                        quantity: 1
                    }]
                });
            }
            
            // Facebook Pixel
            if (typeof fbq === 'function') {
                fbq('track', 'AddToCart', {
                    content_ids: [product.id],
                    content_type: 'product',
                    value: product.price,
                    currency: 'XOF'
                });
            }
        } catch (error) {
            debugLog('Erreur analytics add to cart:', error);
        }
    }
    
    trackSearch(query, resultsCount) {
        if (!getConfig('SEO.TRACK_EVENTS', true)) return;
        
        try {
            // Google Analytics 4
            if (typeof gtag === 'function') {
                gtag('event', 'search', {
                    search_term: query,
                    results_count: resultsCount
                });
            }
            
            // Facebook Pixel
            if (typeof fbq === 'function') {
                fbq('track', 'Search', {
                    search_string: query
                });
            }
        } catch (error) {
            debugLog('Erreur analytics search:', error);
        }
    }
    
    trackFilterUsage() {
        if (!getConfig('SEO.TRACK_EVENTS', true)) return;
        
        try {
            const filters = {
                category: this.selectedCategory,
                price_range: this.selectedPriceRange,
                sort: this.sortBy,
                search: this.searchQuery
            };
            
            // Google Analytics 4
            if (typeof gtag === 'function') {
                gtag('event', 'filter_products', filters);
            }
        } catch (error) {
            debugLog('Erreur analytics filter:', error);
        }
    }
    
    trackPagination(page) {
        if (!getConfig('SEO.TRACK_EVENTS', true)) return;
        
        try {
            // Google Analytics 4
            if (typeof gtag === 'function') {
                gtag('event', 'page_view', {
                    page_title: `Products Page ${page}`,
                    page_location: window.location.href
                });
            }
        } catch (error) {
            debugLog('Erreur analytics pagination:', error);
        }
    }
    
    trackViewModeChange(mode) {
        if (!getConfig('SEO.TRACK_EVENTS', true)) return;
        
        try {
            // Google Analytics 4
            if (typeof gtag === 'function') {
                gtag('event', 'view_mode_change', {
                    view_mode: mode
                });
            }
        } catch (error) {
            debugLog('Erreur analytics view mode:', error);
        }
    }
    
    trackProductShare(product) {
        if (!getConfig('SEO.TRACK_EVENTS', true)) return;
        
        try {
            // Google Analytics 4
            if (typeof gtag === 'function') {
                gtag('event', 'share', {
                    method: navigator.share ? 'native' : 'clipboard',
                    content_type: 'product',
                    item_id: product.id
                });
            }
        } catch (error) {
            debugLog('Erreur analytics share:', error);
        }
    }
    
    trackFiltersCleared() {
        if (!getConfig('SEO.TRACK_EVENTS', true)) return;
        
        try {
            // Google Analytics 4
            if (typeof gtag === 'function') {
                gtag('event', 'clear_filters');
            }
        } catch (error) {
            debugLog('Erreur analytics clear filters:', error);
        }
    }
    
    // === FALLBACK DATA ===
    
    generateSampleProducts() {
        const categories = ['Fruits', 'Légumes', 'Épices', 'Artisanat', 'Vêtements', 'Électronique'];
        const sampleProducts = [];
        
        for (let i = 1; i <= 20; i++) {
            const category = categories[Math.floor(Math.random() * categories.length)];
            const basePrice = Math.floor(Math.random() * 50000) + 1000;
            const hasDiscount = Math.random() > 0.7;
            const discount = hasDiscount ? Math.floor(Math.random() * 30) + 10 : 0;
            const finalPrice = hasDiscount ? Math.floor(basePrice * (1 - discount / 100)) : basePrice;
            
            sampleProducts.push({
                id: i,
                title: `Produit ${i} - ${category}`,
                description: `Description détaillée du produit ${i}. Un excellent produit de qualité supérieure avec toutes les caractéristiques que vous recherchez.`,
                price: finalPrice,
                originalPrice: hasDiscount ? basePrice : null,
                discount: discount,
                category: category,
                image: `https://picsum.photos/400/300?random=${i}`,
                thumbnail: `https://picsum.photos/200/150?random=${i}`,
                inStock: Math.random() > 0.1,
                badge: this.getRandomBadge(i, hasDiscount),
                rating: Math.floor(Math.random() * 5) + 1,
                reviews: Math.floor(Math.random() * 100) + 1,
                sku: `SKU${i.toString().padStart(3, '0')}`,
                weight: `${Math.floor(Math.random() * 5) + 1}kg`,
                origin: this.getRandomOrigin(),
                createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date().toISOString()
            });
        }
        
        // Générer les catégories
        const sampleCategories = categories.map(cat => ({
            id: categories.indexOf(cat) + 1,
            name: cat,
            icon: this.getCategoryIcon(cat),
            description: `Produits de la catégorie ${cat}`,
            productCount: sampleProducts.filter(p => p.category === cat).length
        }));
        
        this.setProductsData({
            products: sampleProducts,
            categories: sampleCategories,
            metadata: {
                totalProducts: sampleProducts.length,
                totalCategories: sampleCategories.length,
                lastUpdated: new Date().toISOString(),
                version: '1.0.0'
            }
        });
    }
    
    getRandomBadge(index, hasDiscount) {
        if (hasDiscount) return 'sale';
        if (index <= 3) return 'new';
        if (Math.random() > 0.8) return 'popular';
        return null;
    }
    
    getRandomOrigin() {
        const origins = ['Abidjan', 'Bouaké', 'Yamoussoukro', 'Daloa', 'Korhogo', 'San-Pédro', 'Man'];
        return origins[Math.floor(Math.random() * origins.length)];
    }
    
    getCategoryIcon(category) {
        const icons = {
            'Fruits': '🍎',
            'Légumes': '🥕',
            'Épices': '🌶️',
            'Artisanat': '🏺',
            'Vêtements': '👕',
            'Électronique': '📱'
        };
        return icons[category] || '📦';
    }
    
    // === MODAL PRODUIT ===
    
    openProductModal(productId) {
        const product = this.getProductById(productId);
        if (!product) {
            this.showNotification('Produit non trouvé', 'error');
            return;
        }
        
        if (typeof openProductModal === 'function') {
            openProductModal(productId);
        } else {
            // Fallback simple
            const url = `${window.location.origin}/product.html?id=${productId}`;
            window.open(url, '_blank');
        }
        
        // Analytics
        this.trackProductView(product);
    }
    
    trackProductView(product) {
        if (!getConfig('SEO.TRACK_EVENTS', true)) return;
        
        try {
            // Google Analytics 4
            if (typeof gtag === 'function') {
                gtag('event', 'view_item', {
                    currency: 'XOF',
                    value: product.price,
                    items: [{
                        item_id: product.id,
                        item_name: product.title,
                        item_category: product.category,
                        price: product.price,
                        quantity: 1
                    }]
                });
            }
            
            // Facebook Pixel
            if (typeof fbq === 'function') {
                fbq('track', 'ViewContent', {
                    content_ids: [product.id],
                    content_type: 'product',
                    value: product.price,
                    currency: 'XOF'
                });
            }
        } catch (error) {
            debugLog('Erreur analytics product view:', error);
        }
    }
    
    // === NETTOYAGE ===
    
    destroy() {
        // Nettoyer les observers
        if (this.imageObserver) {
            this.imageObserver.disconnect();
        }
        
        if (this.loadMoreObserver) {
            this.loadMoreObserver.disconnect();
        }
        
        // Vider le cache
        this.clearCache();
        
        debugLog('ProductManager détruit');
    }
}

// === FONCTIONS GLOBALES ===

/**
 * Recherche de produits avec suggestions
 * @param {string} query - Requête de recherche
 * @returns {Array} Suggestions de produits
 */
function getProductSuggestions(query) {
    if (!window.productManager) return [];
    return window.productManager.searchProducts(query);
}

/**
 * Obtenir les produits d'une catégorie
 * @param {string} categoryName - Nom de la catégorie
 * @returns {Array} Produits de la catégorie
 */
function getProductsByCategory(categoryName) {
    if (!window.productManager) return [];
    return window.productManager.getCategoryProducts(categoryName);
}

/**
 * Obtenir les produits liés
 * @param {number} productId - ID du produit
 * @param {number} limit - Nombre maximum de produits
 * @returns {Array} Produits liés
 */
function getRelatedProducts(productId, limit = 4) {
    if (!window.productManager) return [];
    return window.productManager.getRelatedProducts(productId, limit);
}

/**
 * Filtrer les produits par prix
 * @param {number} minPrice - Prix minimum
 * @param {number} maxPrice - Prix maximum
 * @returns {Array} Produits filtrés
 */
function filterProductsByPrice(minPrice, maxPrice) {
    if (!window.productManager) return [];
    
    return window.productManager.products.filter(product => {
        return product.price >= minPrice && product.price <= maxPrice;
    });
}

/**
 * Obtenir les produits les mieux notés
 * @param {number} limit - Nombre maximum de produits
 * @returns {Array} Produits les mieux notés
 */
function getTopRatedProducts(limit = 10) {
    if (!window.productManager) return [];
    
    return [...window.productManager.products]
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, limit);
}

/**
 * Obtenir les nouveaux produits
 * @param {number} limit - Nombre maximum de produits
 * @returns {Array} Nouveaux produits
 */
function getNewProducts(limit = 10) {
    if (!window.productManager) return [];
    
    return [...window.productManager.products]
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, limit);
}

/**
 * Obtenir les produits en promotion
 * @returns {Array} Produits en promotion
 */
function getSaleProducts() {
    if (!window.productManager) return [];
    
    return window.productManager.products.filter(product => 
        product.originalPrice && product.originalPrice > product.price
    );
}

// === INITIALISATION ===

// Initialiser le gestionnaire de produits quand le DOM est prêt
document.addEventListener('DOMContentLoaded', function() {
    // Vérifier que les dépendances sont chargées
    if (typeof getConfig !== 'function') {
        console.error('Configuration non chargée. Veuillez inclure config.js avant products.js');
        return;
    }
    
    if (typeof formatPrice !== 'function') {
        console.error('Utilitaires non chargés. Veuillez inclure utils.js avant products.js');
        return;
    }
    
    // Initialiser le gestionnaire
    window.productManager = new ProductManager();
    
    // Charger la préférence de vue
    const savedViewMode = localStorage.getItem('viewMode');
    if (savedViewMode && ['grid', 'list'].includes(savedViewMode)) {
        window.productManager.setViewMode(savedViewMode);
    }
    
    debugLog('ProductManager initialisé et prêt');
});

// Nettoyer avant de quitter la page
window.addEventListener('beforeunload', function() {
    if (window.productManager) {
        window.productManager.destroy();
    }
});

// Export pour les modules ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ProductManager,
        getProductSuggestions,
        getProductsByCategory,
        getRelatedProducts,
        filterProductsByPrice,
        getTopRatedProducts,
        getNewProducts,
        getSaleProducts
    };
}iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0