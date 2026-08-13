-- =========================================================
-- Portail Carte Brune CEDEAO — Champs voyage étendus
-- (heure d'arrivée, date/heure/vol de départ)
-- À exécuter dans : Supabase > SQL Editor > New query
-- (à exécuter APRÈS toutes les migrations précédentes)
-- =========================================================

alter table participants add column if not exists arrival_time text;
alter table participants add column if not exists departure_date date;
alter table participants add column if not exists departure_time text;
alter table participants add column if not exists departure_flight_number text;

create or replace function register_participant(payload jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_reg text;
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
  returning reg_number into new_reg;

  return new_reg;
end;
$$;

grant execute on function register_participant(jsonb) to anon;

-- Nouveaux champs par défaut du formulaire (étape Voyage), avec
-- renommage du champ existant pour plus de clarté.
update cms_form_fields set label_fr = 'Numéro de vol (arrivée)', label_en = 'Flight number (arrival)', label_pt = 'Número do voo (chegada)'
where field_key = 'flightNumber' and label_fr = 'Numéro de vol';

insert into cms_form_fields (field_key, step, label_fr, label_en, label_pt, field_type, required, display_order) values
('arrivalTime', 4, 'Heure d''arrivée', 'Arrival time', 'Hora de chegada', 'time', false, 4),
('departureDate', 4, 'Date de départ', 'Departure date', 'Data de partida', 'date', false, 5),
('departureTime', 4, 'Heure de départ', 'Departure time', 'Hora de partida', 'time', false, 6),
('departureFlightNumber', 4, 'Numéro de vol (départ)', 'Flight number (departure)', 'Número do voo (partida)', 'text', false, 7)
on conflict (field_key) do nothing;
