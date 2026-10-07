// Fonction serverless Vercel — ouvre un passeport sous le nom de domaine
// du site (https://www.browncard-event.org/api/passport), sans jamais
// montrer l'adresse du stockage Supabase.
//
// Fonctionnement : l'admin envoie son jeton de connexion ; cette fonction
// interroge le stockage PRIVÉ avec CE jeton (et non avec une clé
// secrète). C'est donc la règle de la base de données qui décide : seuls
// le super admin et le rôle « lecture seule » peuvent lire un passeport.
// Pour tout autre compte, la base refuse et la réponse est « introuvable ».
// Aucune clé secrète n'est nécessaire : les mêmes variables que les
// autres fonctions du site suffisent.

import { createClient } from "@supabase/supabase-js";

// Même forme de chemin que celle imposée par la base : <jeton>/<nom.extension>
const PATH_FORMAT = /^[0-9a-fA-F-]{36}\/[A-Za-z0-9._-]{1,120}$/;

// Types servis (jamais ceux fournis par l'appelant ou le stockage).
const TYPES = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export default async function handler(req, res) {
  // Un passeport ne doit jamais être gardé en cache.
  res.setHeader("Cache-Control", "private, no-store");

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const authorization = String(req.headers.authorization || "");
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  const path = req.body && req.body.path;

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (typeof path !== "string" || !PATH_FORMAT.test(path)) {
    res.status(400).json({ error: "Bad request" });
    return;
  }

  const ext = path.split(".").pop().toLowerCase();
  const type = TYPES[ext];
  if (!type) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  try {
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.storage.from("passports").download(path);
    if (error || !data) {
      // Accès refusé par la base ou fichier absent : même réponse, pour
      // ne rien révéler sur l'existence d'un fichier.
      res.status(404).json({ error: "Not found" });
      return;
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    res.setHeader("Content-Type", type);
    res.setHeader("Content-Disposition", `inline; filename="passeport.${ext}"`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.status(200).send(buffer);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
}
