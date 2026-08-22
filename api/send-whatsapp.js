// Fonction serverless Vercel — envoie le message WhatsApp de
// confirmation d'inscription (avec le lien du groupe "Browncard
// Event") via l'API WhatsApp de Twilio.
// Ne s'exécute jamais dans le navigateur : les identifiants restent secrets.

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

    const body = fillTemplate(map[`whatsapp_body_${safeLang}`] || "Votre inscription est confirmée : {{regNumber}}", vars);

    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM; // ex: whatsapp:+14155238886

    if (!sid || !token || !from) {
      res.status(500).json({ error: "Twilio credentials missing on server" });
      return;
    }

    const to = phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`;

    const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: from, To: to, Body: body }),
    });

    if (!twilioRes.ok) {
      const errText = await twilioRes.text();
      res.status(502).json({ error: "WhatsApp provider error", detail: errText });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
}
