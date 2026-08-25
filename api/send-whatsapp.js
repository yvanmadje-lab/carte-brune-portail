// Fonction serverless Vercel — envoie le message WhatsApp de
// confirmation d'inscription (avec le lien du groupe "Browncard
// Event") via l'API Zavu.
// Ne s'exécute jamais dans le navigateur : la clé API reste secrète.
//
// Deux modes :
// - Si un modèle WhatsApp approuvé existe pour la langue du
//   participant (whatsapp_template_id_fr/en/pt), on l'utilise
//   (obligatoire pour les messages envoyés à l'initiative de
//   l'entreprise, règle Meta) — un modèle Meta approuvé a un texte
//   figé dans UNE langue, d'où un identifiant distinct par langue.
// - Sinon (aucun modèle configuré pour cette langue), on retente un
//   envoi en texte libre dans la langue du participant — ne sera
//   livré que si le participant a déjà écrit au numéro WhatsApp dans
//   les 24h, sinon l'envoi échouera.

import { createClient } from "@supabase/supabase-js";

function fillTemplate(str, vars) {
  return (str || "").replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { phone, lang, firstName, lastName, regNumber, eventTitle } = req.body || {};

    if (!phone) {
      res.status(400).json({ error: "Missing phone number" });
      return;
    }

    const safeLang = ["fr", "en", "pt"].includes(lang) ? lang : "fr";

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: settings } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", [
        `whatsapp_body_${safeLang}`,
        "whatsapp_group_link",
        `whatsapp_template_id_${safeLang}`,
      ]);

    const map = {};
    (settings || []).forEach(r => { map[r.key] = r.value; });

    const vars = {
      firstName: firstName || "",
      lastName: lastName || "",
      regNumber: regNumber || "",
      eventTitle: eventTitle || "",
      whatsappGroupLink: map.whatsapp_group_link || "",
    };

    const apiKey = process.env.ZAVU_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "ZAVU_API_KEY missing on server" });
      return;
    }

    const templateId = (map[`whatsapp_template_id_${safeLang}`] || "").trim();

    const body = templateId
      ? {
          to: phone,
          channel: "whatsapp",
          messageType: "template",
          content: {
            templateId,
            // Ordre fixe des variables — voir l'aide de l'onglet
            // WhatsApp de l'admin pour créer le modèle dans le même ordre.
            templateVariables: {
              "1": vars.firstName,
              "2": vars.lastName,
              "3": vars.eventTitle,
              "4": vars.regNumber,
              "5": vars.whatsappGroupLink,
            },
          },
        }
      : {
          to: phone,
          channel: "whatsapp",
          text: fillTemplate(map[`whatsapp_body_${safeLang}`] || "Votre inscription est confirmée : {{regNumber}}", vars),
        };

    const zavuRes = await fetch("https://api.zavu.dev/v1/messages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!zavuRes.ok) {
      const errText = await zavuRes.text();
      res.status(502).json({ error: "WhatsApp provider error", detail: errText });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
}
