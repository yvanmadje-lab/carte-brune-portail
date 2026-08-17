-- =========================================================
-- Portail Carte Brune CEDEAO — Architecture multi-événements
-- (AG, Réunions de Zone, etc. — inscriptions et numérotation
-- propres à chaque événement ; hôtels et contenu restent partagés)
-- À exécuter dans : Supabase > SQL Editor > New query
-- (à exécuter APRÈS toutes les migrations précédentes)
-- =========================================================

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'other', -- 'ag' | 'zone1' | 'zone2' | 'other'
  year int not null,
  code text not null, -- préfixe des numéros d'inscription, ex: AG42, ZM1
  edition text, -- ex: "42", "1"
  ordinal jsonb not null default '{"fr":"e","en":"","pt":"ª"}',
  title jsonb not null default '{"fr":"","en":"","pt":""}',
  theme jsonb not null default '{"fr":"","en":"","pt":""}',
  subtitle jsonb not null default '{"fr":"","en":"","pt":""}',
  date_short jsonb not null default '{"fr":"","en":"","pt":""}',
  month_year jsonb not null default '{"fr":"","en":"","pt":""}',
  venue jsonb not null default '{"fr":"","en":"","pt":""}',
  city text, country text,
  status text not null default 'draft' check (status in ('draft','open','closed','archived')),
  is_active boolean not null default false,
  created_at timestamptz default now()
);

-- Un seul événement actif à la fois (celui visible publiquement et
-- sur lequel les nouvelles inscriptions arrivent).
create unique index if not exists events_one_active_idx on events (is_active) where is_active;

alter table events enable row level security;

-- Aucun accès public direct à la table : le site public passe
-- uniquement par get_active_event() ci-dessous, qui ne révèle jamais
-- les événements en brouillon/archivés.
drop policy if exists "admins full access events" on events;
create policy "admins full access events"
on events for all
to authenticated
using (true) with check (true);

create or replace function get_active_event()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select to_jsonb(e) from events e where e.is_active limit 1;
$$;
grant execute on function get_active_event() to anon;

create or replace function set_active_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update events set is_active = false where is_active = true;
  update events set is_active = true where id = p_event_id;
end;
$$;
grant execute on function set_active_event(uuid) to authenticated;

-- Chaque inscription est désormais rattachée à un événement précis.
alter table participants add column if not exists event_id uuid references events(id);

-- Événement de départ, à partir des valeurs déjà en place sur le
-- site (42e Assemblée Générale, Dakar). Si vous avez déjà personnalisé
-- le contenu du bandeau depuis l'admin, ces valeurs par défaut ne les
-- reprennent pas automatiquement — vérifiez et ajustez ensuite depuis
-- le nouvel onglet "Événements".
insert into events (type, year, code, edition, ordinal, title, theme, subtitle, date_short, month_year, venue, city, country, status, is_active)
select 'ag', 2026, 'AG42', '42',
  '{"fr":"e","en":"nd","pt":"ª"}',
  '{"fr":"Assemblée Générale","en":"General Assembly","pt":"Assembleia Geral"}',
  '{"fr":"","en":"","pt":""}',
  '{"fr":"Le Conseil des Bureaux du Système d''Assurance Carte Brune CEDEAO réunit à Dakar les Bureaux Nationaux, régulateurs et partenaires techniques pour sa 42e Assemblée Générale annuelle, en collaboration avec la Fédération Sénégalaise des Sociétés d''Assurances (FSSA).","en":"The Council of Bureaux of the ECOWAS Brown Card Insurance Scheme convenes National Bureaux, regulators and technical partners in Dakar for its 42nd annual General Assembly, in partnership with the Senegalese Federation of Insurance Companies (FSSA).","pt":"O Conselho de Bureaux do Sistema de Seguro Cartão Castanho da CEDEAO reúne em Dakar os Bureaux Nacionais, reguladores e parceiros técnicos para a sua 42a Assembleia Geral anual, em parceria com a Federação Senegalesa das Sociedades de Seguros (FSSA)."}',
  '{"fr":"DU 19 AU 22","en":"FROM 19 TO 22","pt":"DE 19 A 22"}',
  '{"fr":"OCTOBRE 2026","en":"OCTOBER 2026","pt":"OUTUBRO 2026"}',
  '{"fr":"Hôtel Pullman Dakar","en":"Hôtel Pullman Dakar","pt":"Hôtel Pullman Dakar"}',
  'Dakar', 'Sénégal', 'open', true
where not exists (select 1 from events);

-- Rattache les inscriptions déjà enregistrées avant cette migration
-- à cet événement de départ, pour ne rien perdre.
update participants set event_id = (select id from events where code = 'AG42' order by created_at asc limit 1)
where event_id is null;

-- La numérotation (CB-{année}-{code}-000001) est désormais calculée
-- par rapport à l'événement actif, plus par une séquence globale.
drop trigger if exists trg_set_reg_number on participants;
drop function if exists set_reg_number();
drop sequence if exists participants_seq;

