-- =========================================================
-- Portail Carte Brune CEDEAO — Paramètres du site (logo, etc.)
-- À exécuter dans : Supabase > SQL Editor > New query
-- (à exécuter APRÈS schema.sql et cms_schema.sql, une seule fois)
-- =========================================================

create table if not exists site_settings (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);
alter table site_settings enable row level security;

drop policy if exists "public read site_settings" on site_settings;
create policy "public read site_settings"
on site_settings for select
to anon
using (true);

drop policy if exists "admins full access site_settings" on site_settings;
create policy "admins full access site_settings"
on site_settings for all
to authenticated
using (true) with check (true);

insert into site_settings (key, value) values ('event_logo', null)
on conflict (key) do nothing;
