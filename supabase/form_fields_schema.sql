-- =========================================================
-- Portail Carte Brune CEDEAO — Champs dynamiques du formulaire
-- À exécuter dans : Supabase > SQL Editor > New query
-- (à exécuter APRÈS les migrations précédentes)
-- =========================================================

create table if not exists cms_form_fields (
  id uuid primary key default gen_random_uuid(),
  field_key text not null unique,
  step int not null, -- 1 = identité, 2 = coordonnées, 4 = voyage
  label_fr text, label_en text, label_pt text,
  field_type text not null default 'text', -- text | textarea | email | tel | date | number
  required boolean not null default false,
  display_order int not null default 0,
  status text not null default 'published', -- 'draft' = champ retiré du formulaire
  created_at timestamptz default now()
);
alter table cms_form_fields enable row level security;

drop policy if exists "public read published cms_form_fields" on cms_form_fields;
create policy "public read published cms_form_fields"
on cms_form_fields for select
to anon
using (status = 'published');

drop policy if exists "admins full access cms_form_fields" on cms_form_fields;
create policy "admins full access cms_form_fields"
on cms_form_fields for all
to authenticated
using (true) with check (true);

-- Reprend les champs actuellement codés en dur comme point de départ
-- (field_key correspond exactement aux clés déjà utilisées par le
-- formulaire et déjà mappées vers des colonnes participants existantes).
insert into cms_form_fields (field_key, step, label_fr, label_en, label_pt, field_type, required, display_order) values
('lastName', 1, 'Nom', 'Last name', 'Apelido', 'text', false, 1),
('firstName', 1, 'Prénom', 'First name', 'Nome próprio', 'text', false, 2),
('position', 1, 'Fonction', 'Position', 'Função', 'text', false, 3),
('organization', 1, 'Organisme', 'Organization', 'Organização', 'text', false, 4),
('city', 2, 'Ville', 'City', 'Cidade', 'text', false, 1),
('phone', 2, 'Téléphone', 'Phone', 'Telefone', 'tel', false, 2),
('email', 2, 'Email', 'Email', 'Email', 'email', false, 3),
('address', 2, 'Adresse', 'Address', 'Endereço', 'text', false, 4),
('flightNumber', 4, 'Numéro de vol', 'Flight number', 'Número do voo', 'text', false, 1),
('airline', 4, 'Compagnie aérienne', 'Airline', 'Companhia aérea', 'text', false, 2),
('arrivalDate', 4, 'Date d''arrivée', 'Arrival date', 'Data de chegada', 'date', false, 3)
on conflict (field_key) do nothing;

-- Capture l'intégralité des réponses soumises (y compris tout champ
-- personnalisé ajouté plus tard qui n'a pas de colonne dédiée), pour
-- que rien ne soit jamais perdu même si le formulaire évolue.
alter table participants add column if not exists raw_payload jsonb;

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
    check_in, check_out, flight_number, airline, arrival_date, transfer,
    raw_payload
  )
  values (
    payload->>'lastName', payload->>'firstName', payload->>'position', payload->>'organization', payload->>'orgType', payload->>'orgOther',
    payload->>'country', payload->>'city', payload->>'phone', payload->>'email', payload->>'address',
    payload->>'wantsHotel', payload->>'hotelId', payload->>'hotelName', payload->>'roomId', payload->>'roomType',
    nullif(payload->>'checkIn','')::date, nullif(payload->>'checkOut','')::date,
    payload->>'flightNumber', payload->>'airline', nullif(payload->>'arrivalDate','')::date, payload->>'transfer',
    payload
  )
  returning reg_number into new_reg;

  return new_reg;
end;
$$;

grant execute on function register_participant(jsonb) to anon;
