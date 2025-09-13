// assets/js/main.js

// Application state
let appState = {
    products: [],
    categories: [],
    filteredProducts: [],
    currentPage: 1,
    productsPerPage: 12,
    viewMode: 'grid',
    searchQuery: '',
    selectedCategory: '',
    selectedPriceRange: '',
    loading: false
};

// DOM elements
const elements = {
    // Navigation
    menuToggle: document.getElementById('menuToggle'),
    navMenu: document.querySelector('.nav-menu'),
    cartBtn: document.getElementById('cartBtn'),
    cartCount: document.getElementById('cartCount'),
    
    // Search and filters
    searchInput: document.getElementById('searchInput'),
    searchBtn: document.getElementById('searchBtn'),
    categoryFilter: document.getElementById('categoryFilter'),
    priceFilter: document.getElementById('priceFilter'),
    
    // Products
    productsGrid: document.getElementById('productsGrid'),
    productsLoading: document.getElementById('productsLoading'),
    loadMoreBtn: document.getElementById('loadMoreBtn'),
    
    // Categories
    categoriesGrid: document.getElementById('categoriesGrid'),
    
    // View toggle
    viewBtns: document.querySelectorAll('.view-btn'),
    
    // Modals
    cartModal: document.getElementById('cartModal'),
    productModal: document.getElementById('productModal'),
    closeCartModal: document.getElementById('closeCartModal'),
    closeProductModal: document.getElementById('closeProductModal'),
    cartItems: document.getElementById('cartItems'),
    cartTotal: document.getElementById('cartTotal'),
    clearCartBtn: document.getElementById('clearCartBtn'),
    checkoutBtn: document.getElementById('checkoutBtn'),
    productModalBody: document.getElementById('productModalBody')
};

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        // Show loading state
        showLoading();
        
        // Load products and categories
        await loadProducts();
        await loadCategories();
        
        // Initialize UI components
        initializeEventListeners();
        initializeCart();
        updateCartDisplay();
        
        // Hide loading state
        hideLoading();
        
        console.log('MarchéIvoire initialized successfully');
    } catch (error) {
        console.error('Error initializing app:', error);
        showNotification('Erreur lors du chargement de l\'application', 'error');
        hideLoading();
    }
}

// Event listeners
function initializeEventListeners() {
    // Mobile menu toggle
    if (elements.menuToggle) {
        elements.menuToggle.addEventListener('click', toggleMobileMenu);
    }
    
    // Search functionality
    if (elements.searchInput) {
        elements.searchInput.addEventListener('input', debounce(handleSearch, 300));
        elements.searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
            }
        });
    }
    
    if (elements.searchBtn) {
        elements.searchBtn.addEventListener('click', handleSearch);
    }
    
    // Filter functionality
    if (elements.categoryFilter) {
        elements.categoryFilter.addEventListener('change', handleCategoryFilter);
    }
    
    if (elements.priceFilter) {
        elements.priceFilter.addEventListener('change', handlePriceFilter);
    }
    
    // View toggle
    elements.viewBtns.forEach(btn => {
        btn.addEventListener('click', handleViewToggle);
    });
    
    // Load more button
    if (elements.loadMoreBtn) {
        elements.loadMoreBtn.addEventListener('click', loadMoreProducts);
    }
    
    // Cart functionality
    if (elements.cartBtn) {
        elements.cartBtn.addEventListener('click', openCartModal);
    }
    
    if (elements.closeCartModal) {
        elements.closeCartModal.addEventListener('click', closeCartModal);
    }
    
    if (elements.closeProductModal) {
        elements.closeProductModal.addEventListener('click', closeProductModal);
    }
    
    if (elements.clearCartBtn) {
        elements.clearCartBtn.addEventListener('click', clearCart);
    }
    
    if (elements.checkoutBtn) {
        elements.checkoutBtn.addEventListener('click', handleCheckout);
    }
    
    // Modal close on backdrop click
    if (elements.cartModal) {
        elements.cartModal.addEventListener('click', function(e) {
            if (e.target === elements.cartModal) {
                closeCartModal();
            }
        });
    }
    
    if (elements.productModal) {
        elements.productModal.addEventListener('click', function(e) {
            if (e.target === elements.productModal) {
                closeProductModal();
            }
        });
    }
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Close mobile menu when clicking on links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', closeMobileMenu);
    });
    
    // ESC key to close modals
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeCartModal();
            closeProductModal();
        }
    });
}

