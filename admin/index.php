<?php
// admin/index.php
session_start();

// Configuration
define('ADMIN_USERNAME', 'admin');
define('ADMIN_PASSWORD', 'marche_ivoire_2025'); // À changer en production
define('PRODUCTS_FILE', '../data/products.json');
define('ORDERS_FILE', '../data/orders.json');
define('UPLOADS_DIR', '../uploads/products/');
define('THUMBS_DIR', '../uploads/thumbs/');

// Vérification de l'authentification
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['login'])) {
        $username = $_POST['username'] ?? '';
        $password = $_POST['password'] ?? '';
        
        if ($username === ADMIN_USERNAME && $password === ADMIN_PASSWORD) {
            $_SESSION['admin_logged_in'] = true;
            $_SESSION['admin_username'] = $username;
            header('Location: index.php');
            exit;
        } else {
            $error = 'Identifiants incorrects';
        }
    }
    
    // Affichage du formulaire de connexion
    include 'login.php';
    exit;
}

// Gestion des actions
$action = $_GET['action'] ?? 'dashboard';
$message = '';
$error = '';

// Fonctions utilitaires
function loadProducts() {
    if (!file_exists(PRODUCTS_FILE)) {
        return ['products' => [], 'categories' => [], 'metadata' => []];
    }
    $content = file_get_contents(PRODUCTS_FILE);
    return json_decode($content, true) ?: ['products' => [], 'categories' => [], 'metadata' => []];
}

