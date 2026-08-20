-- =========================================================
-- Portail Carte Brune CEDEAO — Délai d'expiration du lien de
-- modification + badges en-tête/corps/footer (images)
-- À exécuter dans : Supabase > SQL Editor > New query
-- (à exécuter APRÈS toutes les migrations précédentes)
-- =========================================================

insert into site_settings (key, value) values ('edit_link_expiry_days', '30')
on conflict (key) do nothing;

create or replace function get_participant_by_token(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
  v_expiry_days int;
  v_created timestamptz;
begin
  select coalesce((select value from site_settings where key = 'edit_link_expiry_days')::int, 30) into v_expiry_days;

  select p.created_at into v_created from participants p where p.edit_token = p_token;
  if v_created is null then
    return null;
  end if;

  if now() > v_created + (v_expiry_days || ' days')::interval then
    return jsonb_build_object('expired', true);
  end if;

  select to_jsonb(p) - 'raw_payload' into result from participants p where p.edit_token = p_token;
  return result;
end;
$$;

grant execute on function get_participant_by_token(uuid) to anon;

create or replace function update_participant_by_token(p_token uuid, payload jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expiry_days int;
  v_created timestamptz;
begin
  select coalesce((select value from site_settings where key = 'edit_link_expiry_days')::int, 30) into v_expiry_days;

  select created_at into v_created from participants where edit_token = p_token;
  if v_created is null then
    return false;
  end if;
  if now() > v_created + (v_expiry_days || ' days')::interval then
    return false;
  end if;

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
    departure_flight_number = coalesce(payload->>'departureFlightNumber', departure_flight_number)
  where edit_token = p_token;

  return found;
end;
$$;

grant execute on function update_participant_by_token(uuid, jsonb) to anon;

-- ---------------------------------------------------------
-- Badges : en-tête, corps et pied de page en tant qu'IMAGES
-- (remplace l'ancien modèle texte + fond unique). Les seules
-- variables affichées restent le Nom & Prénom et le Pays, plus le
-- QR code placé dans le pied de page.
-- ---------------------------------------------------------

alter table events add column if not exists badge_header_image text;
alter table events add column if not exists badge_body_image text;
alter table events add column if not exists badge_footer_image text;