// Mobile menu functions
function toggleMobileMenu() {
    if (elements.navMenu) {
        elements.navMenu.classList.toggle('active');
    }
}

function closeMobileMenu() {
    if (elements.navMenu) {
        elements.navMenu.classList.remove('active');
    }
}

// Loading functions
function showLoading() {
    if (elements.productsLoading) {
        elements.productsLoading.classList.add('active');
    }
    appState.loading = true;
}

function hideLoading() {
    if (elements.productsLoading) {
        elements.productsLoading.classList.remove('active');
    }
    appState.loading = false;
}

// Products loading and rendering
async function loadProducts() {
    try {
        // In a real application, this would be an API call
        // For demo purposes, we'll create sample products
        appState.products = generateSampleProducts();
        appState.filteredProducts = [...appState.products];
        
        renderProducts();
        updateLoadMoreButton();
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Erreur lors du chargement des produits', 'error');
    }
}

async function loadCategories() {
    try {
        // Extract unique categories from products
        const categories = [...new Set(appState.products.map(product => product.category))];
        appState.categories = categories.map(category => ({
            name: category,
            icon: getCategoryIcon(category),
            count: appState.products.filter(p => p.category === category).length
        }));
        
        renderCategories();
        populateCategoryFilter();
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function generateSampleProducts() {
    const categories = ['Fruits', 'Légumes', 'Épices', 'Artisanat', 'Vêtements', 'Électronique'];
    const products = [];
    
    for (let i = 1; i <= 50; i++) {
        const category = categories[Math.floor(Math.random() * categories.length)];
        const basePrice = Math.floor(Math.random() * 50000) + 1000;
        const hasDiscount = Math.random() > 0.7;
        const discount = hasDiscount ? Math.floor(Math.random() * 30) + 10 : 0;
        const finalPrice = hasDiscount ? Math.floor(basePrice * (1 - discount / 100)) : basePrice;
        
        products.push({
            id: i,
            title: `Produit ${i} - ${category}`,
            description: `Description détaillée du produit ${i}. Un excellent produit de qualité supérieure.`,
            price: finalPrice,
            originalPrice: hasDiscount ? basePrice : null,
            discount: discount,
            category: category,
            image: `https://picsum.photos/400/300?random=${i}`,
            thumbnail: `https://picsum.photos/200/150?random=${i}`,
            inStock: Math.random() > 0.1,
            badge: getBadgeType(i, hasDiscount),
            rating: Math.floor(Math.random() * 5) + 1,
            reviews: Math.floor(Math.random() * 100) + 1
        });
    }
    
    return products;
}

function getBadgeType(index, hasDiscount) {
    if (hasDiscount) return 'sale';
    if (index <= 5) return 'new';
    if (Math.random() > 0.8) return 'popular';
    return null;
}

function getCategoryIcon(category) {
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

function renderProducts(reset = false) {
    if (!elements.productsGrid) return;
    
    if (reset) {
        elements.productsGrid.innerHTML = '';
        appState.currentPage = 1;
    }
    
    const startIndex = (appState.currentPage - 1) * appState.productsPerPage;
    const endIndex = startIndex + appState.productsPerPage;
    const productsToShow = appState.filteredProducts.slice(startIndex, endIndex);
    
    if (reset) {
        elements.productsGrid.innerHTML = '';
    }
    
    productsToShow.forEach(product => {
        const productElement = createProductElement(product);
        elements.productsGrid.appendChild(productElement);
    });
    
    // Apply view mode
    elements.productsGrid.className = `products-grid ${appState.viewMode}-view`;
    
    updateLoadMoreButton();
}

function createProductElement(product) {
    const productDiv = document.createElement('div');
    productDiv.className = 'product-card';
    productDiv.innerHTML = `
        <div class="product-image-container">
            <img src="${product.image}" alt="${product.title}" class="product-image" loading="lazy">
            ${product.badge ? `<span class="product-badge ${product.badge}">${getBadgeText(product.badge)}</span>` : ''}
        </div>
        <div class="product-info">
            <div class="product-category">${product.category}</div>
            <h3 class="product-title">${product.title}</h3>
            <p class="product-description">${product.description}</p>
            <div class="product-price">
                <span class="price">${formatPrice(product.price)}</span>
                ${product.originalPrice ? `<span class="price-old">${formatPrice(product.originalPrice)}</span>` : ''}
            </div>
            <div class="product-actions">
                <button class="add-to-cart-btn" data-product-id="${product.id}" ${!product.inStock ? 'disabled' : ''}>
                    ${product.inStock ? '🛒 Ajouter' : 'Rupture'}
                </button>
                <button class="quick-view-btn" data-product-id="${product.id}">👁️</button>
            </div>
        </div>
    `;
    
    // Add event listeners
    const addToCartBtn = productDiv.querySelector('.add-to-cart-btn');
    const quickViewBtn = productDiv.querySelector('.quick-view-btn');
    
    if (addToCartBtn && product.inStock) {
        addToCartBtn.addEventListener('click', () => addToCart(product.id));
    }
    
    if (quickViewBtn) {
        quickViewBtn.addEventListener('click', () => openProductModal(product.id));
    }
    
    // Click on product card to open modal
    productDiv.addEventListener('click', (e) => {
        if (!e.target.closest('.product-actions')) {
            openProductModal(product.id);
        }
    });
    
    return productDiv;
}

function getBadgeText(badge) {
    const badges = {
        'sale': 'Promo',
        'new': 'Nouveau',
        'popular': 'Populaire'
    };
    return badges[badge] || '';
}

function renderCategories() {
    if (!elements.categoriesGrid) return;
    
    elements.categoriesGrid.innerHTML = '';
    
    appState.categories.forEach(category => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category-card';
        categoryDiv.innerHTML = `
            <div class="category-icon">${category.icon}</div>
            <h3>${category.name}</h3>
            <p>${category.count} produits</p>
        `;
        
        categoryDiv.addEventListener('click', () => {
            filterByCategory(category.name);
        });
        
        elements.categoriesGrid.appendChild(categoryDiv);
    });
}

function populateCategoryFilter() {
    if (!elements.categoryFilter) return;
    
    // Clear existing options (except "Toutes catégories")
    elements.categoryFilter.innerHTML = '<option value="">Toutes catégories</option>';
    
    appState.categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.name;
        option.textContent = `${category.icon} ${category.name} (${category.count})`;
        elements.categoryFilter.appendChild(option);
    });
}

