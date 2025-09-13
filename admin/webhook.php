<?php
// admin/webhook.php - Webhook CinetPay pour MarchéIvoire
header('Content-Type: application/json; charset=utf-8');

// Configuration CinetPay
define('CINETPAY_API_KEY', 'votre_api_key_cinetpay'); // À remplacer
define('CINETPAY_SITE_ID', 'votre_site_id_cinetpay'); // À remplacer
define('CINETPAY_SECRET_KEY', 'votre_secret_key_cinetpay'); // À remplacer

// Fichiers de données
define('ORDERS_FILE', '../data/orders.json');
define('PAYMENTS_FILE', '../data/payments.json');
define('WEBHOOK_LOGS_FILE', '../data/webhook_logs.json');

// Configuration email
define('SMTP_HOST', 'smtp.votre-provider.com');
define('SMTP_USER', 'noreply@votre-domaine.com');
define('SMTP_PASS', 'votre_mot_de_passe_email');
define('FROM_EMAIL', 'noreply@marcheiivoire.com');
define('FROM_NAME', 'MarchéIvoire');
define('ADMIN_EMAIL', 'admin@marcheiivoire.com');

class CinetPayWebhook {
    private $rawInput;
    private $payload;
    private $signature;
    
    public function __construct() {
        $this->rawInput = file_get_contents('php://input');
        $this->payload = json_decode($this->rawInput, true);
        $this->signature = $_SERVER['HTTP_X_CINETPAY_SIGNATURE'] ?? '';
        
        $this->logWebhook('received', [
            'payload' => $this->payload,
            'signature' => $this->signature,
            'headers' => getallheaders()
        ]);
    }
    
    public function handle() {
        try {
            // Vérifier que le payload est valide
            if (!$this->payload) {
                $this->logWebhook('error', ['message' => 'Payload JSON invalide']);
                return $this->response(['error' => 'Payload invalide'], 400);
            }
            
            // Vérifier la signature pour la sécurité
            if (!$this->verifySignature()) {
                $this->logWebhook('error', ['message' => 'Signature invalide']);
                return $this->response(['error' => 'Signature invalide'], 401);
            }
            
            // Router selon le type d'événement
            $eventType = $this->payload['event'] ?? '';
            
            switch ($eventType) {
                case 'payment.completed':
                    return $this->handlePaymentCompleted();
                case 'payment.failed':
                    return $this->handlePaymentFailed();
                case 'payment.pending':
                    return $this->handlePaymentPending();
                case 'payment.cancelled':
                    return $this->handlePaymentCancelled();
                default:
                    $this->logWebhook('warning', ['message' => 'Type d\'événement non géré', 'event' => $eventType]);
                    return $this->response(['message' => 'Événement reçu mais non traité'], 200);
            }
            
        } catch (Exception $e) {
            $this->logWebhook('error', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);
            return $this->response(['error' => 'Erreur serveur'], 500);
        }
    }
    
    private function verifySignature() {
        if (empty($this->signature)) {
            return false;
        }
        
        // Calculer la signature attendue
        $expectedSignature = hash_hmac('sha256', $this->rawInput, CINETPAY_SECRET_KEY);
        
        // Comparer les signatures de manière sécurisée
        return hash_equals($expectedSignature, $this->signature);
    }
    
    private function handlePaymentCompleted() {
        $paymentData = $this->payload['data'] ?? [];
        $transactionId = $paymentData['transaction_id'] ?? '';
        $orderId = $paymentData['custom'] ?? $paymentData['order_id'] ?? '';
        $amount = (float)($paymentData['amount'] ?? 0);
        $currency = $paymentData['currency'] ?? 'XOF';
        $paymentMethod = $paymentData['payment_method'] ?? '';
        $customerPhone = $paymentData['customer_phone'] ?? '';
        
        $this->logWebhook('info', [
            'message' => 'Paiement complété reçu',
            'transaction_id' => $transactionId,
            'order_id' => $orderId,
            'amount' => $amount
        ]);
        
        // Vérifier que la commande existe
        $order = $this->findOrder($orderId);
        if (!$order) {
            $this->logWebhook('error', ['message' => 'Commande non trouvée', 'order_id' => $orderId]);
            return $this->response(['error' => 'Commande non trouvée'], 404);
        }
        
        // Vérifier le montant
        if (abs($amount - $order['total']) > 0.01) {
            $this->logWebhook('error', [
                'message' => 'Montant incorrect',
                'expected' => $order['total'],
                'received' => $amount
            ]);
            return $this->response(['error' => 'Montant incorrect'], 400);
        }
        
        // Mettre à jour la commande
        $this->updateOrderStatus($orderId, 'completed', 'paid', [
            'transaction_id' => $transactionId,
            'payment_method' => $paymentMethod,
            'payment_phone' => $customerPhone,
            'paid_at' => date('c'),
            'payment_details' => $paymentData
        ]);
        
        // Enregistrer le paiement
        $this->recordPayment([
            'id' => $transactionId,
            'order_id' => $orderId,
            'amount' => $amount,
            'currency' => $currency,
            'payment_method' => $paymentMethod,
            'customer_phone' => $customerPhone,
            'status' => 'completed',
            'cinetpay_data' => $paymentData,
            'created_at' => date('c')
        ]);
        
        // Envoyer les emails de confirmation
        $this->sendPaymentConfirmationEmails($order, $paymentData);
        
        // Traitement post-paiement (stock, etc.)
        $this->processPostPayment($order);
        
        $this->logWebhook('success', [
            'message' => 'Paiement traité avec succès',
            'order_id' => $orderId,
            'transaction_id' => $transactionId
        ]);
        
        return $this->response(['message' => 'Paiement traité avec succès'], 200);
    }
    
