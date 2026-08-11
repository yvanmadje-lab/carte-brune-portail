import React, { useState, useEffect, useMemo } from "react";
import { Globe2, MapPin, Calendar, Hotel as HotelIcon, Plane, ShieldCheck, Search, Download, LayoutDashboard, Users, ChevronRight, ChevronLeft, Check, X, Menu, Building2, Landmark, Quote, Lock, LogOut, RefreshCw, Plus, Trash2, Pencil, Image as ImageIcon, Eye, EyeOff } from "lucide-react";
import { supabase, fetchPublished, fetchAll, upsertRow, deleteRow, uploadMedia, getSetting, setSetting } from "./lib/supabaseClient";

/* ---------------------------------------------------------
   TOKENS — alignés sur l'identité officielle Carte Brune CEDEAO
   (sceau vert/brun, bandeaux-ruban, trame de points, carte néon)
   Vert sceau   #1E9B4F  — anneau supérieur du logo
   Brun sceau   #5C3220  — anneau inférieur du logo
   Vert profond #14532D  — fonds sombres / bandeaux
   Noir carte   #0B0D0C  — séquences "carte lumineuse"
   Sable        #F5F2EA  — fond papier
   Encre        #1A1712  — texte
--------------------------------------------------------- */

const COUNTRIES = ["Bénin","Cabo Verde","Côte d'Ivoire","Gambie","Ghana","Guinée","Guinée-Bissau","Liberia","Nigeria","Sénégal","Sierra Leone","Togo"];

const DEFAULT_HOTELS = [
  { id: "h1", name: "Hôtel Pullman Dakar", distance: "Lieu officiel de l'Assemblée Générale", desc: { fr: "Hôtel hôte de la 42ᵉ Assemblée Générale, en front de mer sur la Corniche.", en: "Host hotel of the 42nd General Assembly, on the seafront Corniche.", pt: "Hotel anfitrião da 42ª Assembleia Geral, à beira-mar na Corniche." }, amenities: ["Wi‑Fi", "Piscine", "Salles de conférence", "Restaurant"], rooms: [ { id: "h1r1", type: "Standard", price: 85000, cur: "FCFA" }, { id: "h1r2", type: "Deluxe", price: 120000, cur: "FCFA" } ] },
  { id: "h2", name: "Radisson Blu Dakar Sea Plaza", distance: "2,1 km du lieu de réunion", desc: { fr: "Établissement moderne surplombant la baie de Dakar.", en: "Modern property overlooking Dakar bay.", pt: "Estabelecimento moderno com vista para a baía de Dakar." }, amenities: ["Wi‑Fi", "Salle de sport", "Climatisation", "Parking"], rooms: [ { id: "h2r1", type: "Standard", price: 75000, cur: "FCFA" }, { id: "h2r2", type: "Suite", price: 140000, cur: "FCFA" } ] },
  { id: "h3", name: "Novotel Dakar", distance: "3,4 km du lieu de réunion", desc: { fr: "Option confortable au centre-ville, proche du Plateau.", en: "Comfortable downtown option, near Le Plateau.", pt: "Opção confortável no centro, perto do Plateau." }, amenities: ["Wi‑Fi", "Petit-déjeuner", "Climatisation"], rooms: [ { id: "h3r1", type: "Standard", price: 55000, cur: "FCFA" } ] },
];

const DEFAULT_TOURISM = [
  { name: { fr: "Île de Gorée", en: "Gorée Island", pt: "Ilha de Gorée" }, desc: { fr: "Site mémoriel classé UNESCO, à 20 minutes en ferry du port de Dakar.", en: "UNESCO memorial site, a 20-minute ferry ride from Dakar's port.", pt: "Local memorial classificado pela UNESCO, a 20 minutos de ferry do porto de Dakar." } },
  { name: { fr: "Monument de la Renaissance", en: "African Renaissance Monument", pt: "Monumento do Renascimento Africano" }, desc: { fr: "Plus haute statue d'Afrique, surplombant les Mamelles.", en: "Africa's tallest statue, overlooking the Mamelles hills.", pt: "A estátua mais alta de África, com vista para as Mamelles." } },
  { name: { fr: "Lac Rose (Retba)", en: "Pink Lake (Lake Retba)", pt: "Lago Rosa (Retba)" }, desc: { fr: "Lac aux eaux roses, ancien terminus du rallye Paris-Dakar.", en: "Pink-hued lake, former finish line of the Paris-Dakar rally.", pt: "Lago de águas rosadas, antiga meta do rali Paris-Dakar." } },
  { name: { fr: "Plage de N'Gor", en: "N'Gor Beach", pt: "Praia de N'Gor" }, desc: { fr: "Plage animée face à l'île de N'Gor, surf et couchers de soleil.", en: "Lively beach facing N'Gor island, surf spots and sunsets.", pt: "Praia animada em frente à ilha de N'Gor, surf e pôr do sol." } },
];

const EVENT = {
  code: "AG42", year: 2026, edition: "42ᵉ",
  title: { fr: "42ᵉ Assemblée Générale", en: "42nd General Assembly", pt: "42ª Assembleia Geral" },
  theme: { fr: "Assemblée Générale annuelle du Conseil des Bureaux du Système d'Assurance Carte Brune CEDEAO", en: "Annual General Assembly of the Council of Bureaux of the ECOWAS Brown Card Insurance Scheme", pt: "Assembleia Geral anual do Conselho de Bureaux do Sistema de Seguro Cartão Castanho da CEDEAO" },
  dates: "19 – 22 octobre 2026", dateShort: "DU 19 AU 22", monthYear: "OCTOBRE 2026",
  city: "Dakar", country: "Sénégal", venue: "Hôtel Pullman Dakar",
  desc: { fr: "Le Conseil des Bureaux du Système d'Assurance Carte Brune CEDEAO réunit à Dakar les Bureaux Nationaux, régulateurs et partenaires techniques pour sa 42ᵉ Assemblée Générale annuelle, en collaboration avec la Fédération Sénégalaise des Sociétés d'Assurances (FSSA).", en: "The Council of Bureaux of the ECOWAS Brown Card Insurance Scheme convenes National Bureaux, regulators and technical partners in Dakar for its 42nd annual General Assembly, in partnership with the Senegalese Federation of Insurance Companies (FSSA).", pt: "O Conselho de Bureaux do Sistema de Seguro Cartão Castanho da CEDEAO reúne em Dakar os Bureaux Nacionais, reguladores e parceiros técnicos para a sua 42ª Assembleia Geral anual, em parceria com a Federação Senegalesa das Sociedades de Seguros (FSSA)." },
};

const DEFAULT_SPEAKERS = [
  { name: "Mme Audrey Tiam", role: { fr: "Secrétaire Exécutive, Bureau National Sénégalais de la Carte Brune CEDEAO", en: "Executive Secretary, Senegalese National Bureau of the ECOWAS Brown Card", pt: "Secretária Executiva, Bureau Nacional Senegalês do Cartão Castanho da CEDEAO" } },
  { name: "FSSA", role: { fr: "Fédération Sénégalaise des Sociétés d'Assurances — partenaire hôte", en: "Senegalese Federation of Insurance Companies — host partner", pt: "Federação Senegalesa das Sociedades de Seguros — parceiro anfitrião" } },
];

