// Fonction serverless Vercel — sert le document PDF associé au QR
// code du badge sous le nom de domaine du site (ex.
// https://www.browncard-event.org/api/badge-pdf), au lieu de
// pointer directement vers l'URL de stockage Supabase. Le visiteur
// qui scanne le QR code ne voit jamais que le fichier est hébergé
// sur Supabase : le serveur récupère le fichier et le retransmet
// lui-même. Servi en "inline" pour s'ouvrir directement, sans
// passer par un téléchargement préalable.

import { createClient } from "@supabase/supabase-js";

const NOT_FOUND_MESSAGE = {
  fr: "Aucun document n'a encore été chargé pour ce badge.",
  en: "No document has been uploaded yet for this badge.",
  pt: "Ainda não foi carregado nenhum documento para este crachá.",
};

export default async function handler(req, res) {
  const lang = ["fr", "en", "pt"].includes(req.query.lang) ? req.query.lang : "fr";

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: event, error } = await supabase.rpc("get_active_event");
    if (error || !event) {
      res.status(404).send(NOT_FOUND_MESSAGE[lang]);
      return;
    }

    const pdf = event.badge_pdf || {};
    const link = pdf[lang] || pdf.fr || pdf.en || pdf.pt || "";
    if (!link) {
      res.status(404).send(NOT_FOUND_MESSAGE[lang]);
      return;
    }

    const fileRes = await fetch(link);
    if (!fileRes.ok) {
      res.status(502).send(NOT_FOUND_MESSAGE[lang]);
      return;
    }

    const buffer = Buffer.from(await fileRes.arrayBuffer());
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="document.pdf"');
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(buffer);
  } catch (err) {
    res.status(500).send(NOT_FOUND_MESSAGE[lang]);
  }
}
