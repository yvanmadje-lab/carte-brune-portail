-- =========================================================
-- Portail Carte Brune CEDEAO — CMS (contenu gérable depuis l'admin)
-- À exécuter dans : Supabase > SQL Editor > New query
-- (à exécuter APRÈS schema.sql, une seule fois)
-- =========================================================

-- ---------- STOCKAGE DES IMAGES ----------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "public read media" on storage.objects;
create policy "public read media"
on storage.objects for select
using (bucket_id = 'media');

drop policy if exists "admin upload media" on storage.objects;
create policy "admin upload media"
on storage.objects for insert
to authenticated
with check (bucket_id = 'media');

drop policy if exists "admin update media" on storage.objects;
create policy "admin update media"
on storage.objects for update
to authenticated
using (bucket_id = 'media');

drop policy if exists "admin delete media" on storage.objects;
create policy "admin delete media"
on storage.objects for delete
to authenticated
using (bucket_id = 'media');

-- ---------- CARROUSEL D'ARRIÈRE-PLAN (hero de la page d'accueil) ----------
create table if not exists hero_slides (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  display_order int not null default 0,
  status text not null default 'published', -- 'published' | 'draft'
  created_at timestamptz default now()
);
alter table hero_slides enable row level security;

drop policy if exists "public read published hero_slides" on hero_slides;
create policy "public read published hero_slides"
on hero_slides for select
to anon
using (status = 'published');

drop policy if exists "admins full access hero_slides" on hero_slides;
create policy "admins full access hero_slides"
on hero_slides for all
to authenticated
using (true) with check (true);

-- ---------- SITES TOURISTIQUES ----------
create table if not exists tourist_sites (
  id uuid primary key default gen_random_uuid(),
  name_fr text, name_en text, name_pt text,
  desc_fr text, desc_en text, desc_pt text,
  image_url text,
  display_order int not null default 0,
  status text not null default 'published',
  created_at timestamptz default now()
);
alter table tourist_sites enable row level security;

drop policy if exists "public read published tourist_sites" on tourist_sites;
create policy "public read published tourist_sites"
on tourist_sites for select
to anon
using (status = 'published');

drop policy if exists "admins full access tourist_sites" on tourist_sites;
create policy "admins full access tourist_sites"
on tourist_sites for all
to authenticated
using (true) with check (true);

-- ---------- HÔTELS ----------
create table if not exists cms_hotels (
  id uuid primary key default gen_random_uuid(),
  name text,
  distance text,
  desc_fr text, desc_en text, desc_pt text,
  image_url text,
  amenities text, -- liste séparée par des virgules, ex: "Wi-Fi, Piscine, Parking"
  price numeric,
  currency text default 'FCFA',
  room_type text default 'Standard',
  display_order int not null default 0,
  status text not null default 'published',
  created_at timestamptz default now()
);
alter table cms_hotels enable row level security;

drop policy if exists "public read published cms_hotels" on cms_hotels;
create policy "public read published cms_hotels"
on cms_hotels for select
to anon
using (status = 'published');

drop policy if exists "admins full access cms_hotels" on cms_hotels;
create policy "admins full access cms_hotels"
on cms_hotels for all
to authenticated
using (true) with check (true);

-- ---------- Données de départ (reprend ce qui était codé en dur) ----------
insert into tourist_sites (name_fr, name_en, name_pt, desc_fr, desc_en, desc_pt, image_url, display_order) values
('Île de Gorée', 'Gorée Island', 'Ilha de Gorée', 'Site mémoriel classé UNESCO, à 20 minutes en ferry du port de Dakar.', E'UNESCO memorial site, a 20-minute ferry ride from Dakar''s port.', 'Local memorial classificado pela UNESCO, a 20 minutos de ferry do porto de Dakar.', null, 1),
('Monument de la Renaissance', 'African Renaissance Monument', 'Monumento do Renascimento Africano', 'Plus haute statue d''Afrique, surplombant les Mamelles.', 'Africa''s tallest statue, overlooking the Mamelles hills.', 'A estátua mais alta de África, com vista para as Mamelles.', null, 2),
('Lac Rose (Retba)', 'Pink Lake (Lake Retba)', 'Lago Rosa (Retba)', 'Lac aux eaux roses, ancien terminus du rallye Paris-Dakar.', 'Pink-hued lake, former finish line of the Paris-Dakar rally.', 'Lago de águas rosadas, antiga meta do rali Paris-Dakar.', null, 3),
('Plage de N''Gor', E'N\'Gor Beach', E'Praia de N\'Gor', 'Plage animée face à l''île de N''Gor, surf et couchers de soleil.', E'Lively beach facing N\'Gor island, surf spots and sunsets.', E'Praia animada em frente à ilha de N\'Gor, surf e pôr do sol.', null, 4)
on conflict do nothing;

insert into cms_hotels (name, distance, desc_fr, desc_en, desc_pt, amenities, price, currency, room_type, display_order) values
('Hôtel Pullman Dakar', 'Lieu officiel de l''Assemblée Générale', 'Hôtel hôte de la 42e Assemblée Générale, en front de mer sur la Corniche.', 'Host hotel of the 42nd General Assembly, on the seafront Corniche.', 'Hotel anfitrião da 42a Assembleia Geral, à beira-mar na Corniche.', 'Wi-Fi, Piscine, Salles de conférence, Restaurant', 85000, 'FCFA', 'Standard', 1),
('Radisson Blu Dakar Sea Plaza', '2,1 km du lieu de réunion', 'Établissement moderne surplombant la baie de Dakar.', 'Modern property overlooking Dakar bay.', 'Estabelecimento moderno com vista para a baía de Dakar.', 'Wi-Fi, Salle de sport, Climatisation, Parking', 75000, 'FCFA', 'Standard', 2),
('Novotel Dakar', '3,4 km du lieu de réunion', 'Option confortable au centre-ville, proche du Plateau.', 'Comfortable downtown option, near Le Plateau.', 'Opção confortável no centro, perto do Plateau.', 'Wi-Fi, Petit-déjeuner, Climatisation', 55000, 'FCFA', 'Standard', 3)
on conflict do nothing;
