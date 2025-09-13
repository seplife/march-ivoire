<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Connexion - Administration MarchéIvoire</title>
    <style>
        :root {
            --primary: #FF6B35;
            --primary-dark: #E55A2B;
            --secondary: #FFA500;
            --danger: #DC3545;
            --dark: #2C3E50;
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
            background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .login-container {
            background: var(--white);
            padding: 40px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            width: 100%;
            max-width: 400px;
            text-align: center;
        }

        .logo {
            font-size: 3rem;
            margin-bottom: 10px;
        }

        .login-title {
            color: var(--dark);
            margin-bottom: 30px;
            font-size: 1.5rem;
        }

        .form-group {
            margin-bottom: 20px;
            text-align: left;
        }

        .form-group label {
            display: block;
            margin-bottom: 8px;
            color: var(--dark);
            font-weight: 600;
        }

        .form-control {
            width: 100%;
            padding: 12px 15px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
            transition: all 0.3s ease;
        }

        .form-control:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
        }

        .btn {
            width: 100%;
            padding: 15px;
            background: var(--primary);
            color: var(--white);
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 20px;
        }

        .btn:hover {
            background: var(--primary-dark);
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(255, 107, 53, 0.3);
        }

        .alert {
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            border: 1px solid transparent;
        }

        .alert-danger {
            background-color: #f8d7da;
            border-color: #f5c6cb;
            color: #721c24;
        }

        .login-info {
            margin-top: 30px;
            padding: 20px;
            background: var(--light);
            border-radius: 8px;
            font-size: 14px;
            color: var(--dark);
        }

        .login-info h4 {
            margin-bottom: 10px;
            color: var(--primary);
        }

        .credentials {
            background: var(--white);
            padding: 10px;
            border-radius: 5px;
            margin-top: 10px;
            font-family: monospace;
            border-left: 4px solid var(--primary);
        }

        .security-note {
            margin-top: 20px;
            font-size: 12px;
            color: #666;
            text-align: center;
        }

        @media (max-width: 480px) {
            .login-container {
                padding: 30px 20px;
            }

            .logo {
                font-size: 2rem;
            }

            .login-title {
                font-size: 1.2rem;
            }
        }

        /* Animation d'entrée */
        .login-container {
            animation: slideUp 0.6s ease;
        }

        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(50px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        /* Effet de typing pour le titre */
        .typing-effect {
            overflow: hidden;
            white-space: nowrap;
            border-right: 2px solid var(--primary);
            animation: typing 3s steps(30, end), blink-caret 0.75s step-end infinite;
        }

        @keyframes typing {
            from { width: 0 }
            to { width: 100% }
        }

        @keyframes blink-caret {
            from, to { border-color: transparent }
            50% { border-color: var(--primary) }
        }

        /* Loader pendant la connexion */
        .loading {
            display: none;
            width: 20px;
            height: 20px;
            border: 2px solid var(--white);
            border-top: 2px solid transparent;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-left: 10px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>

<?php
// Démarrer la session
session_start();

// Définir les identifiants de connexion (à changer en production)
$valid_username = "admin";
$valid_password = "marche_ivoire_2025";
$error = null;

// Vérifier si le formulaire a été soumis
if (isset($_POST['login'])) {
    $username = trim($_POST['username']);
    $password = trim($_POST['password']);

    // Vérifier les identifiants
    if ($username === $valid_username && $password === $valid_password) {
        // Connexion réussie, démarrer la session
        $_SESSION['loggedin'] = true;
        $_SESSION['username'] = $username;

        // Rediriger vers la page d'administration
        header("Location: dashboard.php"); // Remplacez "dashboard.php" par le nom de votre page d'accueil d'administration
        exit;
    } else {
        // Identifiants incorrects
        $error = "Nom d'utilisateur ou mot de passe incorrect.";
    }
}
?>

    <div class="login-container">
        <div class="logo">🛒</div>
        <h1 class="login-title">Administration MarchéIvoire</h1>

        <?php if (isset($error)): ?>
        <div class="alert alert-danger">
            <strong>Erreur :</strong> <?= htmlspecialchars($error) ?>
        </div>
        <?php endif; ?>

        <form method="POST" id="loginForm">
            <div class="form-group">
                <label for="username">Nom d'utilisateur</label>
                <input type="text"
                       id="username"
                       name="username"
                       class="form-control"
                       placeholder="Entrez votre nom d'utilisateur"
                       value="<?= isset($_POST['username']) ? htmlspecialchars($_POST['username']) : '' ?>"
                       required>
            </div>

            <div class="form-group">
                <label for="password">Mot de passe</label>
                <input type="password"
                       id="password"
                       name="password"
                       class="form-control"
                       placeholder="Entrez votre mot de passe"
                       required>
            </div>

            <button type="submit" name="login" class="btn" id="loginBtn">
                Se connecter
                <span class="loading" id="loading"></span>
            </button>
        </form>

        <div class="login-info">
            <h4>🔒 Informations de connexion (Demo)</h4>
            <p>Pour tester l'interface d'administration :</p>
            <div class="credentials">
                <strong>Utilisateur :</strong> admin<br>
                <strong>Mot de passe :</strong> marche_ivoire_2025
            </div>
            <p style="margin-top: 10px;"><em>⚠️ Changez ces identifiants en production !</em></p>
        </div>

        <div class="security-note">
            <p>🛡️ Connexion sécurisée SSL/TLS</p>
            <p>Vos données sont protégées</p>
        </div>
    </div>

    <script>
        // Animation de typing pour le titre
        document.addEventListener('DOMContentLoaded', function() {
            const title = document.querySelector('.login-title');
            if (title) {
                title.classList.add('typing-effect');
            }
        });

        // Gestion du formulaire de connexion
        document.getElementById('loginForm').addEventListener('submit', function(e) {
            const loginBtn = document.getElementById('loginBtn');
            const loading = document.getElementById('loading');

            // Afficher le loader
            loading.style.display = 'inline-block';
            loginBtn.disabled = true;
            loginBtn.style.opacity = '0.7';

            // Simuler un délai de connexion (optionnel)
            setTimeout(() => {
                // Le formulaire sera soumis normalement
            }, 500);
        });

        // Auto-remplissage pour demo (optionnel)
        document.addEventListener('DOMContentLoaded', function() {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('demo') === '1') {
                document.getElementById('username').value = 'admin';
                document.getElementById('password').value = 'marche_ivoire_2025';
            }
        });

        // Validation en temps réel
        const username = document.getElementById('username');
        const password = document.getElementById('password');
        const loginBtn = document.getElementById('loginBtn');

        function validateForm() {
            const isValid = username.value.trim() !== '' && password.value.trim() !== '';
            loginBtn.disabled = !isValid;
            loginBtn.style.opacity = isValid ? '1' : '0.6';
        }

        username.addEventListener('input', validateForm);
        password.addEventListener('input', validateForm);

        // Validation initiale
        validateForm();

        // Animation des champs en cas d'erreur
        <?php if (isset($error)): ?>
        document.addEventListener('DOMContentLoaded', function() {
            const container = document.querySelector('.login-container');
            container.style.animation = 'shake 0.5s ease-in-out';

            setTimeout(() => {
                container.style.animation = '';
            }, 500);
        });

        // Animation de shake
        const style = document.createElement('style');
        style.textContent = `
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }
        `;
        document.head.appendChild(style);
        <?php endif; ?>

        // Effet de particules en arrière-plan (optionnel)
        function createParticles() {
            const container = document.body;

            for (let i = 0; i < 20; i++) {
                const particle = document.createElement('div');
                particle.style.cssText = `
                    position: fixed;
                    width: 4px;
                    height: 4px;
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                    pointer-events: none;
                    z-index: -1;
                    animation: float ${5 + Math.random() * 10}s infinite linear;
                    left: ${Math.random() * 100}vw;
                    top: ${Math.random() * 100}vh;
                `;
                container.appendChild(particle);
            }
        }

        // Ajouter l'animation CSS pour les particules
        const particleStyle = document.createElement('style');
        particleStyle.textContent = `
            @keyframes float {
                0% {
                    transform: translateY(0) rotate(0deg);
                    opacity: 1;
                }
                100% {
                    transform: translateY(-100vh) rotate(360deg);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(particleStyle);

        // Créer les particules au chargement
        document.addEventListener('DOMContentLoaded', createParticles);

        // Gestion des touches
        document.addEventListener('keydown', function(e) {
            // Entrée pour soumettre le formulaire
            if (e.key === 'Enter' && !loginBtn.disabled) {
                document.getElementById('loginForm').submit();
            }

            // Échap pour effacer les champs
            if (e.key === 'Escape') {
                username.value = '';
                password.value = '';
                username.focus();
                validateForm();
            }
        });

        // Focus automatique sur le premier champ
        document.addEventListener('DOMContentLoaded', function() {
            if (!username.value) {
                username.focus();
            } else {
                password.focus();
            }
        });

        // Affichage des informations de sécurité
        console.log('🔒 Interface d\'administration MarchéIvoire');
        console.log('🛡️ Connexion sécurisée');
        console.log('⚠️ Utilisez des identifiants forts en production');
    </script>
</body>
</html>