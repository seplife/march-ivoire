<?php
// admin/api.php - API REST pour MarchéIvoire
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Gérer les requêtes OPTIONS (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configuration
define('PRODUCTS_FILE', '../data/products.json');
define('ORDERS_FILE', '../data/orders.json');
define('SETTINGS_FILE', '../data/settings.json');
define('LOGS_FILE', '../data/api_logs.json');
define('UPLOADS_DIR', '../uploads/products/');
define('THUMBS_DIR', '../uploads/thumbs/');

// Clés API (en production, utiliser une base de données)
define('API_KEYS', [
    'public' => 'pk_marche_ivoire_2025',
    'private' => 'sk_marche_ivoire_2025_secret'
]);

// Démarrer la session pour l'authentification admin
session_start();

class MarcheIvoireAPI {
    private $method;
    private $action;
    private $data;
    private $headers;
    
    public function __construct() {
        $this->method = $_SERVER['REQUEST_METHOD'];
        $this->action = $_GET['action'] ?? '';
        $this->headers = getallheaders();
        
        // Récupérer les données selon la méthode
        switch ($this->method) {
            case 'GET':
                $this->data = $_GET;
                break;
            case 'POST':
                $this->data = array_merge($_POST, $this->getJsonInput());
                break;
            case 'PUT':
                $this->data = $this->getJsonInput();
                break;
            case 'DELETE':
                $this->data = $_GET;
                break;
        }
        
        $this->logRequest();
    }
    
    public function handleRequest() {
        try {
            // Validation de base
            if (empty($this->action)) {
                return $this->response(['error' => 'Action manquante'], 400);
            }
            
            // Router les actions
            switch ($this->action) {
                // Actions publiques (pas d'auth requise)
                case 'products':
                    return $this->getProducts();
                case 'product':
                    return $this->getProduct();
                case 'categories':
                    return $this->getCategories();
                case 'search':
                    return $this->searchProducts();
                case 'stats':
                    return $this->getPublicStats();
                
                // Actions de commande
                case 'create_order':
                    return $this->createOrder();
                case 'verify_order':
                    return $this->verifyOrder();
                
                // Actions admin (auth requise)
                case 'admin_products':
                    $this->requireAdminAuth();
                    return $this->adminGetProducts();
                case 'create_product':
                    $this->requireAdminAuth();
                    return $this->createProduct();
                case 'update_product':
                    $this->requireAdminAuth();
                    return $this->updateProduct();
                case 'delete_product':
                    $this->requireAdminAuth();
                    return $this->deleteProduct();
                case 'orders':
                    $this->requireAdminAuth();
                    return $this->getOrders();
                case 'update_order':
                    $this->requireAdminAuth();
                    return $this->updateOrder();
                case 'dashboard_stats':
                    $this->requireAdminAuth();
                    return $this->getDashboardStats();
                case 'upload_image':
                    $this->requireAdminAuth();
                    return $this->uploadImage();
                
                default:
                    return $this->response(['error' => 'Action non reconnue'], 404);
            }
        } catch (Exception $e) {
            $this->logError($e);
            return $this->response(['error' => 'Erreur serveur'], 500);
        }
    }
    
    // === MÉTHODES PUBLIQUES ===
    
    private function getProducts() {
        $data = $this->loadProducts();
        $products = $data['products'] ?? [];
        
        // Filtres optionnels
        $category = $this->data['category'] ?? '';
        $limit = min((int)($this->data['limit'] ?? 50), 100);
        $offset = max((int)($this->data['offset'] ?? 0), 0);
        $inStock = isset($this->data['in_stock']) ? (bool)$this->data['in_stock'] : null;
        
        // Appliquer les filtres
        if ($category) {
            $products = array_filter($products, function($p) use ($category) {
                return $p['category'] === $category;
            });
        }
        
        if ($inStock !== null) {
            $products = array_filter($products, function($p) use ($inStock) {
                return $p['inStock'] === $inStock;
            });
        }
        
        // Pagination
        $total = count($products);
        $products = array_slice($products, $offset, $limit);
        
        return $this->response([
            'products' => array_values($products),
            'pagination' => [
                'total' => $total,
                'limit' => $limit,
                'offset' => $offset,
                'has_more' => ($offset + $limit) < $total
            ]
        ]);
    }
    
    private function getProduct() {
        $id = (int)($this->data['id'] ?? 0);
        if (!$id) {
            return $this->response(['error' => 'ID produit manquant'], 400);
        }
        
        $data = $this->loadProducts();
        $product = $this->findProductById($data['products'], $id);
        
        if (!$product) {
            return $this->response(['error' => 'Produit non trouvé'], 404);
        }
        
        return $this->response(['product' => $product]);
    }
    
    private function getCategories() {
        $data = $this->loadProducts();
        return $this->response(['categories' => $data['categories'] ?? []]);
    }
    
    private function searchProducts() {
        $query = trim($this->data['q'] ?? '');
        if (strlen($query) < 2) {
            return $this->response(['error' => 'Requête trop courte'], 400);
        }
        
        $data = $this->loadProducts();
        $products = $data['products'] ?? [];
        
        $results = array_filter($products, function($product) use ($query) {
            return stripos($product['title'], $query) !== false ||
                   stripos($product['description'], $query) !== false ||
                   stripos($product['category'], $query) !== false;
        });
        
        return $this->response([
            'query' => $query,
            'results' => array_values($results),
            'count' => count($results)
        ]);
    }
    
    private function getPublicStats() {
        $data = $this->loadProducts();
        $orders = $this->loadOrders();
        
        return $this->response([
            'total_products' => count($data['products'] ?? []),
            'total_categories' => count($data['categories'] ?? []),
            'products_in_stock' => count(array_filter($data['products'] ?? [], function($p) {
                return $p['inStock'] ?? false;
            })),
            'total_orders' => count($orders),
            'last_updated' => $data['metadata']['lastUpdated'] ?? null
        ]);
    }
    
    // === MÉTHODES DE COMMANDE ===
    
    private function createOrder() {
        // Validation des données
        $required = ['customerInfo', 'items', 'total', 'paymentMethod'];
        foreach ($required as $field) {
            if (!isset($this->data[$field])) {
                return $this->response(['error' => "Champ manquant: $field"], 400);
            }
        }
        
        // Générer un ID unique pour la commande
        $orderId = 'ORDER_' . time() . '_' . bin2hex(random_bytes(4));
        
        // Valider les produits et calculer le total
        $calculatedTotal = $this->validateOrderItems($this->data['items']);
        if ($calculatedTotal === false) {
            return $this->response(['error' => 'Produits invalides dans la commande'], 400);
        }
        
        if (abs($calculatedTotal - (float)$this->data['total']) > 0.01) {
            return $this->response(['error' => 'Total incorrect'], 400);
        }
        
        // Créer la commande
        $order = [
            'id' => $orderId,
            'customerInfo' => $this->sanitizeCustomerInfo($this->data['customerInfo']),
            'items' => $this->data['items'],
            'subtotal' => $calculatedTotal,
            'shipping' => 2000, // Frais de livraison fixes
            'total' => $calculatedTotal + 2000,
            'paymentMethod' => $this->data['paymentMethod'],
            'paymentPhone' => $this->data['paymentPhone'] ?? '',
            'status' => 'pending',
            'paymentStatus' => 'pending',
            'createdAt' => date('c'),
            'updatedAt' => date('c'),
            'ipAddress' => $_SERVER['REMOTE_ADDR'] ?? '',
            'userAgent' => $_SERVER['HTTP_USER_AGENT'] ?? ''
        ];
        
        // Sauvegarder la commande
        $orders = $this->loadOrders();
        $orders[] = $order;
        $this->saveOrders($orders);
        
        // Log de la création
        $this->logActivity('order_created', ['order_id' => $orderId, 'total' => $order['total']]);
        
        return $this->response([
            'success' => true,
            'order_id' => $orderId,
            'order' => $order,
            'message' => 'Commande créée avec succès'
        ], 201);
    }
    
    private function verifyOrder() {
        $orderId = $this->data['order_id'] ?? '';
        if (!$orderId) {
            return $this->response(['error' => 'ID commande manquant'], 400);
        }
        
        $orders = $this->loadOrders();
        $order = $this->findOrderById($orders, $orderId);
        
        if (!$order) {
            return $this->response(['error' => 'Commande non trouvée'], 404);
        }
        
        return $this->response(['order' => $order]);
    }
    
    // === MÉTHODES ADMIN ===
    
    private function adminGetProducts() {
        $data = $this->loadProducts();
        return $this->response([
            'products' => $data['products'] ?? [],
            'categories' => $data['categories'] ?? [],
            'metadata' => $data['metadata'] ?? []
        ]);
    }
    
    private function createProduct() {
        // Validation
        $required = ['title', 'description', 'price', 'category'];
        foreach ($required as $field) {
            if (empty($this->data[$field])) {
                return $this->response(['error' => "Champ manquant: $field"], 400);
            }
        }
        
        $data = $this->loadProducts();
        
        // Générer un nouvel ID
        $newId = 1;
        if (!empty($data['products'])) {
            $newId = max(array_column($data['products'], 'id')) + 1;
        }
        
        // Créer le produit
        $product = [
            'id' => $newId,
            'title' => $this->sanitizeString($this->data['title']),
            'description' => $this->sanitizeString($this->data['description']),
            'price' => max(0, (int)$this->data['price']),
            'originalPrice' => !empty($this->data['originalPrice']) ? max(0, (int)$this->data['originalPrice']) : null,
            'discount' => 0,
            'category' => $this->sanitizeString($this->data['category']),
            'image' => $this->data['image'] ?? '',
            'thumbnail' => $this->data['thumbnail'] ?? '',
            'inStock' => (bool)($this->data['inStock'] ?? true),
            'badge' => $this->data['badge'] ?? null,
            'rating' => max(1, min(5, (int)($this->data['rating'] ?? 5))),
            'reviews' => 0,
            'sku' => $this->sanitizeString($this->data['sku'] ?? ''),
            'weight' => $this->sanitizeString($this->data['weight'] ?? ''),
            'origin' => $this->sanitizeString($this->data['origin'] ?? ''),
            'createdAt' => date('c'),
            'updatedAt' => date('c')
        ];
        
        // Calculer le discount
        if ($product['originalPrice'] && $product['originalPrice'] > $product['price']) {
            $product['discount'] = round((($product['originalPrice'] - $product['price']) / $product['originalPrice']) * 100);
        }
        
        // Ajouter le produit
        $data['products'][] = $product;
        
        // Mettre à jour les catégories
        $this->updateCategories($data);
        
        // Sauvegarder
        $this->saveProducts($data);
        
        $this->logActivity('product_created', ['product_id' => $newId, 'title' => $product['title']]);
        
        return $this->response(['success' => true, 'product' => $product], 201);
    }
    
    private function updateProduct() {
        $id = (int)($this->data['id'] ?? 0);
        if (!$id) {
            return $this->response(['error' => 'ID produit manquant'], 400);
        }
        
        $data = $this->loadProducts();
        $productIndex = $this->findProductIndex($data['products'], $id);
        
        if ($productIndex === false) {
            return $this->response(['error' => 'Produit non trouvé'], 404);
        }
        
        $product = &$data['products'][$productIndex];
        
        // Mettre à jour les champs fournis
        $updateableFields = ['title', 'description', 'price', 'originalPrice', 'category', 'image', 'thumbnail', 'inStock', 'badge', 'rating', 'sku', 'weight', 'origin'];
        
        foreach ($updateableFields as $field) {
            if (isset($this->data[$field])) {
                switch ($field) {
                    case 'price':
                    case 'originalPrice':
                        $product[$field] = max(0, (int)$this->data[$field]);
                        break;
                    case 'inStock':
                        $product[$field] = (bool)$this->data[$field];
                        break;
                    case 'rating':
                        $product[$field] = max(1, min(5, (int)$this->data[$field]));
                        break;
                    default:
                        $product[$field] = $this->sanitizeString($this->data[$field]);
                }
            }
        }
        
        // Recalculer le discount
        if ($product['originalPrice'] && $product['originalPrice'] > $product['price']) {
            $product['discount'] = round((($product['originalPrice'] - $product['price']) / $product['originalPrice']) * 100);
        } else {
            $product['discount'] = 0;
        }
        
        $product['updatedAt'] = date('c');
        
        // Mettre à jour les catégories
        $this->updateCategories($data);
        
        // Sauvegarder
        $this->saveProducts($data);
        
        $this->logActivity('product_updated', ['product_id' => $id, 'title' => $product['title']]);
        
        return $this->response(['success' => true, 'product' => $product]);
    }
    
    private function deleteProduct() {
        $id = (int)($this->data['id'] ?? 0);
        if (!$id) {
            return $this->response(['error' => 'ID produit manquant'], 400);
        }
        
        $data = $this->loadProducts();
        $productIndex = $this->findProductIndex($data['products'], $id);
        
        if ($productIndex === false) {
            return $this->response(['error' => 'Produit non trouvé'], 404);
        }
        
        $product = $data['products'][$productIndex];
        
        // Supprimer les images
        $this->deleteProductImages($product);
        
        // Supprimer le produit
        array_splice($data['products'], $productIndex, 1);
        
        // Mettre à jour les catégories
        $this->updateCategories($data);
        
        // Sauvegarder
        $this->saveProducts($data);
        
        $this->logActivity('product_deleted', ['product_id' => $id, 'title' => $product['title']]);
        
        return $this->response(['success' => true, 'message' => 'Produit supprimé']);
    }
    
    private function getOrders() {
        $orders = $this->loadOrders();
        $status = $this->data['status'] ?? '';
        $limit = min((int)($this->data['limit'] ?? 50), 100);
        $offset = max((int)($this->data['offset'] ?? 0), 0);
        
        // Filtrer par statut si fourni
        if ($status) {
            $orders = array_filter($orders, function($order) use ($status) {
                return $order['status'] === $status;
            });
        }
        
        // Trier par date (plus récent en premier)
        usort($orders, function($a, $b) {
            return strtotime($b['createdAt']) - strtotime($a['createdAt']);
        });
        
        // Pagination
        $total = count($orders);
        $orders = array_slice($orders, $offset, $limit);
        
        return $this->response([
            'orders' => array_values($orders),
            'pagination' => [
                'total' => $total,
                'limit' => $limit,
                'offset' => $offset,
                'has_more' => ($offset + $limit) < $total
            ]
        ]);
    }
    
    private function updateOrder() {
        $orderId = $this->data['order_id'] ?? '';
        if (!$orderId) {
            return $this->response(['error' => 'ID commande manquant'], 400);
        }
        
        $orders = $this->loadOrders();
        $orderIndex = $this->findOrderIndex($orders, $orderId);
        
        if ($orderIndex === false) {
            return $this->response(['error' => 'Commande non trouvée'], 404);
        }
        
        $order = &$orders[$orderIndex];
        
        // Mettre à jour les champs autorisés
        $updateableFields = ['status', 'paymentStatus', 'notes'];
        foreach ($updateableFields as $field) {
            if (isset($this->data[$field])) {
                $order[$field] = $this->sanitizeString($this->data[$field]);
            }
        }
        
        $order['updatedAt'] = date('c');
        
        $this->saveOrders($orders);
        
        $this->logActivity('order_updated', ['order_id' => $orderId, 'status' => $order['status']]);
        
        return $this->response(['success' => true, 'order' => $order]);
    }
    
    private function getDashboardStats() {
        $data = $this->loadProducts();
        $orders = $this->loadOrders();
        
        $stats = [
            'products' => [
                'total' => count($data['products'] ?? []),
                'in_stock' => count(array_filter($data['products'] ?? [], function($p) { return $p['inStock']; })),
                'out_of_stock' => count(array_filter($data['products'] ?? [], function($p) { return !$p['inStock']; }))
            ],
            'orders' => [
                'total' => count($orders),
                'pending' => count(array_filter($orders, function($o) { return $o['status'] === 'pending'; })),
                'completed' => count(array_filter($orders, function($o) { return $o['status'] === 'completed'; })),
                'total_revenue' => array_sum(array_column($orders, 'total'))
            ],
            'categories' => count($data['categories'] ?? []),
            'recent_orders' => array_slice(array_reverse($orders), 0, 5)
        ];
        
        return $this->response(['stats' => $stats]);
    }
    
    private function uploadImage() {
        if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
            return $this->response(['error' => 'Aucun fichier uploadé'], 400);
        }
        
        $file = $_FILES['image'];
        $productId = (int)($this->data['product_id'] ?? 0);
        
        try {
            $result = $this->processImageUpload($file, $productId);
            return $this->response(['success' => true, 'images' => $result]);
        } catch (Exception $e) {
            return $this->response(['error' => $e->getMessage()], 400);
        }
    }
    
    // === MÉTHODES UTILITAIRES ===
    
    private function loadProducts() {
        if (!file_exists(PRODUCTS_FILE)) {
            return ['products' => [], 'categories' => [], 'metadata' => []];
        }
        $content = file_get_contents(PRODUCTS_FILE);
        return json_decode($content, true) ?: ['products' => [], 'categories' => [], 'metadata' => []];
    }
    
    private function saveProducts($data) {
        $dir = dirname(PRODUCTS_FILE);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        
        $data['metadata']['lastUpdated'] = date('c');
        $data['metadata']['totalProducts'] = count($data['products']);
        $data['metadata']['totalCategories'] = count($data['categories']);
        
        return file_put_contents(PRODUCTS_FILE, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
    
    private function loadOrders() {
        if (!file_exists(ORDERS_FILE)) {
            return [];
        }
        $content = file_get_contents(ORDERS_FILE);
        return json_decode($content, true) ?: [];
    }
    
    private function saveOrders($orders) {
        $dir = dirname(ORDERS_FILE);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        return file_put_contents(ORDERS_FILE, json_encode($orders, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
    
    private function findProductById($products, $id) {
        foreach ($products as $product) {
            if ($product['id'] === $id) {
                return $product;
            }
        }
        return null;
    }
    
    private function findProductIndex($products, $id) {
        foreach ($products as $index => $product) {
            if ($product['id'] === $id) {
                return $index;
            }
        }
        return false;
    }
    
    private function findOrderById($orders, $id) {
        foreach ($orders as $order) {
            if ($order['id'] === $id) {
                return $order;
            }
        }
        return null;
    }
    
    private function findOrderIndex($orders, $id) {
        foreach ($orders as $index => $order) {
            if ($order['id'] === $id) {
                return $index;
            }
        }
        return false;
    }
    
    private function validateOrderItems($items) {
        $data = $this->loadProducts();
        $products = $data['products'];
        $total = 0;
        
        foreach ($items as $item) {
            if (!isset($item['productId']) || !isset($item['quantity'])) {
                return false;
            }
            
            $product = $this->findProductById($products, $item['productId']);
            if (!$product || !$product['inStock']) {
                return false;
            }
            
            $total += $product['price'] * $item['quantity'];
        }
        
        return $total;
    }
    
    private function sanitizeCustomerInfo($info) {
        $sanitized = [];
        $fields = ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'postalCode', 'deliveryNotes'];
        
        foreach ($fields as $field) {
            if (isset($info[$field])) {
                $sanitized[$field] = $this->sanitizeString($info[$field]);
            }
        }
        
        return $sanitized;
    }
    
    private function sanitizeString($str) {
        return htmlspecialchars(trim($str), ENT_QUOTES, 'UTF-8');
    }
    
    private function updateCategories(&$data) {
        $categories = [];
        $categoryCount = [];
        
        // Compter les produits par catégorie
        foreach ($data['products'] as $product) {
            $cat = $product['category'];
            if (!isset($categoryCount[$cat])) {
                $categoryCount[$cat] = 0;
            }
            $categoryCount[$cat]++;
        }
        
        // Créer la liste des catégories
        foreach ($categoryCount as $name => $count) {
            $categories[] = [
                'id' => crc32($name),
                'name' => $name,
                'icon' => $this->getCategoryIcon($name),
                'description' => "Produits de la catégorie " . $name,
                'productCount' => $count
            ];
        }
        
        $data['categories'] = $categories;
    }
    
    private function getCategoryIcon($category) {
        $icons = [
            'Fruits' => '🍎',
            'Légumes' => '🥕',
            'Épices' => '🌶️',
            'Artisanat' => '🏺',
            'Vêtements' => '👕',
            'Électronique' => '📱'
        ];
        return $icons[$category] ?? '📦';
    }
    
    private function processImageUpload($file, $productId) {
        $allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!in_array($file['type'], $allowedTypes)) {
            throw new Exception('Type de fichier non autorisé');
        }
        
        if ($file['size'] > 5 * 1024 * 1024) {
            throw new Exception('Fichier trop volumineux (max 5MB)');
        }
        
        // Créer les répertoires
        if (!is_dir(UPLOADS_DIR)) mkdir(UPLOADS_DIR, 0755, true);
        if (!is_dir(THUMBS_DIR)) mkdir(THUMBS_DIR, 0755, true);
        
        $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = 'product_' . $productId . '_' . time() . '.' . $extension;
        $thumbFilename = 'product_' . $productId . '_' . time() . '_thumb.' . $extension;
        
        $imagePath = UPLOADS_DIR . $filename;
        $thumbPath = THUMBS_DIR . $thumbFilename;
        
        if (!move_uploaded_file($file['tmp_name'], $imagePath)) {
            throw new Exception('Erreur lors du téléchargement');
        }
        
        // Créer la miniature
        $this->createThumbnail($imagePath, $thumbPath, 200, 150);
        
        return [
            'image' => 'uploads/products/' . $filename,
            'thumbnail' => 'uploads/thumbs/' . $thumbFilename
        ];
    }
    
    private function createThumbnail($source, $destination, $width, $height) {
        $info = getimagesize($source);
        if (!$info) return false;
        
        switch ($info['mime']) {
            case 'image/jpeg': $image = imagecreatefromjpeg($source); break;
            case 'image/png': $image = imagecreatefrompng($source); break;
            case 'image/webp': $image = imagecreatefromwebp($source); break;
            default: return false;
        }
        
        $thumb = imagecreatetruecolor($width, $height);
        imagecopyresampled($thumb, $image, 0, 0, 0, 0, $width, $height, $info[0], $info[1]);
        
        switch ($info['mime']) {
            case 'image/jpeg': imagejpeg($thumb, $destination, 90); break;
            case 'image/png': imagepng($thumb, $destination); break;
            case 'image/webp': imagewebp($thumb, $destination, 90); break;
        }
        
        imagedestroy($image);
        imagedestroy($thumb);
        
        return true;
    }
    
    private function deleteProductImages($product) {
        if (!empty($product['image'])) {
            $imagePath = '../' . $product['image'];
            if (file_exists($imagePath)) {
                unlink($imagePath);
            }
        }
        
        if (!empty($product['thumbnail'])) {
            $thumbPath = '../' . $product['thumbnail'];
            if (file_exists($thumbPath)) {
                unlink($thumbPath);
            }
        }
    }
    
    private function requireAdminAuth() {
        // Vérifier la session admin
        if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
            // Vérifier l'API key en fallback
            $apiKey = $this->headers['Authorization'] ?? $this->headers['X-API-Key'] ?? '';
            if ($apiKey !== 'Bearer ' . API_KEYS['private']) {
                http_response_code(401);
                echo json_encode(['error' => 'Authentification requise']);
                exit();
            }
        }
    }
    
    private function getJsonInput() {
        $input = file_get_contents('php://input');
        return json_decode($input, true) ?: [];
    }
    
    private function response($data, $code = 200) {
        http_response_code($code);
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit();
    }
    
    private function logRequest() {
        $log = [
            'timestamp' => date('c'),
            'method' => $this->method,
            'action' => $this->action,
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
            'authenticated' => isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in']
        ];
        
        $this->writeLog('requests', $log);
    }
    
    private function logActivity($activity, $data = []) {
        $log = [
            'timestamp' => date('c'),
            'activity' => $activity,
            'data' => $data,
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'user' => $_SESSION['admin_username'] ?? 'system'
        ];
        
        $this->writeLog('activities', $log);
    }
    
    private function logError($exception) {
        $log = [
            'timestamp' => date('c'),
            'error' => $exception->getMessage(),
            'file' => $exception->getFile(),
            'line' => $exception->getLine(),
            'trace' => $exception->getTraceAsString(),
            'request' => [
                'method' => $this->method,
                'action' => $this->action,
                'data' => $this->data
            ]
        ];
        
        $this->writeLog('errors', $log);
    }
    
    private function writeLog($type, $log) {
        try {
            $logsDir = dirname(LOGS_FILE);
            if (!is_dir($logsDir)) {
                mkdir($logsDir, 0755, true);
            }
            
            $logFile = $logsDir . '/' . $type . '_' . date('Y-m') . '.json';
            
            $logs = [];
            if (file_exists($logFile)) {
                $content = file_get_contents($logFile);
                $logs = json_decode($content, true) ?: [];
            }
            
            $logs[] = $log;
            
            // Garder seulement les 1000 derniers logs par fichier
            if (count($logs) > 1000) {
                $logs = array_slice($logs, -1000);
            }
            
            file_put_contents($logFile, json_encode($logs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        } catch (Exception $e) {
            // Ignorer les erreurs de logging pour éviter les boucles
            error_log('Erreur de logging: ' . $e->getMessage());
        }
    }
}

// Point d'entrée de l'API
try {
    $api = new MarcheIvoireAPI();
    $api->handleRequest();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Erreur serveur interne',
        'message' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>