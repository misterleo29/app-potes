# 🎉 App Potes

Application moderne pour organiser des sorties et communiquer entre amis en temps réel.

## ✨ Fonctionnalités

### 🎮 Demandes entre potes
- Créer des demandes (jouer, manger, ciné, sport, etc.)
- Répondre aux demandes en temps réel
- Messages vocaux intégrés
- Notifications instantanées

### 📅 Événements
- Créer et gérer des événements
- Système de participation
- Voir qui participe en temps réel

### 📞 Communication
- **Appels vocaux en direct** entre potes
- **Messages vocaux** avec enregistrement
- Système de mute/unmute
- Notifications push

### 👥 Système social
- Authentification Firebase
- Profils utilisateurs
- Notifications en temps réel
- Mode admin

## 🚀 Technologies

- **React 18** - Interface utilisateur
- **Firebase** - Backend & Realtime Database
- **Vite** - Build tool ultra-rapide
- **Tailwind CSS** - Styling moderne
- **WebRTC** - Appels vocaux
- **Lucide Icons** - Icônes modernes

## 📦 Installation

```bash
# Cloner le projet
git clone https://github.com/misterleo29/app-potes.git

# Installer les dépendances
npm install

# Lancer en développement
npm run dev

# Build pour production
npm run build
```

## 🔧 Configuration Firebase

1. Crée un projet sur [Firebase Console](https://console.firebase.google.com/)
2. Active **Authentication** (Email/Password)
3. Active **Realtime Database**
4. Copie ta configuration Firebase
5. Crée un fichier `.env.local` :

```env
VITE_FIREBASE_API_KEY=ta_clé
VITE_FIREBASE_AUTH_DOMAIN=ton-projet.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://ton-projet.firebasedatabase.app
VITE_FIREBASE_PROJECT_ID=ton-projet-id
VITE_FIREBASE_STORAGE_BUCKET=ton-projet.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456:web:abc123
```

## 🌐 Déploiement Cloudflare

L'application est configurée pour être déployée sur Cloudflare Pages :

```bash
# Build command
npm install && npm run build

# Output directory
dist
```

N'oublie pas d'ajouter les variables d'environnement dans **Cloudflare Dashboard** → **Settings** → **Environment variables**

## 📱 Fonctionnalités Responsive

L'application s'adapte automatiquement à tous les écrans :
- 📱 Mobile : Navigation optimisée + barre d'actions flottante
- 💻 Desktop : Interface complète avec sidebar
- 🎨 Design moderne avec glassmorphism

## 🔐 Sécurité

- Authentification Firebase sécurisée
- Variables d'environnement pour les clés sensibles
- Règles de sécurité Firebase Database
- Mode admin protégé par mot de passe

## 👨‍💻 Développé par

**misterleo29** - [GitHub](https://github.com/misterleo29)

## 📄 Licence

MIT License - Fais-en ce que tu veux ! 🎉