const T = {
  nav_home: { fr: "Accueil", en: "Home", pt: "Início" },
  nav_events: { fr: "Événements", en: "Events", pt: "Eventos" },
  nav_hotels: { fr: "Hôtels", en: "Hotels", pt: "Hotéis" },
  nav_tourism: { fr: "Tourisme", en: "Tourism", pt: "Turismo" },
  register: { fr: "S'inscrire", en: "Register", pt: "Inscrever-se" },
  council: { fr: "Conseil des Bureaux — Système d'Assurance Carte Brune CEDEAO", en: "Council of Bureaux — ECOWAS Brown Card Insurance Scheme", pt: "Conselho de Bureaux — Sistema de Seguro Cartão Castanho da CEDEAO" },
  hero_cta: { fr: "S'inscrire à la réunion", en: "Register for the meeting", pt: "Inscrever-se na reunião" },
  tourism_title: { fr: "Découvrir Dakar", en: "Discover Dakar", pt: "Descobrir Dakar" },
  speakers_title: { fr: "Ils portent l'événement", en: "Event partners & speakers", pt: "Parceiros e intervenientes" },
  hotels_title: { fr: "Hébergement recommandé", en: "Recommended accommodation", pt: "Alojamento recomendado" },
  per_night: { fr: "/ nuit", en: "/ night", pt: "/ noite" },
  step1_title: { fr: "Informations du participant", en: "Participant information", pt: "Informações do participante" },
  step2_title: { fr: "Coordonnées", en: "Contact details", pt: "Dados de contacto" },
  step3_title: { fr: "Hébergement", en: "Accommodation", pt: "Alojamento" },
  step4_title: { fr: "Voyage", en: "Travel", pt: "Viagem" },
  step5_title: { fr: "Récapitulatif", en: "Summary", pt: "Resumo" },
  last_name: { fr: "Nom", en: "Last name", pt: "Apelido" },
  first_name: { fr: "Prénom", en: "First name", pt: "Nome próprio" },
  position: { fr: "Fonction", en: "Position", pt: "Função" },
  organization: { fr: "Organisme", en: "Organization", pt: "Organização" },
  org_type: { fr: "Type d'organisme", en: "Organization type", pt: "Tipo de organização" },
  org_other: { fr: "Précisez l'organisme", en: "Please specify", pt: "Especifique" },
  country: { fr: "Pays", en: "Country", pt: "País" },
  city: { fr: "Ville", en: "City", pt: "Cidade" },
  phone: { fr: "Téléphone", en: "Phone", pt: "Telefone" },
  email: { fr: "Email", en: "Email", pt: "Email" },
  address: { fr: "Adresse", en: "Address", pt: "Endereço" },
  want_hotel: { fr: "Souhaitez-vous réserver un hôtel proposé par l'organisation ?", en: "Would you like to book an hotel offered by the organization?", pt: "Deseja reservar um hotel proposto pela organização?" },
  yes: { fr: "Oui", en: "Yes", pt: "Sim" },
  no: { fr: "Non", en: "No", pt: "Não" },
  check_in: { fr: "Date d'arrivée à l'hôtel", en: "Hotel check-in", pt: "Data de chegada ao hotel" },
  check_out: { fr: "Date de départ de l'hôtel", en: "Hotel check-out", pt: "Data de saída do hotel" },
  flight_number: { fr: "Numéro de vol", en: "Flight number", pt: "Número do voo" },
  arrival_date: { fr: "Date d'arrivée", en: "Arrival date", pt: "Data de chegada" },
  airline: { fr: "Compagnie aérienne", en: "Airline", pt: "Companhia aérea" },
  transfer: { fr: "Besoin de transfert aéroport", en: "Airport transfer needed", pt: "Necessita de transfer do aeroporto" },
  back: { fr: "Précédent", en: "Back", pt: "Anterior" },
  next: { fr: "Suivant", en: "Next", pt: "Seguinte" },
  submit: { fr: "Valider mon inscription", en: "Submit registration", pt: "Confirmar inscrição" },
  confirmed_title: { fr: "Inscription enregistrée avec succès", en: "Registration successfully recorded", pt: "Inscrição registada com sucesso" },
  reg_number: { fr: "Numéro d'inscription", en: "Registration number", pt: "Número de inscrição" },
  back_home: { fr: "Retour à l'accueil", en: "Back to home", pt: "Voltar ao início" },
  admin: { fr: "Administration", en: "Admin", pt: "Administração" },
  dashboard: { fr: "Tableau de bord", en: "Dashboard", pt: "Painel" },
  participants: { fr: "Participants", en: "Participants", pt: "Participantes" },
  total_reg: { fr: "Inscriptions", en: "Registrations", pt: "Inscrições" },
  by_country: { fr: "Par pays", en: "By country", pt: "Por país" },
  by_org: { fr: "Par type d'organisme", en: "By organization type", pt: "Por tipo de organização" },
  export_csv: { fr: "Exporter CSV", en: "Export CSV", pt: "Exportar CSV" },
  search_ph: { fr: "Rechercher nom, email, organisme…", en: "Search name, email, organization…", pt: "Pesquisar nome, email, organização…" },
  all_countries: { fr: "Tous les pays", en: "All countries", pt: "Todos os países" },
  no_participants: { fr: "Aucune inscription pour le moment.", en: "No registrations yet.", pt: "Ainda sem inscrições." },
  admin_login_title: { fr: "Espace administrateur", en: "Admin area", pt: "Área de administração" },
  admin_email: { fr: "Email", en: "Email", pt: "Email" },
  admin_password: { fr: "Mot de passe", en: "Password", pt: "Palavra-passe" },
  admin_login: { fr: "Se connecter", en: "Sign in", pt: "Iniciar sessão" },
  admin_logout: { fr: "Se déconnecter", en: "Sign out", pt: "Terminar sessão" },
  admin_login_error: { fr: "Identifiants incorrects.", en: "Incorrect credentials.", pt: "Credenciais incorretas." },
  refresh: { fr: "Actualiser", en: "Refresh", pt: "Atualizar" },
  submit_error: { fr: "Une erreur est survenue. Merci de réessayer.", en: "Something went wrong. Please try again.", pt: "Ocorreu um erro. Tente novamente." },
  submitting: { fr: "Envoi en cours…", en: "Submitting…", pt: "A enviar…" },
  content_tab: { fr: "Contenu du site", en: "Site content", pt: "Conteúdo do site" },
  participants_tab: { fr: "Participants", en: "Participants", pt: "Participantes" },
  hero_carousel_tab: { fr: "Carrousel d'accueil", en: "Homepage carousel", pt: "Carrossel inicial" },
  tourism_tab: { fr: "Tourisme", en: "Tourism", pt: "Turismo" },
  hotels_tab: { fr: "Hôtels", en: "Hotels", pt: "Hotéis" },
  add_new: { fr: "Ajouter", en: "Add", pt: "Adicionar" },
  edit: { fr: "Modifier", en: "Edit", pt: "Editar" },
  delete: { fr: "Supprimer", en: "Delete", pt: "Eliminar" },
  save: { fr: "Enregistrer", en: "Save", pt: "Guardar" },
  cancel: { fr: "Annuler", en: "Cancel", pt: "Cancelar" },
  published: { fr: "Publié", en: "Published", pt: "Publicado" },
  draft: { fr: "Brouillon", en: "Draft", pt: "Rascunho" },
  image: { fr: "Image", en: "Image", pt: "Imagem" },
  upload_image: { fr: "Choisir une image", en: "Choose image", pt: "Escolher imagem" },
  uploading: { fr: "Envoi de l'image…", en: "Uploading image…", pt: "A enviar imagem…" },
  display_order: { fr: "Ordre d'affichage", en: "Display order", pt: "Ordem de exibição" },
  amenities_help: { fr: "Commodités, séparées par des virgules", en: "Amenities, comma-separated", pt: "Comodidades, separadas por vírgulas" },
  price: { fr: "Prix / nuit", en: "Price / night", pt: "Preço / noite" },
  currency: { fr: "Devise", en: "Currency", pt: "Moeda" },
  room_type: { fr: "Type de chambre", en: "Room type", pt: "Tipo de quarto" },
  name_fr: { fr: "Nom (Français)", en: "Name (French)", pt: "Nome (Francês)" },
  name_en: { fr: "Nom (Anglais)", en: "Name (English)", pt: "Nome (Inglês)" },
  name_pt: { fr: "Nom (Portugais)", en: "Name (Portuguese)", pt: "Nome (Português)" },
  desc_fr: { fr: "Description (Français)", en: "Description (French)", pt: "Descrição (Francês)" },
  desc_en: { fr: "Description (Anglais)", en: "Description (English)", pt: "Descrição (Inglês)" },
  desc_pt: { fr: "Description (Portugais)", en: "Description (Portuguese)", pt: "Descrição (Português)" },
  confirm_delete: { fr: "Supprimer cet élément ?", en: "Delete this item?", pt: "Eliminar este item?" },
  no_items: { fr: "Aucun élément pour le moment.", en: "No items yet.", pt: "Ainda sem itens." },
  hero_carousel_help: { fr: "Ces images défilent en arrière-plan du bandeau d'accueil. Sans image ajoutée, le fond reste uni.", en: "These images rotate behind the homepage hero banner. With none added, the background stays plain.", pt: "Estas imagens alternam no fundo do banner inicial. Sem imagens, o fundo permanece liso." },
  logo_tab: { fr: "Logo", en: "Logo", pt: "Logótipo" },
  logo_help: { fr: "Ce logo remplace le sceau par défaut dans l'en-tête et le bandeau d'accueil du site.", en: "This logo replaces the default seal in the header and homepage banner.", pt: "Este logótipo substitui o selo padrão no cabeçalho e no banner inicial." },
  speakers_tab: { fr: "Ils portent l'événement", en: "Event partners", pt: "Parceiros do evento" },
  role_fr: { fr: "Titre / rôle (Français)", en: "Title / role (French)", pt: "Título / função (Francês)" },
  role_en: { fr: "Titre / rôle (Anglais)", en: "Title / role (English)", pt: "Título / função (Inglês)" },
  role_pt: { fr: "Titre / rôle (Portugais)", en: "Title / role (Portuguese)", pt: "Título / função (Português)" },
  full_name: { fr: "Nom complet", en: "Full name", pt: "Nome completo" },
  view_site: { fr: "Voir le site public", en: "View public site", pt: "Ver site público" },
  hotel_none: { fr: "Hébergement personnel", en: "Own accommodation", pt: "Alojamento próprio" },
  bureau: { fr: "Bureau National", en: "National Bureau", pt: "Bureau Nacional" },
  insurer: { fr: "Compagnie d'assurance", en: "Insurance company", pt: "Companhia de seguros" },
  regulator: { fr: "Direction des Assurances", en: "Insurance Directorate", pt: "Direção de Seguros" },
  other: { fr: "Autre", en: "Other", pt: "Outro" },
};
const t = (k, lang) => (T[k] ? T[k][lang] : k);

