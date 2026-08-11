# Portail Carte Brune CEDEAO — 42e Assemblée Générale

Site React (Vite + Tailwind) avec back-office admin connecté à une vraie
base de données (Supabase : Postgres + Auth), déployable sur Vercel.

## Architecture

- Le formulaire public d'inscription appelle une fonction serveur
  sécurisée (`register_participant`) — les visiteurs n'ont jamais
  d'accès direct à la table des participants.
- Le tableau de bord admin (bouton "Administration" en bas de page)
  est protégé par une connexion (email + mot de passe), gérée par
  Supabase Auth. Sans connexion, impossible de voir la liste des
  participants.

## Étape 1 — Créer le projet Supabase (5 min)

1. Allez sur https://supabase.com → "New project" (offre gratuite).
2. Une fois le projet créé, ouvrez **SQL Editor** → **New query**,
   collez le contenu du fichier `supabase/schema.sql` de ce dossier,
   puis cliquez **Run**. Cela crée la table `participants`, la
   numérotation automatique des inscriptions, et les règles de
   sécurité (RLS).
3. Allez dans **Authentication → Users → Add user**, créez votre
   compte administrateur (email + mot de passe). C'est ce compte qui
   vous servira à vous connecter à l'espace admin du site.
4. Allez dans **Project Settings → API** : notez votre **Project URL**
   et votre clé **anon public**.

## Étape 2 — Connecter le site à Supabase

En local, copiez `.env.example` en `.env` et remplissez les deux
valeurs récupérées à l'étape précédente :
```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Sur **Vercel** (votre site déjà déployé) : allez dans
**Project → Settings → Environment Variables**, ajoutez les deux
mêmes variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`),
puis relancez un déploiement (**Deployments → ⋯ → Redeploy**).

## Étape 3 — Tester

```
npm install
npm run dev
```

- Sur le site public, faites une inscription test → vous devez
  obtenir un numéro `CB-2026-AG42-000001`.
- Cliquez sur "Administration" en bas de page, connectez-vous avec le
  compte créé à l'étape 1 → vous devez voir cette inscription dans le
  tableau de bord, avec recherche, filtre par pays et export CSV.

## Ajouter d'autres administrateurs

Authentication → Users → Add user, dans votre projet Supabase. Aucune
inscription publique n'est possible : seuls les comptes que vous créez
vous-même peuvent se connecter à l'espace admin.

## Prochaines étapes possibles

- Gestion des rôles (super admin / logistique / lecture seule)
- Emails automatiques de confirmation (via une fonction Supabase Edge
  + un service d'envoi comme Resend)
- Gestion des événements/hôtels/tourisme depuis le back-office plutôt
  que dans le code (tables `events`, `hotels`, `tourist_sites`)
- QR code et badge PDF