function saveProducts($data) {
    // Créer le répertoire si nécessaire
    $dir = dirname(PRODUCTS_FILE);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    
    // Mettre à jour les métadonnées
    $data['metadata']['lastUpdated'] = date('c');
    $data['metadata']['totalProducts'] = count($data['products']);
    $data['metadata']['totalCategories'] = count($data['categories']);
    
    return file_put_contents(PRODUCTS_FILE, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function loadOrders() {
    if (!file_exists(ORDERS_FILE)) {
        return [];
    }
    $content = file_get_contents(ORDERS_FILE);
    return json_decode($content, true) ?: [];
}

function saveOrders($orders) {
    $dir = dirname(ORDERS_FILE);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    return file_put_contents(ORDERS_FILE, json_encode($orders, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function uploadImage($file, $productId) {
    $allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!in_array($file['type'], $allowedTypes)) {
        throw new Exception('Type de fichier non autorisé');
    }
    
    if ($file['size'] > 5 * 1024 * 1024) { // 5MB max
        throw new Exception('Fichier trop volumineux (max 5MB)');
    }
    
    // Créer les répertoires si nécessaire
    if (!is_dir(UPLOADS_DIR)) {
        mkdir(UPLOADS_DIR, 0755, true);
    }
    if (!is_dir(THUMBS_DIR)) {
        mkdir(THUMBS_DIR, 0755, true);
    }
    
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = 'product_' . $productId . '_' . time() . '.' . $extension;
    $thumbFilename = 'product_' . $productId . '_' . time() . '_thumb.' . $extension;
    
    $imagePath = UPLOADS_DIR . $filename;
    $thumbPath = THUMBS_DIR . $thumbFilename;
    
    if (!move_uploaded_file($file['tmp_name'], $imagePath)) {
        throw new Exception('Erreur lors du téléchargement');
    }
    
    // Créer la miniature
    createThumbnail($imagePath, $thumbPath, 200, 150);
    
    return [
        'image' => 'uploads/products/' . $filename,
        'thumbnail' => 'uploads/thumbs/' . $thumbFilename
    ];
}

function createThumbnail($source, $destination, $width, $height) {
    $info = getimagesize($source);
    if (!$info) return false;
    
    switch ($info['mime']) {
        case 'image/jpeg':
            $image = imagecreatefromjpeg($source);
            break;
        case 'image/png':
            $image = imagecreatefrompng($source);
            break;
        case 'image/webp':
            $image = imagecreatefromwebp($source);
            break;
        default:
            return false;
    }
    
    $thumb = imagecreatetruecolor($width, $height);
    imagecopyresampled($thumb, $image, 0, 0, 0, 0, $width, $height, $info[0], $info[1]);
    
    switch ($info['mime']) {
        case 'image/jpeg':
            imagejpeg($thumb, $destination, 90);
            break;
        case 'image/png':
            imagepng($thumb, $destination);
            break;
        case 'image/webp':
            imagewebp($thumb, $destination, 90);
            break;
    }
    
    imagedestroy($image);
    imagedestroy($thumb);
    
    return true;
}

// Traitement des actions
switch ($action) {
    case 'add_product':
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            try {
                $data = loadProducts();
                
                // Générer un nouvel ID
                $newId = 1;
                if (!empty($data['products'])) {
                    $newId = max(array_column($data['products'], 'id')) + 1;
                }
                
                $product = [
                    'id' => $newId,
                    'title' => $_POST['title'] ?? '',
                    'description' => $_POST['description'] ?? '',
                    'price' => (int)($_POST['price'] ?? 0),
                    'originalPrice' => !empty($_POST['originalPrice']) ? (int)$_POST['originalPrice'] : null,
                    'discount' => 0,
                    'category' => $_POST['category'] ?? '',
                    'image' => '',
                    'thumbnail' => '',
                    'inStock' => isset($_POST['inStock']),
                    'badge' => $_POST['badge'] ?? null,
                    'rating' => (int)($_POST['rating'] ?? 5),
                    'reviews' => 0,
                    'sku' => $_POST['sku'] ?? '',
                    'weight' => $_POST['weight'] ?? '',
                    'origin' => $_POST['origin'] ?? '',
                    'createdAt' => date('c'),
                    'updatedAt' => date('c')
                ];
                
                // Calculer le discount si nécessaire
                if ($product['originalPrice'] && $product['originalPrice'] > $product['price']) {
                    $product['discount'] = round((($product['originalPrice'] - $product['price']) / $product['originalPrice']) * 100);
                }
                
                // Upload d'image
                if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
                    $imageData = uploadImage($_FILES['image'], $newId);
                    $product['image'] = $imageData['image'];
                    $product['thumbnail'] = $imageData['thumbnail'];
                }
                
                $data['products'][] = $product;
                
                // Mettre à jour les catégories
                $categories = array_unique(array_column($data['products'], 'category'));
                $data['categories'] = array_map(function($cat) use ($data) {
                    return [
                        'id' => crc32($cat),
                        'name' => $cat,
                        'icon' => getCategoryIcon($cat),
                        'description' => "Produits de la catégorie " . $cat,
                        'productCount' => count(array_filter($data['products'], function($p) use ($cat) {
                            return $p['category'] === $cat;
                        }))
                    ];
                }, $categories);
                
                if (saveProducts($data)) {
                    $message = 'Produit ajouté avec succès';
                } else {
                    $error = 'Erreur lors de la sauvegarde';
                }
            } catch (Exception $e) {
                $error = $e->getMessage();
            }
        }
        break;
        
    case 'edit_product':
        $productId = (int)($_GET['id'] ?? 0);
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            try {
                $data = loadProducts();
                $productIndex = array_search($productId, array_column($data['products'], 'id'));
                
                if ($productIndex !== false) {
                    $product = &$data['products'][$productIndex];
                    
                    $product['title'] = $_POST['title'] ?? $product['title'];
                    $product['description'] = $_POST['description'] ?? $product['description'];
                    $product['price'] = (int)($_POST['price'] ?? $product['price']);
                    $product['originalPrice'] = !empty($_POST['originalPrice']) ? (int)$_POST['originalPrice'] : null;
                    $product['category'] = $_POST['category'] ?? $product['category'];
                    $product['inStock'] = isset($_POST['inStock']);
                    $product['badge'] = $_POST['badge'] ?? null;
                    $product['rating'] = (int)($_POST['rating'] ?? $product['rating']);
                    $product['sku'] = $_POST['sku'] ?? $product['sku'];
                    $product['weight'] = $_POST['weight'] ?? $product['weight'];
                    $product['origin'] = $_POST['origin'] ?? $product['origin'];
                    $product['updatedAt'] = date('c');
                    
                    // Recalculer le discount
                    if ($product['originalPrice'] && $product['originalPrice'] > $product['price']) {
                        $product['discount'] = round((($product['originalPrice'] - $product['price']) / $product['originalPrice']) * 100);
                    } else {
                        $product['discount'] = 0;
                    }
                    
                    // Upload nouvelle image si fournie
                    if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
                        $imageData = uploadImage($_FILES['image'], $productId);
                        $product['image'] = $imageData['image'];
                        $product['thumbnail'] = $imageData['thumbnail'];
                    }
                    
                    if (saveProducts($data)) {
                        $message = 'Produit modifié avec succès';
                    } else {
                        $error = 'Erreur lors de la sauvegarde';
                    }
                }
            } catch (Exception $e) {
                $error = $e->getMessage();
            }
        }
        break;
        
    case 'delete_product':
        $productId = (int)($_GET['id'] ?? 0);
        if ($productId > 0) {
            $data = loadProducts();
            $data['products'] = array_filter($data['products'], function($p) use ($productId) {
                return $p['id'] !== $productId;
            });
            $data['products'] = array_values($data['products']); // Réindexer
            
            if (saveProducts($data)) {
                $message = 'Produit supprimé avec succès';
            } else {
                $error = 'Erreur lors de la suppression';
            }
        }
        break;
        
    case 'logout':
        session_destroy();
        header('Location: index.php');
        exit;
}