// Search and filter functions
function handleSearch() {
    const query = elements.searchInput.value.trim().toLowerCase();
    appState.searchQuery = query;
    applyFilters();
}

function handleCategoryFilter() {
    appState.selectedCategory = elements.categoryFilter.value;
    applyFilters();
}

function handlePriceFilter() {
    appState.selectedPriceRange = elements.priceFilter.value;
    applyFilters();
}

function filterByCategory(categoryName) {
    appState.selectedCategory = categoryName;
    if (elements.categoryFilter) {
        elements.categoryFilter.value = categoryName;
    }
    applyFilters();
    
    // Scroll to products section
    const productsSection = document.getElementById('produits');
    if (productsSection) {
        productsSection.scrollIntoView({ behavior: 'smooth' });
    }
}

function applyFilters() {
    let filtered = [...appState.products];
    
    // Apply search filter
    if (appState.searchQuery) {
        filtered = filtered.filter(product => 
            product.title.toLowerCase().includes(appState.searchQuery) ||
            product.description.toLowerCase().includes(appState.searchQuery) ||
            product.category.toLowerCase().includes(appState.searchQuery)
        );
    }
    
    // Apply category filter
    if (appState.selectedCategory) {
        filtered = filtered.filter(product => product.category === appState.selectedCategory);
    }
    
    // Apply price filter
    if (appState.selectedPriceRange) {
        const [min, max] = appState.selectedPriceRange.includes('+') 
            ? [parseInt(appState.selectedPriceRange.replace('+', '')), Infinity]
            : appState.selectedPriceRange.split('-').map(Number);
        
        filtered = filtered.filter(product => 
            product.price >= min && product.price <= max
        );
    }
    
    appState.filteredProducts = filtered;
    appState.currentPage = 1;
    renderProducts(true);
    
    // Show no results message if needed
    if (filtered.length === 0) {
        showNoResultsMessage();
    }
}

