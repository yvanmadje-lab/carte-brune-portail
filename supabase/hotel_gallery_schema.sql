-- =========================================================
-- Portail Carte Brune CEDEAO — Galerie photos & site web des hôtels
-- À exécuter dans : Supabase > SQL Editor > New query
-- (à exécuter APRÈS toutes les migrations précédentes)
-- =========================================================

alter table cms_hotels add column if not exists gallery jsonb default '[]'::jsonb;
alter table cms_hotels add column if not exists website text;
