// Fonction appelée une fois par jour par Vercel Cron (voir vercel.json).
// Fait une requête minimale à Supabase pour empêcher la mise en veille
// automatique du projet après 7 jours d'inactivité (limite du plan
// gratuit). Ne modifie jamais rien, ne fait que lire une seule ligne.

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase.from("events").select("id").limit(1);
    if (error) throw error;

    res.status(200).json({ ok: true, pinged_at: new Date().toISOString() });
  } catch (err) {
    // On répond quand même 200 pour ne pas générer d'alerte inutile
    // dans les logs Vercel — l'objectif est juste de générer une
    // requête, pas de garantir un résultat métier.
    res.status(200).json({ ok: false, error: String(err.message || err) });
  }
}
