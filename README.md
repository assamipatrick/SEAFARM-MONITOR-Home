<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# SEAFARM MONITOR - Seaweed Farm ERP

Application ERP complète pour la gestion des fermes d'algues marines.

View your app in AI Studio: https://ai.studio/apps/drive/1zQ6tUXAAWSTkVuPMTmMMvN7enAKl0kLX

## 🌐 URLs

- **Application en ligne**: https://3000-ipgxzkc0k8beqtda8wcn9-b32ec7bb.sandbox.novita.ai
- **Dépôt GitHub**: https://github.com/assamipatrick/SEAFARM-MONITOR-Home

## 📋 Aperçu du Projet

SEAFARM MONITOR est un système de gestion d'entreprise (ERP) développé avec React, Vite et TypeScript pour la gestion complète des opérations de fermes d'algues marines.

### Fonctionnalités Principales

- 🗺️ **Gestion Géographique** - Cartographie interactive avec Leaflet
- 📊 **Tableaux de Bord** - Visualisation des données avec Chart.js
- 📱 **PWA Ready** - Support pour installation en tant qu'application
- 🔐 **Authentification** - Intégration Supabase
- 🤖 **IA Intégrée** - Support Google Gemini AI
- 📦 **Gestion d'Inventaire** - Système complet de gestion des stocks
- 💰 **Gestion Financière** - Intégration Stripe pour les paiements
- 🖨️ **Génération de Rapports** - Exportation PDF et Excel
- 🏷️ **Système QR Code** - Génération et scan de QR codes

## 🛠️ Stack Technique

- **Frontend**: React 19.2, TypeScript, Vite 6.2
- **Routage**: React Router DOM 7.9
- **Cartographie**: Leaflet 1.9.4
- **Graphiques**: Chart.js
- **Styling**: Tailwind CSS (via CDN)
- **Base de données**: Supabase
- **IA**: Google Gemini API
- **Paiements**: Stripe

## 🚀 Installation et Démarrage

**Prérequis**: Node.js 16+

### Installation

```bash
# Cloner le dépôt
git clone https://github.com/assamipatrick/SEAFARM-MONITOR-Home.git
cd SEAFARM-MONITOR-Home

# Installer les dépendances
npm install
```

### Configuration

1. Créer un fichier `.env` à la racine du projet :

```bash
# Gemini API Key (optionnel)
GEMINI_API_KEY=your_api_key_here

# Supabase Configuration (optionnel)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Démarrage en Développement

```bash
# Méthode 1: Avec Vite directement
npm run dev

# Méthode 2: Avec PM2 (recommandé pour production/sandbox)
pm2 start ecosystem.config.cjs
```

L'application sera accessible sur `http://localhost:3000`

### Build de Production

```bash
npm run build
```

## 📦 Structure du Projet

```
webapp/
├── components/          # Composants React réutilisables
│   └── ui/             # Composants UI (Icon, etc.)
├── contexts/           # Contextes React (DataContext)
├── database/           # Configuration base de données
├── hooks/              # Hooks React personnalisés
├── inventory/          # Module de gestion d'inventaire
├── pages/              # Pages de l'application
├── services/           # Services et API
├── src/                # Code source principal
│   └── utils/          # Utilitaires
├── public/             # Assets statiques
├── index.html          # Point d'entrée HTML
├── index.tsx           # Point d'entrée React
├── App.tsx             # Composant principal
├── types.ts            # Définitions TypeScript
├── constants.ts        # Constants de l'application
├── permissions.ts      # Gestion des permissions
├── translations.ts     # Traductions multilingues
└── vite.config.ts      # Configuration Vite
```

## 🔧 Scripts Disponibles

```bash
npm run dev      # Démarrer le serveur de développement
npm run build    # Créer le build de production
npm run preview  # Prévisualiser le build de production
```

## 📝 Fonctionnalités Détaillées

### Modules Principaux

1. **Dashboard** - Aperçu général des opérations
2. **Inventory Management** - Gestion complète des stocks
3. **Mapping System** - Visualisation géographique des fermes
4. **Financial Management** - Suivi financier et paiements
5. **Reporting** - Génération de rapports PDF/Excel
6. **User Management** - Gestion des utilisateurs et permissions
7. **QR Code System** - Traçabilité des produits

### Technologies Intégrées

- **Leaflet** - Cartographie interactive
- **Chart.js** - Visualisation de données
- **Recharts** - Graphiques réactifs
- **jsPDF** - Génération de PDF
- **html2canvas** - Capture d'écran pour rapports
- **ExcelJS** - Export Excel
- **QRCode.js** - Génération de QR codes

## 🌟 Dernières Mises à Jour

- ✅ Correction des erreurs JSX dans Icon.tsx
- ✅ Configuration PM2 pour déploiement
- ✅ Ajout du fichier .gitignore
- ✅ Synchronisation GitHub
- ✅ Application déployée et fonctionnelle

## 🔐 Sécurité

- Variables d'environnement pour les clés API
- .gitignore configuré pour exclure les fichiers sensibles
- Authentification Supabase intégrée

## 📄 Licence

Ce projet est privé et appartient à l'organisation.

## 👥 Contributeurs

- Patrick Assami (@assamipatrick)

## 📞 Support

Pour toute question ou problème, veuillez ouvrir une issue sur GitHub.

---

**Status**: ✅ Application en ligne et fonctionnelle  
**Dernière mise à jour**: 18 janvier 2026
