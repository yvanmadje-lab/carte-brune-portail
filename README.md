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
4. `supabase/speakers_schema.sql` (section "Comité d'organisation")
5. `supabase/menu_schema.sql` (menu de navigation)
6. `supabase/org_types_schema.sql` (types d'organisme du formulaire d'inscription)
7. `supabase/form_fields_schema.sql` (champs dynamiques du formulaire + capture complète des réponses)
8. `supabase/travel_fields_schema.sql` (heure d'arrivée, date/heure/vol de départ)
9. `supabase/roles_schema.sql` (rôles administrateurs — super admin / gestionnaire / lecture seule)
10. `supabase/hotel_gallery_schema.sql` (galerie photos et site web de chaque hôtel)

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
- **Contenu du bandeau** : le numéro d'édition (42), la lettre en
  exposant (ex: "e" en français, "nd" en anglais, "ª" en portugais),
  l'identité "Carte Brune CEDEAO" (traduisible en FR/EN/PT, affichée
  dans l'en-tête et le bandeau), le titre et le sous-titre, le thème
  de la réunion (affiché dans un bandeau dédié s'il est rempli), les
  dates courtes, le mois/année et le lieu — chacun traduisible dans
  les trois langues —, ainsi que la ville et le pays.
- **Menu** : ajoutez/modifiez/réordonnez les liens du menu de
  navigation (nom en FR/EN/PT + cible : une section de la page comme
  `event-section`, `hotels-section`, `tourism-section`, `top` pour
  l'accueil, ou une URL complète).
- **Types d'organisme** : gérez les choix proposés à l'étape 1 du
  formulaire d'inscription (nom en FR/EN/PT, et une case à cocher
  pour indiquer si ce choix doit faire apparaître le champ "précisez"
  — comme pour l'option "Autre").
- **Champs du formulaire** : ajoutez, modifiez, retirez (statut
  Brouillon) ou rendez obligatoires les champs simples des étapes
  Identité, Coordonnées et Voyage (nom en FR/EN/PT, type — texte
  court, texte long, email, téléphone, date, nombre —, ordre
  d'affichage). Les champs structurants (pays, type d'organisme,
  choix hôtel/chambre, transfert aéroport) restent fixes car ils
  pilotent une logique dépendante, mais sont gérables depuis leurs
  propres onglets respectifs.
- **Comité d'organisation** : ajoutez les membres du comité
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

## Limite connue

Le préfixe des numéros d'inscription (`CB-2026-AG42-...`) est fixé
dans la base de données (trigger SQL), pas dans le contenu du
bandeau — le modifier nécessite d'éditer `supabase/schema.sql`
directement, pour rester cohérent avec les inscriptions déjà
enregistrées.

Tout champ personnalisé ajouté via "Champs du formulaire" (au-delà
des onze champs de départ) est bien enregistré — dans la colonne
`raw_payload` (réponse complète au format JSON) de chaque
inscription — mais n'apparaît pas encore comme colonne dédiée dans
le tableau des participants ni dans l'export CSV standard. C'est une
extension possible pour une prochaine itération.

## Filtres et tableau des participants

Recherche libre (nom/email/organisme), plus filtres combinables par
pays, hôtel, date d'arrivée et date de départ (dates de séjour à
l'hôtel choisies à l'inscription).

Le tableau affiche désormais : organisme, **type d'organisme**, pays,
email, hôtel, **type de chambre**, date/heure d'arrivée, numéro de vol
arrivée, date/heure de départ, numéro de vol départ. Comme il compte
beaucoup de colonnes, le tableau défile horizontalement (glissez ou
utilisez la molette + Maj) et verticalement au-delà d'une certaine
hauteur, avec l'en-tête toujours visible.

Deux boutons d'export : **Excel (.xlsx)** et **PDF** (mise en page
paysage), tous deux respectant les filtres actifs. L'en-tête du
fichier reprend automatiquement les filtres choisis, par exemple :
`LISTE DES PARTICIPANTS - DATE D'ARRIVÉE : 2026-10-19`.

Les filtres de date d'arrivée/départ portent sur les dates de **voyage**
saisies à l'étape 4 du formulaire (et non les dates de séjour à
l'hôtel).

## Rôles administrateurs

Trois rôles, gérés depuis le nouvel onglet **"Utilisateurs"** (visible
uniquement pour les super admins) :

- **Super administrateur** : accès complet, y compris la gestion des
  utilisateurs.
- **Gestionnaire** : accès complet aux participants et au contenu du
  site, mais pas à l'onglet Utilisateurs.
- **Lecture seule** : consultation des participants uniquement (avec
  recherche, filtres et export), aucune modification possible.

**Comment donner accès à quelqu'un** : créez d'abord son compte dans
Supabase (Authentication → Users → Add user, comme pour le tout
premier admin). Dès sa première connexion, il apparaît automatiquement
dans l'onglet "Utilisateurs" avec le rôle "Lecture seule" — changez
alors son rôle si besoin. Aucun compte existant avant cette migration
n'est bloqué : ils deviennent tous super admin automatiquement lors de
l'exécution de `roles_schema.sql`, à vous d'ajuster ensuite.

Retirer l'accès d'une personne depuis cet onglet ne supprime pas son
compte Supabase — seulement ses droits d'accès à l'admin du site.

## Champs "heure"

Le type de champ "Heure" est disponible dans "Champs du formulaire"
pour tout champ voyage — utilisé par défaut pour l'heure d'arrivée et
l'heure de départ.

## Photos plus grandes (admin et site public)

Toutes les tailles d'affichage d'image ont été augmentées : logo
(jusqu'à 224px dans l'admin, 80px dans l'en-tête public), vignettes
de listes (280px de hauteur dans l'admin comme sur le site public),
photos du comité d'organisation (128px de diamètre), aperçu plein
cadre lors d'un envoi (320px).

## Export Excel et PDF — police agrandie

Les deux exports utilisent désormais une police plus grande et
lisible (titre 16pt, en-têtes 11-13pt, contenu 10-12pt). L'export
Excel produit un vrai fichier `.xlsx` avec mise en forme (via la
librairie ExcelJS).

## Suppression de doublons (participants)

Dans l'onglet Participants, une icône de suppression apparaît en fin
de ligne pour les rôles Super administrateur et Gestionnaire — utile
pour retirer une inscription en double. Cette action est définitive
(la ligne est supprimée de la base) ; le rôle Lecture seule ne voit
pas cette icône.

## Galerie photos et site web par hôtel

Dans "Contenu du site → Hôtels", chaque hôtel dispose maintenant de :
- une **galerie de photos** (au-delà de la photo principale) — ajoutez
  autant de photos que nécessaire, chacune avec un bouton pour la
  retirer ;
- un champ **site web** (URL) — affiché comme bouton "Visiter le
  site" sur la fiche hôtel publique.

Sur le site public, cliquer sur la photo d'un hôtel (ou sur "Voir les
photos") ouvre une visionneuse plein écran avec navigation
précédent/suivant entre toutes les photos de cet hôtel.

## Prochaines étapes possibles

- Gestion des rôles admin (super admin / logistique / lecture seule)
- Emails automatiques de confirmation
- Gestion des événements multi-années depuis le back-office
- QR code et badge PDF