    private function handlePaymentFailed() {
        $paymentData = $this->payload['data'] ?? [];
        $orderId = $paymentData['custom'] ?? $paymentData['order_id'] ?? '';
        $reason = $paymentData['reason'] ?? 'Échec du paiement';
        
        $this->logWebhook('info', [
            'message' => 'Paiement échoué',
            'order_id' => $orderId,
            'reason' => $reason
        ]);
        
        // Mettre à jour la commande
        $this->updateOrderStatus($orderId, 'payment_failed', 'failed', [
            'failure_reason' => $reason,
            'failed_at' => date('c'),
            'payment_details' => $paymentData
        ]);
        
        // Envoyer notification d'échec
        $order = $this->findOrder($orderId);
        if ($order) {
            $this->sendPaymentFailedEmail($order, $reason);
        }
        
        return $this->response(['message' => 'Échec de paiement traité'], 200);
    }
    
    private function handlePaymentPending() {
        $paymentData = $this->payload['data'] ?? [];
        $orderId = $paymentData['custom'] ?? $paymentData['order_id'] ?? '';
        
        $this->logWebhook('info', [
            'message' => 'Paiement en attente',
            'order_id' => $orderId
        ]);
        
        // Mettre à jour le statut
        $this->updateOrderStatus($orderId, 'pending', 'pending', [
            'pending_at' => date('c'),
            'payment_details' => $paymentData
        ]);
        
        return $this->response(['message' => 'Paiement en attente traité'], 200);
    }
    
    private function handlePaymentCancelled() {
        $paymentData = $this->payload['data'] ?? [];
        $orderId = $paymentData['custom'] ?? $paymentData['order_id'] ?? '';
        
        $this->logWebhook('info', [
            'message' => 'Paiement annulé',
            'order_id' => $orderId
        ]);
        
        // Mettre à jour le statut
        $this->updateOrderStatus($orderId, 'cancelled', 'cancelled', [
            'cancelled_at' => date('c'),
            'payment_details' => $paymentData
        ]);
        
        return $this->response(['message' => 'Annulation traitée'], 200);
    }
    
    private function findOrder($orderId) {
        if (!file_exists(ORDERS_FILE)) {
            return null;
        }
        
        $orders = json_decode(file_get_contents(ORDERS_FILE), true) ?: [];
        
        foreach ($orders as $order) {
            if ($order['id'] === $orderId) {
                return $order;
            }
        }
        
        return null;
    }
    
