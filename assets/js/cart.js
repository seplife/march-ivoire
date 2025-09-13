// assets/js/cart.js

// Cart management functions
let cart = [];

// Initialize cart from localStorage
function initializeCart() {
    try {
        const savedCart = localStorage.getItem('marche_ivoire_cart');
        if (savedCart) {
            cart = JSON.parse(savedCart);
        }
    } catch (error) {
        console.error('Error loading cart from localStorage:', error);
        cart = [];
    }
}

// Save cart to localStorage
function saveCart() {
    try {
        localStorage.setItem('marche_ivoire_cart', JSON.stringify(cart));
    } catch (error) {
        console.error('Error saving cart to localStorage:', error);
    }
}

// Get current cart
function getCart() {
    return cart;
}

// Add product to cart
function addToCart(productId, quantity = 1) {
    const product = appState.products.find(p => p.id === productId);
    if (!product) {
        showNotification('Produit non trouvé', 'error');
        return;
    }
    
    if (!product.inStock) {
        showNotification('Produit en rupture de stock', 'error');
        return;
    }
    
    // Check if product already exists in cart
    const existingItemIndex = cart.findIndex(item => item.productId === productId);
    
    if (existingItemIndex >= 0) {
        // Update quantity
        cart[existingItemIndex].quantity += quantity;
        showNotification(`Quantité mise à jour pour ${product.title}`, 'success');
    } else {
        // Add new item
        cart.push({
            productId: productId,
            quantity: quantity,
            addedAt: new Date().toISOString()
        });
        showNotification(`${product.title} ajouté au panier`, 'success');
    }
    
    saveCart();
    updateCartDisplay();
    animateCartButton();
}

// Remove product from cart
function removeFromCart(productId) {
    const product = appState.products.find(p => p.id === productId);
    cart = cart.filter(item => item.productId !== productId);
    
    if (product) {
        showNotification(`${product.title} retiré du panier`, 'info');
    }
    
    saveCart();
    updateCartDisplay();
    updateCartModal();
}

// Update cart item quantity
function updateCartQuantity(productId, newQuantity) {
    newQuantity = parseInt(newQuantity);
    
    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }
    
    const itemIndex = cart.findIndex(item => item.productId === productId);
    if (itemIndex >= 0) {
        cart[itemIndex].quantity = newQuantity;
        saveCart();
        updateCartDisplay();
        updateCartModal();
    }
}

// Clear entire cart
function clearCart() {
    cart = [];
    saveCart();
    updateCartDisplay();
    updateCartModal();
    showNotification('Panier vidé', 'info');
}

// Update cart display in header
function updateCartDisplay() {
    const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
    
    if (elements.cartCount) {
        elements.cartCount.textContent = cartCount;
    }
    
    // Update cart button appearance
    if (elements.cartBtn) {
        if (cartCount > 0) {
            elements.cartBtn.classList.add('has-items');
        } else {
            elements.cartBtn.classList.remove('has-items');
        }
    }
}

// Animate cart button when item is added
function animateCartButton() {
    if (elements.cartBtn) {
        elements.cartBtn.classList.add('animate-bounce');
        setTimeout(() => {
            elements.cartBtn.classList.remove('animate-bounce');
        }, 600);
    }
}

// Get cart total
function getCartTotal() {
    return cart.reduce((total, item) => {
        const product = appState.products.find(p => p.id === item.productId);
        return total + (product ? product.price * item.quantity : 0);
    }, 0);
}

// Get cart item count
function getCartItemCount() {
    return cart.reduce((total, item) => total + item.quantity, 0);
}

// Check if product is in cart
function isInCart(productId) {
    return cart.some(item => item.productId === productId);
}

// Get quantity of specific product in cart
function getProductQuantityInCart(productId) {
    const item = cart.find(item => item.productId === productId);
    return item ? item.quantity : 0;
}

// Validate cart (check stock, prices, etc.)
function validateCart() {
    const validItems = [];
    const invalidItems = [];
    
    cart.forEach(item => {
        const product = appState.products.find(p => p.id === item.productId);
        if (product && product.inStock) {
            validItems.push(item);
        } else {
            invalidItems.push(item);
        }
    });
    
    if (invalidItems.length > 0) {
        cart = validItems;
        saveCart();
        updateCartDisplay();
        
        const invalidProductNames = invalidItems.map(item => {
            const product = appState.products.find(p => p.id === item.productId);
            return product ? product.title : `Produit #${item.productId}`;
        }).join(', ');
        
        showNotification(`Produits retirés du panier (non disponibles): ${invalidProductNames}`, 'warning');
    }
    
    return validItems;
}

// Export cart data for checkout
function exportCartForCheckout() {
    const cartData = {
        items: cart.map(item => {
            const product = appState.products.find(p => p.id === item.productId);
            return {
                productId: item.productId,
                productTitle: product ? product.title : 'Produit inconnu',
                quantity: item.quantity,
                unitPrice: product ? product.price : 0,
                totalPrice: product ? product.price * item.quantity : 0
            };
        }),
        totalAmount: getCartTotal(),
        totalItems: getCartItemCount(),
        cartId: generateCartId(),
        timestamp: new Date().toISOString()
    };
    
    return cartData;
}