create or replace function register_participant(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event record;
  v_count int;
  new_reg text;
  new_token uuid;
begin
  select * into v_event from events where is_active limit 1;
  if v_event is null then
    raise exception 'Aucun événement actif — contactez l''administrateur.';
  end if;

  select count(*) into v_count from participants where event_id = v_event.id;
  new_reg := 'CB-' || v_event.year || '-' || v_event.code || '-' || lpad((v_count + 1)::text, 6, '0');

  insert into participants (
    event_id, reg_number,
    last_name, first_name, "position", organization, org_type, org_other,
    country, city, phone, email, address,
    wants_hotel, hotel_id, hotel_name, room_id, room_type,
    check_in, check_out,
    flight_number, airline, arrival_date, arrival_time,
    departure_date, departure_time, departure_flight_number,
    transfer, raw_payload
  )
  values (
    v_event.id, new_reg,
    payload->>'lastName', payload->>'firstName', payload->>'position', payload->>'organization', payload->>'orgType', payload->>'orgOther',
    payload->>'country', payload->>'city', payload->>'phone', payload->>'email', payload->>'address',
    payload->>'wantsHotel', payload->>'hotelId', payload->>'hotelName', payload->>'roomId', payload->>'roomType',
    nullif(payload->>'checkIn','')::date, nullif(payload->>'checkOut','')::date,
    payload->>'flightNumber', payload->>'airline', nullif(payload->>'arrivalDate','')::date, payload->>'arrivalTime',
    nullif(payload->>'departureDate','')::date, payload->>'departureTime', payload->>'departureFlightNumber',
    payload->>'transfer', payload
  )
  returning edit_token into new_token;

  return jsonb_build_object('regNumber', new_reg, 'editToken', new_token);
end;
$$;

grant execute on function register_participant(jsonb) to anon;

-- ---------------------------------------------------------
-- CONTENU RATTACHÉ À CHAQUE ÉVÉNEMENT (hôtels, tourisme,
-- carrousel d'accueil, comité d'organisation)
-- ---------------------------------------------------------

alter table cms_hotels add column if not exists event_id uuid references events(id);
alter table tourist_sites add column if not exists event_id uuid references events(id);
alter table hero_slides add column if not exists event_id uuid references events(id);
alter table cms_speakers add column if not exists event_id uuid references events(id);

-- Rattache tout le contenu existant à l'événement de départ (AG42),
-- pour qu'il reste visible tant que cet événement est actif.
update cms_hotels set event_id = (select id from events where code = 'AG42' order by created_at asc limit 1) where event_id is null;
update tourist_sites set event_id = (select id from events where code = 'AG42' order by created_at asc limit 1) where event_id is null;
update hero_slides set event_id = (select id from events where code = 'AG42' order by created_at asc limit 1) where event_id is null;
update cms_speakers set event_id = (select id from events where code = 'AG42' order by created_at asc limit 1) where event_id is null;

-- ---------------------------------------------------------
-- CHAMPS BADGE (en-tête personnalisable, fond du corps du badge,
-- document PDF par langue vers lequel le QR code redirige)
-- ---------------------------------------------------------

alter table events add column if not exists badge_header jsonb not null default '{"fr":"","en":"","pt":""}';
alter table events add column if not exists badge_background text;
alter table events add column if not exists badge_pdf jsonb not null default '{"fr":"","en":"","pt":""}';

-- ---------------------------------------------------------
-- DUPLIQUER UN ÉVÉNEMENT (préparer l'édition suivante) : copie la
-- structure (contenu, hôtels, tourisme, carrousel, comité) mais
-- JAMAIS les participants, conformément au cahier des charges.
-- ---------------------------------------------------------

create or replace function duplicate_event(p_event_id uuid, p_new_year int, p_new_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_id uuid;
begin
  insert into events (type, year, code, edition, ordinal, title, theme, subtitle, date_short, month_year, venue, city, country, status, is_active, badge_header, badge_background, badge_pdf)
  select type, p_new_year, p_new_code, edition, ordinal, title, theme, subtitle, date_short, month_year, venue, city, country, 'draft', false, badge_header, badge_background, badge_pdf
  from events where id = p_event_id
  returning id into v_new_id;

  insert into cms_hotels (event_id, name, distance, desc_fr, desc_en, desc_pt, image_url, amenities, price, currency, room_type, gallery, website, display_order, status)
  select v_new_id, name, distance, desc_fr, desc_en, desc_pt, image_url, amenities, price, currency, room_type, gallery, website, display_order, status
  from cms_hotels where event_id = p_event_id;

  insert into tourist_sites (event_id, name_fr, name_en, name_pt, desc_fr, desc_en, desc_pt, image_url, display_order, status)
  select v_new_id, name_fr, name_en, name_pt, desc_fr, desc_en, desc_pt, image_url, display_order, status
  from tourist_sites where event_id = p_event_id;

  insert into hero_slides (event_id, image_url, display_order, status)
  select v_new_id, image_url, display_order, status
  from hero_slides where event_id = p_event_id;

  insert into cms_speakers (event_id, name, role_fr, role_en, role_pt, image_url, display_order, status)
  select v_new_id, name, role_fr, role_en, role_pt, image_url, display_order, status
  from cms_speakers where event_id = p_event_id;

  return v_new_id;
end;
$$;

grant execute on function duplicate_event(uuid, int, text) to authenticated;

-- ---------------------------------------------------------
-- ARCHIVES PUBLIQUES : liste des événements passés (jamais les
-- brouillons), consultable sans connexion.
-- ---------------------------------------------------------

create or replace function list_archived_events()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(jsonb_agg(to_jsonb(e) order by e.year desc, e.created_at desc), '[]'::jsonb)
  from events e
  where e.status in ('closed', 'archived') and e.is_active = false;
$$;

grant execute on function list_archived_events() to anon;