function showNoResultsMessage() {
    if (!elements.productsGrid) return;
    
    elements.productsGrid.innerHTML = `
        <div class="no-results">
            <div class="no-results-icon">🔍</div>
            <h3>Aucun produit trouvé</h3>
            <p>Essayez de modifier vos critères de recherche</p>
            <button class="btn" onclick="clearFilters()">Effacer les filtres</button>
        </div>
    `;
}

function clearFilters() {
    appState.searchQuery = '';
    appState.selectedCategory = '';
    appState.selectedPriceRange = '';
    
    if (elements.searchInput) elements.searchInput.value = '';
    if (elements.categoryFilter) elements.categoryFilter.value = '';
    if (elements.priceFilter) elements.priceFilter.value = '';
    
    applyFilters();
}

// View toggle functionality
function handleViewToggle(e) {
    const viewMode = e.target.dataset.view;
    if (viewMode) {
        appState.viewMode = viewMode;
        
        // Update active button
        elements.viewBtns.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        
        // Apply view mode
        if (elements.productsGrid) {
            elements.productsGrid.className = `products-grid ${viewMode}-view`;
        }
    }
}

// Load more functionality
function loadMoreProducts() {
    appState.currentPage++;
    renderProducts();
}

function updateLoadMoreButton() {
    if (!elements.loadMoreBtn) return;
    
    const totalProducts = appState.filteredProducts.length;
    const loadedProducts = appState.currentPage * appState.productsPerPage;
    
    if (loadedProducts >= totalProducts) {
        elements.loadMoreBtn.style.display = 'none';
    } else {
        elements.loadMoreBtn.style.display = 'block';
        elements.loadMoreBtn.textContent = `Charger plus (${totalProducts - loadedProducts} restants)`;
    }
}

