-- =========================================================
-- Portail Carte Brune CEDEAO — Programme (PDF) par événement
-- À exécuter dans : Supabase > SQL Editor > New query
-- (à exécuter APRÈS toutes les migrations précédentes)
-- =========================================================

alter table events add column if not exists program_pdf jsonb not null default '{"fr":"","en":"","pt":""}';