const ORG_TYPES = ["bureau", "insurer", "regulator", "other"];

function regNumber(seq) {
  return `CB-${EVENT.year}-${EVENT.code}-${String(seq).padStart(6, "0")}`;
}

function toCSV(rows) {
  const headers = ["Numéro", "Nom", "Prénom", "Fonction", "Organisme", "Pays", "Email", "Téléphone", "Hôtel", "Arrivée", "Départ"];
  const lines = [headers.join(",")];
  rows.forEach(r => {
    lines.push([r.regNumber, r.lastName, r.firstName, r.position, r.organization, r.country, r.email, r.phone, r.hotelName || "", r.checkIn || "", r.checkOut || ""].map(v => `"${(v || "").toString().replace(/"/g, '""')}"`).join(","));
  });
  return lines.join("\n");
}

function downloadCSV(csv, filename) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

const emptyForm = { lastName: "", firstName: "", position: "", organization: "", orgType: "bureau", orgOther: "", country: COUNTRIES[11], city: "", phone: "", email: "", address: "", wantsHotel: "yes", hotelId: DEFAULT_HOTELS[0].id, roomId: DEFAULT_HOTELS[0].rooms[0].id, checkIn: "", checkOut: "", flightNumber: "", airline: "", arrivalDate: "", transfer: "yes" };

