-- =========================================================
-- Portail Carte Brune CEDEAO — Numéro WhatsApp obligatoire +
-- notification WhatsApp + lien du groupe "Browncard Event"
-- À exécuter dans : Supabase > SQL Editor > New query
-- (à exécuter APRÈS toutes les migrations précédentes)
-- =========================================================

-- Renomme le champ "Téléphone" existant en "Numéro WhatsApp" et le
-- rend obligatoire (ne touche que l'installation par défaut ; si vous
-- aviez déjà personnalisé ce champ, ajustez-le ensuite depuis l'admin).
update cms_form_fields set
  label_fr = 'Numéro WhatsApp (avec indicatif, ex: +225 07 12 34 56 78)',
  label_en = 'WhatsApp number (with country code, e.g. +225 07 12 34 56 78)',
  label_pt = 'Número WhatsApp (com indicativo, ex: +225 07 12 34 56 78)',
  required = true
where field_key = 'phone';

-- Modèles de message WhatsApp (un par langue) + lien d'invitation du
-- groupe WhatsApp "Browncard Event" (créé manuellement par l'admin
-- dans WhatsApp, puis collé ici — Meta n'autorise aucune création de
-- groupe par API, seul le lien d'invitation peut être partagé).
insert into site_settings (key, value) values
('whatsapp_group_link', ''),
('whatsapp_body_fr', E'Bonjour {{firstName}} {{lastName}},\n\nVotre inscription à {{eventTitle}} est confirmée sous le numéro {{regNumber}}.\n\nRejoignez le groupe WhatsApp officiel de l''événement (Browncard Event) : {{whatsappGroupLink}}\n\nÀ bientôt !'),
('whatsapp_body_en', E'Hello {{firstName}} {{lastName}},\n\nYour registration for {{eventTitle}} is confirmed under number {{regNumber}}.\n\nJoin the official WhatsApp group for the event (Browncard Event): {{whatsappGroupLink}}\n\nSee you soon!'),
('whatsapp_body_pt', E'Olá {{firstName}} {{lastName}},\n\nA sua inscrição para {{eventTitle}} está confirmada com o número {{regNumber}}.\n\nJunte-se ao grupo oficial de WhatsApp do evento (Browncard Event): {{whatsappGroupLink}}\n\nAté breve!')
on conflict (key) do nothing;