function getCategoryIcon($category) {
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

// Charger les données pour l'affichage
$data = loadProducts();
$orders = loadOrders();

// Statistiques
$stats = [
    'totalProducts' => count($data['products']),
    'totalCategories' => count($data['categories']),
    'totalOrders' => count($orders),
    'totalRevenue' => array_sum(array_column($orders, 'total')),
    'productsInStock' => count(array_filter($data['products'], function($p) { return $p['inStock']; })),
    'productsOutStock' => count(array_filter($data['products'], function($p) { return !$p['inStock']; }))
];
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Administration - MarchéIvoire</title>
    <style>
        :root {
            --primary: #FF6B35;
            --success: #28A745;
            --danger: #DC3545;
            --warning: #FFC107;
            --info: #17A2B8;
            --dark: #343A40;
            --light: #F8F9FA;
            --white: #FFFFFF;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: var(--light);
            color: var(--dark);
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: var(--white);
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .nav {
            display: flex;
            gap: 20px;
        }
        
        .nav a {
            color: var(--primary);
            text-decoration: none;
            padding: 10px 15px;
            border-radius: 5px;
            transition: all 0.3s;
        }
        
        .nav a:hover, .nav a.active {
            background: var(--primary);
            color: var(--white);
        }
        
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            font-weight: 600;
            transition: all 0.3s;
        }
        
        .btn-primary { background: var(--primary); color: var(--white); }
        .btn-success { background: var(--success); color: var(--white); }
        .btn-danger { background: var(--danger); color: var(--white); }
        .btn-warning { background: var(--warning); color: var(--dark); }
        .btn-info { background: var(--info); color: var(--white); }
        
        .btn:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }
        
        .card {
            background: var(--white);
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: var(--white);
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .stat-number {
            font-size: 2rem;
            font-weight: bold;
            color: var(--primary);
        }
        
        .table {
            width: 100%;
            border-collapse: collapse;
            background: var(--white);
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .table th, .table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        
        .table th {
            background: var(--primary);
            color: var(--white);
        }
        
        .table tr:hover {
            background: var(--light);
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
        }
        
        .form-control {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 14px;
        }
        
        .form-control:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.2);
        }
        
        .alert {
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        
        .alert-success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .alert-danger {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .product-image {
            width: 60px;
            height: 60px;
            object-fit: cover;
            border-radius: 5px;
        }
        
        .badge {
            padding: 3px 8px;
            border-radius: 3px;
            font-size: 12px;
            font-weight: 600;
        }
        
        .badge-success { background: var(--success); color: var(--white); }
        .badge-danger { background: var(--danger); color: var(--white); }
        .badge-warning { background: var(--warning); color: var(--dark); }
        .badge-info { background: var(--info); color: var(--white); }
        
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 1000;
        }
        
        .modal.active {
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .modal-content {
            background: var(--white);
            padding: 30px;
            border-radius: 8px;
            width: 90%;
            max-width: 600px;
            max-height: 90vh;
            overflow-y: auto;
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        
        .close {
            font-size: 24px;
            cursor: pointer;
            color: var(--danger);
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }
            
            .header {
                flex-direction: column;
                gap: 15px;
            }
            
            .nav {
                flex-wrap: wrap;
                justify-content: center;
            }
            
            .table {
                font-size: 12px;
            }
            
            .table th, .table td {
                padding: 8px 5px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛒 Administration MarchéIvoire</h1>
            <div class="nav">
                <a href="?action=dashboard" class="<?= $action === 'dashboard' ? 'active' : '' ?>">Tableau de bord</a>
                <a href="?action=products" class="<?= $action === 'products' ? 'active' : '' ?>">Produits</a>
                <a href="?action=orders" class="<?= $action === 'orders' ? 'active' : '' ?>">Commandes</a>
                <a href="?action=logout" class="btn btn-danger">Déconnexion</a>
            </div>
        </div>
        
        <?php if ($message): ?>
        <div class="alert alert-success"><?= htmlspecialchars($message) ?></div>
        <?php endif; ?>
        
        <?php if ($error): ?>
        <div class="alert alert-danger"><?= htmlspecialchars($error) ?></div>
        <?php endif; ?>
        
        <?php if ($action === 'dashboard' || $action === ''): ?>
        <!-- Tableau de bord -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number"><?= $stats['totalProducts'] ?></div>
                <div>Produits totaux</div>
            </div>
            <div class="stat-card">
                <div class="stat-number"><?= $stats['productsInStock'] ?></div>
                <div>En stock</div>
            </div>
            <div class="stat-card">
                <div class="stat-number"><?= $stats['productsOutStock'] ?></div>
                <div>Ruptures</div>
            </div>
            <div class="stat-card">
                <div class="stat-number"><?= $stats['totalOrders'] ?></div>
                <div>Commandes</div>
            </div>
            <div class="stat-card">
                <div class="stat-number"><?= number_format($stats['totalRevenue']) ?> F</div>
                <div>Chiffre d'affaires</div>
            </div>
            <div class="stat-card">
                <div class="stat-number"><?= $stats['totalCategories'] ?></div>
                <div>Catégories</div>
            </div>
        </div>
        
        <div class="card">
            <h3>Activité récente</h3>
            <p>Dernières commandes et modifications produits...</p>
            <!-- Ici on pourrait afficher les dernières activités -->
        </div>
        
        <?php elseif ($action === 'products'): ?>
        <!-- Gestion des produits -->
        <div class="card">
            <div class="modal-header">
                <h3>Gestion des produits</h3>
                <button class="btn btn-primary" onclick="openModal('addProductModal')">+ Ajouter un produit</button>
            </div>
            
            <table class="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Image</th>
                        <th>Nom</th>
                        <th>Catégorie</th>
                        <th>Prix</th>
                        <th>Stock</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($data['products'] as $product): ?>
                    <tr>
                        <td><?= $product['id'] ?></td>
                        <td>
                            <?php if ($product['thumbnail']): ?>
                            <img src="../<?= htmlspecialchars($product['thumbnail']) ?>" class="product-image" alt="<?= htmlspecialchars($product['title']) ?>">
                            <?php else: ?>
                            <div style="width:60px;height:60px;background:#ddd;border-radius:5px;display:flex;align-items:center;justify-content:center;">📦</div>
                            <?php endif; ?>
                        </td>
                        <td>
                            <strong><?= htmlspecialchars($product['title']) ?></strong><br>
                            <small><?= htmlspecialchars(substr($product['description'], 0, 50)) ?>...</small>
                        </td>
                        <td>
                            <?php foreach ($data['categories'] as $cat): ?>
                                <?php if ($cat['name'] === $product['category']): ?>
                                    <?= $cat['icon'] ?> <?= htmlspecialchars($product['category']) ?>
                                    <?php break; ?>
                                <?php endif; ?>
                            <?php endforeach; ?>
                        </td>
                        <td>
                            <?= number_format($product['price']) ?> F
                            <?php if ($product['originalPrice']): ?>
                            <br><small><del><?= number_format($product['originalPrice']) ?> F</del> (-<?= $product['discount'] ?>%)</small>
                            <?php endif; ?>
                        </td>
                        <td>
                            <?php if ($product['inStock']): ?>
                            <span class="badge badge-success">En stock</span>
                            <?php else: ?>
                            <span class="badge badge-danger">Rupture</span>
                            <?php endif; ?>
                        </td>
                        <td>
                            <a href="?action=edit_product&id=<?= $product['id'] ?>" class="btn btn-info btn-sm">✏️</a>
                            <a href="?action=delete_product&id=<?= $product['id'] ?>" 
                               onclick="return confirm('Supprimer ce produit ?')" 
                               class="btn btn-danger btn-sm">🗑️</a>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        
        <?php elseif ($action === 'orders'): ?>
        <!-- Gestion des commandes -->
        <div class="card">
            <h3>Commandes</h3>
            <?php if (empty($orders)): ?>
            <p>Aucune commande pour le moment.</p>
            <?php else: ?>
            <table class="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Date</th>
                        <th>Client</th>
                        <th>Total</th>
                        <th>Statut</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($orders as $order): ?>
                    <tr>
                        <td><?= htmlspecialchars($order['id']) ?></td>
                        <td><?= date('d/m/Y H:i', strtotime($order['createdAt'])) ?></td>
                        <td><?= htmlspecialchars($order['customerName']) ?></td>
                        <td><?= number_format($order['total']) ?> F</td>
                        <td>
                            <span class="badge badge-<?= $order['status'] === 'completed' ? 'success' : 'warning' ?>">
                                <?= ucfirst($order['status']) ?>
                            </span>
                        </td>
                        <td>
                            <button class="btn btn-info btn-sm" onclick="viewOrder(<?= htmlspecialchars(json_encode($order)) ?>)">👁️</button>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
            <?php endif; ?>
        </div>
        
        <?php elseif ($action === 'add_product' || $action === 'edit_product'): ?>
        <!-- Formulaire d'ajout/modification de produit -->
        <?php
        $product = null;
        if ($action === 'edit_product') {
            $productId = (int)($_GET['id'] ?? 0);
            $product = array_filter($data['products'], function($p) use ($productId) {
                return $p['id'] === $productId;
            });
            $product = $product ? array_values($product)[0] : null;
        }
        ?>
        
        <div class="card">
            <h3><?= $action === 'edit_product' ? 'Modifier le produit' : 'Ajouter un produit' ?></h3>
            
            <form method="POST" enctype="multipart/form-data">
                <div class="form-group">
                    <label>Nom du produit *</label>
                    <input type="text" name="title" class="form-control" 
                           value="<?= $product ? htmlspecialchars($product['title']) : '' ?>" required>
                </div>
                
                <div class="form-group">
                    <label>Description *</label>
                    <textarea name="description" class="form-control" rows="4" required><?= $product ? htmlspecialchars($product['description']) : '' ?></textarea>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div class="form-group">
                        <label>Prix (FCFA) *</label>
                        <input type="number" name="price" class="form-control" 
                               value="<?= $product ? $product['price'] : '' ?>" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Prix original (pour promo)</label>
                        <input type="number" name="originalPrice" class="form-control" 
                               value="<?= $product && $product['originalPrice'] ? $product['originalPrice'] : '' ?>">
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div class="form-group">
                        <label>Catégorie *</label>
                        <select name="category" class="form-control" required>
                            <option value="">Choisir une catégorie</option>
                            <?php 
                            $categories = ['Fruits', 'Légumes', 'Épices', 'Artisanat', 'Vêtements', 'Électronique'];
                            foreach ($categories as $cat): 
                            ?>
                            <option value="<?= $cat ?>" <?= ($product && $product['category'] === $cat) ? 'selected' : '' ?>>
                                <?= getCategoryIcon($cat) ?> <?= $cat ?>
                            </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Badge</label>
                        <select name="badge" class="form-control">
                            <option value="">Aucun badge</option>
                            <option value="new" <?= ($product && $product['badge'] === 'new') ? 'selected' : '' ?>>Nouveau</option>
                            <option value="sale" <?= ($product && $product['badge'] === 'sale') ? 'selected' : '' ?>>Promo</option>
                            <option value="popular" <?= ($product && $product['badge'] === 'popular') ? 'selected' : '' ?>>Populaire</option>
                        </select>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
                    <div class="form-group">
                        <label>SKU</label>
                        <input type="text" name="sku" class="form-control" 
                               value="<?= $product ? htmlspecialchars($product['sku']) : '' ?>">
                    </div>
                    
                    <div class="form-group">
                        <label>Poids</label>
                        <input type="text" name="weight" class="form-control" 
                               value="<?= $product ? htmlspecialchars($product['weight']) : '' ?>">
                    </div>
                    
                    <div class="form-group">
                        <label>Origine</label>
                        <input type="text" name="origin" class="form-control" 
                               value="<?= $product ? htmlspecialchars($product['origin']) : '' ?>">
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr auto; gap: 20px; align-items: end;">
                    <div class="form-group">
                        <label>Image du produit</label>
                        <input type="file" name="image" class="form-control" accept="image/*">
                        <?php if ($product && $product['thumbnail']): ?>
                        <br><img src="../<?= htmlspecialchars($product['thumbnail']) ?>" style="max-width: 100px; max-height: 100px;">
                        <?php endif; ?>
                    </div>
                    
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="inStock" <?= ($product && $product['inStock']) ? 'checked' : 'checked' ?>>
                            En stock
                        </label>
                    </div>
                </div>
                
                <div style="margin-top: 30px;">
                    <button type="submit" class="btn btn-success">
                        <?= $action === 'edit_product' ? 'Modifier' : 'Ajouter' ?> le produit
                    </button>
                    <a href="?action=products" class="btn btn-secondary">Annuler</a>
                </div>
            </form>
        </div>
        
        <?php endif; ?>
    </div>
    
    <script>
        function openModal(modalId) {
            document.getElementById(modalId).classList.add('active');
        }
        
        function closeModal(modalId) {
            document.getElementById(modalId).classList.remove('active');
        }
        
        function viewOrder(order) {
            alert('Détails de la commande #' + order.id + '\nTotal: ' + order.total + ' FCFA\nStatut: ' + order.status);
        }
        
        // Fermer les modales en cliquant en dehors
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('active');
            }
        });
    </script>
</body>
</html>