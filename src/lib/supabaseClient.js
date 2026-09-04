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

export async function listHotelManagerLinks() {
  const { data, error } = await supabase.from("hotel_managers").select("*");
  if (error) return [];
  return data || [];
}

export async function addHotelManager(userId, hotelId) {
  const { error } = await supabase.from("hotel_managers").upsert({ user_id: userId, hotel_id: hotelId });
  if (error) throw error;
}

export async function removeHotelManager(userId, hotelId) {
  const { error } = await supabase.from("hotel_managers").delete().eq("user_id", userId).eq("hotel_id", hotelId);
  if (error) throw error;
}

export async function listMyManagedHotels() {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData?.user?.id;
  if (!uid) return [];
  const { data, error } = await supabase.from("hotel_managers").select("hotel_id, cms_hotels(id, name_fr, name_en, name_pt, name)").eq("user_id", uid);
  if (error) return [];
  return (data || []).map(row => row.cms_hotels).filter(Boolean);
}

export async function listCountryManagerLinks() {
  const { data, error } = await supabase.from("country_managers").select("*");
  if (error) return [];
  return data || [];
}

export async function addCountryManager(userId, country) {
  const { error } = await supabase.from("country_managers").upsert({ user_id: userId, country });
  if (error) throw error;
}

export async function removeCountryManager(userId, country) {
  const { error } = await supabase.from("country_managers").delete().eq("user_id", userId).eq("country", country);
  if (error) throw error;
}

export async function listMyManagedCountries() {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData?.user?.id;
  if (!uid) return [];
  const { data, error } = await supabase.from("country_managers").select("country").eq("user_id", uid);
  if (error) return [];
  return (data || []).map(row => row.country);
}

export async function clearParticipantsForActiveEvent() {
  const { data, error } = await supabase.rpc("clear_participants_for_active_event");
  if (error) throw error;
  return data;
}

export async function fetchPublishedForEvent(table, eventId) {
  if (!eventId) return [];
  const { data, error } = await supabase.from(table).select("*").eq("status", "published").eq("event_id", eventId).order("display_order", { ascending: true });
  if (error) return [];
  return data || [];
}

export async function fetchAllForEvent(table, eventId) {
  if (!eventId) return [];
  const { data, error } = await supabase.from(table).select("*").eq("event_id", eventId).order("display_order", { ascending: true });
  if (error) return [];
  return data || [];
}

export async function getActiveEvent() {
  const { data, error } = await supabase.rpc("get_active_event");
  if (error) return null;
  return data;
}

export async function listAllEvents() {
  const { data, error } = await supabase.from("events").select("*").order("year", { ascending: false }).order("created_at", { ascending: false });
  if (error) return [];
  return data || [];
}

export async function setActiveEvent(eventId) {
  const { error } = await supabase.rpc("set_active_event", { p_event_id: eventId });
  if (error) throw error;
}

export async function duplicateEvent(eventId, newYear, newCode) {
  const { data, error } = await supabase.rpc("duplicate_event", { p_event_id: eventId, p_new_year: newYear, p_new_code: newCode });
  if (error) throw error;
  return data;
}

export async function listArchivedEvents() {
  const { data, error } = await supabase.rpc("list_archived_events");
  if (error) return [];
  return data || [];
}