export default function App() {
  const [lang, setLang] = useState("fr");
  const [view, setView] = useState("public");
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [participants, setParticipants] = useState([]);
  const [confirmed, setConfirmed] = useState(null);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [adminUser, setAdminUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [hotels, setHotels] = useState(DEFAULT_HOTELS);
  const [tourism, setTourism] = useState(DEFAULT_TOURISM);
  const [heroSlides, setHeroSlides] = useState([]);
  const [logoUrl, setLogoUrl] = useState("");
  const [speakers, setSpeakers] = useState(DEFAULT_SPEAKERS);

  // Contenu public (tourisme, hôtels, carrousel, logo, intervenants) — visible sans connexion.
  async function loadPublicContent() {
    const [t, h, s, logo, sp] = await Promise.all([
      fetchPublished("tourist_sites"),
      fetchPublished("cms_hotels"),
      fetchPublished("hero_slides"),
      getSetting("event_logo"),
      fetchPublished("cms_speakers"),
    ]);
    if (t.length) setTourism(t.map(r => ({
      id: r.id,
      name: { fr: r.name_fr, en: r.name_en, pt: r.name_pt },
      desc: { fr: r.desc_fr, en: r.desc_en, pt: r.desc_pt },
      image: r.image_url,
    })));
    if (h.length) setHotels(h.map(r => ({
      id: r.id,
      name: r.name,
      distance: r.distance,
      desc: { fr: r.desc_fr, en: r.desc_en, pt: r.desc_pt },
      amenities: (r.amenities || "").split(",").map(a => a.trim()).filter(Boolean),
      image: r.image_url,
      rooms: [{ id: r.id + "-r1", type: r.room_type || "Standard", price: Number(r.price) || 0, cur: r.currency || "FCFA" }],
    })));
    if (s.length) setHeroSlides(s.map(r => r.image_url));
    if (logo) setLogoUrl(logo);
    if (sp.length) setSpeakers(sp.map(r => ({
      id: r.id,
      name: r.name,
      role: { fr: r.role_fr, en: r.role_en, pt: r.role_pt },
      image: r.image_url,
    })));
  }

  useEffect(() => { loadPublicContent(); }, []);

  // Session admin : suit l'état de connexion Supabase Auth.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAdminUser(data.session?.user || null);
      setAuthChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAdminUser(session?.user || null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  function mapRow(row) {
    return {
      id: row.id,
      regNumber: row.reg_number,
      lastName: row.last_name,
      firstName: row.first_name,
      position: row.position,
      organization: row.organization,
      orgType: row.org_type,
      country: row.country,
      email: row.email,
      phone: row.phone,
      hotelName: row.hotel_name,
      checkIn: row.check_in,
      checkOut: row.check_out,
    };
  }

  async function fetchParticipants() {
    setParticipantsLoading(true);
    const { data, error } = await supabase
      .from("participants")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setParticipants(data.map(mapRow));
    setParticipantsLoading(false);
  }

  useEffect(() => {
    if (adminUser) fetchParticipants();
  }, [adminUser]);

  function update(field, value) { setForm(f => ({ ...f, [field]: value })); }

  const selectedHotel = hotels.find(h => h.id === form.hotelId) || hotels[0] || DEFAULT_HOTELS[0];
  const selectedRoom = selectedHotel.rooms.find(r => r.id === form.roomId) || selectedHotel.rooms[0];

  async function submitRegistration() {
    setSubmitting(true);
    setSubmitError("");
    const payload = {
      ...form,
      hotelName: form.wantsHotel === "yes" ? selectedHotel.name : "",
      roomType: form.wantsHotel === "yes" ? selectedRoom.type : "",
    };
    const { data, error } = await supabase.rpc("register_participant", { payload });
    setSubmitting(false);
    if (error) {
      setSubmitError(t("submit_error", lang));
      return;
    }
    setConfirmed({ ...form, regNumber: data });
    setStep(6);
  }

  function startOver() {
    setForm(emptyForm); setStep(1); setConfirmed(null); setSubmitError(""); setView("public");
  }

  const stats = useMemo(() => {
    const byCountry = {}; const byOrg = {};
    participants.forEach(p => {
      byCountry[p.country] = (byCountry[p.country] || 0) + 1;
      byOrg[p.orgType] = (byOrg[p.orgType] || 0) + 1;
    });
    return { total: participants.length, byCountry, byOrg };
  }, [participants]);

  const filtered = useMemo(() => {
    return participants.filter(p => {
      const s = search.toLowerCase();
      const matchesSearch = !s || `${p.lastName} ${p.firstName} ${p.email} ${p.organization}`.toLowerCase().includes(s);
      const matchesCountry = !countryFilter || p.country === countryFilter;
      return matchesSearch && matchesCountry;
    });
  }, [participants, search, countryFilter]);

  return (
    <div style={{ background: "var(--sable)", color: "var(--encre)", minHeight: "100%", fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Manrope:wght@500;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        :root{
          --vert:#1E9B4F; --vert-fonce:#14532D; --brun:#5C3220; --brun-clair:#8A5A3C; --noir:#0B0D0C; --sable:#F5F2EA; --encre:#1A1712; --sable-deep:#E8E0CC;
          --navy: var(--vert-fonce); --lagune: var(--vert); --ocre: var(--brun-clair); --argile: var(--brun);
        }
        .font-display{ font-family:'Fraunces', serif; }
        .font-mono{ font-family:'IBM Plex Mono', monospace; }
        body, .cb-btn, .cb-input, .cb-label{ font-family:'Manrope', sans-serif; }
        .cb-btn{ background:var(--brun); color:#fff; border:none; padding:.8rem 1.5rem; font-weight:700; letter-spacing:.02em; display:inline-flex; align-items:center; gap:.5rem; cursor:pointer; transition:filter .15s ease; clip-path: polygon(0 0, 100% 0, 96% 100%, 0% 100%); }
        .cb-btn:hover{ filter:brightness(1.1); }
        .cb-btn-outline{ background:transparent; border:1.5px solid var(--vert-fonce); color:var(--vert-fonce); padding:.75rem 1.4rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:.5rem; }
        .cb-input{ width:100%; border:1.5px solid #CFC4A3; background:#fff; padding:.65rem .8rem; font-family:'Manrope',sans-serif; font-size:.95rem; }
        .cb-input:focus{ outline:2px solid var(--vert); outline-offset:1px; border-color:var(--vert); }
        .cb-label{ font-size:.78rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--vert-fonce); margin-bottom:.3rem; display:block; }
        .stamp{ border:3px solid var(--vert); border-radius:50%; width:150px; height:150px; display:flex; align-items:center; justify-content:center; flex-direction:column; color:var(--vert); position:relative; background:var(--noir); }
        .stamp::before{ content:''; position:absolute; inset:7px; border:2px solid var(--brun); border-radius:50%; }
        .radio-card{ border:1.5px solid #CFC4A3; padding:.7rem 1rem; cursor:pointer; display:flex; align-items:center; gap:.6rem; background:#fff; }
        .radio-card.active{ border-color:var(--vert); background:#EAF6EE; }
        .weave{ height:6px; background: linear-gradient(90deg, var(--vert) 0 50%, var(--brun) 50% 100%); }
        .dots{ background-image: radial-gradient(var(--vert) 1.4px, transparent 1.4px); background-size: 13px 13px; opacity:.35; }
        .ribbon{ clip-path: polygon(3% 0, 100% 0, 97% 100%, 0% 100%); }
        .seal{ border-radius:50%; display:flex; align-items:center; justify-content:center; position:relative; }
        .seal-ring{ position:absolute; inset:0; border-radius:50%; background: conic-gradient(var(--vert) 0deg 180deg, var(--brun) 180deg 360deg); }
        .neon-outline{ filter: drop-shadow(0 0 6px rgba(255,255,255,.55)); }
      `}</style>

      {/* HEADER */}
      <header style={{ background: "var(--navy)" }} className="text-white sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-5 py-3">
          <button onClick={() => { setView("public"); setStep(1); }} className="flex items-center gap-3 text-left">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-9 h-9 rounded-full object-cover flex-shrink-0" style={{ border: "2px solid var(--vert)" }} />
            ) : (
              <div className="seal w-9 h-9 flex-shrink-0">
                <div className="seal-ring" />
                <div style={{ position: "absolute", inset: 3, background: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ShieldCheck size={14} color="var(--vert-fonce)" />
                </div>
              </div>
            )}
            <div>
              <div className="font-display font-semibold leading-tight" style={{ fontSize: "1.05rem" }}>Carte Brune CEDEAO</div>
              <div className="text-[11px] opacity-75 leading-tight hidden sm:block">{t("council", lang)}</div>
            </div>
          </button>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button onClick={() => setView("public")} className="hover:opacity-80">{t("nav_home", lang)}</button>
            <button onClick={() => { setView("public"); document.getElementById("event-section")?.scrollIntoView({behavior:"smooth"}); }} className="hover:opacity-80">{t("nav_events", lang)}</button>
            <button onClick={() => { setView("public"); document.getElementById("hotels-section")?.scrollIntoView({behavior:"smooth"}); }} className="hover:opacity-80">{t("nav_hotels", lang)}</button>
            <button onClick={() => { setView("public"); document.getElementById("tourism-section")?.scrollIntoView({behavior:"smooth"}); }} className="hover:opacity-80">{t("nav_tourism", lang)}</button>
          </nav>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button onClick={() => setLangMenuOpen(v => !v)} className="flex items-center gap-1 text-sm border border-white/30 px-2.5 py-1.5">
                <Globe2 size={14} /> {lang.toUpperCase()}
              </button>
              {langMenuOpen && (
                <div className="absolute right-0 mt-1 bg-white text-[var(--navy)] shadow-lg text-sm w-32 z-50">
                  {["fr","en","pt"].map(l => (
                    <button key={l} onClick={() => { setLang(l); setLangMenuOpen(false); }} className="block w-full text-left px-3 py-2 hover:bg-[var(--sable)]">{{fr:"Français",en:"English",pt:"Português"}[l]}</button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setView("register")} className="cb-btn hidden sm:inline-flex text-sm py-2 px-4">{t("register", lang)}</button>
            <button className="md:hidden" onClick={() => setMobileNav(v => !v)}><Menu size={20} /></button>
          </div>
        </div>
        {mobileNav && (
          <div className="md:hidden flex flex-col gap-3 px-5 pb-4 text-sm">
            <button onClick={() => { setView("public"); setMobileNav(false); }} className="text-left">{t("nav_home", lang)}</button>
            <button onClick={() => setView("register")} className="cb-btn text-sm justify-center">{t("register", lang)}</button>
          </div>
        )}
      </header>
      <div className="weave" />

      {view === "public" && (
        <PublicSite lang={lang} setView={setView} hotels={hotels} tourism={tourism} heroSlides={heroSlides} logoUrl={logoUrl} speakers={speakers} />
      )}

      {view === "register" && step < 6 && (
        <RegistrationWizard lang={lang} step={step} setStep={setStep} form={form} update={update} selectedHotel={selectedHotel} selectedRoom={selectedRoom} onSubmit={submitRegistration} setView={setView} submitting={submitting} submitError={submitError} hotels={hotels} />
      )}

      {view === "register" && step === 6 && confirmed && (
        <Confirmation lang={lang} record={confirmed} onDone={startOver} />
      )}

      {view === "admin" && (
        <AdminPanel lang={lang} participants={participants} stats={stats} filtered={filtered} search={search} setSearch={setSearch} countryFilter={countryFilter} setCountryFilter={setCountryFilter} setView={setView} adminUser={adminUser} authChecked={authChecked} participantsLoading={participantsLoading} onRefresh={fetchParticipants} logoUrl={logoUrl} onLogoChange={setLogoUrl} />
      )}

      <footer style={{ background: "var(--navy)" }} className="text-white/70 text-xs mt-16 py-8 px-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between gap-3">
          <div>© {EVENT.year} Système d'Assurance Carte Brune CEDEAO</div>
          <button onClick={() => setView(view === "admin" ? "public" : "admin")} className="underline hover:text-white">
            {view === "admin" ? t("view_site", lang) : t("admin", lang)}
          </button>
        </div>
      </footer>
    </div>
  );
}

function HeroCarousel({ images }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (images.length < 2) return;
    const id = setInterval(() => setI(n => (n + 1) % images.length), 5000);
    return () => clearInterval(id);
  }, [images.length]);
  if (!images.length) return null;
  return (
    <div className="absolute inset-0 pointer-events-none">
      {images.map((src, idx) => (
        <div key={idx} className="absolute inset-0 transition-opacity duration-[1500ms]" style={{ opacity: idx === i ? 1 : 0, backgroundImage: `url(${src})`, backgroundSize: "cover", backgroundPosition: "center" }} />
      ))}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(11,13,12,.55), rgba(11,13,12,.9))" }} />
    </div>
  );
}

function PublicSite({ lang, setView, hotels, tourism, heroSlides, logoUrl, speakers }) {
  return (
    <>
      {/* HERO — fond noir + trame de points, dans l'esprit du bandeau vidéo */}
      <section id="event-section" style={{ background: "var(--noir)" }} className="relative text-white px-5 py-20 overflow-hidden">
        <HeroCarousel images={heroSlides} />
        <div className="dots absolute inset-0 pointer-events-none" style={{ maskImage: "radial-gradient(ellipse at bottom left, black, transparent 70%)" }} />
        <div className="max-w-6xl mx-auto relative">
          <div className="flex items-start gap-3 mb-6">
            <span className="font-display font-bold leading-none" style={{ fontSize: "5rem", color: "var(--vert)" }}>{EVENT.edition.replace("ᵉ","")}</span>
            <span className="font-display" style={{ fontSize: "1.6rem", color: "var(--brun-clair)", marginTop: "0.6rem" }}>e</span>
          </div>
          <h1 className="font-display font-semibold leading-tight -mt-10 mb-6" style={{ fontSize: "2.4rem" }}>
            {lang === "fr" ? "Assemblée Générale" : lang === "en" ? "General Assembly" : "Assembleia Geral"}
          </h1>
          <p className="text-white/80 max-w-xl leading-relaxed mb-8">{EVENT.desc[lang]}</p>

          <div className="inline-flex flex-wrap items-stretch gap-0 mb-8" style={{ background: "var(--vert-fonce)" }}>
            <div className="flex items-center gap-3 px-5 py-3">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="seal w-8 h-8 flex-shrink-0"><div className="seal-ring" /><div style={{ position:"absolute", inset:2, background:"#fff", borderRadius:"50%" }} /></div>
              )}
              <div className="text-sm leading-tight">
                <div className="font-semibold">{t("council", lang).split("—")[0]}</div>
              </div>
            </div>
            <div className="ribbon flex items-center px-5 py-3" style={{ background: "var(--brun)" }}>
              <span className="font-display font-bold text-lg tracking-wide">{EVENT.dateShort}</span>
            </div>
            <div className="flex items-center px-5 py-3 text-sm">{EVENT.monthYear}</div>
            <div className="flex items-center gap-1.5 px-5 py-3 text-sm border-l border-white/10">
              <MapPin size={14} color="var(--vert)" /> <span className="font-semibold">{EVENT.venue}</span>&nbsp;{EVENT.city}
            </div>
          </div>
          <div>
            <button onClick={() => setView("register")} className="cb-btn">{t("hero_cta", lang)} <ChevronRight size={16} /></button>
          </div>
        </div>
      </section>

      {/* PARTENAIRES & INTERVENANTS */}
      <section className="max-w-6xl mx-auto px-5 py-14">
        <h2 className="font-display font-semibold text-2xl mb-8" style={{ color: "var(--vert-fonce)" }}>{t("speakers_title", lang)}</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          {speakers.map((s, i) => (
            <div key={s.id || i} className="flex items-start gap-4 bg-white border p-5" style={{ borderColor: "#CFC4A3" }}>
              {s.image ? (
                <img src={s.image} alt={s.name} className="w-11 h-11 rounded-full object-cover flex-shrink-0" style={{ border: "2px solid var(--vert)" }} />
              ) : (
                <div className="seal w-11 h-11 flex-shrink-0"><div className="seal-ring" /><div style={{ position:"absolute", inset:3, background:"#fff", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center" }}><Quote size={16} color="var(--vert-fonce)" /></div></div>
              )}
              <div>
                <div className="font-semibold text-sm">{s.name}</div>
                <div className="text-xs text-black/60 mt-1 leading-relaxed">{s.role[lang]}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TOURISM CAROUSEL */}
      <section id="tourism-section" className="px-5 py-14" style={{ background: "var(--sable-deep)" }}>
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display font-semibold text-2xl mb-8" style={{ color: "var(--navy)" }}>{t("tourism_title", lang)}</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
            {tourism.map((site, i) => (
              <div key={site.id || i} className="bg-white">
                {site.image ? (
                  <div style={{ height: "110px", backgroundImage: `url(${site.image})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                ) : (
                  <div style={{ background: [ "var(--lagune)","var(--argile)","var(--ocre)","var(--navy)" ][i % 4], height: "110px" }} />
                )}
                <div className="p-4">
                  <div className="font-semibold text-sm mb-1">{site.name[lang]}</div>
                  <div className="text-xs text-black/60 leading-relaxed">{site.desc[lang]}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOTELS */}
      <section id="hotels-section" className="max-w-6xl mx-auto px-5 py-14">
        <h2 className="font-display font-semibold text-2xl mb-8" style={{ color: "var(--navy)" }}>{t("hotels_title", lang)}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {hotels.map(h => (
            <div key={h.id} className="border" style={{ borderColor: "#CFC4A3" }}>
              {h.image ? (
                <div className="h-24 flex items-end p-3" style={{ backgroundImage: `url(${h.image})`, backgroundSize: "cover", backgroundPosition: "center" }}>
                  <span className="text-white font-display font-semibold text-lg" style={{ textShadow: "0 1px 6px rgba(0,0,0,.7)" }}>{h.name}</span>
                </div>
              ) : (
                <div style={{ background: "var(--navy)" }} className="h-24 flex items-end p-3">
                  <span className="text-white font-display font-semibold text-lg">{h.name}</span>
                </div>
              )}
              <div className="p-4">
                <div className="text-xs text-black/50 mb-2 flex items-center gap-1"><MapPin size={12} /> {h.distance}</div>
                <p className="text-sm mb-3 leading-relaxed">{h.desc[lang]}</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {h.amenities.map(a => <span key={a} className="text-[11px] px-2 py-0.5 bg-[var(--sable-deep)]">{a}</span>)}
                </div>
                <div className="text-sm font-mono font-semibold" style={{ color: "var(--argile)" }}>
                  {h.rooms[0].price.toLocaleString()} {h.rooms[0].cur} {t("per_night", lang)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function Field({ label, children }) {
  return <div><label className="cb-label">{label}</label>{children}</div>;
}

function RegistrationWizard({ lang, step, setStep, form, update, selectedHotel, selectedRoom, onSubmit, setView, submitting, submitError, hotels }) {
  const titles = ["step1_title","step2_title","step3_title","step4_title","step5_title"];
  return (
    <div className="max-w-3xl mx-auto px-5 py-12">
      <div className="flex items-center gap-2 mb-8 text-xs font-mono">
        {[1,2,3,4,5].map(n => (
          <React.Fragment key={n}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: n <= step ? "var(--argile)" : "#E7DCC2", color: n <= step ? "#fff" : "#8a8168" }}>{n}</div>
            {n < 5 && <div className="flex-1 h-[2px]" style={{ background: n < step ? "var(--argile)" : "#E7DCC2" }} />}
          </React.Fragment>
        ))}
      </div>
      <h2 className="font-display font-semibold text-2xl mb-6" style={{ color: "var(--navy)" }}>{t(titles[step-1], lang)}</h2>

      {step === 1 && (
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label={t("last_name", lang)}><input className="cb-input" value={form.lastName} onChange={e=>update("lastName", e.target.value)} /></Field>
          <Field label={t("first_name", lang)}><input className="cb-input" value={form.firstName} onChange={e=>update("firstName", e.target.value)} /></Field>
          <Field label={t("position", lang)}><input className="cb-input" value={form.position} onChange={e=>update("position", e.target.value)} /></Field>
          <Field label={t("organization", lang)}><input className="cb-input" value={form.organization} onChange={e=>update("organization", e.target.value)} /></Field>
          <div className="sm:col-span-2">
            <label className="cb-label">{t("org_type", lang)}</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ORG_TYPES.map(ot => (
                <div key={ot} onClick={() => update("orgType", ot)} className={`radio-card ${form.orgType===ot ? "active":""}`}>
                  {form.orgType===ot && <Check size={14} color="var(--lagune)" />} {t(ot === "bureau" ? "bureau" : ot === "insurer" ? "insurer" : ot === "regulator" ? "regulator" : "other", lang)}
                </div>
              ))}
            </div>
          </div>
          {form.orgType === "other" && (
            <div className="sm:col-span-2"><Field label={t("org_other", lang)}><input className="cb-input" value={form.orgOther} onChange={e=>update("orgOther", e.target.value)} /></Field></div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label={t("country", lang)}>
            <select className="cb-input" value={form.country} onChange={e=>update("country", e.target.value)}>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label={t("city", lang)}><input className="cb-input" value={form.city} onChange={e=>update("city", e.target.value)} /></Field>
          <Field label={t("phone", lang)}><input className="cb-input" value={form.phone} onChange={e=>update("phone", e.target.value)} /></Field>
          <Field label={t("email", lang)}><input type="email" className="cb-input" value={form.email} onChange={e=>update("email", e.target.value)} /></Field>
          <div className="sm:col-span-2"><Field label={t("address", lang)}><input className="cb-input" value={form.address} onChange={e=>update("address", e.target.value)} /></Field></div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <div>
            <label className="cb-label">{t("want_hotel", lang)}</label>
            <div className="flex gap-3">
              {["yes","no"].map(v => (
                <div key={v} onClick={() => update("wantsHotel", v)} className={`radio-card ${form.wantsHotel===v?"active":""}`}>
                  {form.wantsHotel===v && <Check size={14} color="var(--lagune)"/>} {v==="yes" ? t("yes",lang) : t("no",lang)}
                </div>
              ))}
            </div>
          </div>
          {form.wantsHotel === "yes" && (
            <>
              <Field label={t("nav_hotels", lang)}>
                <select className="cb-input" value={form.hotelId} onChange={e=>{ const h = hotels.find(x=>x.id===e.target.value); update("hotelId", e.target.value); update("roomId", h.rooms[0].id); }}>
                  {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </Field>
              <Field label="Type de chambre">
                <select className="cb-input" value={form.roomId} onChange={e=>update("roomId", e.target.value)}>
                  {selectedHotel.rooms.map(r => <option key={r.id} value={r.id}>{r.type} — {r.price.toLocaleString()} {r.cur}</option>)}
                </select>
              </Field>
              <div className="grid sm:grid-cols-2 gap-5">
                <Field label={t("check_in", lang)}><input type="date" className="cb-input" value={form.checkIn} onChange={e=>update("checkIn", e.target.value)} /></Field>
                <Field label={t("check_out", lang)}><input type="date" className="cb-input" value={form.checkOut} onChange={e=>update("checkOut", e.target.value)} /></Field>
              </div>
            </>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label={t("arrival_date", lang)}><input type="date" className="cb-input" value={form.arrivalDate} onChange={e=>update("arrivalDate", e.target.value)} /></Field>
          <Field label={t("flight_number", lang)}><input className="cb-input" value={form.flightNumber} onChange={e=>update("flightNumber", e.target.value)} /></Field>
          <Field label={t("airline", lang)}><input className="cb-input" value={form.airline} onChange={e=>update("airline", e.target.value)} /></Field>
          <div>
            <label className="cb-label">{t("transfer", lang)}</label>
            <div className="flex gap-3">
              {["yes","no"].map(v => (
                <div key={v} onClick={() => update("transfer", v)} className={`radio-card ${form.transfer===v?"active":""}`}>
                  {form.transfer===v && <Check size={14} color="var(--lagune)"/>} {v==="yes" ? t("yes",lang) : t("no",lang)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="bg-white border p-6 space-y-4 text-sm" style={{ borderColor: "#CFC4A3" }}>
          <div>
            <div className="cb-label">{t("step1_title", lang)}</div>
            <div>{form.firstName} {form.lastName} — {form.position} — {form.organization}</div>
          </div>
          <div>
            <div className="cb-label">{t("step2_title", lang)}</div>
            <div>{form.country}, {form.city} · {form.email} · {form.phone}</div>
          </div>
          <div>
            <div className="cb-label">{t("step3_title", lang)}</div>
            <div>{form.wantsHotel === "yes" ? `${selectedHotel.name} — ${selectedRoom.type} (${form.checkIn || "—"} → ${form.checkOut || "—"})` : t("hotel_none", lang)}</div>
          </div>
          <div>
            <div className="cb-label">{t("step4_title", lang)}</div>
            <div>{form.airline || "—"} {form.flightNumber} — {form.arrivalDate || "—"}</div>
          </div>
        </div>
      )}

      {submitError && (
        <div className="mt-4 text-sm px-4 py-3" style={{ background: "#FBEAEA", color: "#8A2A2A", border: "1px solid #E3B0B0" }}>{submitError}</div>
      )}

      <div className="flex justify-between mt-8">
        <button onClick={() => step === 1 ? setView("public") : setStep(s => s - 1)} className="cb-btn-outline" disabled={submitting}><ChevronLeft size={16} /> {t("back", lang)}</button>
        {step < 5 ? (
          <button onClick={() => setStep(s => s + 1)} className="cb-btn">{t("next", lang)} <ChevronRight size={16} /></button>
        ) : (
          <button onClick={onSubmit} className="cb-btn" disabled={submitting} style={{ opacity: submitting ? 0.7 : 1 }}>
            {submitting ? t("submitting", lang) : t("submit", lang)} {!submitting && <Check size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}

function Confirmation({ lang, record, onDone }) {
  return (
    <div className="max-w-xl mx-auto px-5 py-16 text-center">
      <div className="stamp mx-auto mb-8" style={{ color: "var(--argile)" }}>
        <ShieldCheck size={28} />
        <span className="font-mono text-[10px] mt-1">{EVENT.year}</span>
      </div>
      <h2 className="font-display font-semibold text-2xl mb-2" style={{ color: "var(--navy)" }}>{t("confirmed_title", lang)}</h2>
      <p className="text-sm text-black/60 mb-6">{record.firstName} {record.lastName}</p>
      <div className="inline-block border-2 border-dashed px-6 py-3 mb-8" style={{ borderColor: "var(--argile)" }}>
        <div className="cb-label mb-1">{t("reg_number", lang)}</div>
        <div className="font-mono font-semibold text-lg" style={{ color: "var(--argile)" }}>{record.regNumber}</div>
      </div>
      <div>
        <button onClick={onDone} className="cb-btn">{t("back_home", lang)}</button>
      </div>
    </div>
  );
}

function AdminLogin({ lang }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(t("admin_login_error", lang));
  }

  return (
    <div className="max-w-sm mx-auto px-5 py-20">
      <div className="flex items-center gap-2 mb-6">
        <Lock size={18} color="var(--vert-fonce)" />
        <h2 className="font-display font-semibold text-xl" style={{ color: "var(--vert-fonce)" }}>{t("admin_login_title", lang)}</h2>
      </div>
      <form onSubmit={handleLogin} className="space-y-4">
        <Field label={t("admin_email", lang)}><input type="email" required className="cb-input" value={email} onChange={e=>setEmail(e.target.value)} /></Field>
        <Field label={t("admin_password", lang)}><input type="password" required className="cb-input" value={password} onChange={e=>setPassword(e.target.value)} /></Field>
        {error && <div className="text-sm px-3 py-2" style={{ background: "#FBEAEA", color: "#8A2A2A" }}>{error}</div>}
        <button type="submit" className="cb-btn w-full justify-center" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>{t("admin_login", lang)}</button>
      </form>
    </div>
  );
}

function AdminPanel({ lang, participants, stats, filtered, search, setSearch, countryFilter, setCountryFilter, setView, adminUser, authChecked, participantsLoading, onRefresh, logoUrl, onLogoChange }) {
  const [tab, setTab] = useState("participants");
  if (!authChecked) return null;
  if (!adminUser) return <AdminLogin lang={lang} />;
  return (
    <div className="max-w-6xl mx-auto px-5 py-10">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <LayoutDashboard size={20} color="var(--navy)" />
          <h2 className="font-display font-semibold text-2xl" style={{ color: "var(--navy)" }}>{t("dashboard", lang)}</h2>
        </div>
        <div className="flex items-center gap-3">
          {tab === "participants" && <button onClick={onRefresh} className="cb-btn-outline text-sm py-1.5 px-3"><RefreshCw size={14} className={participantsLoading ? "animate-spin" : ""} /> {t("refresh", lang)}</button>}
          <button onClick={() => supabase.auth.signOut()} className="text-sm flex items-center gap-1 text-black/60 hover:text-black"><LogOut size={14} /> {t("admin_logout", lang)}</button>
        </div>
      </div>

      <div className="flex gap-1 mb-8 border-b" style={{ borderColor: "#CFC4A3" }}>
        {[["participants", t("participants_tab", lang)], ["content", t("content_tab", lang)]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className="px-4 py-2.5 text-sm font-semibold" style={{ color: tab === key ? "var(--vert-fonce)" : "#8a8168", borderBottom: tab === key ? "2px solid var(--vert-fonce)" : "2px solid transparent" }}>{label}</button>
        ))}
      </div>

      {tab === "participants" && (
      <>
      <div className="grid sm:grid-cols-3 gap-5 mb-10">
        <div className="bg-white border p-5" style={{ borderColor: "#CFC4A3" }}>
          <div className="cb-label">{t("total_reg", lang)}</div>
          <div className="font-display font-semibold text-3xl" style={{ color: "var(--argile)" }}>{stats.total}</div>
        </div>
        <div className="bg-white border p-5" style={{ borderColor: "#CFC4A3" }}>
          <div className="cb-label mb-2">{t("by_country", lang)}</div>
          <div className="space-y-1 text-sm max-h-24 overflow-auto">
            {Object.entries(stats.byCountry).length === 0 && <span className="text-black/40">—</span>}
            {Object.entries(stats.byCountry).map(([c,n]) => (
              <div key={c} className="flex justify-between"><span>{c}</span><span className="font-mono">{n}</span></div>
            ))}
          </div>
        </div>
        <div className="bg-white border p-5" style={{ borderColor: "#CFC4A3" }}>
          <div className="cb-label mb-2">{t("by_org", lang)}</div>
          <div className="space-y-1 text-sm">
            {Object.entries(stats.byOrg).length === 0 && <span className="text-black/40">—</span>}
            {Object.entries(stats.byOrg).map(([o,n]) => (
              <div key={o} className="flex justify-between"><span>{t(o, lang)}</span><span className="font-mono">{n}</span></div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Users size={18} color="var(--navy)" />
        <h3 className="font-display font-semibold text-xl" style={{ color: "var(--navy)" }}>{t("participants", lang)}</h3>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
          <input className="cb-input pl-9" placeholder={t("search_ph", lang)} value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <select className="cb-input sm:w-52" value={countryFilter} onChange={e=>setCountryFilter(e.target.value)}>
          <option value="">{t("all_countries", lang)}</option>
          {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={() => downloadCSV(toCSV(filtered), `participants-${EVENT.code}-${EVENT.year}.csv`)} className="cb-btn-outline whitespace-nowrap"><Download size={15} /> {t("export_csv", lang)}</button>
      </div>

      <div className="bg-white border overflow-auto" style={{ borderColor: "#CFC4A3" }}>
        <table className="w-full text-sm">
          <thead style={{ background: "var(--sable-deep)" }}>
            <tr className="text-left">
              {["#", t("last_name",lang), t("first_name",lang), t("organization",lang), t("country",lang), t("email",lang), t("nav_hotels",lang)].map(h => (
                <th key={h} className="px-3 py-2 font-semibold text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-black/40">{t("no_participants", lang)}</td></tr>
            )}
            {filtered.map(p => (
              <tr key={p.id} className="border-t" style={{ borderColor: "#E7DCC2" }}>
                <td className="px-3 py-2 font-mono text-xs">{p.regNumber}</td>
                <td className="px-3 py-2">{p.lastName}</td>
                <td className="px-3 py-2">{p.firstName}</td>
                <td className="px-3 py-2">{p.organization}</td>
                <td className="px-3 py-2">{p.country}</td>
                <td className="px-3 py-2">{p.email}</td>
                <td className="px-3 py-2">{p.hotelName || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </>
      )}

      {tab === "content" && <ContentManager lang={lang} logoUrl={logoUrl} onLogoChange={onLogoChange} />}
    </div>
  );
}

/* ---------------------------------------------------------
   CMS — gestion du contenu (carrousel, tourisme, hôtels)
--------------------------------------------------------- */

function ImageUploader({ lang, value, onChange, folder }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const url = await uploadMedia(file, folder);
      onChange(url);
    } catch (err) {
      setError(String(err.message || err));
    }
    setUploading(false);
  }

  return (
    <div>
      <label className="cb-label">{t("image", lang)}</label>
      {value && (
        <div className="mb-2 w-full h-28" style={{ backgroundImage: `url(${value})`, backgroundSize: "cover", backgroundPosition: "center", border: "1px solid #CFC4A3" }} />
      )}
      <label className="cb-btn-outline text-sm cursor-pointer inline-flex">
        <ImageIcon size={14} /> {uploading ? t("uploading", lang) : t("upload_image", lang)}
        <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
      </label>
      {error && <div className="text-xs mt-1" style={{ color: "#8A2A2A" }}>{error}</div>}
    </div>
  );
}

function StatusBadge({ status }) {
  const published = status === "published";
  return (
    <span className="text-[11px] px-2 py-0.5 inline-flex items-center gap-1" style={{ background: published ? "#EAF6EE" : "#F1EEE4", color: published ? "var(--vert-fonce)" : "#8a8168" }}>
      {published ? <Eye size={11} /> : <EyeOff size={11} />}
    </span>
  );
}

function ContentManager({ lang, logoUrl, onLogoChange }) {
  const [sub, setSub] = useState("logo");
  const subs = [
    ["logo", t("logo_tab", lang)],
    ["hero", t("hero_carousel_tab", lang)],
    ["tourism", t("tourism_tab", lang)],
    ["hotels", t("hotels_tab", lang)],
    ["speakers", t("speakers_tab", lang)],
  ];
  return (
    <div>
      <div className="flex gap-4 mb-6 text-sm flex-wrap">
        {subs.map(([key, label]) => (
          <button key={key} onClick={() => setSub(key)} className="px-3 py-1.5" style={{ background: sub === key ? "var(--vert-fonce)" : "#fff", color: sub === key ? "#fff" : "var(--vert-fonce)", border: "1px solid var(--vert-fonce)" }}>{label}</button>
        ))}
      </div>
      {sub === "logo" && <LogoManager lang={lang} logoUrl={logoUrl} onLogoChange={onLogoChange} />}
      {sub === "hero" && <HeroSlidesManager lang={lang} />}
      {sub === "tourism" && <TourismManager lang={lang} />}
      {sub === "hotels" && <HotelsManager lang={lang} />}
      {sub === "speakers" && <SpeakersManager lang={lang} />}
    </div>
  );
}

function LogoManager({ lang, logoUrl, onLogoChange }) {
  const [draft, setDraft] = useState(logoUrl || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await setSetting("event_logo", draft || null);
      onLogoChange(draft);
      setSaved(true);
    } catch (e) { /* best effort */ }
    setSaving(false);
  }

  async function handleRemove() {
    setSaving(true);
    try {
      await setSetting("event_logo", null);
      setDraft("");
      onLogoChange("");
    } catch (e) { /* best effort */ }
    setSaving(false);
  }

  return (
    <div className="bg-white border p-5 max-w-sm space-y-4" style={{ borderColor: "#CFC4A3" }}>
      <p className="text-xs text-black/50">{t("logo_help", lang)}</p>
      <ImageUploader lang={lang} value={draft} onChange={setDraft} folder="logo" />
      <div className="flex gap-2">
        <button onClick={handleSave} className="cb-btn text-sm" disabled={saving}>{t("save", lang)}</button>
        {draft && <button onClick={handleRemove} className="cb-btn-outline text-sm" disabled={saving}>{t("delete", lang)}</button>}
      </div>
      {saved && <div className="text-xs" style={{ color: "var(--vert-fonce)" }}>✓ {t("save", lang)}</div>}
    </div>
  );
}

function HeroSlidesManager({ lang }) {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() { setLoading(true); setItems(await fetchAll("hero_slides")); setLoading(false); }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing.image_url) return;
    await upsertRow("hero_slides", editing);
    setEditing(null);
    load();
  }
  async function remove(id) {
    if (!window.confirm(t("confirm_delete", lang))) return;
    await deleteRow("hero_slides", id);
    load();
  }

  return (
    <div>
      <p className="text-xs text-black/50 mb-4 max-w-lg">{t("hero_carousel_help", lang)}</p>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {items.map(it => (
          <div key={it.id} className="bg-white border" style={{ borderColor: "#CFC4A3" }}>
            <div className="h-28" style={{ backgroundImage: `url(${it.image_url})`, backgroundSize: "cover", backgroundPosition: "center" }} />
            <div className="p-3 flex items-center justify-between">
              <StatusBadge status={it.status} />
              <div className="flex gap-2">
                <button onClick={() => setEditing(it)}><Pencil size={14} color="var(--vert-fonce)" /></button>
                <button onClick={() => remove(it.id)}><Trash2 size={14} color="#8A2A2A" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {!loading && items.length === 0 && !editing && <p className="text-sm text-black/40 mb-4">{t("no_items", lang)}</p>}

      {editing ? (
        <div className="bg-white border p-5 max-w-sm space-y-4" style={{ borderColor: "#CFC4A3" }}>
          <ImageUploader lang={lang} value={editing.image_url} onChange={url => setEditing(e => ({ ...e, image_url: url }))} folder="hero" />
          <Field label={t("display_order", lang)}><input type="number" className="cb-input" value={editing.display_order || 0} onChange={e=>setEditing(x=>({ ...x, display_order: Number(e.target.value) }))} /></Field>
          <div>
            <label className="cb-label">{t("published", lang)}</label>
            <select className="cb-input" value={editing.status} onChange={e=>setEditing(x=>({ ...x, status: e.target.value }))}>
              <option value="published">{t("published", lang)}</option>
              <option value="draft">{t("draft", lang)}</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="cb-btn text-sm">{t("save", lang)}</button>
            <button onClick={() => setEditing(null)} className="cb-btn-outline text-sm">{t("cancel", lang)}</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setEditing({ image_url: "", display_order: items.length, status: "published" })} className="cb-btn text-sm"><Plus size={15} /> {t("add_new", lang)}</button>
      )}
    </div>
  );
}

function TourismManager({ lang }) {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() { setLoading(true); setItems(await fetchAll("tourist_sites")); setLoading(false); }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing.name_fr) return;
    await upsertRow("tourist_sites", editing);
    setEditing(null);
    load();
  }
  async function remove(id) {
    if (!window.confirm(t("confirm_delete", lang))) return;
    await deleteRow("tourist_sites", id);
    load();
  }

  return (
    <div>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {items.map(it => (
          <div key={it.id} className="bg-white border" style={{ borderColor: "#CFC4A3" }}>
            {it.image_url ? <div className="h-24" style={{ backgroundImage: `url(${it.image_url})`, backgroundSize: "cover", backgroundPosition: "center" }} /> : <div className="h-24" style={{ background: "var(--sable-deep)" }} />}
            <div className="p-3">
              <div className="text-sm font-semibold mb-1">{it.name_fr}</div>
              <div className="flex items-center justify-between">
                <StatusBadge status={it.status} />
                <div className="flex gap-2">
                  <button onClick={() => setEditing(it)}><Pencil size={14} color="var(--vert-fonce)" /></button>
                  <button onClick={() => remove(it.id)}><Trash2 size={14} color="#8A2A2A" /></button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {!loading && items.length === 0 && !editing && <p className="text-sm text-black/40 mb-4">{t("no_items", lang)}</p>}

      {editing ? (
        <div className="bg-white border p-5 max-w-lg space-y-4" style={{ borderColor: "#CFC4A3" }}>
          <ImageUploader lang={lang} value={editing.image_url} onChange={url => setEditing(e => ({ ...e, image_url: url }))} folder="tourism" />
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label={t("name_fr", lang)}><input className="cb-input" value={editing.name_fr || ""} onChange={e=>setEditing(x=>({ ...x, name_fr: e.target.value }))} /></Field>
            <Field label={t("name_en", lang)}><input className="cb-input" value={editing.name_en || ""} onChange={e=>setEditing(x=>({ ...x, name_en: e.target.value }))} /></Field>
            <Field label={t("name_pt", lang)}><input className="cb-input" value={editing.name_pt || ""} onChange={e=>setEditing(x=>({ ...x, name_pt: e.target.value }))} /></Field>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label={t("desc_fr", lang)}><textarea className="cb-input" rows={3} value={editing.desc_fr || ""} onChange={e=>setEditing(x=>({ ...x, desc_fr: e.target.value }))} /></Field>
            <Field label={t("desc_en", lang)}><textarea className="cb-input" rows={3} value={editing.desc_en || ""} onChange={e=>setEditing(x=>({ ...x, desc_en: e.target.value }))} /></Field>
            <Field label={t("desc_pt", lang)}><textarea className="cb-input" rows={3} value={editing.desc_pt || ""} onChange={e=>setEditing(x=>({ ...x, desc_pt: e.target.value }))} /></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={t("display_order", lang)}><input type="number" className="cb-input" value={editing.display_order || 0} onChange={e=>setEditing(x=>({ ...x, display_order: Number(e.target.value) }))} /></Field>
            <div>
              <label className="cb-label">{t("published", lang)}</label>
              <select className="cb-input" value={editing.status} onChange={e=>setEditing(x=>({ ...x, status: e.target.value }))}>
                <option value="published">{t("published", lang)}</option>
                <option value="draft">{t("draft", lang)}</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="cb-btn text-sm">{t("save", lang)}</button>
            <button onClick={() => setEditing(null)} className="cb-btn-outline text-sm">{t("cancel", lang)}</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setEditing({ name_fr: "", name_en: "", name_pt: "", desc_fr: "", desc_en: "", desc_pt: "", image_url: "", display_order: items.length, status: "published" })} className="cb-btn text-sm"><Plus size={15} /> {t("add_new", lang)}</button>
      )}
    </div>
  );
}

function HotelsManager({ lang }) {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() { setLoading(true); setItems(await fetchAll("cms_hotels")); setLoading(false); }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing.name) return;
    await upsertRow("cms_hotels", editing);
    setEditing(null);
    load();
  }
  async function remove(id) {
    if (!window.confirm(t("confirm_delete", lang))) return;
    await deleteRow("cms_hotels", id);
    load();
  }

  return (
    <div>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {items.map(it => (
          <div key={it.id} className="bg-white border" style={{ borderColor: "#CFC4A3" }}>
            {it.image_url ? <div className="h-24" style={{ backgroundImage: `url(${it.image_url})`, backgroundSize: "cover", backgroundPosition: "center" }} /> : <div className="h-24" style={{ background: "var(--navy)" }} />}
            <div className="p-3">
              <div className="text-sm font-semibold mb-1">{it.name}</div>
              <div className="text-xs text-black/50 mb-2">{Number(it.price || 0).toLocaleString()} {it.currency}</div>
              <div className="flex items-center justify-between">
                <StatusBadge status={it.status} />
                <div className="flex gap-2">
                  <button onClick={() => setEditing(it)}><Pencil size={14} color="var(--vert-fonce)" /></button>
                  <button onClick={() => remove(it.id)}><Trash2 size={14} color="#8A2A2A" /></button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {!loading && items.length === 0 && !editing && <p className="text-sm text-black/40 mb-4">{t("no_items", lang)}</p>}

      {editing ? (
        <div className="bg-white border p-5 max-w-lg space-y-4" style={{ borderColor: "#CFC4A3" }}>
          <ImageUploader lang={lang} value={editing.image_url} onChange={url => setEditing(e => ({ ...e, image_url: url }))} folder="hotels" />
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={t("organization", lang) === "Organization" ? "Hotel name" : "Nom de l'hôtel"}><input className="cb-input" value={editing.name || ""} onChange={e=>setEditing(x=>({ ...x, name: e.target.value }))} /></Field>
            <Field label="Distance"><input className="cb-input" value={editing.distance || ""} onChange={e=>setEditing(x=>({ ...x, distance: e.target.value }))} /></Field>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label={t("desc_fr", lang)}><textarea className="cb-input" rows={3} value={editing.desc_fr || ""} onChange={e=>setEditing(x=>({ ...x, desc_fr: e.target.value }))} /></Field>
            <Field label={t("desc_en", lang)}><textarea className="cb-input" rows={3} value={editing.desc_en || ""} onChange={e=>setEditing(x=>({ ...x, desc_en: e.target.value }))} /></Field>
            <Field label={t("desc_pt", lang)}><textarea className="cb-input" rows={3} value={editing.desc_pt || ""} onChange={e=>setEditing(x=>({ ...x, desc_pt: e.target.value }))} /></Field>
          </div>
          <Field label={t("amenities_help", lang)}><input className="cb-input" value={editing.amenities || ""} onChange={e=>setEditing(x=>({ ...x, amenities: e.target.value }))} placeholder="Wi-Fi, Piscine, Parking" /></Field>
          <div className="grid sm:grid-cols-4 gap-3">
            <Field label={t("price", lang)}><input type="number" className="cb-input" value={editing.price || 0} onChange={e=>setEditing(x=>({ ...x, price: Number(e.target.value) }))} /></Field>
            <Field label={t("currency", lang)}><input className="cb-input" value={editing.currency || "FCFA"} onChange={e=>setEditing(x=>({ ...x, currency: e.target.value }))} /></Field>
            <Field label={t("room_type", lang)}><input className="cb-input" value={editing.room_type || "Standard"} onChange={e=>setEditing(x=>({ ...x, room_type: e.target.value }))} /></Field>
            <Field label={t("display_order", lang)}><input type="number" className="cb-input" value={editing.display_order || 0} onChange={e=>setEditing(x=>({ ...x, display_order: Number(e.target.value) }))} /></Field>
          </div>
          <div>
            <label className="cb-label">{t("published", lang)}</label>
            <select className="cb-input" value={editing.status} onChange={e=>setEditing(x=>({ ...x, status: e.target.value }))}>
              <option value="published">{t("published", lang)}</option>
              <option value="draft">{t("draft", lang)}</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="cb-btn text-sm">{t("save", lang)}</button>
            <button onClick={() => setEditing(null)} className="cb-btn-outline text-sm">{t("cancel", lang)}</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setEditing({ name: "", distance: "", desc_fr: "", desc_en: "", desc_pt: "", amenities: "", price: 0, currency: "FCFA", room_type: "Standard", image_url: "", display_order: items.length, status: "published" })} className="cb-btn text-sm"><Plus size={15} /> {t("add_new", lang)}</button>
      )}
    </div>
  );
}

function SpeakersManager({ lang }) {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() { setLoading(true); setItems(await fetchAll("cms_speakers")); setLoading(false); }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing.name) return;
    await upsertRow("cms_speakers", editing);
    setEditing(null);
    load();
  }
  async function remove(id) {
    if (!window.confirm(t("confirm_delete", lang))) return;
    await deleteRow("cms_speakers", id);
    load();
  }

  return (
    <div>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {items.map(it => (
          <div key={it.id} className="flex items-start gap-3 bg-white border p-4" style={{ borderColor: "#CFC4A3" }}>
            {it.image_url ? (
              <img src={it.image_url} alt={it.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-full flex-shrink-0" style={{ background: "var(--sable-deep)" }} />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{it.name}</div>
              <div className="text-xs text-black/50 truncate mb-2">{it.role_fr}</div>
              <div className="flex items-center justify-between">
                <StatusBadge status={it.status} />
                <div className="flex gap-2">
                  <button onClick={() => setEditing(it)}><Pencil size={14} color="var(--vert-fonce)" /></button>
                  <button onClick={() => remove(it.id)}><Trash2 size={14} color="#8A2A2A" /></button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {!loading && items.length === 0 && !editing && <p className="text-sm text-black/40 mb-4">{t("no_items", lang)}</p>}

      {editing ? (
        <div className="bg-white border p-5 max-w-lg space-y-4" style={{ borderColor: "#CFC4A3" }}>
          <ImageUploader lang={lang} value={editing.image_url} onChange={url => setEditing(e => ({ ...e, image_url: url }))} folder="speakers" />
          <Field label={t("full_name", lang)}><input className="cb-input" value={editing.name || ""} onChange={e=>setEditing(x=>({ ...x, name: e.target.value }))} /></Field>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label={t("role_fr", lang)}><textarea className="cb-input" rows={3} value={editing.role_fr || ""} onChange={e=>setEditing(x=>({ ...x, role_fr: e.target.value }))} /></Field>
            <Field label={t("role_en", lang)}><textarea className="cb-input" rows={3} value={editing.role_en || ""} onChange={e=>setEditing(x=>({ ...x, role_en: e.target.value }))} /></Field>
            <Field label={t("role_pt", lang)}><textarea className="cb-input" rows={3} value={editing.role_pt || ""} onChange={e=>setEditing(x=>({ ...x, role_pt: e.target.value }))} /></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={t("display_order", lang)}><input type="number" className="cb-input" value={editing.display_order || 0} onChange={e=>setEditing(x=>({ ...x, display_order: Number(e.target.value) }))} /></Field>
            <div>
              <label className="cb-label">{t("published", lang)}</label>
              <select className="cb-input" value={editing.status} onChange={e=>setEditing(x=>({ ...x, status: e.target.value }))}>
                <option value="published">{t("published", lang)}</option>
                <option value="draft">{t("draft", lang)}</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="cb-btn text-sm">{t("save", lang)}</button>
            <button onClick={() => setEditing(null)} className="cb-btn-outline text-sm">{t("cancel", lang)}</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setEditing({ name: "", role_fr: "", role_en: "", role_pt: "", image_url: "", display_order: items.length, status: "published" })} className="cb-btn text-sm"><Plus size={15} /> {t("add_new", lang)}</button>
      )}
    </div>
  );
}
