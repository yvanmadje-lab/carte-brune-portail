import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn("Supabase env vars manquantes : VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient(url, anonKey);

// --- Helpers CMS génériques (utilisés par l'espace admin) ---

export async function uploadMedia(file, folder = "misc") {
  const ext = file.name.split(".").pop();
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("media").getPublicUrl(path);
  return data.publicUrl;
}

export async function fetchPublished(table) {
  const { data, error } = await supabase.from(table).select("*").eq("status", "published").order("display_order", { ascending: true });
  if (error) return [];
  return data || [];
}

export async function fetchAll(table) {
  const { data, error } = await supabase.from(table).select("*").order("display_order", { ascending: true });
  if (error) return [];
  return data || [];
}

export async function upsertRow(table, row) {
  const { data, error } = await supabase.from(table).upsert(row).select().single();
  if (error) throw error;
  return data;
}

export async function deleteRow(table, id) {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}

export async function getSetting(key) {
  const { data, error } = await supabase.from("site_settings").select("value").eq("key", key).maybeSingle();
  if (error) return null;
  return data?.value || null;
}

export async function setSetting(key, value) {
  const { error } = await supabase.from("site_settings").upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw error;
}

export async function getAllSettings() {
  const { data, error } = await supabase.from("site_settings").select("key, value");
  if (error || !data) return {};
  const map = {};
  data.forEach(row => { map[row.key] = row.value; });
  return map;
}

export async function getMyProfile() {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData?.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase.from("admin_profiles").select("*").eq("user_id", uid).maybeSingle();
  if (error) return null;
  return data;
}

export async function listAdminProfiles() {
  const { data, error } = await supabase.from("admin_profiles").select("*").order("created_at", { ascending: true });
  if (error) return [];
  return data || [];
}

export async function updateAdminRole(userId, role) {
  const { error } = await supabase.from("admin_profiles").update({ role }).eq("user_id", userId);
  if (error) throw error;
}

export async function removeAdminProfile(userId) {
  const { error } = await supabase.from("admin_profiles").delete().eq("user_id", userId);
  if (error) throw error;
}
