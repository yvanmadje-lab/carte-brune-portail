-- =========================================================
-- Portail Carte Brune CEDEAO — Rôles administrateurs
-- À exécuter dans : Supabase > SQL Editor > New query
-- (à exécuter APRÈS toutes les migrations précédentes)
-- =========================================================


-- ---------- PROFILS ADMIN (rôle par utilisateur) ----------
create table if not exists admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'viewer' check (role in ('super_admin', 'manager', 'viewer')),
  display_name text,
  created_at timestamptz default now()
);

-- Fonctions utilitaires utilisées dans les policies ci-dessous.
create or replace function is_super_admin() returns boolean
language sql stable security definer as $$
  select exists(select 1 from admin_profiles where user_id = auth.uid() and role = 'super_admin');
$$;

create or replace function can_edit() returns boolean
language sql stable security definer as $$
  select exists(select 1 from admin_profiles where user_id = auth.uid() and role in ('super_admin', 'manager'));
$$;

alter table admin_profiles enable row level security;

drop policy if exists "view own or all if super admin" on admin_profiles;
create policy "view own or all if super admin"
on admin_profiles for select
to authenticated
using (auth.uid() = user_id or is_super_admin());

drop policy if exists "super admin manages profiles insert" on admin_profiles;
create policy "super admin manages profiles insert"
on admin_profiles for insert
to authenticated
with check (is_super_admin());

drop policy if exists "super admin manages profiles update" on admin_profiles;
create policy "super admin manages profiles update"
on admin_profiles for update
to authenticated
using (is_super_admin())
with check (is_super_admin());

drop policy if exists "super admin manages profiles delete" on admin_profiles;
create policy "super admin manages profiles delete"
on admin_profiles for delete
to authenticated
using (is_super_admin());

-- Nouveau compte admin (créé via Supabase Authentication > Users) →
-- profil "viewer" créé automatiquement, à promouvoir ensuite depuis
-- l'onglet "Utilisateurs" de l'admin.
create or replace function handle_new_admin_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into admin_profiles (user_id, email, role) values (new.id, new.email, 'viewer')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_admin_user();

-- Comptes admin déjà créés avant cette migration → deviennent
-- super_admin automatiquement (pour ne pas se retrouver bloqué dehors).
insert into admin_profiles (user_id, email, role)
select id, email, 'super_admin' from auth.users
on conflict (user_id) do nothing;

-- ---------- Mise à jour des permissions existantes ----------
-- Lecture ouverte à tout admin connecté (y compris "viewer"),
-- écriture réservée aux rôles super_admin et manager.

drop policy if exists "admins full access" on participants;
drop policy if exists "participants select" on participants;
drop policy if exists "participants insert" on participants;
drop policy if exists "participants update" on participants;
drop policy if exists "participants delete" on participants;
create policy "participants select" on participants for select to authenticated using (true);
create policy "participants insert" on participants for insert to authenticated with check (can_edit());
create policy "participants update" on participants for update to authenticated using (can_edit()) with check (can_edit());
create policy "participants delete" on participants for delete to authenticated using (can_edit());

do $$
declare
  tbl text;
  tables text[] := array['tourist_sites','cms_hotels','hero_slides','cms_speakers','cms_menu_items','cms_org_types','cms_form_fields','site_settings'];
begin
  foreach tbl in array tables loop
    execute format('drop policy if exists %I on %I', 'admins full access ' || tbl, tbl);
    execute format('drop policy if exists %I on %I', tbl || ' select', tbl);
    execute format('drop policy if exists %I on %I', tbl || ' insert', tbl);
    execute format('drop policy if exists %I on %I', tbl || ' update', tbl);
    execute format('drop policy if exists %I on %I', tbl || ' delete', tbl);
    execute format('create policy %I on %I for select to authenticated using (true)', tbl || ' select', tbl);
    execute format('create policy %I on %I for insert to authenticated with check (can_edit())', tbl || ' insert', tbl);
    execute format('create policy %I on %I for update to authenticated using (can_edit()) with check (can_edit())', tbl || ' update', tbl);
    execute format('create policy %I on %I for delete to authenticated using (can_edit())', tbl || ' delete', tbl);
  end loop;
end $$;
