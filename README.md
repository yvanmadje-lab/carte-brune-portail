# Portail Carte Brune CEDEAO — 42e Assemblée Générale

Site React (Vite + Tailwind) avec back-office CMS complet, connecté à
Supabase (Postgres + Auth + Storage), déployable sur Vercel.

## Architecture

- Le formulaire public d'inscription appelle une fonction serveur
  sécurisée (`register_participant`) — les visiteurs n'ont jamais
  d'accès direct à la table des participants.
- Le tableau de bord admin (bouton "Administration" en bas de page)
  est protégé par connexion (email + mot de passe / Supabase Auth),
  avec deux onglets :
  - **Participants** : inscriptions, recherche, filtres, export CSV
  - **Contenu du site** : gestion du carrousel d'accueil, des sites
    touristiques et des hôtels — avec upload d'images, publication/
    brouillon, ordre d'affichage. C'est le CMS.

## Étape 1 — Base de données (si pas déjà fait)

Dans Supabase → **SQL Editor**, exécutez dans l'ordre :
1. `supabase/schema.sql` (table des participants)
2. `supabase/cms_schema.sql` (carrousel, tourisme, hôtels, stockage
   d'images — inclut des données de départ reprenant le contenu
   actuel du site)
3. `supabase/settings_schema.sql` (paramètres du site, dont le logo)
4. `supabase/speakers_schema.sql` (section "Ils portent l'événement")

Dans **Authentication → Users → Add user**, créez votre compte admin.

Dans **Project Settings → API**, notez votre Project URL et votre clé
`anon public`.

## Étape 2 — Variables d'environnement sur Vercel

Project → Settings → Environment Variables :
```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
Puis **Deployments → ⋯ → Redeploy**.

## Étape 3 — Utiliser le CMS

Site en ligne → "Administration" → connexion → onglet **Contenu du
site** :
- **Logo** : téléchargez le logo officiel de l'événement — il
  remplace automatiquement le sceau par défaut dans l'en-tête et le
  bandeau d'accueil, partout sur le site.
- **Ils portent l'événement** : ajoutez les membres du comité
  d'organisation ou partenaires (nom, titre/rôle en FR/EN/PT, photo).
- **Carrousel d'accueil** : ajoutez des images qui défileront en
  fond du bandeau "42e Assemblée Générale". Sans image, le fond reste
  uni (comme avant).
- **Tourisme** : ajoutez/modifiez/supprimez les sites touristiques
  affichés sur la page publique (nom et description en FR/EN/PT +
  photo).
- **Hôtels** : idem pour les hôtels recommandés (nom, distance,
  description, commodités, prix, photo).

Chaque élément a un statut **Publié / Brouillon** — seul le contenu
publié apparaît sur le site public. L'ordre d'affichage se règle
avec le champ numérique correspondant (0 = premier).

## Tester en local

```
npm install
cp .env.example .env   # puis remplir avec vos clés Supabase
npm run dev
```

## Prochaines étapes possibles

- Gestion des rôles admin (super admin / logistique / lecture seule)
- Emails automatiques de confirmation
- Gestion des événements multi-années depuis le back-office
- QR code et badge PDF
