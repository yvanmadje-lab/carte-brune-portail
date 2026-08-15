// Fonction serverless Vercel — envoie l'email de confirmation
// d'inscription (avec le lien de modification) via Resend.
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
    const { email, lang, firstName, lastName, regNumber, editLink, eventTitle } = req.body || {};

    if (!email || !editLink) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const safeLang = ["fr", "en", "pt"].includes(lang) ? lang : "fr";

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: settings } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", [`email_subject_${safeLang}`, `email_body_${safeLang}`]);

    const map = {};
    (settings || []).forEach(r => { map[r.key] = r.value; });

    const vars = {
      firstName: firstName || "",
      lastName: lastName || "",
      regNumber: regNumber || "",
      editLink,
      eventTitle: eventTitle || "",
    };

    const subject = fillTemplate(map[`email_subject_${safeLang}`] || "Confirmation d'inscription", vars);
    const text = fillTemplate(map[`email_body_${safeLang}`] || `Votre lien : ${editLink}`, vars);
    const html = text.replace(/\n/g, "<br/>").replace(editLink, `<a href="${editLink}">${editLink}</a>`);

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      res.status(500).json({ error: "RESEND_API_KEY missing on server" });
      return;
    }

    const from = process.env.EMAIL_FROM || "onboarding@resend.dev";

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [email], subject, text, html }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      res.status(502).json({ error: "Email provider error", detail: errText });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
}