// Generate unique cart ID
function generateCartId() {
    return 'cart_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Cart persistence across browser sessions
function syncCartWithServer() {
    // In a real application, this would sync with backend
    // For now, we just use localStorage
    console.log('Cart synced locally');
}

// Handle cart operations when offline
function handleOfflineCart() {
    // Store cart operations for when connection is restored
    const offlineOperations = JSON.parse(localStorage.getItem('marche_ivoire_offline_operations') || '[]');
    
    // This would be used to sync operations when back online
    return offlineOperations;
}

// Merge carts (useful for logged-in users)
function mergeCarts(serverCart, localCart) {
    const merged = [...localCart];
    
    serverCart.forEach(serverItem => {
        const existingIndex = merged.findIndex(item => item.productId === serverItem.productId);
        if (existingIndex >= 0) {
            // Keep the larger quantity
            merged[existingIndex].quantity = Math.max(merged[existingIndex].quantity, serverItem.quantity);
        } else {
            merged.push(serverItem);
        }
    });
    
    return merged;
}

// Auto-save cart periodically
setInterval(() => {
    if (cart.length > 0) {
        saveCart();
    }
}, 30000); // Save every 30 seconds

// Handle page unload - save cart
window.addEventListener('beforeunload', () => {
    saveCart();
});

// Handle visibility change - save cart when tab becomes hidden
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        saveCart();
    }
});

// Quick add to cart with animation
function quickAddToCart(productId, buttonElement) {
    addToCart(productId);
    
    if (buttonElement) {
        const originalText = buttonElement.textContent;
        buttonElement.textContent = '✓ Ajouté!';
        buttonElement.disabled = true;
        
        setTimeout(() => {
            buttonElement.textContent = originalText;
            buttonElement.disabled = false;
        }, 1500);
    }
}

// Cart analytics (for business insights)
function trackCartEvent(event, data = {}) {
    const cartEvent = {
        event: event,
        timestamp: new Date().toISOString(),
        cartSize: cart.length,
        cartValue: getCartTotal(),
        ...data
    };
    
    // In a real app, this would send to analytics service
    console.log('Cart Event:', cartEvent);
    
    // Store locally for later sync
    const events = JSON.parse(localStorage.getItem('marche_ivoire_cart_events') || '[]');
    events.push(cartEvent);
    
    // Keep only last 100 events
    if (events.length > 100) {
        events.splice(0, events.length - 100);
    }
    
    localStorage.setItem('marche_ivoire_cart_events', JSON.stringify(events));
}

// Track cart events
function initCartAnalytics() {
    // Track when cart is viewed
    if (elements.cartBtn) {
        elements.cartBtn.addEventListener('click', () => {
            trackCartEvent('cart_viewed');
        });
    }
    
    // Track checkout initiation
    if (elements.checkoutBtn) {
        elements.checkoutBtn.addEventListener('click', () => {
            trackCartEvent('checkout_initiated', {
                cartValue: getCartTotal(),
                itemCount: getCartItemCount()
            });
        });
    }
}

// Initialize cart analytics when DOM is ready
document.addEventListener('DOMContentLoaded', initCartAnalytics);

// Cart recommendations (cross-sell/upsell)
function getCartRecommendations() {
    if (cart.length === 0) return [];
    
    const cartCategories = cart.map(item => {
        const product = appState.products.find(p => p.id === item.productId);
        return product ? product.category : null;
    }).filter(Boolean);
    
    const uniqueCategories = [...new Set(cartCategories)];
    
    // Recommend products from same categories not already in cart
    const recommendations = appState.products.filter(product => 
        uniqueCategories.includes(product.category) && 
        !isInCart(product.id) &&
        product.inStock
    ).slice(0, 4);
    
    return recommendations;
}

// Display cart recommendations
function displayCartRecommendations() {
    const recommendations = getCartRecommendations();
    
    if (recommendations.length === 0) return '';
    
    return `
        <div class="cart-recommendations">
            <h4>Vous pourriez aussi aimer</h4>
            <div class="recommendations-grid">
                ${recommendations.map(product => `
                    <div class="recommendation-item">
                        <img src="${product.thumbnail}" alt="${product.title}" class="recommendation-image">
                        <div class="recommendation-info">
                            <div class="recommendation-title">${product.title}</div>
                            <div class="recommendation-price">${formatPrice(product.price)}</div>
                            <button class="btn btn-sm" onclick="quickAddToCart(${product.id}, this)">
                                Ajouter
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Enhanced cart modal with recommendations
function updateCartModalWithRecommendations() {
    updateCartModal();
    
    const recommendations = displayCartRecommendations();
    if (recommendations && elements.cartItems) {
        elements.cartItems.insertAdjacentHTML('afterend', recommendations);
    }
}

// Initialize cart when script loads
initializeCart();