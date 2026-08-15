-- =========================================================
-- Portail Carte Brune CEDEAO — Lien de modification + emails
-- À exécuter dans : Supabase > SQL Editor > New query
-- (à exécuter APRÈS toutes les migrations précédentes)
-- =========================================================

-- Jeton unique et secret permettant à un participant de retrouver et
-- modifier SA PROPRE inscription, sans compte ni mot de passe — le
-- lien contenant ce jeton n'est communiqué que par email.
alter table participants add column if not exists edit_token uuid not null default gen_random_uuid();
create unique index if not exists participants_edit_token_idx on participants(edit_token);

-- L'inscription renvoie désormais le numéro ET le jeton de
-- modification (au lieu du seul numéro), pour construire le lien
-- envoyé par email juste après l'inscription.
-- Supprime l'ancienne version (qui renvoyait "text") pour pouvoir la
-- recréer avec un type de retour différent ("jsonb") — PostgreSQL
-- l'exige, CREATE OR REPLACE seul ne suffit pas dans ce cas.
drop function if exists register_participant(jsonb);

create or replace function register_participant(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_reg text;
  new_token uuid;
begin
  insert into participants (
    last_name, first_name, "position", organization, org_type, org_other,
    country, city, phone, email, address,
    wants_hotel, hotel_id, hotel_name, room_id, room_type,
    check_in, check_out,
    flight_number, airline, arrival_date, arrival_time,
    departure_date, departure_time, departure_flight_number,
    transfer, raw_payload
  )
  values (
    payload->>'lastName', payload->>'firstName', payload->>'position', payload->>'organization', payload->>'orgType', payload->>'orgOther',
    payload->>'country', payload->>'city', payload->>'phone', payload->>'email', payload->>'address',
    payload->>'wantsHotel', payload->>'hotelId', payload->>'hotelName', payload->>'roomId', payload->>'roomType',
    nullif(payload->>'checkIn','')::date, nullif(payload->>'checkOut','')::date,
    payload->>'flightNumber', payload->>'airline', nullif(payload->>'arrivalDate','')::date, payload->>'arrivalTime',
    nullif(payload->>'departureDate','')::date, payload->>'departureTime', payload->>'departureFlightNumber',
    payload->>'transfer', payload
  )
  returning reg_number, edit_token into new_reg, new_token;

  return jsonb_build_object('regNumber', new_reg, 'editToken', new_token);
end;
$$;

grant execute on function register_participant(jsonb) to anon;

-- Retrouve sa propre inscription à partir du jeton reçu par email
-- (aucun accès direct à la table, aucune authentification requise).
create or replace function get_participant_by_token(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select to_jsonb(p) - 'raw_payload' into result
  from participants p
  where p.edit_token = p_token;
  return result;
end;
$$;

grant execute on function get_participant_by_token(uuid) to anon;

-- Met à jour sa propre inscription à partir du jeton reçu par email.
create or replace function update_participant_by_token(p_token uuid, payload jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update participants set
    last_name = coalesce(payload->>'lastName', last_name),
    first_name = coalesce(payload->>'firstName', first_name),
    "position" = coalesce(payload->>'position', "position"),
    organization = coalesce(payload->>'organization', organization),
    org_type = coalesce(payload->>'orgType', org_type),
    org_other = coalesce(payload->>'orgOther', org_other),
    country = coalesce(payload->>'country', country),
    city = coalesce(payload->>'city', city),
    phone = coalesce(payload->>'phone', phone),
    email = coalesce(payload->>'email', email),
    address = coalesce(payload->>'address', address),
    wants_hotel = coalesce(payload->>'wantsHotel', wants_hotel),
    hotel_id = coalesce(payload->>'hotelId', hotel_id),
    hotel_name = coalesce(payload->>'hotelName', hotel_name),
    room_id = coalesce(payload->>'roomId', room_id),
    room_type = coalesce(payload->>'roomType', room_type),
    check_in = coalesce(nullif(payload->>'checkIn','')::date, check_in),
    check_out = coalesce(nullif(payload->>'checkOut','')::date, check_out),
    flight_number = coalesce(payload->>'flightNumber', flight_number),
    airline = coalesce(payload->>'airline', airline),
    arrival_date = coalesce(nullif(payload->>'arrivalDate','')::date, arrival_date),
    arrival_time = coalesce(payload->>'arrivalTime', arrival_time),
    departure_date = coalesce(nullif(payload->>'departureDate','')::date, departure_date),
    departure_time = coalesce(payload->>'departureTime', departure_time),
    departure_flight_number = coalesce(payload->>'departureFlightNumber', departure_flight_number),
    transfer = coalesce(payload->>'transfer', transfer)
  where edit_token = p_token;

  return found;
end;
$$;

grant execute on function update_participant_by_token(uuid, jsonb) to anon;

-- Modèles d'email de confirmation (sujet + corps), un jeu par langue,
-- éditables depuis l'admin. Variables disponibles dans le corps :
-- {{firstName}} {{lastName}} {{regNumber}} {{editLink}} {{eventTitle}}
insert into site_settings (key, value) values
('email_subject_fr', 'Confirmation de votre inscription — {{eventTitle}}'),
('email_subject_en', 'Your registration confirmation — {{eventTitle}}'),
('email_subject_pt', 'Confirmação da sua inscrição — {{eventTitle}}'),
('email_body_fr', E'Bonjour {{firstName}} {{lastName}},\n\nVotre inscription a bien été enregistrée sous le numéro {{regNumber}}.\n\nPour consulter ou modifier vos informations à tout moment, utilisez le lien ci-dessous :\n{{editLink}}\n\nÀ bientôt,\nLe Secrétariat Général Permanent — Carte Brune CEDEAO'),
('email_body_en', E'Hello {{firstName}} {{lastName}},\n\nYour registration has been recorded under number {{regNumber}}.\n\nTo view or update your information at any time, use the link below:\n{{editLink}}\n\nSee you soon,\nThe Permanent General Secretariat — ECOWAS Brown Card'),
('email_body_pt', E'Olá {{firstName}} {{lastName}},\n\nA sua inscrição foi registada com o número {{regNumber}}.\n\nPara consultar ou atualizar os seus dados a qualquer momento, utilize o link abaixo:\n{{editLink}}\n\nAté breve,\nO Secretariado-Geral Permanente — Cartão Castanho CEDEAO')
on conflict (key) do nothing;
