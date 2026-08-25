-- =========================================================
-- Portail Carte Brune CEDEAO — Modèle WhatsApp approuvé (Zavu)
-- À exécuter dans : Supabase > SQL Editor > New query
-- (à exécuter APRÈS toutes les migrations précédentes)
-- =========================================================

insert into site_settings (key, value) values ('whatsapp_template_id', '')
on conflict (key) do nothing;
