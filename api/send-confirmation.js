// Fonction serverless Vercel — envoie l'email de confirmation
// d'inscription (avec le lien de modification) via Resend.
// Ne s'exécute jamais dans le navigateur : la clé API reste secrète.
//
// Fiabilité : jusqu'à 3 tentatives d'envoi (avec un court délai
// entre chaque), et le résultat (réussite ou échec, avec le détail
// de l'erreur) est toujours enregistré sur la ligne du participant
// via mark_confirmation_email_status — ce qui permet à l'admin de
// voir quels emails n'ont pas pu partir et de les renvoyer
// manuellement depuis le tableau des participants.

import { createClient } from "@supabase/supabase-js";

function fillTemplate(str, vars) {
  return (str || "").replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Enregistre le résultat de l'envoi sur la ligne du participant.
// Ne doit JAMAIS faire échouer la requête : l'email est déjà parti (ou
// non), ce suivi n'est qu'un témoin.
// NB : une requête Supabase n'est pas une vraie Promise (elle n'a pas de
// .catch()). Appeler .catch() dessus provoquait une erreur APRÈS l'envoi
// de l'email, avant l'enregistrement de son résultat : l'email partait
// bien, mais l'admin continuait d'afficher « échec ». On utilise donc
// try/await et on lit { error } dans la réponse.
async function markStatus(supabase, editToken, sent, errorText) {
  if (!supabase || !editToken) return;
  try {
    const { error } = await supabase.rpc("mark_confirmation_email_status", {
      p_edit_token: editToken,
      p_sent: sent,
      p_error: sent ? null : errorText,
    });
    if (error) console.error("mark_confirmation_email_status:", error.message || error);
  } catch (e) {
    console.error("mark_confirmation_email_status:", e);
  }
}

function extractEditToken(editLink) {
  try {
    const url = new URL(editLink);
    return url.searchParams.get("edit");
  } catch {
    return null;
  }
}

async function sendViaResend({ resendKey, from, email, subject, text, html }) {
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
    throw new Error(`Resend ${resendRes.status}: ${errText}`);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let supabase = null;
  let editToken = null;
  let sent = false; // true dès qu'un envoi a réussi (utile au bloc catch final)

  try {
    const { email, lang, firstName, lastName, regNumber, editLink, eventTitle } = req.body || {};

    if (!email || !editLink) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    editToken = extractEditToken(editLink);
    const safeLang = ["fr", "en", "pt"].includes(lang) ? lang : "fr";

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    supabase = createClient(supabaseUrl, supabaseKey);

    const { data: settings } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", [`email_subject_${safeLang}`, `email_body_${safeLang}`, "whatsapp_group_link"]);

    const map = {};
    (settings || []).forEach(r => { map[r.key] = r.value; });

    const vars = {
      firstName: firstName || "",
      lastName: lastName || "",
      regNumber: regNumber || "",
      editLink,
      eventTitle: eventTitle || "",
      whatsappGroupLink: map.whatsapp_group_link || "",
    };

    const subject = fillTemplate(map[`email_subject_${safeLang}`] || "Confirmation d'inscription", vars);
    const text = fillTemplate(map[`email_body_${safeLang}`] || `Votre lien : ${editLink}\n\nSi vous ne voyez pas cet email dans votre boîte de réception, pensez à vérifier votre dossier Spam/Courrier indésirable.`, vars);
    let html = text.replace(/\n/g, "<br/>").replace(editLink, `<a href="${editLink}">${editLink}</a>`);
    if (vars.whatsappGroupLink) {
      html = html.replace(vars.whatsappGroupLink, `<a href="${vars.whatsappGroupLink}">${vars.whatsappGroupLink}</a>`);
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      await markStatus(supabase, editToken, false, "RESEND_API_KEY missing on server");
      res.status(500).json({ error: "RESEND_API_KEY missing on server" });
      return;
    }

    const from = process.env.EMAIL_FROM || "onboarding@resend.dev";

    // Jusqu'à 3 tentatives : les échecs d'envoi (blip réseau,
    // erreur transitoire chez Resend) ne se traduisent plus par un
    // email jamais parti sans qu'on le sache.
    let lastError = null;
    for (let attempt = 1; attempt <= 3 && !sent; attempt++) {
      try {
        await sendViaResend({ resendKey, from, email, subject, text, html });
        sent = true;
      } catch (e) {
        lastError = String(e.message || e);
        if (attempt < 3) await sleep(attempt * 800);
      }
    }

    await markStatus(supabase, editToken, sent, lastError);

    if (!sent) {
      res.status(502).json({ error: "Email provider error", detail: lastError });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    const message = String(err.message || err);
    // Si l'email est déjà parti, une erreur tardive ne doit pas le
    // faire passer pour un échec.
    if (!sent) await markStatus(supabase, editToken, false, message);
    res.status(sent ? 200 : 500).json(sent ? { ok: true } : { error: message });
  }
}
