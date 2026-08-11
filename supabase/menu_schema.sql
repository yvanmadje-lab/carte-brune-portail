-- =========================================================
-- Portail Carte Brune CEDEAO — Menu de navigation
-- À exécuter dans : Supabase > SQL Editor > New query
-- (à exécuter APRÈS les migrations précédentes)
-- =========================================================

create table if not exists cms_menu_items (
  id uuid primary key default gen_random_uuid(),
  label_fr text, label_en text, label_pt text,
  target text, -- 'top', 'event-section', 'hotels-section', 'tourism-section', ou une URL complète
  display_order int not null default 0,
  status text not null default 'published',
  created_at timestamptz default now()
);
alter table cms_menu_items enable row level security;

drop policy if exists "public read published cms_menu_items" on cms_menu_items;
create policy "public read published cms_menu_items"
on cms_menu_items for select
to anon
using (status = 'published');

drop policy if exists "admins full access cms_menu_items" on cms_menu_items;
create policy "admins full access cms_menu_items"
on cms_menu_items for all
to authenticated
using (true) with check (true);

insert into cms_menu_items (label_fr, label_en, label_pt, target, display_order) values
('Accueil', 'Home', 'Início', 'top', 1),
('Événements', 'Events', 'Eventos', 'event-section', 2),
('Hôtels', 'Hotels', 'Hotéis', 'hotels-section', 3),
('Tourisme', 'Tourism', 'Turismo', 'tourism-section', 4)
on conflict do nothing;
