-- =========================================================
-- Portail Carte Brune CEDEAO — Intervenants / Comité d'organisation
-- À exécuter dans : Supabase > SQL Editor > New query
-- (à exécuter APRÈS schema.sql, cms_schema.sql et settings_schema.sql)
-- =========================================================

create table if not exists cms_speakers (
  id uuid primary key default gen_random_uuid(),
  name text,
  role_fr text, role_en text, role_pt text,
  image_url text,
  display_order int not null default 0,
  status text not null default 'published',
  created_at timestamptz default now()
);
alter table cms_speakers enable row level security;

drop policy if exists "public read published cms_speakers" on cms_speakers;
create policy "public read published cms_speakers"
on cms_speakers for select
to anon
using (status = 'published');

drop policy if exists "admins full access cms_speakers" on cms_speakers;
create policy "admins full access cms_speakers"
on cms_speakers for all
to authenticated
using (true) with check (true);

-- Reprend les intervenants déjà affichés sur le site comme point de départ
insert into cms_speakers (name, role_fr, role_en, role_pt, display_order) values
('Mme Audrey Tiam', 'Secrétaire Exécutive, Bureau National Sénégalais de la Carte Brune CEDEAO', 'Executive Secretary, Senegalese National Bureau of the ECOWAS Brown Card', 'Secretária Executiva, Bureau Nacional Senegalês do Cartão Castanho da CEDEAO', 1),
('FSSA', 'Fédération Sénégalaise des Sociétés d''Assurances — partenaire hôte', 'Senegalese Federation of Insurance Companies — host partner', 'Federação Senegalesa das Sociedades de Seguros — parceiro anfitrião', 2)
on conflict do nothing;
