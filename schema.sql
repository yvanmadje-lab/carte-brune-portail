-- =========================================================
-- Portail Carte Brune CEDEAO — schéma Supabase
-- À exécuter une seule fois dans : Supabase > SQL Editor > New query
-- =========================================================

create extension if not exists "pgcrypto";

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  reg_number text unique,
  last_name text,
  first_name text,
  "position" text,
  organization text,
  org_type text,
  org_other text,
  country text,
  city text,
  phone text,
  email text,
  address text,
  wants_hotel text,
  hotel_id text,
  hotel_name text,
  room_id text,
  room_type text,
  check_in date,
  check_out date,
  flight_number text,
  airline text,
  arrival_date date,
  transfer text,
  created_at timestamptz default now()
);

-- Numérotation officielle CB-2026-AG42-000001, générée côté serveur
create sequence if not exists participants_seq start 1;

create or replace function set_reg_number()
returns trigger as $$
begin
  new.reg_number := 'CB-2026-AG42-' || lpad(nextval('participants_seq')::text, 6, '0');
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_reg_number on participants;
create trigger trg_set_reg_number
before insert on participants
for each row execute function set_reg_number();

-- Sécurité : la table n'est accessible ni en lecture ni en écriture
-- directe par le public. Seuls les administrateurs connectés
-- (authenticated) peuvent la consulter/modifier.
alter table participants enable row level security;

drop policy if exists "admins full access" on participants;
create policy "admins full access"
on participants for all
to authenticated
using (true)
with check (true);

-- Le formulaire public d'inscription passe uniquement par cette
-- fonction (SECURITY DEFINER = elle contourne le RLS ci-dessus de façon
-- contrôlée), qui ne renvoie QUE le numéro d'inscription généré —
-- jamais les données des autres participants.
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
    check_in, check_out, flight_number, airline, arrival_date, transfer
  )
  values (
    payload->>'lastName', payload->>'firstName', payload->>'position', payload->>'organization', payload->>'orgType', payload->>'orgOther',
    payload->>'country', payload->>'city', payload->>'phone', payload->>'email', payload->>'address',
    payload->>'wantsHotel', payload->>'hotelId', payload->>'hotelName', payload->>'roomId', payload->>'roomType',
    nullif(payload->>'checkIn','')::date, nullif(payload->>'checkOut','')::date,
    payload->>'flightNumber', payload->>'airline', nullif(payload->>'arrivalDate','')::date, payload->>'transfer'
  )
  returning reg_number into new_reg;

  return new_reg;
end;
$$;

-- Autorise le public (visiteurs non connectés) à appeler UNIQUEMENT
-- cette fonction d'inscription — pas d'accès direct à la table.
grant execute on function register_participant(jsonb) to anon;
