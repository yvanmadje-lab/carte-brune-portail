-- =========================================================
-- Portail Carte Brune CEDEAO — Types d'organisme (formulaire d'inscription)
-- À exécuter dans : Supabase > SQL Editor > New query
-- (à exécuter APRÈS les migrations précédentes)
-- =========================================================

create table if not exists cms_org_types (
  id uuid primary key default gen_random_uuid(),
  label_fr text, label_en text, label_pt text,
  is_other boolean not null default false,
  display_order int not null default 0,
  status text not null default 'published',
  created_at timestamptz default now()
);
alter table cms_org_types enable row level security;

drop policy if exists "public read published cms_org_types" on cms_org_types;
create policy "public read published cms_org_types"
on cms_org_types for select
to anon
using (status = 'published');

drop policy if exists "admins full access cms_org_types" on cms_org_types;
create policy "admins full access cms_org_types"
on cms_org_types for all
to authenticated
using (true) with check (true);

insert into cms_org_types (label_fr, label_en, label_pt, is_other, display_order) values
('Bureau National', 'National Bureau', 'Bureau Nacional', false, 1),
('Compagnie d''assurance', 'Insurance company', 'Companhia de seguros', false, 2),
('Direction des Assurances', 'Insurance Directorate', 'Direção de Seguros', false, 3),
('Autre', 'Other', 'Outro', true, 4)
on conflict do nothing;
