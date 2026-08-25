-- =========================================================
-- Portail Carte Brune CEDEAO — Modèles WhatsApp approuvés,
-- un par langue (FR/EN/PT), car un modèle Meta a un texte figé
-- dans une seule langue.
-- À exécuter dans : Supabase > SQL Editor > New query
-- (à exécuter APRÈS toutes les migrations précédentes)
-- =========================================================

insert into site_settings (key, value) values
('whatsapp_template_id_fr', ''),
('whatsapp_template_id_en', ''),
('whatsapp_template_id_pt', '')
on conflict (key) do nothing;

-- Reprend l'ancien identifiant unique (si déjà configuré) comme
-- modèle français, pour ne rien perdre de ce qui a déjà été fait.
update site_settings set value = (select value from site_settings where key = 'whatsapp_template_id')
where key = 'whatsapp_template_id_fr'
and exists (select 1 from site_settings where key = 'whatsapp_template_id' and value <> '');

delete from site_settings where key = 'whatsapp_template_id';