// Product modal functions
function openProductModal(productId) {
    const product = appState.products.find(p => p.id === productId);
    if (!product || !elements.productModal || !elements.productModalBody) return;
    
    elements.productModalBody.innerHTML = `
        <div class="product-detail">
            <div class="product-detail-image-container">
                <img src="${product.image}" alt="${product.title}" class="product-detail-image">
            </div>
            <div class="product-detail-info">
                <div class="product-detail-category">${product.category}</div>
                <h2>${product.title}</h2>
                <div class="product-detail-price">
                    ${formatPrice(product.price)}
                    ${product.originalPrice ? `<span class="price-old">${formatPrice(product.originalPrice)}</span>` : ''}
                </div>
                <div class="product-detail-description">
                    <p>${product.description}</p>
                    <p>Ce produit de qualité supérieure est disponible avec livraison rapide dans toute la Côte d'Ivoire. Paiement sécurisé via Mobile Money.</p>
                </div>
                <div class="product-detail-actions">
                    <button class="btn btn-primary add-to-cart-btn" data-product-id="${product.id}" ${!product.inStock ? 'disabled' : ''}>
                        ${product.inStock ? '🛒 Ajouter au panier' : 'Rupture de stock'}
                    </button>
                    <button class="btn btn-outline" onclick="shareProduct(${product.id})">
                        📤 Partager
                    </button>
                </div>
                <div class="product-detail-meta">
                    <p><strong>Statut:</strong> ${product.inStock ? '✅ En stock' : '❌ Rupture'}</p>
                    <p><strong>Catégorie:</strong> ${product.category}</p>
                    <p><strong>Note:</strong> ${'⭐'.repeat(product.rating)} (${product.reviews} avis)</p>
                </div>
            </div>
        </div>
    `;
    
    // Add event listener to add to cart button
    const addToCartBtn = elements.productModalBody.querySelector('.add-to-cart-btn');
    if (addToCartBtn && product.inStock) {
        addToCartBtn.addEventListener('click', () => {
            addToCart(product.id);
            closeProductModal();
        });
    }
    
    elements.productModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeProductModal() {
    if (elements.productModal) {
        elements.productModal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function shareProduct(productId) {
    const product = appState.products.find(p => p.id === productId);
    if (!product) return;
    
    if (navigator.share) {
        navigator.share({
            title: product.title,
            text: product.description,
            url: `${window.location.origin}?product=${productId}`
        }).catch(console.error);
    } else {
        // Fallback - copy to clipboard
        const url = `${window.location.origin}?product=${productId}`;
        navigator.clipboard.writeText(url).then(() => {
            showNotification('Lien copié dans le presse-papiers', 'success');
        }).catch(() => {
            showNotification('Impossible de copier le lien', 'error');
        });
    }
}

// Cart modal functions
function openCartModal() {
    updateCartModal();
    if (elements.cartModal) {
        elements.cartModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeCartModal() {
    if (elements.cartModal) {
        elements.cartModal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function updateCartModal() {
    if (!elements.cartItems || !elements.cartTotal) return;
    
    const cart = getCart();
    
    if (cart.length === 0) {
        elements.cartItems.innerHTML = `
            <div class="empty-cart">
                <div class="empty-cart-icon">🛒</div>
                <h3>Votre panier est vide</h3>
                <p>Découvrez nos produits et ajoutez-les à votre panier</p>
            </div>
        `;
        elements.cartTotal.textContent = '0 FCFA';
        return;
    }
    
    elements.cartItems.innerHTML = '';
    let total = 0;
    
    cart.forEach(item => {
        const product = appState.products.find(p => p.id === item.productId);
        if (!product) return;
        
        const itemTotal = product.price * item.quantity;
        total += itemTotal;
        
        const cartItemDiv = document.createElement('div');
        cartItemDiv.className = 'cart-item';
        cartItemDiv.innerHTML = `
            <img src="${product.thumbnail}" alt="${product.title}" class="cart-item-image">
            <div class="cart-item-info">
                <div class="cart-item-title">${product.title}</div>
                <div class="cart-item-price">${formatPrice(product.price)} × ${item.quantity}</div>
            </div>
            <div class="cart-item-actions">
                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="updateCartQuantity(${item.productId}, ${item.quantity - 1})">-</button>
                    <input type="number" class="quantity-input" value="${item.quantity}" min="1" 
                           onchange="updateCartQuantity(${item.productId}, this.value)">
                    <button class="quantity-btn" onclick="updateCartQuantity(${item.productId}, ${item.quantity + 1})">+</button>
                </div>
                <button class="remove-item-btn" onclick="removeFromCart(${item.productId})" title="Supprimer">🗑️</button>
            </div>
        `;
        
        elements.cartItems.appendChild(cartItemDiv);
    });
    
    elements.cartTotal.textContent = formatPrice(total);
}

// Checkout function
function handleCheckout() {
    const cart = getCart();
    if (cart.length === 0) {
        showNotification('Votre panier est vide', 'warning');
        return;
    }
    
    // Calculate total
    let total = 0;
    cart.forEach(item => {
        const product = appState.products.find(p => p.id === item.productId);
        if (product) {
            total += product.price * item.quantity;
        }
    });
    
    // In a real application, this would redirect to payment processing
    showNotification('Redirection vers le paiement...', 'info');
    
    // Simulate payment processing
    setTimeout(() => {
        // For demo purposes, we'll just clear the cart and show success
        clearCart();
        closeCartModal();
        showNotification('Commande passée avec succès! 🎉', 'success');
    }, 2000);
}

// Utility functions
function formatPrice(price) {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showNotification(message, type = 'success') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create new notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Hide notification after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Performance optimization
function lazyLoadImages() {
    const images = document.querySelectorAll('img[loading="lazy"]');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src || img.src;
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
    }
}

// Initialize lazy loading when DOM is ready
document.addEventListener('DOMContentLoaded', lazyLoadImages);

// Handle online/offline status
window.addEventListener('online', () => {
    showNotification('Connexion rétablie', 'success');
});

window.addEventListener('offline', () => {
    showNotification('Connexion perdue - Mode hors ligne', 'warning');
});

// Global error handler
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    showNotification('Une erreur s\'est produite', 'error');
});

// Service worker update handler
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        showNotification('Application mise à jour', 'info');
    });
}

// Export functions for global access
window.updateCartQuantity = updateCartQuantity;
window.removeFromCart = removeFromCart;
window.clearFilters = clearFilters;
window.shareProduct = shareProduct;