    private function updateOrderStatus($orderId, $status, $paymentStatus, $additionalData = []) {
        if (!file_exists(ORDERS_FILE)) {
            return false;
        }
        
        $orders = json_decode(file_get_contents(ORDERS_FILE), true) ?: [];
        
        foreach ($orders as &$order) {
            if ($order['id'] === $orderId) {
                $order['status'] = $status;
                $order['paymentStatus'] = $paymentStatus;
                $order['updatedAt'] = date('c');
                
                // Ajouter les données supplémentaires
                foreach ($additionalData as $key => $value) {
                    $order[$key] = $value;
                }
                
                break;
            }
        }
        
        return file_put_contents(ORDERS_FILE, json_encode($orders, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
    
    private function recordPayment($payment) {
        $payments = [];
        if (file_exists(PAYMENTS_FILE)) {
            $payments = json_decode(file_get_contents(PAYMENTS_FILE), true) ?: [];
        }
        
        $payments[] = $payment;
        
        // Créer le répertoire si nécessaire
        $dir = dirname(PAYMENTS_FILE);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        
        return file_put_contents(PAYMENTS_FILE, json_encode($payments, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
    
    private function sendPaymentConfirmationEmails($order, $paymentData) {
        try {
            // Email au client
            $this->sendCustomerEmail($order, $paymentData);
            
            // Email à l'admin
            $this->sendAdminNotification($order, $paymentData);
            
        } catch (Exception $e) {
            $this->logWebhook('error', [
                'message' => 'Erreur envoi email',
                'error' => $e->getMessage()
            ]);
        }
    }
    
    private function sendCustomerEmail($order, $paymentData) {
        $customerEmail = $order['customerInfo']['email'] ?? '';
        if (!$customerEmail) {
            return;
        }
        
        $subject = "Confirmation de commande - MarchéIvoire #{$order['id']}";
        
        $message = $this->generateCustomerEmailTemplate($order, $paymentData);
        
        $this->sendEmail($customerEmail, $subject, $message);
    }
    
    private function sendAdminNotification($order, $paymentData) {
        $subject = "Nouvelle commande payée - MarchéIvoire #{$order['id']}";
        
        $message = $this->generateAdminEmailTemplate($order, $paymentData);
        
        $this->sendEmail(ADMIN_EMAIL, $subject, $message);
    }
    
    private function sendPaymentFailedEmail($order, $reason) {
        $customerEmail = $order['customerInfo']['email'] ?? '';
        if (!$customerEmail) {
            return;
        }
        
        $subject = "Problème de paiement - MarchéIvoire #{$order['id']}";
        
        $message = "
        <html>
        <body style='font-family: Arial, sans-serif;'>
            <div style='max-width: 600px; margin: 0 auto;'>
                <h2 style='color: #FF6B35;'>Problème avec votre paiement</h2>
                
                <p>Bonjour {$order['customerInfo']['firstName']},</p>
                
                <p>Nous avons rencontré un problème lors du traitement de votre paiement pour la commande #{$order['id']}.</p>
                
                <p><strong>Raison :</strong> {$reason}</p>
                
                <p>Vous pouvez réessayer le paiement en suivant ce lien :</p>
                <p><a href='https://votre-domaine.com/retry-payment.html?order={$order['id']}' style='background: #FF6B35; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>Réessayer le paiement</a></p>
                
                <p>Si le problème persiste, contactez notre support :</p>
                <p>📧 support@marcheiivoire.com<br>📞 +225 XX XX XX XX XX</p>
                
                <hr>
                <p style='font-size: 12px; color: #666;'>MarchéIvoire - Votre marketplace ivoirienne</p>
            </div>
        </body>
        </html>
        ";
        
        $this->sendEmail($customerEmail, $subject, $message);
    }
    
    private function generateCustomerEmailTemplate($order, $paymentData) {
        $itemsHtml = '';
        foreach ($order['items'] as $item) {
            // Note: En production, récupérer les détails du produit depuis la base
            $itemsHtml .= "<tr>
                <td>Produit #{$item['productId']}</td>
                <td>{$item['quantity']}</td>
                <td>" . number_format($item['quantity'] * 1000) . " FCFA</td>
            </tr>";
        }
        
        return "
        <html>
        <body style='font-family: Arial, sans-serif;'>
            <div style='max-width: 600px; margin: 0 auto;'>
                <h2 style='color: #FF6B35;'>🎉 Commande confirmée !</h2>
                
                <p>Bonjour {$order['customerInfo']['firstName']},</p>
                
                <p>Votre paiement a été traité avec succès ! Voici les détails de votre commande :</p>
                
                <div style='background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;'>
                    <h3>Commande #{$order['id']}</h3>
                    <p><strong>Date :</strong> " . date('d/m/Y H:i', strtotime($order['createdAt'])) . "</p>
                    <p><strong>Montant :</strong> " . number_format($order['total']) . " FCFA</p>
                    <p><strong>Paiement :</strong> {$paymentData['payment_method']}</p>
                </div>
                
                <h4>Articles commandés :</h4>
                <table style='width: 100%; border-collapse: collapse;'>
                    <tr style='background: #e9ecef;'>
                        <th style='padding: 10px; text-align: left;'>Produit</th>
                        <th style='padding: 10px; text-align: left;'>Quantité</th>
                        <th style='padding: 10px; text-align: left;'>Prix</th>
                    </tr>
                    {$itemsHtml}
                </table>
                
                <h4>Adresse de livraison :</h4>
                <p>
                    {$order['customerInfo']['firstName']} {$order['customerInfo']['lastName']}<br>
                    {$order['customerInfo']['address']}<br>
                    {$order['customerInfo']['city']}<br>
                    📞 {$order['customerInfo']['phone']}
                </p>
                
                <p>Nous préparons votre commande et vous contacterons bientôt pour la livraison.</p>
                
                <hr>
                <p style='font-size: 12px; color: #666;'>
                    MarchéIvoire - Votre marketplace ivoirienne<br>
                    📧 contact@marcheiivoire.com | 📞 +225 XX XX XX XX XX
                </p>
            </div>
        </body>
        </html>
        ";
    }
    
    private function generateAdminEmailTemplate($order, $paymentData) {
        return "
        <html>
        <body style='font-family: Arial, sans-serif;'>
            <div style='max-width: 600px; margin: 0 auto;'>
                <h2 style='color: #FF6B35;'>💰 Nouvelle commande payée</h2>
                
                <div style='background: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;'>
                    <h3>Commande #{$order['id']}</h3>
                    <p><strong>Client :</strong> {$order['customerInfo']['firstName']} {$order['customerInfo']['lastName']}</p>
                    <p><strong>Email :</strong> {$order['customerInfo']['email']}</p>
                    <p><strong>Téléphone :</strong> {$order['customerInfo']['phone']}</p>
                    <p><strong>Montant :</strong> " . number_format($order['total']) . " FCFA</p>
                    <p><strong>Paiement :</strong> {$paymentData['payment_method']}</p>
                    <p><strong>Transaction ID :</strong> {$paymentData['transaction_id']}</p>
                </div>
                
                <h4>Adresse de livraison :</h4>
                <p>
                    {$order['customerInfo']['address']}<br>
                    {$order['customerInfo']['city']}
                </p>
                
                <p><a href='https://votre-domaine.com/admin/index.php?action=orders' style='background: #FF6B35; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>Voir dans l'admin</a></p>
            </div>
        </body>
        </html>
        ";
    }
    
    private function sendEmail($to, $subject, $message) {
        // Configuration pour PHPMailer ou fonction mail() native
        
        $headers = [
            'MIME-Version: 1.0',
            'Content-type: text/html; charset=utf-8',
            'From: ' . FROM_NAME . ' <' . FROM_EMAIL . '>',
            'Reply-To: ' . FROM_EMAIL,
            'X-Mailer: PHP/' . phpversion()
        ];
        
        return mail($to, $subject, $message, implode("\r\n", $headers));
    }
    
    private function processPostPayment($order) {
        // Ici on peut ajouter la logique pour :
        // - Décrémenter le stock des produits
        // - Créer des entrées de comptabilité
        // - Déclencher le processus de préparation de commande
        // - Notifier les fournisseurs
        // - Intégrer avec un système de CRM
        
        $this->logWebhook('info', [
            'message' => 'Traitement post-paiement',
            'order_id' => $order['id']
        ]);
        
        // Exemple : décrémentation du stock (à implémenter selon vos besoins)
        // $this->updateProductStock($order['items']);
    }
    
    private function updateProductStock($items) {
        // Logique de mise à jour du stock
        // À implémenter selon vos besoins
    }
    
    private function logWebhook($level, $data) {
        $log = [
            'timestamp' => date('c'),
            'level' => $level,
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
            'data' => $data
        ];
        
        $logs = [];
        if (file_exists(WEBHOOK_LOGS_FILE)) {
            $logs = json_decode(file_get_contents(WEBHOOK_LOGS_FILE), true) ?: [];
        }
        
        $logs[] = $log;
        
        // Garder seulement les 500 derniers logs
        if (count($logs) > 500) {
            $logs = array_slice($logs, -500);
        }
        
        // Créer le répertoire si nécessaire
        $dir = dirname(WEBHOOK_LOGS_FILE);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        
        file_put_contents(WEBHOOK_LOGS_FILE, json_encode($logs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
    
    private function response($data, $code = 200) {
        http_response_code($code);
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit();
    }
}

// Traitement du webhook
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $webhook = new CinetPayWebhook();
    $webhook->handle();
} else {
    // GET request - page d'information
    http_response_code(200);
    echo json_encode([
        'service' => 'MarchéIvoire CinetPay Webhook',
        'status' => 'active',
        'version' => '1.0.0',
        'timestamp' => date('c')
    ]);
}
?>