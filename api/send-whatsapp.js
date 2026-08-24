// Fonction serverless Vercel — envoie le message WhatsApp de
// confirmation d'inscription (avec le lien du groupe "Browncard
// Event") via l'API Zavu.
// Ne s'exécute jamais dans le navigateur : la clé API reste secrète.

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
      .in("key", [`whatsapp_body_${safeLang}`, "whatsapp_group_link"]);

    const map = {};
    (settings || []).forEach(r => { map[r.key] = r.value; });

    const vars = {
      firstName: firstName || "",
      lastName: lastName || "",
      regNumber: regNumber || "",
      eventTitle: eventTitle || "",
      whatsappGroupLink: map.whatsapp_group_link || "",
    };

    const text = fillTemplate(map[`whatsapp_body_${safeLang}`] || "Votre inscription est confirmée : {{regNumber}}", vars);

    const apiKey = process.env.ZAVU_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "ZAVU_API_KEY missing on server" });
      return;
    }

    const zavuRes = await fetch("https://api.zavu.dev/v1/messages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to: phone, channel: "whatsapp", text }),
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
