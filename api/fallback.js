// Réponse de secours pour toute adresse /api/... qui ne correspond à
// aucune fonction réelle du site (ex: quelqu'un tape juste "/api/"
// dans la barre d'adresse). Remplace la page d'erreur par défaut de
// l'hébergeur (qui révèle son nom et renvoie vers sa documentation)
// par un simple message neutre, sans aucune mention technique.
export default function handler(req, res) {
  res.status(404).send("Page non trouvée.");
}
