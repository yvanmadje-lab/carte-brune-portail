// Fonction serverless Vercel — sert le PDF du programme sous le nom
// de domaine du site (ex. https://votresite.vercel.app/api/program),
// au lieu d'ouvrir directement l'URL de stockage Supabase. Le
// visiteur ne voit jamais que le fichier est hébergé sur Supabase :
// le serveur récupère le fichier et le retransmet lui-même.

import { createClient } from "@supabase/supabase-js";

const NOT_FOUND_MESSAGE = {
  fr: "Aucun document Programme n'a encore été chargé pour cet événement.",
  en: "No Programme document has been uploaded yet for this event.",
  pt: "Ainda não foi carregado nenhum documento de Programa para este evento.",
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

    const pdf = event.program_pdf || {};
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
    res.setHeader("Content-Disposition", 'inline; filename="programme.pdf"');
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(buffer);
  } catch (err) {
    res.status(500).send(NOT_FOUND_MESSAGE[lang]);
  }
}
