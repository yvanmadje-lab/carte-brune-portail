import React, { useState, useEffect, useMemo } from "react";
import { Globe2, MapPin, Calendar, Hotel as HotelIcon, Plane, ShieldCheck, Search, Download, LayoutDashboard, Users, ChevronRight, ChevronLeft, Check, X, Menu, Building2, Landmark, Quote, Lock, LogOut, RefreshCw, Plus, Trash2, Pencil, Image as ImageIcon, Eye, EyeOff, QrCode } from "lucide-react";
import { supabase, fetchPublished, fetchAll, upsertRow, deleteRow, uploadMedia, getSetting, setSetting, getAllSettings, getMyProfile, listAdminProfiles, updateAdminRole, removeAdminProfile, fetchPublishedForEvent, fetchAllForEvent, getActiveEvent, listAllEvents, setActiveEvent, duplicateEvent, listArchivedEvents } from "./lib/supabaseClient";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import QRCode from "qrcode";

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

const DEFAULT_EVENT = {
  code: "AG42", year: 2026, edition: "42",
  ordinal: { fr: "e", en: "nd", pt: "ª" },
  brand: { fr: "Carte Brune CEDEAO", en: "ECOWAS Brown Card", pt: "Cartão Castanho CEDEAO" },
  title: { fr: "Assemblée Générale", en: "General Assembly", pt: "Assembleia Geral" },
  theme: { fr: "", en: "", pt: "" },
  dateShort: { fr: "DU 19 AU 22", en: "FROM 19 TO 22", pt: "DE 19 A 22" },
  monthYear: { fr: "OCTOBRE 2026", en: "OCTOBER 2026", pt: "OUTUBRO 2026" },
  venue: { fr: "Hôtel Pullman Dakar", en: "Hôtel Pullman Dakar", pt: "Hôtel Pullman Dakar" },
  city: "Dakar", country: "Sénégal",
  desc: { fr: "Le Conseil des Bureaux du Système d'Assurance Carte Brune CEDEAO réunit à Dakar les Bureaux Nationaux, régulateurs et partenaires techniques pour sa 42ᵉ Assemblée Générale annuelle, en collaboration avec la Fédération Sénégalaise des Sociétés d'Assurances (FSSA).", en: "The Council of Bureaux of the ECOWAS Brown Card Insurance Scheme convenes National Bureaux, regulators and technical partners in Dakar for its 42nd annual General Assembly, in partnership with the Senegalese Federation of Insurance Companies (FSSA).", pt: "O Conselho de Bureaux do Sistema de Seguro Cartão Castanho da CEDEAO reúne em Dakar os Bureaux Nacionais, reguladores e parceiros técnicos para a sua 42ª Assembleia Geral anual, em parceria com a Federação Senegalesa das Sociedades de Seguros (FSSA)." },
};

const DEFAULT_ORG_TYPES = [
  { id: "bureau", label: { fr: "Bureau National", en: "National Bureau", pt: "Bureau Nacional" }, isOther: false },
  { id: "insurer", label: { fr: "Compagnie d'assurance", en: "Insurance company", pt: "Companhia de seguros" }, isOther: false },
  { id: "regulator", label: { fr: "Direction des Assurances", en: "Insurance Directorate", pt: "Direção de Seguros" }, isOther: false },
  { id: "other", label: { fr: "Autre", en: "Other", pt: "Outro" }, isOther: true },
];

// Champs "simples" du formulaire d'inscription, gérables depuis l'admin
// (les champs structurants — pays, type d'organisme, choix hôtel/chambre,
// transfert — restent fixes car ils pilotent une logique dépendante).
const DEFAULT_FORM_FIELDS = [
  { id: "lastName", field_key: "lastName", step: 1, label: { fr: "Nom", en: "Last name", pt: "Apelido" }, field_type: "text", required: false, display_order: 1 },
  { id: "firstName", field_key: "firstName", step: 1, label: { fr: "Prénom", en: "First name", pt: "Nome próprio" }, field_type: "text", required: false, display_order: 2 },
  { id: "position", field_key: "position", step: 1, label: { fr: "Fonction", en: "Position", pt: "Função" }, field_type: "text", required: false, display_order: 3 },
  { id: "organization", field_key: "organization", step: 1, label: { fr: "Organisme", en: "Organization", pt: "Organização" }, field_type: "text", required: false, display_order: 4 },
  { id: "city", field_key: "city", step: 2, label: { fr: "Ville", en: "City", pt: "Cidade" }, field_type: "text", required: false, display_order: 1 },
  { id: "phone", field_key: "phone", step: 2, label: { fr: "Téléphone", en: "Phone", pt: "Telefone" }, field_type: "tel", required: false, display_order: 2 },
  { id: "email", field_key: "email", step: 2, label: { fr: "Email", en: "Email", pt: "Email" }, field_type: "email", required: false, display_order: 3 },
  { id: "address", field_key: "address", step: 2, label: { fr: "Adresse", en: "Address", pt: "Endereço" }, field_type: "text", required: false, display_order: 4 },
  { id: "flightNumber", field_key: "flightNumber", step: 4, label: { fr: "Numéro de vol (arrivée)", en: "Flight number (arrival)", pt: "Número do voo (chegada)" }, field_type: "text", required: false, display_order: 1 },
  { id: "airline", field_key: "airline", step: 4, label: { fr: "Compagnie aérienne", en: "Airline", pt: "Companhia aérea" }, field_type: "text", required: false, display_order: 2 },
  { id: "arrivalDate", field_key: "arrivalDate", step: 4, label: { fr: "Date d'arrivée", en: "Arrival date", pt: "Data de chegada" }, field_type: "date", required: false, display_order: 3 },
  { id: "arrivalTime", field_key: "arrivalTime", step: 4, label: { fr: "Heure d'arrivée", en: "Arrival time", pt: "Hora de chegada" }, field_type: "time", required: false, display_order: 4 },
  { id: "departureDate", field_key: "departureDate", step: 4, label: { fr: "Date de départ", en: "Departure date", pt: "Data de partida" }, field_type: "date", required: false, display_order: 5 },
  { id: "departureTime", field_key: "departureTime", step: 4, label: { fr: "Heure de départ", en: "Departure time", pt: "Hora de partida" }, field_type: "time", required: false, display_order: 6 },
  { id: "departureFlightNumber", field_key: "departureFlightNumber", step: 4, label: { fr: "Numéro de vol (départ)", en: "Flight number (departure)", pt: "Número do voo (partida)" }, field_type: "text", required: false, display_order: 7 },
];

const DEFAULT_MENU = [
  { id: "m1", label: { fr: "Accueil", en: "Home", pt: "Início" }, target: "top" },
  { id: "m2", label: { fr: "Événements", en: "Events", pt: "Eventos" }, target: "event-section" },
  { id: "m3", label: { fr: "Hôtels", en: "Hotels", pt: "Hotéis" }, target: "hotels-section" },
  { id: "m4", label: { fr: "Tourisme", en: "Tourism", pt: "Turismo" }, target: "tourism-section" },
];

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
  speakers_title: { fr: "Comité d'organisation", en: "Organizing committee", pt: "Comité organizador" },
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
  email_sent_notice: { fr: "Un email de confirmation vient de vous être envoyé, avec un lien pour consulter ou modifier vos informations à tout moment. Utilisez ce lien depuis votre boîte mail.", en: "A confirmation email has just been sent to you, with a link to view or update your information at any time. Use that link from your inbox.", pt: "Acabou de lhe ser enviado um email de confirmação, com um link para consultar ou atualizar os seus dados a qualquer momento. Utilize esse link a partir da sua caixa de correio." },
  update_title: { fr: "Mettre à jour mon inscription", en: "Update my registration", pt: "Atualizar a minha inscrição" },
  update_intro: { fr: "Modifiez vos informations ci-dessous puis enregistrez.", en: "Edit your information below, then save.", pt: "Edite as suas informações abaixo e depois guarde." },
  update_save: { fr: "Enregistrer les modifications", en: "Save changes", pt: "Guardar alterações" },
  update_saved: { fr: "Vos informations ont été mises à jour avec succès.", en: "Your information has been successfully updated.", pt: "As suas informações foram atualizadas com sucesso." },
  update_link_invalid: { fr: "Ce lien de modification est invalide ou a expiré.", en: "This update link is invalid or has expired.", pt: "Este link de atualização é inválido ou expirou." },
  email_tab: { fr: "Email de confirmation", en: "Confirmation email", pt: "Email de confirmação" },
  email_subject_label: { fr: "Objet de l'email", en: "Email subject", pt: "Assunto do email" },
  email_body_label: { fr: "Corps de l'email", en: "Email body", pt: "Corpo do email" },
  email_vars_help: { fr: "Variables disponibles : {{firstName}} {{lastName}} {{regNumber}} {{editLink}} {{eventTitle}}", en: "Available variables: {{firstName}} {{lastName}} {{regNumber}} {{editLink}} {{eventTitle}}", pt: "Variáveis disponíveis: {{firstName}} {{lastName}} {{regNumber}} {{editLink}} {{eventTitle}}" },
  download_badge: { fr: "Télécharger le badge", en: "Download badge", pt: "Descarregar crachá" },
  download_all_badges: { fr: "Télécharger les badges", en: "Download badges", pt: "Descarregar crachás" },
  generating_badges: { fr: "Génération en cours…", en: "Generating…", pt: "A gerar…" },
  admin: { fr: "Administration", en: "Admin", pt: "Administração" },
  dashboard: { fr: "Tableau de bord", en: "Dashboard", pt: "Painel" },
  participants: { fr: "Participants", en: "Participants", pt: "Participantes" },
  total_reg: { fr: "Inscriptions", en: "Registrations", pt: "Inscrições" },
  by_country: { fr: "Par pays", en: "By country", pt: "Por país" },
  by_org: { fr: "Par type d'organisme", en: "By organization type", pt: "Por tipo de organização" },
  export_excel: { fr: "Exporter Excel", en: "Export Excel", pt: "Exportar Excel" },
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
  confirm_delete_participant: { fr: "Supprimer définitivement cette inscription (utile en cas de doublon) ?", en: "Permanently delete this registration (useful for duplicates)?", pt: "Eliminar definitivamente esta inscrição (útil em caso de duplicado)?" },
  visit_website: { fr: "Visiter le site", en: "Visit website", pt: "Visitar site" },
  gallery_label: { fr: "Galerie photos de l'hôtel", en: "Hotel photo gallery", pt: "Galeria de fotos do hotel" },
  website_label: { fr: "Site Internet de l'hôtel", en: "Hotel website", pt: "Site do hotel" },
  view_photos: { fr: "Voir les photos", en: "View photos", pt: "Ver fotos" },
  add_photo: { fr: "Ajouter une photo", en: "Add photo", pt: "Adicionar foto" },
  no_items: { fr: "Aucun élément pour le moment.", en: "No items yet.", pt: "Ainda sem itens." },
  hero_carousel_help: { fr: "Ces images défilent en arrière-plan du bandeau d'accueil. Sans image ajoutée, le fond reste uni.", en: "These images rotate behind the homepage hero banner. With none added, the background stays plain.", pt: "Estas imagens alternam no fundo do banner inicial. Sem imagens, o fundo permanece liso." },
  logo_tab: { fr: "Logo", en: "Logo", pt: "Logótipo" },
  logo_help: { fr: "Ce logo remplace le sceau par défaut dans l'en-tête et le bandeau d'accueil du site.", en: "This logo replaces the default seal in the header and homepage banner.", pt: "Este logótipo substitui o selo padrão no cabeçalho e no banner inicial." },
  speakers_tab: { fr: "Comité d'organisation", en: "Organizing committee", pt: "Comité organizador" },
  role_fr: { fr: "Titre / rôle (Français)", en: "Title / role (French)", pt: "Título / função (Francês)" },
  role_en: { fr: "Titre / rôle (Anglais)", en: "Title / role (English)", pt: "Título / função (Inglês)" },
  role_pt: { fr: "Titre / rôle (Portugais)", en: "Title / role (Portuguese)", pt: "Título / função (Português)" },
  full_name: { fr: "Nom complet", en: "Full name", pt: "Nome completo" },
  theme_label: { fr: "Thème de la réunion", en: "Meeting theme", pt: "Tema da reunião" },
  hero_content_tab: { fr: "Contenu du bandeau", en: "Hero content", pt: "Conteúdo do banner" },
  content_scope_help: { fr: "Ce contenu (carrousel, tourisme, hôtels, comité) est propre à l'événement actuellement actif — changez d'événement actif dans l'onglet \"Événements\" pour gérer le contenu d'un autre.", en: "This content (carousel, tourism, hotels, committee) belongs to the currently active event — switch the active event in the \"Events\" tab to manage another one's content.", pt: "Este conteúdo (carrossel, turismo, hotéis, comité) pertence ao evento atualmente ativo — mude o evento ativo no separador \"Eventos\" para gerir o conteúdo de outro." },
  events_tab: { fr: "Événements", en: "Events", pt: "Eventos" },
  event_type_label: { fr: "Type de réunion", en: "Meeting type", pt: "Tipo de reunião" },
  event_type_ag: { fr: "Assemblée Générale", en: "General Assembly", pt: "Assembleia Geral" },
  event_type_zone1: { fr: "Première Réunion de Zone", en: "First Zonal Meeting", pt: "Primeira Reunião Zonal" },
  event_type_zone2: { fr: "Deuxième Réunion de Zone", en: "Second Zonal Meeting", pt: "Segunda Reunião Zonal" },
  event_type_other: { fr: "Autre", en: "Other", pt: "Outro" },
  event_year_label: { fr: "Année", en: "Year", pt: "Ano" },
  event_code_label: { fr: "Code (préfixe des numéros d'inscription)", en: "Code (registration number prefix)", pt: "Código (prefixo dos números de inscrição)" },
  event_status_label: { fr: "Statut", en: "Status", pt: "Estado" },
  status_draft: { fr: "Brouillon", en: "Draft", pt: "Rascunho" },
  status_open: { fr: "Ouvert aux inscriptions", en: "Open for registration", pt: "Aberto a inscrições" },
  status_closed: { fr: "Inscriptions fermées", en: "Registration closed", pt: "Inscrições fechadas" },
  status_archived: { fr: "Archivé", en: "Archived", pt: "Arquivado" },
  set_active_event: { fr: "Définir comme actif", en: "Set as active", pt: "Definir como ativo" },
  currently_active: { fr: "Actif actuellement", en: "Currently active", pt: "Atualmente ativo" },
  duplicate_event_btn: { fr: "Dupliquer pour l'année suivante", en: "Duplicate for next year", pt: "Duplicar para o próximo ano" },
  duplicate_event_prompt_year: { fr: "Année du nouvel événement :", en: "Year of the new event:", pt: "Ano do novo evento:" },
  duplicate_event_prompt_code: { fr: "Code du nouvel événement (ex: AG43) :", en: "Code of the new event (e.g. AG43):", pt: "Código do novo evento (ex: AG43):" },
  duplicate_event_success: { fr: "Événement dupliqué avec succès (en brouillon) — retrouvez-le dans la liste pour l'éditer.", en: "Event duplicated successfully (as draft) — find it in the list to edit it.", pt: "Evento duplicado com sucesso (como rascunho) — encontre-o na lista para editar." },
  badge_header_tab: { fr: "En-tête du badge (FR/EN/PT)", en: "Badge header (FR/EN/PT)", pt: "Cabeçalho do crachá (FR/EN/PT)" },
  badge_background_label: { fr: "Photo de fond du corps du badge", en: "Badge body background photo", pt: "Foto de fundo do corpo do crachá" },
  badge_pdf_label: { fr: "Document PDF (le QR code du badge y renverra)", en: "PDF document (the badge QR code will link to it)", pt: "Documento PDF (o QR code do crachá remeterá para ele)" },
  upload_pdf: { fr: "Choisir un PDF", en: "Choose PDF", pt: "Escolher PDF" },
  archives_title: { fr: "Archives des réunions", en: "Meeting archives", pt: "Arquivo de reuniões" },
  no_archived_events: { fr: "Aucun événement archivé pour le moment.", en: "No archived events yet.", pt: "Ainda sem eventos arquivados." },
  menu_tab: { fr: "Menu", en: "Menu", pt: "Menu" },
  edition_number: { fr: "Numéro d'édition (ex: 42)", en: "Edition number (e.g. 42)", pt: "Número da edição (ex: 42)" },
  title_fr: { fr: "Titre (Français)", en: "Title (French)", pt: "Título (Francês)" },
  title_en: { fr: "Titre (Anglais)", en: "Title (English)", pt: "Título (Inglês)" },
  title_pt: { fr: "Titre (Portugais)", en: "Title (Portuguese)", pt: "Título (Português)" },
  subtitle_fr: { fr: "Sous-titre / description (Français)", en: "Subtitle / description (French)", pt: "Subtítulo / descrição (Francês)" },
  subtitle_en: { fr: "Sous-titre / description (Anglais)", en: "Subtitle / description (English)", pt: "Subtítulo / descrição (Inglês)" },
  subtitle_pt: { fr: "Sous-titre / description (Portugais)", en: "Subtitle / description (Portuguese)", pt: "Subtítulo / descrição (Português)" },
  theme_fr: { fr: "Thème de la réunion (Français)", en: "Meeting theme (French)", pt: "Tema da reunião (Francês)" },
  theme_en: { fr: "Thème de la réunion (Anglais)", en: "Meeting theme (English)", pt: "Tema da reunião (Inglês)" },
  theme_pt: { fr: "Thème de la réunion (Portugais)", en: "Meeting theme (Portuguese)", pt: "Tema da reunião (Português)" },
  date_short_label: { fr: "Dates (format court, ex: DU 19 AU 22)", en: "Dates (short format, e.g. FROM 19 TO 22)", pt: "Datas (formato curto)" },
  month_year_label: { fr: "Mois et année (ex: OCTOBRE 2026)", en: "Month and year (e.g. OCTOBER 2026)", pt: "Mês e ano" },
  venue_label: { fr: "Lieu (nom de l'hôtel/salle)", en: "Venue name", pt: "Nome do local" },
  city_label: { fr: "Ville", en: "City", pt: "Cidade" },
  country_label: { fr: "Pays", en: "Country", pt: "País" },
  hero_theme_help: { fr: "Si rempli, un bandeau \"Thème de la réunion\" apparaît sur la page d'accueil. Laissez vide pour le masquer.", en: "If filled, a \"Meeting theme\" banner appears on the homepage. Leave empty to hide it.", pt: "Se preenchido, um banner \"Tema da reunião\" aparece na página inicial. Deixe vazio para ocultar." },
  menu_target_help: { fr: "Où mène ce lien : event-section (haut de page), hotels-section, tourism-section, top (accueil), ou une URL complète (https://...)", en: "Where this link goes: event-section (top), hotels-section, tourism-section, top (home), or a full URL (https://...)", pt: "Para onde este link vai: event-section, hotels-section, tourism-section, top, ou um URL completo" },
  menu_target: { fr: "Cible du lien", en: "Link target", pt: "Destino do link" },
  ordinal_label: { fr: "Lettre en exposant (ex: e, nd, ª)", en: "Superscript suffix (e.g. e, nd, ª)", pt: "Sufixo sobrescrito" },
  brand_help: { fr: "Nom affiché dans l'en-tête et le bandeau d'accueil, dans chaque langue.", en: "Name shown in the header and homepage banner, in each language.", pt: "Nome exibido no cabeçalho e no banner inicial, em cada idioma." },
  org_types_tab: { fr: "Types d'organisme", en: "Organization types", pt: "Tipos de organização" },
  is_other_label: { fr: "Déclenche le champ \"précisez\" (option \"Autre\")", en: "Triggers the \"please specify\" field (the \"Other\" option)", pt: "Ativa o campo \"especifique\" (opção \"Outro\")" },
  required_fields_error: { fr: "Merci de compléter les champs obligatoires :", en: "Please complete the required fields:", pt: "Preencha os campos obrigatórios:" },
  form_fields_tab: { fr: "Champs du formulaire", en: "Form fields", pt: "Campos do formulário" },
  field_key_label: { fr: "Clé technique (unique, sans espace)", en: "Technical key (unique, no spaces)", pt: "Chave técnica (única, sem espaços)" },
  field_type_label: { fr: "Type de champ", en: "Field type", pt: "Tipo de campo" },
  field_step_label: { fr: "Étape du formulaire", en: "Form step", pt: "Etapa do formulário" },
  required_label: { fr: "Champ obligatoire", en: "Required field", pt: "Campo obrigatório" },
  field_type_text: { fr: "Texte court", en: "Short text", pt: "Texto curto" },
  field_type_textarea: { fr: "Texte long", en: "Long text", pt: "Texto longo" },
  field_type_email: { fr: "Email", en: "Email", pt: "Email" },
  field_type_tel: { fr: "Téléphone", en: "Phone", pt: "Telefone" },
  field_type_date: { fr: "Date", en: "Date", pt: "Data" },
  field_type_number: { fr: "Nombre", en: "Number", pt: "Número" },
  field_type_time: { fr: "Heure", en: "Time", pt: "Hora" },
  arrival_time: { fr: "Heure d'arrivée", en: "Arrival time", pt: "Hora de chegada" },
  flight_arrival: { fr: "Vol arrivée", en: "Arrival flight", pt: "Voo de chegada" },
  departure_date: { fr: "Date de départ", en: "Departure date", pt: "Data de partida" },
  departure_time: { fr: "Heure de départ", en: "Departure time", pt: "Hora de partida" },
  flight_departure: { fr: "Vol départ", en: "Departure flight", pt: "Voo de partida" },
  org_type_col: { fr: "Type d'organisme", en: "Organization type", pt: "Tipo de organização" },
  name_col: { fr: "Nom & Prénom", en: "Name", pt: "Nome" },
  hotel_room_col: { fr: "Hôtel & Chambre", en: "Hotel & Room", pt: "Hotel & Quarto" },
  export_pdf: { fr: "Exporter PDF", en: "Export PDF", pt: "Exportar PDF" },
  hotel_label: { fr: "Hôtel", en: "Hotel", pt: "Hotel" },
  search_label: { fr: "Recherche", en: "Search", pt: "Pesquisa" },
  participants_list_title: { fr: "Liste des participants", en: "Participants list", pt: "Lista de participantes" },
  users_tab: { fr: "Utilisateurs", en: "Users", pt: "Utilizadores" },
  role_viewer: { fr: "Lecture seule", en: "Read-only", pt: "Apenas leitura" },
  role_super_admin: { fr: "Super administrateur", en: "Super admin", pt: "Super administrador" },
  role_manager: { fr: "Gestionnaire", en: "Manager", pt: "Gestor" },
  role_label: { fr: "Rôle", en: "Role", pt: "Função" },
  you_label: { fr: "Vous", en: "You", pt: "Você" },
  users_help: { fr: "Pour donner accès à l'admin à quelqu'un, créez d'abord son compte dans Supabase (Authentication → Users → Add user). Il apparaîtra automatiquement ici en \"Lecture seule\" — changez ensuite son rôle.", en: "To give someone admin access, first create their account in Supabase (Authentication → Users → Add user). They'll appear here automatically as \"Read-only\" — then change their role.", pt: "Para dar acesso de administrador a alguém, crie primeiro a conta no Supabase (Authentication → Users → Add user). Aparecerá aqui automaticamente como \"Apenas leitura\" — depois altere a função." },
  no_users: { fr: "Aucun utilisateur pour le moment.", en: "No users yet.", pt: "Ainda sem utilizadores." },
  remove_access: { fr: "Retirer l'accès admin", en: "Remove admin access", pt: "Remover acesso de administrador" },
  confirm_remove_user: { fr: "Retirer l'accès admin de cette personne ? Son compte Supabase ne sera pas supprimé.", en: "Remove this person's admin access? Their Supabase account will not be deleted.", pt: "Remover o acesso de administrador desta pessoa? A conta Supabase não será eliminada." },
  cannot_remove_self: { fr: "Vous ne pouvez pas retirer votre propre accès.", en: "You can't remove your own access.", pt: "Não pode remover o seu próprio acesso." },
  role_manager_help: { fr: "Gestionnaire : accès complet aux participants et au contenu du site.", en: "Manager: full access to participants and site content.", pt: "Gestor: acesso total aos participantes e ao conteúdo do site." },
  role_viewer_help: { fr: "Lecture seule : consultation des participants uniquement, pas de modification.", en: "Read-only: can view participants only, no changes.", pt: "Apenas leitura: pode ver os participantes, sem alterações." },
  role_super_admin_help: { fr: "Super administrateur : accès complet, y compris la gestion des utilisateurs.", en: "Super admin: full access, including user management.", pt: "Super administrador: acesso total, incluindo gestão de utilizadores." },
  read_only_notice: { fr: "Vous êtes en lecture seule : consultation uniquement, aucune modification possible.", en: "You are in read-only mode: viewing only, no changes possible.", pt: "Está em modo de apenas leitura: apenas consulta, sem alterações possíveis." },
  filter_hotel: { fr: "Tous les hôtels", en: "All hotels", pt: "Todos os hotéis" },
  filter_arrival: { fr: "Date d'arrivée", en: "Arrival date", pt: "Data de chegada" },
  filter_departure: { fr: "Date de départ", en: "Departure date", pt: "Data de saída" },
  reset_filters: { fr: "Réinitialiser les filtres", en: "Reset filters", pt: "Repor filtros" },
  view_site: { fr: "Voir le site public", en: "View public site", pt: "Ver site público" },
  hotel_none: { fr: "Hébergement personnel", en: "Own accommodation", pt: "Alojamento próprio" },
  bureau: { fr: "Bureau National", en: "National Bureau", pt: "Bureau Nacional" },
  insurer: { fr: "Compagnie d'assurance", en: "Insurance company", pt: "Companhia de seguros" },
  regulator: { fr: "Direction des Assurances", en: "Insurance Directorate", pt: "Direção de Seguros" },
  other: { fr: "Autre", en: "Other", pt: "Outro" },
};
const t = (k, lang) => (T[k] ? T[k][lang] : k);

function regNumber(seq) {
  return `CB-${DEFAULT_EVENT.year}-${DEFAULT_EVENT.code}-${String(seq).padStart(6, "0")}`;
}

function exportHeaders(lang) {
  return [t("name_col",lang), t("org_type_col",lang), t("country",lang), t("hotel_room_col",lang), t("arrival_date",lang), t("arrival_time",lang), t("flight_arrival",lang), t("departure_date",lang), t("departure_time",lang), t("flight_departure",lang)];
}

function exportRows(rows) {
  return rows.map(r => [
    `${r.lastName || ""} ${r.firstName || ""}`.trim(),
    r.orgType || "",
    r.country,
    [r.hotelName, r.roomType].filter(Boolean).join(" - "),
    r.arrivalDate || "",
    r.arrivalTime || "",
    r.flightNumber || "",
    r.departureDate || "",
    r.departureTime || "",
    r.departureFlightNumber || "",
  ]);
}

// Construit un titre du type "LISTE DES PARTICIPANTS - DATE D'ARRIVÉE : 2026-10-19"
// à partir des filtres actuellement actifs, pour l'en-tête des exports.
function buildExportTitle(lang, filters) {
  const parts = [];
  if (filters.countryFilter) parts.push(`${t("country", lang)} : ${filters.countryFilter}`);
  if (filters.hotelFilter) parts.push(`${t("hotel_label", lang)} : ${filters.hotelFilter}`);
  if (filters.arrivalFilter) parts.push(`${t("arrival_date", lang)} : ${filters.arrivalFilter}`);
  if (filters.departureFilter) parts.push(`${t("departure_date", lang)} : ${filters.departureFilter}`);
  if (filters.search) parts.push(`${t("search_label", lang)} : ${filters.search}`);
  const base = t("participants_list_title", lang);
  const title = parts.length ? `${base} - ${parts.join(" - ")}` : base;
  return title.toUpperCase();
}

async function downloadExcel(rows, filename, titleText, lang) {
  const headers = exportHeaders(lang);
  const body = exportRows(rows);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Participants");

  ws.mergeCells(1, 1, 1, headers.length);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = titleText;
  titleCell.font = { size: 16, bold: true, color: { argb: "FF14532D" } };
  titleCell.alignment = { vertical: "middle" };
  ws.getRow(1).height = 28;

  const headerRow = ws.addRow(headers);
  headerRow.eachCell(c => {
    c.font = { size: 13, bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF14532D" } };
    c.alignment = { vertical: "middle" };
  });
  headerRow.height = 22;

  body.forEach(r => {
    const row = ws.addRow(r);
    row.font = { size: 12 };
    row.height = 20;
  });

  ws.columns.forEach(col => { col.width = 20; });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function downloadPDF(rows, filename, titleText, lang) {
  const cols = exportHeaders(lang);
  const body = exportRows(rows);
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(11);
  doc.text(titleText, 14, 12);
  autoTable(doc, {
    head: [cols], body, startY: 17,
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [20, 83, 45], fontSize: 7.5, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 45 }, 3: { cellWidth: 45 } },
  });
  doc.save(filename);
}

// --- Badges participants avec QR code ---

async function loadImageAsDataURL(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return null;
  }
}

// Rend transparents les pixels quasi blancs d'une image (utilisé pour
// le logo sur les badges, souvent fourni sur fond blanc).
function stripWhiteBackground(dataUrl) {
  return new Promise((resolve) => {
    if (!dataUrl) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i] > 235 && d[i + 1] > 235 && d[i + 2] > 235) d[i + 3] = 0;
        }
        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch (e) { resolve(dataUrl); }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function pickBadgePdfLink(event, lang) {
  const pdf = event.badgePdf || {};
  return pdf[lang] || pdf.fr || pdf.en || pdf.pt || "";
}

const BADGE_W = 90, BADGE_H = 130;

async function drawBadgePage(doc, p, eventData, logoDataUrl, bgDataUrl, lang) {
  // Fond du corps du badge (photo choisie par l'admin), avec un
  // panneau translucide pour garder le texte lisible.
  if (bgDataUrl) {
    try {
      doc.addImage(bgDataUrl, "JPEG", 0, 26, BADGE_W, BADGE_H - 26);
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.82 }));
      doc.setFillColor(245, 242, 234);
      doc.rect(0, 26, BADGE_W, BADGE_H - 26, "F");
      doc.restoreGraphicsState();
    } catch (e) { /* skip */ }
  }

  doc.setFillColor(20, 83, 45);
  doc.rect(0, 0, BADGE_W, 26, "F");
  if (logoDataUrl) {
    try { doc.addImage(logoDataUrl, "PNG", 5, 4, 18, 18); } catch (e) { /* skip */ }
  }
  const headerLine = (eventData.badgeHeader && eventData.badgeHeader[lang]) || eventData.title[lang] || "";
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, "bold");
  doc.setFontSize(8.5);
  doc.text(headerLine, 26, 11, { maxWidth: 59 });
  doc.setFont(undefined, "normal");
  doc.setFontSize(6.5);
  doc.text(`${eventData.dateShort[lang] || ""} ${eventData.monthYear[lang] || ""}`, 26, 17, { maxWidth: 59 });
  doc.text(eventData.venue[lang] || "", 26, 21, { maxWidth: 59 });

  doc.setTextColor(26, 23, 18);
  doc.setFont(undefined, "bold");
  doc.setFontSize(15);
  const fullName = `${p.firstName || ""} ${p.lastName || ""}`.trim();
  doc.text(fullName, BADGE_W / 2, 42, { align: "center", maxWidth: 80 });
  doc.setFont(undefined, "normal");
  doc.setFontSize(10);
  doc.text(p.position || "", BADGE_W / 2, 50, { align: "center", maxWidth: 80 });
  doc.setFontSize(9.5);
  doc.setTextColor(90, 90, 90);
  doc.text(p.organization || "", BADGE_W / 2, 57, { align: "center", maxWidth: 80 });
  doc.text(p.country || "", BADGE_W / 2, 63, { align: "center" });

  // Le QR code renvoie vers le document PDF (programme, etc.) choisi
  // par l'admin pour la langue courante — pas simplement le numéro.
  const pdfLink = pickBadgePdfLink(eventData, lang);
  const qrValue = pdfLink || p.regNumber || p.id || "";
  const qrDataUrl = await QRCode.toDataURL(qrValue, { margin: 1, width: 240 });
  doc.addImage(qrDataUrl, "PNG", (BADGE_W - 42) / 2, 72, 42, 42);
  doc.setFont(undefined, "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(26, 23, 18);
  doc.text(p.regNumber || "", BADGE_W / 2, 120, { align: "center" });
}

async function downloadBadges(participants, eventData, logoUrl, lang, filename) {
  const [logoDataUrlRaw, bgDataUrl] = await Promise.all([
    loadImageAsDataURL(logoUrl),
    loadImageAsDataURL(eventData.badgeBackground),
  ]);
  const logoDataUrl = await stripWhiteBackground(logoDataUrlRaw);
  const doc = new jsPDF({ unit: "mm", format: [BADGE_W, BADGE_H] });
  for (let i = 0; i < participants.length; i++) {
    if (i > 0) doc.addPage([BADGE_W, BADGE_H]);
    await drawBadgePage(doc, participants[i], eventData, logoDataUrl, bgDataUrl, lang);
  }
  doc.save(filename);
}

const emptyForm = { lastName: "", firstName: "", position: "", organization: "", orgType: DEFAULT_ORG_TYPES[0].label.fr, orgOther: "", country: COUNTRIES[11], city: "", phone: "", email: "", address: "", wantsHotel: "yes", hotelId: DEFAULT_HOTELS[0].id, roomId: DEFAULT_HOTELS[0].rooms[0].id, checkIn: "", checkOut: "", flightNumber: "", airline: "", arrivalDate: "", arrivalTime: "", departureDate: "", departureTime: "", departureFlightNumber: "", transfer: "yes" };

export default function App() {
  const [lang, setLang] = useState("fr");
  const [view, setView] = useState("public");
  const [editToken, setEditToken] = useState(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [participants, setParticipants] = useState([]);
  const [confirmed, setConfirmed] = useState(null);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [hotelFilter, setHotelFilter] = useState("");
  const [arrivalFilter, setArrivalFilter] = useState("");
  const [departureFilter, setDepartureFilter] = useState("");

  // Détecte un lien de modification (?edit=<jeton>), envoyé uniquement
  // par email — jamais saisi ni collé manuellement dans le navigateur.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("edit");
    if (token) { setEditToken(token); setView("update"); }
  }, []);
  const [mobileNav, setMobileNav] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [adminUser, setAdminUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [myRole, setMyRole] = useState(null);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [hotels, setHotels] = useState(DEFAULT_HOTELS);
  const [tourism, setTourism] = useState(DEFAULT_TOURISM);
  const [heroSlides, setHeroSlides] = useState([]);
  const [logoUrl, setLogoUrl] = useState("");
  const [speakers, setSpeakers] = useState(DEFAULT_SPEAKERS);
  const [eventData, setEventData] = useState(DEFAULT_EVENT);
  const [menu, setMenu] = useState(DEFAULT_MENU);
  const [orgTypes, setOrgTypes] = useState(DEFAULT_ORG_TYPES);
  const [formFields, setFormFields] = useState(DEFAULT_FORM_FIELDS);

  function mapEventRow(r) {
    return {
      id: r.id,
      code: r.code, year: r.year, type: r.type, status: r.status,
      edition: r.edition || "",
      ordinal: r.ordinal || DEFAULT_EVENT.ordinal,
      title: r.title || DEFAULT_EVENT.title,
      theme: r.theme || DEFAULT_EVENT.theme,
      desc: r.subtitle || DEFAULT_EVENT.desc,
      dateShort: r.date_short || DEFAULT_EVENT.dateShort,
      monthYear: r.month_year || DEFAULT_EVENT.monthYear,
      venue: r.venue || DEFAULT_EVENT.venue,
      city: r.city || DEFAULT_EVENT.city,
      country: r.country || DEFAULT_EVENT.country,
      badgeHeader: r.badge_header || { fr: "", en: "", pt: "" },
      badgeBackground: r.badge_background || "",
      badgePdf: r.badge_pdf || { fr: "", en: "", pt: "" },
    };
  }

  // Contenu public (tourisme, hôtels, carrousel, logo, intervenants, bandeau, menu) — visible sans connexion.
  async function loadPublicContent() {
    const activeEventRow = await getActiveEvent();
    const activeEvent = activeEventRow ? mapEventRow(activeEventRow) : { ...DEFAULT_EVENT, id: null };
    const eventId = activeEvent.id;

    const [t, h, s, settings, sp, mn, ot, ff] = await Promise.all([
      fetchPublishedForEvent("tourist_sites", eventId),
      fetchPublishedForEvent("cms_hotels", eventId),
      fetchPublishedForEvent("hero_slides", eventId),
      getAllSettings(),
      fetchPublishedForEvent("cms_speakers", eventId),
      fetchPublished("cms_menu_items"),
      fetchPublished("cms_org_types"),
      fetchPublished("cms_form_fields"),
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
      gallery: Array.isArray(r.gallery) ? r.gallery : [],
      website: r.website || "",
      rooms: [{ id: r.id + "-r1", type: r.room_type || "Standard", price: Number(r.price) || 0, cur: r.currency || "FCFA" }],
    })));
    if (s.length) setHeroSlides(s.map(r => r.image_url));
    if (settings.event_logo) setLogoUrl(settings.event_logo);
    setEventData({
      ...activeEvent,
      brand: {
        fr: settings.event_brand_fr || DEFAULT_EVENT.brand.fr,
        en: settings.event_brand_en || DEFAULT_EVENT.brand.en,
        pt: settings.event_brand_pt || DEFAULT_EVENT.brand.pt,
      },
    });
    if (sp.length) setSpeakers(sp.map(r => ({
      id: r.id,
      name: r.name,
      role: { fr: r.role_fr, en: r.role_en, pt: r.role_pt },
      image: r.image_url,
    })));
    if (mn.length) setMenu(mn.map(r => ({
      id: r.id,
      label: { fr: r.label_fr, en: r.label_en, pt: r.label_pt },
      target: r.target,
    })));
    if (ot.length) setOrgTypes(ot.map(r => ({
      id: r.id,
      label: { fr: r.label_fr, en: r.label_en, pt: r.label_pt },
      isOther: !!r.is_other,
    })));
    if (ff.length) setFormFields(ff.map(r => ({
      id: r.id,
      field_key: r.field_key,
      step: r.step,
      label: { fr: r.label_fr, en: r.label_en, pt: r.label_pt },
      field_type: r.field_type || "text",
      required: !!r.required,
      display_order: r.display_order,
    })));
  }

  useEffect(() => { loadPublicContent(); }, []);

  function goToMenuTarget(target) {
    if (!target || target === "top") { setView("public"); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    if (target.startsWith("http")) { window.open(target, "_blank"); return; }
    setView("public");
    setTimeout(() => document.getElementById(target)?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  // Session admin : suit l'état de connexion Supabase Auth.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAdminUser(data.session?.user || null);
      setAuthChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAdminUser(session?.user || null);
      if (!session?.user) setMyRole(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (adminUser) getMyProfile().then(p => setMyRole(p?.role || "viewer"));
  }, [adminUser]);

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
      roomType: row.room_type,
      checkIn: row.check_in,
      checkOut: row.check_out,
      arrivalDate: row.arrival_date,
      arrivalTime: row.arrival_time,
      flightNumber: row.flight_number,
      departureDate: row.departure_date,
      departureTime: row.departure_time,
      departureFlightNumber: row.departure_flight_number,
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

  async function deleteParticipant(id) {
    if (!window.confirm(t("confirm_delete_participant", lang))) return;
    try {
      await deleteRow("participants", id);
      setParticipants(list => list.filter(p => p.id !== id));
    } catch (e) { /* best effort */ }
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
    if (error || !data) {
      setSubmitError(t("submit_error", lang));
      return;
    }
    const regNumber = data.regNumber;
    const editToken = data.editToken;
    setConfirmed({ ...form, regNumber });
    setStep(6);

    // Envoi de l'email de confirmation — au mieux, n'empêche jamais
    // la confirmation de s'afficher si l'envoi échoue.
    if (form.email && editToken) {
      const editLink = `${window.location.origin}${window.location.pathname}?edit=${editToken}`;
      fetch("/api/send-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email, lang, firstName: form.firstName, lastName: form.lastName,
          regNumber, editLink, eventTitle: eventData.title[lang],
        }),
      }).catch(() => { /* best effort */ });
    }
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
    const norm = (v) => (v ? String(v).slice(0, 10) : "");
    return participants.filter(p => {
      const s = search.toLowerCase();
      const matchesSearch = !s || `${p.lastName} ${p.firstName} ${p.email} ${p.organization}`.toLowerCase().includes(s);
      const matchesCountry = !countryFilter || p.country === countryFilter;
      const matchesHotel = !hotelFilter || p.hotelName === hotelFilter;
      const matchesArrival = !arrivalFilter || norm(p.arrivalDate) === arrivalFilter;
      const matchesDeparture = !departureFilter || norm(p.departureDate) === departureFilter;
      return matchesSearch && matchesCountry && matchesHotel && matchesArrival && matchesDeparture;
    });
  }, [participants, search, countryFilter, hotelFilter, arrivalFilter, departureFilter]);

  const hotelOptions = useMemo(() => Array.from(new Set(participants.map(p => p.hotelName).filter(Boolean))), [participants]);

  return (
    <div style={{ background: "var(--sable)", color: "var(--encre)", minHeight: "100%", fontFamily: "'IBM Plex Sans', sans-serif", overflowX: "hidden" }}>
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
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 px-4 sm:px-5 py-2.5 sm:py-3">
          <button onClick={() => { setView("public"); setStep(1); }} className="flex items-center gap-2 sm:gap-3 text-left min-w-0 flex-1">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-10 h-10 sm:w-20 sm:h-20 rounded-full object-cover flex-shrink-0" style={{ border: "2px solid var(--vert)" }} />
            ) : (
              <div className="seal w-10 h-10 sm:w-20 sm:h-20 flex-shrink-0">
                <div className="seal-ring" />
                <div style={{ position: "absolute", inset: 3, background: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ShieldCheck size={14} className="sm:hidden" color="var(--vert-fonce)" />
                  <ShieldCheck size={22} className="hidden sm:block" color="var(--vert-fonce)" />
                </div>
              </div>
            )}
            <div className="min-w-0">
              <div className="font-display font-semibold leading-tight truncate text-sm sm:text-xl">{eventData.brand[lang]}</div>
              <div className="text-[11px] opacity-75 leading-tight hidden sm:block truncate">{t("council", lang)}</div>
            </div>
          </button>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium flex-shrink-0">
            {menu.map(item => (
              <button key={item.id} onClick={() => goToMenuTarget(item.target)} className="hover:opacity-80 whitespace-nowrap">{item.label[lang]}</button>
            ))}
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            <div className="relative">
              <button onClick={() => setLangMenuOpen(v => !v)} className="flex items-center gap-1 text-xs sm:text-sm border border-white/30 px-2 sm:px-2.5 py-1 sm:py-1.5">
                <Globe2 size={13} /> {lang.toUpperCase()}
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
            <button className="md:hidden flex-shrink-0" onClick={() => setMobileNav(v => !v)} aria-label="Menu"><Menu size={22} /></button>
          </div>
        </div>
        {mobileNav && (
          <div className="md:hidden flex flex-col gap-3 px-5 pb-4 text-sm">
            {menu.map(item => (
              <button key={item.id} onClick={() => { goToMenuTarget(item.target); setMobileNav(false); }} className="text-left">{item.label[lang]}</button>
            ))}
            <button onClick={() => setView("register")} className="cb-btn text-sm justify-center">{t("register", lang)}</button>
          </div>
        )}
      </header>
      <div className="weave" />

      {view === "public" && (
        <PublicSite lang={lang} setView={setView} hotels={hotels} tourism={tourism} heroSlides={heroSlides} logoUrl={logoUrl} speakers={speakers} event={eventData} />
      )}

      {view === "register" && step < 6 && (
        <RegistrationWizard lang={lang} step={step} setStep={setStep} form={form} update={update} selectedHotel={selectedHotel} selectedRoom={selectedRoom} onSubmit={submitRegistration} setView={setView} submitting={submitting} submitError={submitError} hotels={hotels} orgTypes={orgTypes} formFields={formFields} />
      )}

      {view === "register" && step === 6 && confirmed && (
        <Confirmation lang={lang} record={confirmed} onDone={startOver} eventData={eventData} />
      )}

      {view === "update" && (
        <UpdateRegistration lang={lang} token={editToken} hotels={hotels} orgTypes={orgTypes} formFields={formFields} setView={setView} />
      )}

      {view === "admin" && (
        <AdminPanel lang={lang} participants={participants} stats={stats} filtered={filtered} search={search} setSearch={setSearch} countryFilter={countryFilter} setCountryFilter={setCountryFilter} hotelFilter={hotelFilter} setHotelFilter={setHotelFilter} arrivalFilter={arrivalFilter} setArrivalFilter={setArrivalFilter} departureFilter={departureFilter} setDepartureFilter={setDepartureFilter} hotelOptions={hotelOptions} setView={setView} adminUser={adminUser} authChecked={authChecked} participantsLoading={participantsLoading} onRefresh={fetchParticipants} onDeleteParticipant={deleteParticipant} logoUrl={logoUrl} onLogoChange={setLogoUrl} eventData={eventData} onEventChange={loadPublicContent} orgTypes={orgTypes} formFields={formFields} myRole={myRole} />
      )}

      {view === "archives" && (
        <ArchivesPage lang={lang} setView={setView} />
      )}

      <footer style={{ background: "var(--navy)" }} className="text-white/70 text-xs mt-16 py-8 px-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between gap-3">
          <div>© {eventData.year || DEFAULT_EVENT.year} {eventData.brand[lang]}</div>
          <div className="flex items-center gap-4">
            <button onClick={() => setView("archives")} className="underline hover:text-white">{t("archives_title", lang)}</button>
            <button onClick={() => setView(view === "admin" ? "public" : "admin")} className="underline hover:text-white">
              {view === "admin" ? t("view_site", lang) : t("admin", lang)}
            </button>
          </div>
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

function PublicSite({ lang, setView, hotels, tourism, heroSlides, logoUrl, speakers, event }) {
  const hasTheme = event.theme && (event.theme.fr || event.theme.en || event.theme.pt);
  const [galleryHotel, setGalleryHotel] = useState(null);
  return (
    <>
      {/* HERO — fond noir + trame de points, dans l'esprit du bandeau vidéo */}
      <section id="event-section" style={{ background: "var(--noir)" }} className="relative text-white px-4 sm:px-5 py-12 sm:py-20 overflow-hidden">
        <HeroCarousel images={heroSlides} />
        <div className="dots absolute inset-0 pointer-events-none" style={{ maskImage: "radial-gradient(ellipse at bottom left, black, transparent 70%)" }} />
        <div className="max-w-6xl mx-auto relative">
          <div className="flex items-start gap-2 sm:gap-3 mb-4 sm:mb-6">
            <span className="font-display font-bold leading-none" style={{ fontSize: "clamp(2.6rem, 14vw, 5rem)", color: "var(--vert)" }}>{event.edition}</span>
            <span className="font-display" style={{ fontSize: "clamp(1rem, 4vw, 1.6rem)", color: "var(--brun-clair)", marginTop: "0.6rem" }}>{event.ordinal[lang]}</span>
          </div>
          <h1 className="font-display font-semibold leading-tight -mt-6 sm:-mt-10 mb-4 sm:mb-6" style={{ fontSize: "clamp(1.6rem, 6vw, 2.4rem)" }}>
            {event.title[lang]}
          </h1>
          <p className="text-white/80 max-w-xl leading-relaxed mb-6 sm:mb-8 text-sm sm:text-base">{event.desc[lang]}</p>

          <div className="flex flex-wrap items-stretch gap-0 mb-6 sm:mb-8" style={{ background: "var(--vert-fonce)" }}>
            <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-2.5 sm:py-3">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-10 h-10 sm:w-16 sm:h-16 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="seal w-10 h-10 sm:w-16 sm:h-16 flex-shrink-0"><div className="seal-ring" /><div style={{ position:"absolute", inset:3, background:"#fff", borderRadius:"50%" }} /></div>
              )}
              <div className="text-xs sm:text-sm leading-tight">
                <div className="font-semibold">{event.brand[lang]}</div>
              </div>
            </div>
            <div className="ribbon flex items-center px-4 sm:px-5 py-2.5 sm:py-3" style={{ background: "var(--brun)" }}>
              <span className="font-display font-bold text-base sm:text-lg tracking-wide">{event.dateShort[lang]}</span>
            </div>
            <div className="flex items-center px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm">{event.monthYear[lang]}</div>
            <div className="flex items-center gap-1.5 px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm border-l border-white/10">
              <MapPin size={14} color="var(--vert)" /> <span className="font-semibold">{event.venue[lang]}</span>&nbsp;{event.city}
            </div>
          </div>
          <div>
            <button onClick={() => setView("register")} className="cb-btn w-full sm:w-auto justify-center">{t("hero_cta", lang)} <ChevronRight size={16} /></button>
          </div>
        </div>
      </section>

      {hasTheme && (
        <section className="px-4 sm:px-5 py-8 sm:py-12" style={{ background: "var(--vert-fonce)" }}>
          <div className="max-w-4xl mx-auto text-center text-white">
            <div className="cb-label mb-2" style={{ color: "var(--vert)" }}>{t("theme_label", lang)}</div>
            <p className="font-display leading-relaxed" style={{ fontSize: "clamp(1rem, 4vw, 1.3rem)" }}>{event.theme[lang]}</p>
          </div>
        </section>
      )}

      {/* PARTENAIRES & INTERVENANTS */}
      <section className="max-w-6xl mx-auto px-5 py-14">
        <h2 className="font-display font-semibold text-2xl mb-8" style={{ color: "var(--vert-fonce)" }}>{t("speakers_title", lang)}</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          {speakers.map((s, i) => (
            <div key={s.id || i} className="flex items-start gap-4 bg-white border p-5" style={{ borderColor: "#CFC4A3" }}>
              {s.image ? (
                <img src={s.image} alt={s.name} className="w-32 h-32 rounded-full object-cover flex-shrink-0" style={{ border: "2px solid var(--vert)" }} />
              ) : (
                <div className="seal w-32 h-32 flex-shrink-0"><div className="seal-ring" /><div style={{ position:"absolute", inset:6, background:"#fff", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center" }}><Quote size={36} color="var(--vert-fonce)" /></div></div>
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
                  <div style={{ height: "280px", backgroundImage: `url(${site.image})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                ) : (
                  <div style={{ background: [ "var(--lagune)","var(--argile)","var(--ocre)","var(--navy)" ][i % 4], height: "280px" }} />
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
          {hotels.map(h => {
            const gallery = [h.image, ...(h.gallery || [])].filter(Boolean);
            return (
            <div key={h.id} className="border" style={{ borderColor: "#CFC4A3" }}>
              {h.image ? (
                <button onClick={() => gallery.length && setGalleryHotel(h)} className="w-full flex items-end p-3 text-left" style={{ height: "280px", backgroundImage: `url(${h.image})`, backgroundSize: "cover", backgroundPosition: "center", cursor: gallery.length ? "pointer" : "default" }}>
                  <span className="text-white font-display font-semibold text-lg" style={{ textShadow: "0 1px 6px rgba(0,0,0,.7)" }}>{h.name}</span>
                </button>
              ) : (
                <div style={{ background: "var(--navy)", height: "280px" }} className="flex items-end p-3">
                  <span className="text-white font-display font-semibold text-lg">{h.name}</span>
                </div>
              )}
              <div className="p-4">
                <div className="text-xs text-black/50 mb-2 flex items-center gap-1"><MapPin size={12} /> {h.distance}</div>
                <p className="text-sm mb-3 leading-relaxed">{h.desc[lang]}</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {h.amenities.map(a => <span key={a} className="text-[11px] px-2 py-0.5 bg-[var(--sable-deep)]">{a}</span>)}
                </div>
                <div className="text-sm font-mono font-semibold mb-3" style={{ color: "var(--argile)" }}>
                  {h.rooms[0].price.toLocaleString()} {h.rooms[0].cur} {t("per_night", lang)}
                </div>
                <div className="flex flex-wrap gap-2">
                  {gallery.length > 0 && (
                    <button onClick={() => setGalleryHotel(h)} className="cb-btn-outline text-xs py-1.5 px-3"><ImageIcon size={13} /> {t("view_photos", lang)}</button>
                  )}
                  {h.website && (
                    <a href={h.website} target="_blank" rel="noopener noreferrer" className="cb-btn-outline text-xs py-1.5 px-3" style={{ textDecoration: "none" }}><Globe2 size={13} /> {t("visit_website", lang)}</a>
                  )}
                </div>
              </div>
            </div>
          );})}
        </div>
      </section>

      {galleryHotel && (
        <HotelGalleryModal hotel={galleryHotel} images={[galleryHotel.image, ...(galleryHotel.gallery || [])].filter(Boolean)} onClose={() => setGalleryHotel(null)} />
      )}
    </>
  );
}

function HotelGalleryModal({ hotel, images, onClose }) {
  const [index, setIndex] = useState(0);
  const next = () => setIndex(i => (i + 1) % images.length);
  const prev = () => setIndex(i => (i - 1 + images.length) % images.length);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(11,13,12,.92)" }} onClick={onClose}>
      <button onClick={onClose} className="absolute top-5 right-5 text-white"><X size={28} /></button>
      <div className="text-white absolute top-5 left-5 font-display font-semibold text-lg">{hotel.name}</div>
      <div className="relative max-w-5xl w-full px-16" onClick={e => e.stopPropagation()}>
        <img src={images[index]} alt={hotel.name} className="w-full object-contain" style={{ maxHeight: "80vh" }} />
        {images.length > 1 && (
          <>
            <button onClick={prev} className="absolute left-0 top-1/2 -translate-y-1/2 text-white p-2"><ChevronLeft size={36} /></button>
            <button onClick={next} className="absolute right-0 top-1/2 -translate-y-1/2 text-white p-2"><ChevronRight size={36} /></button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="absolute bottom-6 text-white/70 text-sm font-mono">{index + 1} / {images.length}</div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return <div><label className="cb-label">{label}</label>{children}</div>;
}

function DynamicField({ field, lang, value, onChange }) {
  const label = field.label[lang] + (field.required ? " *" : "");
  if (field.field_type === "textarea") {
    return <Field label={label}><textarea className="cb-input" rows={3} value={value || ""} onChange={e=>onChange(e.target.value)} /></Field>;
  }
  const type = ["email", "tel", "date", "number", "time"].includes(field.field_type) ? field.field_type : "text";
  return <Field label={label}><input type={type} className="cb-input" value={value || ""} onChange={e=>onChange(e.target.value)} /></Field>;
}

function RegistrationWizard({ lang, step, setStep, form, update, selectedHotel, selectedRoom, onSubmit, setView, submitting, submitError, hotels, orgTypes, formFields }) {
  const titles = ["step1_title","step2_title","step3_title","step4_title","step5_title"];
  const [stepError, setStepError] = useState("");
  const fieldsForStep = (n) => formFields.filter(f => f.step === n).sort((a,b) => a.display_order - b.display_order);

  function validateAndAdvance() {
    const missing = fieldsForStep(step).filter(f => f.required && !String(form[f.field_key] || "").trim());
    if (missing.length) {
      setStepError(t("required_fields_error", lang) + " " + missing.map(f => f.label[lang]).join(", "));
      return;
    }
    setStepError("");
    if (step < 5) setStep(s => s + 1); else onSubmit();
  }

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
          {fieldsForStep(1).map(f => (
            <DynamicField key={f.id} field={f} lang={lang} value={form[f.field_key]} onChange={v => update(f.field_key, v)} />
          ))}
          <div className="sm:col-span-2">
            <label className="cb-label">{t("org_type", lang)}</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {orgTypes.map(ot => (
                <div key={ot.id} onClick={() => update("orgType", ot.label.fr)} className={`radio-card ${form.orgType===ot.label.fr ? "active":""}`}>
                  {form.orgType===ot.label.fr && <Check size={14} color="var(--lagune)" />} {ot.label[lang]}
                </div>
              ))}
            </div>
          </div>
          {orgTypes.find(ot => ot.label.fr === form.orgType)?.isOther && (
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
          {fieldsForStep(2).map(f => (
            <DynamicField key={f.id} field={f} lang={lang} value={form[f.field_key]} onChange={v => update(f.field_key, v)} />
          ))}
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
          {fieldsForStep(4).map(f => (
            <DynamicField key={f.id} field={f} lang={lang} value={form[f.field_key]} onChange={v => update(f.field_key, v)} />
          ))}
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

      {stepError && (
        <div className="mt-4 text-sm px-4 py-3" style={{ background: "#FBEAEA", color: "#8A2A2A", border: "1px solid #E3B0B0" }}>{stepError}</div>
      )}
      {submitError && (
        <div className="mt-4 text-sm px-4 py-3" style={{ background: "#FBEAEA", color: "#8A2A2A", border: "1px solid #E3B0B0" }}>{submitError}</div>
      )}

      <div className="flex justify-between mt-8">
        <button onClick={() => step === 1 ? setView("public") : setStep(s => s - 1)} className="cb-btn-outline" disabled={submitting}><ChevronLeft size={16} /> {t("back", lang)}</button>
        {step < 5 ? (
          <button onClick={validateAndAdvance} className="cb-btn">{t("next", lang)} <ChevronRight size={16} /></button>
        ) : (
          <button onClick={validateAndAdvance} className="cb-btn" disabled={submitting} style={{ opacity: submitting ? 0.7 : 1 }}>
            {submitting ? t("submitting", lang) : t("submit", lang)} {!submitting && <Check size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}

function Confirmation({ lang, record, onDone, eventData }) {
  return (
    <div className="max-w-xl mx-auto px-5 py-16 text-center">
      <div className="stamp mx-auto mb-8" style={{ color: "var(--argile)" }}>
        <ShieldCheck size={28} />
        <span className="font-mono text-[10px] mt-1">{eventData.year || DEFAULT_EVENT.year}</span>
      </div>
      <h2 className="font-display font-semibold text-2xl mb-2" style={{ color: "var(--navy)" }}>{t("confirmed_title", lang)}</h2>
      <p className="text-sm text-black/60 mb-6">{record.firstName} {record.lastName}</p>
      <div className="inline-block border-2 border-dashed px-6 py-3 mb-8" style={{ borderColor: "var(--argile)" }}>
        <div className="cb-label mb-1">{t("reg_number", lang)}</div>
        <div className="font-mono font-semibold text-lg" style={{ color: "var(--argile)" }}>{record.regNumber}</div>
      </div>
      <p className="text-sm text-black/60 mb-8 max-w-sm mx-auto leading-relaxed">{t("email_sent_notice", lang)}</p>
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

function AdminPanel({ lang, participants, stats, filtered, search, setSearch, countryFilter, setCountryFilter, hotelFilter, setHotelFilter, arrivalFilter, setArrivalFilter, departureFilter, setDepartureFilter, hotelOptions, setView, adminUser, authChecked, participantsLoading, onRefresh, onDeleteParticipant, logoUrl, onLogoChange, eventData, onEventChange, orgTypes, formFields, myRole }) {
  const [tab, setTab] = useState("participants");
  const [generatingBadges, setGeneratingBadges] = useState(false);
  const canEdit = myRole === "super_admin" || myRole === "manager";
  const isSuperAdmin = myRole === "super_admin";

  async function handleDownloadBadges() {
    setGeneratingBadges(true);
    try {
      await downloadBadges(filtered, eventData, logoUrl, lang, `badges-${eventData.code || DEFAULT_EVENT.code}-${eventData.year || DEFAULT_EVENT.year}.pdf`);
    } catch (e) { /* best effort */ }
    setGeneratingBadges(false);
  }
  if (!authChecked) return null;
  if (!adminUser) return <AdminLogin lang={lang} />;
  if (myRole === null) return null;
  return (
    <div className="max-w-6xl mx-auto px-5 py-10">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <LayoutDashboard size={20} color="var(--navy)" />
          <h2 className="font-display font-semibold text-2xl" style={{ color: "var(--navy)" }}>{t("dashboard", lang)}</h2>
          {myRole === "viewer" && <span className="text-[11px] px-2 py-1 flex items-center gap-1" style={{ background: "#F1EEE4", color: "#8a8168" }}><Eye size={11}/> {t("role_viewer", lang)}</span>}
        </div>
        <div className="flex items-center gap-3">
          {tab === "participants" && <button onClick={onRefresh} className="cb-btn-outline text-sm py-1.5 px-3"><RefreshCw size={14} className={participantsLoading ? "animate-spin" : ""} /> {t("refresh", lang)}</button>}
          <button onClick={() => supabase.auth.signOut()} className="text-sm flex items-center gap-1 text-black/60 hover:text-black"><LogOut size={14} /> {t("admin_logout", lang)}</button>
        </div>
      </div>

      <div className="flex gap-1 mb-8 border-b flex-wrap" style={{ borderColor: "#CFC4A3" }}>
        {[["participants", t("participants_tab", lang)], ...(isSuperAdmin ? [["events", t("events_tab", lang)]] : []), ...(canEdit ? [["content", t("content_tab", lang)]] : []), ...(isSuperAdmin ? [["users", t("users_tab", lang)]] : [])].map(([key, label]) => (
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
              <div key={o} className="flex justify-between"><span>{o}</span><span className="font-mono">{n}</span></div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Users size={18} color="var(--navy)" />
        <h3 className="font-display font-semibold text-xl" style={{ color: "var(--navy)" }}>{t("participants", lang)}</h3>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
          <input className="cb-input pl-9" placeholder={t("search_ph", lang)} value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <button onClick={() => downloadExcel(filtered, `participants-${eventData.code || DEFAULT_EVENT.code}-${eventData.year || DEFAULT_EVENT.year}.xlsx`, buildExportTitle(lang, { countryFilter, hotelFilter, arrivalFilter, departureFilter, search }), lang)} className="cb-btn-outline whitespace-nowrap"><Download size={15} /> {t("export_excel", lang)}</button>
        <button onClick={() => downloadPDF(filtered, `participants-${eventData.code || DEFAULT_EVENT.code}-${eventData.year || DEFAULT_EVENT.year}.pdf`, buildExportTitle(lang, { countryFilter, hotelFilter, arrivalFilter, departureFilter, search }), lang)} className="cb-btn-outline whitespace-nowrap"><Download size={15} /> {t("export_pdf", lang)}</button>
        <button onClick={handleDownloadBadges} disabled={generatingBadges || filtered.length === 0} className="cb-btn-outline whitespace-nowrap" style={{ opacity: generatingBadges ? 0.7 : 1 }}><Download size={15} /> {generatingBadges ? t("generating_badges", lang) : t("download_all_badges", lang)}</button>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-wrap">
        <select className="cb-input sm:w-48" value={countryFilter} onChange={e=>setCountryFilter(e.target.value)}>
          <option value="">{t("all_countries", lang)}</option>
          {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="cb-input sm:w-48" value={hotelFilter} onChange={e=>setHotelFilter(e.target.value)}>
          <option value="">{t("filter_hotel", lang)}</option>
          {hotelOptions.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <div className="sm:w-44">
          <label className="cb-label">{t("filter_arrival", lang)}</label>
          <input type="date" className="cb-input" value={arrivalFilter} onChange={e=>setArrivalFilter(e.target.value)} />
        </div>
        <div className="sm:w-44">
          <label className="cb-label">{t("filter_departure", lang)}</label>
          <input type="date" className="cb-input" value={departureFilter} onChange={e=>setDepartureFilter(e.target.value)} />
        </div>
        {(countryFilter || hotelFilter || arrivalFilter || departureFilter) && (
          <button onClick={() => { setCountryFilter(""); setHotelFilter(""); setArrivalFilter(""); setDepartureFilter(""); }} className="text-xs text-black/50 underline">{t("reset_filters", lang)}</button>
        )}
      </div>

      <div className="bg-white border" style={{ borderColor: "#CFC4A3", maxHeight: "560px", overflow: "auto" }}>
        <table className="w-full text-sm" style={{ minWidth: "1400px" }}>
          <thead style={{ background: "var(--sable-deep)", position: "sticky", top: 0, zIndex: 1 }}>
            <tr className="text-left">
              {["#", t("last_name",lang), t("first_name",lang), t("organization",lang), t("org_type_col",lang), t("country",lang), t("email",lang), t("nav_hotels",lang), t("room_type",lang), t("arrival_date",lang), t("arrival_time",lang), t("flight_arrival",lang), t("departure_date",lang), t("departure_time",lang), t("flight_departure",lang)].map(h => (
                <th key={h} className="px-3 py-2 font-semibold text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
              <th className="px-3 py-2"></th>
              {canEdit && <th className="px-3 py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={17} className="px-3 py-8 text-center text-black/40">{t("no_participants", lang)}</td></tr>
            )}
            {filtered.map(p => (
              <tr key={p.id} className="border-t" style={{ borderColor: "#E7DCC2" }}>
                <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{p.regNumber}</td>
                <td className="px-3 py-2 whitespace-nowrap">{p.lastName}</td>
                <td className="px-3 py-2 whitespace-nowrap">{p.firstName}</td>
                <td className="px-3 py-2 whitespace-nowrap">{p.organization}</td>
                <td className="px-3 py-2 whitespace-nowrap">{p.orgType || "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">{p.country}</td>
                <td className="px-3 py-2 whitespace-nowrap">{p.email}</td>
                <td className="px-3 py-2 whitespace-nowrap">{p.hotelName || "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">{p.roomType || "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">{p.arrivalDate || "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">{p.arrivalTime || "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">{p.flightNumber || "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">{p.departureDate || "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">{p.departureTime || "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">{p.departureFlightNumber || "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <button onClick={() => downloadBadges([p], eventData, logoUrl, lang, `badge-${p.regNumber}.pdf`)} title={t("download_badge", lang)}><QrCode size={14} color="var(--vert-fonce)" /></button>
                </td>
                {canEdit && (
                  <td className="px-3 py-2 whitespace-nowrap">
                    <button onClick={() => onDeleteParticipant(p.id)} title={t("delete", lang)}><Trash2 size={14} color="#8A2A2A" /></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </>
      )}

      {tab === "events" && isSuperAdmin && <EventsManager lang={lang} activeEventId={eventData.id} onActiveEventChanged={onEventChange} eventData={eventData} />}
      {tab === "content" && <ContentManager lang={lang} logoUrl={logoUrl} onLogoChange={onLogoChange} eventData={eventData} onEventChange={onEventChange} canEdit={canEdit} />}
      {tab === "users" && isSuperAdmin && <UsersManager lang={lang} currentUserId={adminUser.id} />}
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
        <div className="mb-2 w-full" style={{ height: "320px", backgroundImage: `url(${value})`, backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center", backgroundColor: "#F1EEE4", border: "1px solid #CFC4A3" }} />
      )}
      <label className="cb-btn-outline text-sm cursor-pointer inline-flex">
        <ImageIcon size={14} /> {uploading ? t("uploading", lang) : t("upload_image", lang)}
        <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
      </label>
      {error && <div className="text-xs mt-1" style={{ color: "#8A2A2A" }}>{error}</div>}
    </div>
  );
}

function FileUploader({ lang, value, onChange, folder, label }) {
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
      <label className="cb-label">{label}</label>
      {value && (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-xs block mb-2 truncate" style={{ color: "var(--vert-fonce)", textDecoration: "underline" }}>{value}</a>
      )}
      <label className="cb-btn-outline text-sm cursor-pointer inline-flex">
        <ImageIcon size={14} /> {uploading ? t("uploading", lang) : t("upload_pdf", lang)}
        <input type="file" accept="application/pdf" className="hidden" onChange={handleFile} disabled={uploading} />
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

function ContentManager({ lang, logoUrl, onLogoChange, eventData, onEventChange, canEdit }) {
  const [sub, setSub] = useState("logo");
  const eventId = eventData.id;
  const subs = [
    ["logo", t("logo_tab", lang)],
    ["carousel", t("hero_carousel_tab", lang)],
    ["menu", t("menu_tab", lang)],
    ["orgtypes", t("org_types_tab", lang)],
    ["formfields", t("form_fields_tab", lang)],
    ["email", t("email_tab", lang)],
    ["tourism", t("tourism_tab", lang)],
    ["hotels", t("hotels_tab", lang)],
    ["speakers", t("speakers_tab", lang)],
  ];
  return (
    <div>
      {!canEdit && <div className="text-xs px-3 py-2 mb-4 inline-block" style={{ background: "#F1EEE4", color: "#8a8168" }}>{t("read_only_notice", lang)}</div>}
      <p className="text-xs text-black/50 mb-4 max-w-lg">{t("content_scope_help", lang)}</p>
      <div className="flex gap-4 mb-6 text-sm flex-wrap">
        {subs.map(([key, label]) => (
          <button key={key} onClick={() => setSub(key)} className="px-3 py-1.5" style={{ background: sub === key ? "var(--vert-fonce)" : "#fff", color: sub === key ? "#fff" : "var(--vert-fonce)", border: "1px solid var(--vert-fonce)" }}>{label}</button>
        ))}
      </div>
      {sub === "logo" && <LogoManager lang={lang} logoUrl={logoUrl} onLogoChange={onLogoChange} canEdit={canEdit} />}
      {sub === "carousel" && <HeroSlidesManager lang={lang} canEdit={canEdit} eventId={eventId} />}
      {sub === "menu" && <MenuManager lang={lang} canEdit={canEdit} />}
      {sub === "orgtypes" && <OrgTypesManager lang={lang} canEdit={canEdit} />}
      {sub === "formfields" && <FormFieldsManager lang={lang} canEdit={canEdit} />}
      {sub === "email" && <EmailTemplateManager lang={lang} canEdit={canEdit} />}
      {sub === "tourism" && <TourismManager lang={lang} canEdit={canEdit} eventId={eventId} />}
      {sub === "hotels" && <HotelsManager lang={lang} canEdit={canEdit} eventId={eventId} />}
      {sub === "speakers" && <SpeakersManager lang={lang} canEdit={canEdit} eventId={eventId} />}
    </div>
  );
}

function LogoManager({ lang, logoUrl, onLogoChange, canEdit }) {
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
    <div className="bg-white border p-5 max-w-lg space-y-4" style={{ borderColor: "#CFC4A3" }}>
      <p className="text-xs text-black/50">{t("logo_help", lang)}</p>
      {canEdit ? (
        <>
          <ImageUploader lang={lang} value={draft} onChange={setDraft} folder="logo" />
          <div className="flex gap-2">
            <button onClick={handleSave} className="cb-btn text-sm" disabled={saving}>{t("save", lang)}</button>
            {draft && <button onClick={handleRemove} className="cb-btn-outline text-sm" disabled={saving}>{t("delete", lang)}</button>}
          </div>
          {saved && <div className="text-xs" style={{ color: "var(--vert-fonce)" }}>✓ {t("save", lang)}</div>}
        </>
      ) : draft && (
        <img src={draft} alt="Logo" className="w-56 h-56 rounded-full object-cover" />
      )}
    </div>
  );
}

function HeroSlidesManager({ lang , canEdit, eventId }) {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() { setLoading(true); setItems(await fetchAllForEvent("hero_slides", eventId)); setLoading(false); }
  useEffect(() => { load(); }, [eventId]);

  async function save() {
    if (!editing.image_url) return;
    await upsertRow("hero_slides", { ...editing, event_id: eventId });
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
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {items.map(it => (
          <div key={it.id} className="bg-white border" style={{ borderColor: "#CFC4A3" }}>
            <div className="h-72" style={{ backgroundImage: `url(${it.image_url})`, backgroundSize: "cover", backgroundPosition: "center" }} />
            <div className="p-3 flex items-center justify-between">
              <StatusBadge status={it.status} />
              <div className="flex gap-2">
                {canEdit && <button onClick={() => setEditing(it)}><Pencil size={14} color="var(--vert-fonce)" /></button>}
                {canEdit && <button onClick={() => remove(it.id)}><Trash2 size={14} color="#8A2A2A" /></button>}
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
        canEdit && <button onClick={() => setEditing({ image_url: "", display_order: items.length, status: "published" })} className="cb-btn text-sm"><Plus size={15} /> {t("add_new", lang)}</button>
      )}
    </div>
  );
}

function TourismManager({ lang , canEdit, eventId }) {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() { setLoading(true); setItems(await fetchAllForEvent("tourist_sites", eventId)); setLoading(false); }
  useEffect(() => { load(); }, [eventId]);

  async function save() {
    if (!editing.name_fr) return;
    await upsertRow("tourist_sites", { ...editing, event_id: eventId });
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
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {items.map(it => (
          <div key={it.id} className="bg-white border" style={{ borderColor: "#CFC4A3" }}>
            {it.image_url ? <div className="h-72" style={{ backgroundImage: `url(${it.image_url})`, backgroundSize: "cover", backgroundPosition: "center" }} /> : <div className="h-72" style={{ background: "var(--sable-deep)" }} />}
            <div className="p-3">
              <div className="text-sm font-semibold mb-1">{it.name_fr}</div>
              <div className="flex items-center justify-between">
                <StatusBadge status={it.status} />
                <div className="flex gap-2">
                  {canEdit && <button onClick={() => setEditing(it)}><Pencil size={14} color="var(--vert-fonce)" /></button>}
                  {canEdit && <button onClick={() => remove(it.id)}><Trash2 size={14} color="#8A2A2A" /></button>}
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
        canEdit && <button onClick={() => setEditing({ name_fr: "", name_en: "", name_pt: "", desc_fr: "", desc_en: "", desc_pt: "", image_url: "", display_order: items.length, status: "published" })} className="cb-btn text-sm"><Plus size={15} /> {t("add_new", lang)}</button>
      )}
    </div>
  );
}

function HotelsManager({ lang , canEdit, eventId }) {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() { setLoading(true); setItems(await fetchAllForEvent("cms_hotels", eventId)); setLoading(false); }
  useEffect(() => { load(); }, [eventId]);

  async function save() {
    if (!editing.name) return;
    await upsertRow("cms_hotels", { ...editing, event_id: eventId });
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
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {items.map(it => (
          <div key={it.id} className="bg-white border" style={{ borderColor: "#CFC4A3" }}>
            {it.image_url ? <div className="h-72" style={{ backgroundImage: `url(${it.image_url})`, backgroundSize: "cover", backgroundPosition: "center" }} /> : <div className="h-72" style={{ background: "var(--navy)" }} />}
            <div className="p-3">
              <div className="text-sm font-semibold mb-1">{it.name}</div>
              <div className="text-xs text-black/50 mb-2">{Number(it.price || 0).toLocaleString()} {it.currency}</div>
              <div className="flex items-center justify-between">
                <StatusBadge status={it.status} />
                <div className="flex gap-2">
                  {canEdit && <button onClick={() => setEditing(it)}><Pencil size={14} color="var(--vert-fonce)" /></button>}
                  {canEdit && <button onClick={() => remove(it.id)}><Trash2 size={14} color="#8A2A2A" /></button>}
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
          <Field label={t("website_label", lang)}><input type="url" className="cb-input" value={editing.website || ""} onChange={e=>setEditing(x=>({ ...x, website: e.target.value }))} placeholder="https://..." /></Field>
          <div>
            <label className="cb-label">{t("gallery_label", lang)}</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(editing.gallery || []).map((url, idx) => (
                <div key={idx} className="relative" style={{ width: "110px", height: "110px" }}>
                  <img src={url} alt="" className="w-full h-full object-cover" style={{ border: "1px solid #CFC4A3" }} />
                  <button onClick={() => setEditing(x => ({ ...x, gallery: x.gallery.filter((_, i) => i !== idx) }))} className="absolute -top-2 -right-2 bg-white rounded-full" style={{ border: "1px solid #CFC4A3", width: "22px", height: "22px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <X size={13} color="#8A2A2A" />
                  </button>
                </div>
              ))}
            </div>
            <ImageUploader lang={lang} value="" onChange={url => setEditing(x => ({ ...x, gallery: [...(x.gallery || []), url] }))} folder="hotels" />
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
        canEdit && <button onClick={() => setEditing({ name: "", distance: "", desc_fr: "", desc_en: "", desc_pt: "", amenities: "", price: 0, currency: "FCFA", room_type: "Standard", image_url: "", website: "", gallery: [], display_order: items.length, status: "published" })} className="cb-btn text-sm"><Plus size={15} /> {t("add_new", lang)}</button>
      )}
    </div>
  );
}

function SpeakersManager({ lang , canEdit, eventId }) {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() { setLoading(true); setItems(await fetchAllForEvent("cms_speakers", eventId)); setLoading(false); }
  useEffect(() => { load(); }, [eventId]);

  async function save() {
    if (!editing.name) return;
    await upsertRow("cms_speakers", { ...editing, event_id: eventId });
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
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {items.map(it => (
          <div key={it.id} className="flex items-start gap-3 bg-white border p-4" style={{ borderColor: "#CFC4A3" }}>
            {it.image_url ? (
              <img src={it.image_url} alt={it.name} className="w-32 h-32 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-32 h-32 rounded-full flex-shrink-0" style={{ background: "var(--sable-deep)" }} />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{it.name}</div>
              <div className="text-xs text-black/50 truncate mb-2">{it.role_fr}</div>
              <div className="flex items-center justify-between">
                <StatusBadge status={it.status} />
                <div className="flex gap-2">
                  {canEdit && <button onClick={() => setEditing(it)}><Pencil size={14} color="var(--vert-fonce)" /></button>}
                  {canEdit && <button onClick={() => remove(it.id)}><Trash2 size={14} color="#8A2A2A" /></button>}
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
        canEdit && <button onClick={() => setEditing({ name: "", role_fr: "", role_en: "", role_pt: "", image_url: "", display_order: items.length, status: "published" })} className="cb-btn text-sm"><Plus size={15} /> {t("add_new", lang)}</button>
      )}
    </div>
  );
}

function EventHeroManager({ lang, eventData, onEventChange, canEdit }) {
  const [draft, setDraft] = useState({
    event_edition: eventData.edition || "",
    event_ordinal_fr: eventData.ordinal.fr || "", event_ordinal_en: eventData.ordinal.en || "", event_ordinal_pt: eventData.ordinal.pt || "",
    event_brand_fr: eventData.brand.fr || "", event_brand_en: eventData.brand.en || "", event_brand_pt: eventData.brand.pt || "",
    event_title_fr: eventData.title.fr || "", event_title_en: eventData.title.en || "", event_title_pt: eventData.title.pt || "",
    event_subtitle_fr: eventData.desc.fr || "", event_subtitle_en: eventData.desc.en || "", event_subtitle_pt: eventData.desc.pt || "",
    event_theme_fr: eventData.theme.fr || "", event_theme_en: eventData.theme.en || "", event_theme_pt: eventData.theme.pt || "",
    event_date_short_fr: eventData.dateShort.fr || "", event_date_short_en: eventData.dateShort.en || "", event_date_short_pt: eventData.dateShort.pt || "",
    event_month_year_fr: eventData.monthYear.fr || "", event_month_year_en: eventData.monthYear.en || "", event_month_year_pt: eventData.monthYear.pt || "",
    event_venue_fr: eventData.venue.fr || "", event_venue_en: eventData.venue.en || "", event_venue_pt: eventData.venue.pt || "",
    event_city: eventData.city || "", event_country: eventData.country || "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function set(key, value) { setDraft(d => ({ ...d, [key]: value })); setSaved(false); }

  async function handleSave() {
    setSaving(true);
    try {
      await Promise.all(Object.entries(draft).map(([key, value]) => setSetting(key, value)));
      onEventChange({
        ...eventData,
        edition: draft.event_edition,
        ordinal: { fr: draft.event_ordinal_fr, en: draft.event_ordinal_en, pt: draft.event_ordinal_pt },
        brand: { fr: draft.event_brand_fr, en: draft.event_brand_en, pt: draft.event_brand_pt },
        title: { fr: draft.event_title_fr, en: draft.event_title_en, pt: draft.event_title_pt },
        desc: { fr: draft.event_subtitle_fr, en: draft.event_subtitle_en, pt: draft.event_subtitle_pt },
        theme: { fr: draft.event_theme_fr, en: draft.event_theme_en, pt: draft.event_theme_pt },
        dateShort: { fr: draft.event_date_short_fr, en: draft.event_date_short_en, pt: draft.event_date_short_pt },
        monthYear: { fr: draft.event_month_year_fr, en: draft.event_month_year_en, pt: draft.event_month_year_pt },
        venue: { fr: draft.event_venue_fr, en: draft.event_venue_en, pt: draft.event_venue_pt },
        city: draft.event_city, country: draft.event_country,
      });
      setSaved(true);
    } catch (e) { /* best effort */ }
    setSaving(false);
  }

  return (
    <div className="bg-white border p-5 max-w-2xl space-y-5" style={{ borderColor: "#CFC4A3" }}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label={t("edition_number", lang)}><input className="cb-input" value={draft.event_edition} onChange={e=>set("event_edition", e.target.value)} /></Field>
        <div>
          <label className="cb-label">{t("ordinal_label", lang)}</label>
          <div className="grid grid-cols-3 gap-2">
            <input className="cb-input" placeholder="FR" value={draft.event_ordinal_fr} onChange={e=>set("event_ordinal_fr", e.target.value)} />
            <input className="cb-input" placeholder="EN" value={draft.event_ordinal_en} onChange={e=>set("event_ordinal_en", e.target.value)} />
            <input className="cb-input" placeholder="PT" value={draft.event_ordinal_pt} onChange={e=>set("event_ordinal_pt", e.target.value)} />
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs text-black/50 mb-2">{t("brand_help", lang)}</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="FR"><input className="cb-input" value={draft.event_brand_fr} onChange={e=>set("event_brand_fr", e.target.value)} /></Field>
          <Field label="EN"><input className="cb-input" value={draft.event_brand_en} onChange={e=>set("event_brand_en", e.target.value)} /></Field>
          <Field label="PT"><input className="cb-input" value={draft.event_brand_pt} onChange={e=>set("event_brand_pt", e.target.value)} /></Field>
        </div>
      </div>

      <div>
        <label className="cb-label mb-1 block">{t("date_short_label", lang)}</label>
        <div className="grid sm:grid-cols-3 gap-3 mb-3">
          <input className="cb-input" placeholder="FR" value={draft.event_date_short_fr} onChange={e=>set("event_date_short_fr", e.target.value)} />
          <input className="cb-input" placeholder="EN" value={draft.event_date_short_en} onChange={e=>set("event_date_short_en", e.target.value)} />
          <input className="cb-input" placeholder="PT" value={draft.event_date_short_pt} onChange={e=>set("event_date_short_pt", e.target.value)} />
        </div>
        <label className="cb-label mb-1 block">{t("month_year_label", lang)}</label>
        <div className="grid sm:grid-cols-3 gap-3 mb-3">
          <input className="cb-input" placeholder="FR" value={draft.event_month_year_fr} onChange={e=>set("event_month_year_fr", e.target.value)} />
          <input className="cb-input" placeholder="EN" value={draft.event_month_year_en} onChange={e=>set("event_month_year_en", e.target.value)} />
          <input className="cb-input" placeholder="PT" value={draft.event_month_year_pt} onChange={e=>set("event_month_year_pt", e.target.value)} />
        </div>
        <label className="cb-label mb-1 block">{t("venue_label", lang)}</label>
        <div className="grid sm:grid-cols-3 gap-3">
          <input className="cb-input" placeholder="FR" value={draft.event_venue_fr} onChange={e=>set("event_venue_fr", e.target.value)} />
          <input className="cb-input" placeholder="EN" value={draft.event_venue_en} onChange={e=>set("event_venue_en", e.target.value)} />
          <input className="cb-input" placeholder="PT" value={draft.event_venue_pt} onChange={e=>set("event_venue_pt", e.target.value)} />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label={t("city_label", lang)}><input className="cb-input" value={draft.event_city} onChange={e=>set("event_city", e.target.value)} /></Field>
        <Field label={t("country_label", lang)}><input className="cb-input" value={draft.event_country} onChange={e=>set("event_country", e.target.value)} /></Field>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label={t("title_fr", lang)}><input className="cb-input" value={draft.event_title_fr} onChange={e=>set("event_title_fr", e.target.value)} /></Field>
        <Field label={t("title_en", lang)}><input className="cb-input" value={draft.event_title_en} onChange={e=>set("event_title_en", e.target.value)} /></Field>
        <Field label={t("title_pt", lang)}><input className="cb-input" value={draft.event_title_pt} onChange={e=>set("event_title_pt", e.target.value)} /></Field>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label={t("subtitle_fr", lang)}><textarea className="cb-input" rows={3} value={draft.event_subtitle_fr} onChange={e=>set("event_subtitle_fr", e.target.value)} /></Field>
        <Field label={t("subtitle_en", lang)}><textarea className="cb-input" rows={3} value={draft.event_subtitle_en} onChange={e=>set("event_subtitle_en", e.target.value)} /></Field>
        <Field label={t("subtitle_pt", lang)}><textarea className="cb-input" rows={3} value={draft.event_subtitle_pt} onChange={e=>set("event_subtitle_pt", e.target.value)} /></Field>
      </div>
      <div>
        <p className="text-xs text-black/50 mb-3">{t("hero_theme_help", lang)}</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label={t("theme_fr", lang)}><textarea className="cb-input" rows={3} value={draft.event_theme_fr} onChange={e=>set("event_theme_fr", e.target.value)} /></Field>
          <Field label={t("theme_en", lang)}><textarea className="cb-input" rows={3} value={draft.event_theme_en} onChange={e=>set("event_theme_en", e.target.value)} /></Field>
          <Field label={t("theme_pt", lang)}><textarea className="cb-input" rows={3} value={draft.event_theme_pt} onChange={e=>set("event_theme_pt", e.target.value)} /></Field>
        </div>
      </div>
      <div className="flex gap-2 items-center">
        {canEdit && <button onClick={handleSave} className="cb-btn text-sm" disabled={saving}>{t("save", lang)}</button>}
        {saved && <span className="text-xs" style={{ color: "var(--vert-fonce)" }}>✓</span>}
      </div>
    </div>
  );
}

function MenuManager({ lang , canEdit }) {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() { setLoading(true); setItems(await fetchAll("cms_menu_items")); setLoading(false); }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing.label_fr || !editing.target) return;
    await upsertRow("cms_menu_items", editing);
    setEditing(null);
    load();
  }
  async function remove(id) {
    if (!window.confirm(t("confirm_delete", lang))) return;
    await deleteRow("cms_menu_items", id);
    load();
  }

  return (
    <div>
      <div className="space-y-2 mb-6">
        {items.map(it => (
          <div key={it.id} className="flex items-center justify-between bg-white border px-4 py-3" style={{ borderColor: "#CFC4A3" }}>
            <div>
              <div className="text-sm font-semibold">{it.label_fr}</div>
              <div className="text-xs text-black/50 font-mono">{it.target}</div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={it.status} />
              {canEdit && <button onClick={() => setEditing(it)}><Pencil size={14} color="var(--vert-fonce)" /></button>}
              {canEdit && <button onClick={() => remove(it.id)}><Trash2 size={14} color="#8A2A2A" /></button>}
            </div>
          </div>
        ))}
      </div>
      {!loading && items.length === 0 && !editing && <p className="text-sm text-black/40 mb-4">{t("no_items", lang)}</p>}

      {editing ? (
        <div className="bg-white border p-5 max-w-lg space-y-4" style={{ borderColor: "#CFC4A3" }}>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label={t("name_fr", lang)}><input className="cb-input" value={editing.label_fr || ""} onChange={e=>setEditing(x=>({ ...x, label_fr: e.target.value }))} /></Field>
            <Field label={t("name_en", lang)}><input className="cb-input" value={editing.label_en || ""} onChange={e=>setEditing(x=>({ ...x, label_en: e.target.value }))} /></Field>
            <Field label={t("name_pt", lang)}><input className="cb-input" value={editing.label_pt || ""} onChange={e=>setEditing(x=>({ ...x, label_pt: e.target.value }))} /></Field>
          </div>
          <Field label={t("menu_target", lang)}><input className="cb-input" value={editing.target || ""} onChange={e=>setEditing(x=>({ ...x, target: e.target.value }))} placeholder="event-section" /></Field>
          <p className="text-xs text-black/50">{t("menu_target_help", lang)}</p>
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
        canEdit && <button onClick={() => setEditing({ label_fr: "", label_en: "", label_pt: "", target: "", display_order: items.length, status: "published" })} className="cb-btn text-sm"><Plus size={15} /> {t("add_new", lang)}</button>
      )}
    </div>
  );
}

function OrgTypesManager({ lang , canEdit }) {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() { setLoading(true); setItems(await fetchAll("cms_org_types")); setLoading(false); }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing.label_fr) return;
    await upsertRow("cms_org_types", editing);
    setEditing(null);
    load();
  }
  async function remove(id) {
    if (!window.confirm(t("confirm_delete", lang))) return;
    await deleteRow("cms_org_types", id);
    load();
  }

  return (
    <div>
      <div className="space-y-2 mb-6">
        {items.map(it => (
          <div key={it.id} className="flex items-center justify-between bg-white border px-4 py-3" style={{ borderColor: "#CFC4A3" }}>
            <div>
              <div className="text-sm font-semibold">{it.label_fr} {it.is_other && <span className="text-[10px] px-1.5 py-0.5 ml-1" style={{ background: "var(--sable-deep)" }}>Autre</span>}</div>
              <div className="text-xs text-black/50">{it.label_en} · {it.label_pt}</div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={it.status} />
              {canEdit && <button onClick={() => setEditing(it)}><Pencil size={14} color="var(--vert-fonce)" /></button>}
              {canEdit && <button onClick={() => remove(it.id)}><Trash2 size={14} color="#8A2A2A" /></button>}
            </div>
          </div>
        ))}
      </div>
      {!loading && items.length === 0 && !editing && <p className="text-sm text-black/40 mb-4">{t("no_items", lang)}</p>}

      {editing ? (
        <div className="bg-white border p-5 max-w-lg space-y-4" style={{ borderColor: "#CFC4A3" }}>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label={t("name_fr", lang)}><input className="cb-input" value={editing.label_fr || ""} onChange={e=>setEditing(x=>({ ...x, label_fr: e.target.value }))} /></Field>
            <Field label={t("name_en", lang)}><input className="cb-input" value={editing.label_en || ""} onChange={e=>setEditing(x=>({ ...x, label_en: e.target.value }))} /></Field>
            <Field label={t("name_pt", lang)}><input className="cb-input" value={editing.label_pt || ""} onChange={e=>setEditing(x=>({ ...x, label_pt: e.target.value }))} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!editing.is_other} onChange={e=>setEditing(x=>({ ...x, is_other: e.target.checked }))} />
            {t("is_other_label", lang)}
          </label>
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
        canEdit && <button onClick={() => setEditing({ label_fr: "", label_en: "", label_pt: "", is_other: false, display_order: items.length, status: "published" })} className="cb-btn text-sm"><Plus size={15} /> {t("add_new", lang)}</button>
      )}
    </div>
  );
}

const FIELD_TYPE_OPTIONS = ["text", "textarea", "email", "tel", "date", "time", "number"];
const FIELD_STEP_OPTIONS = [1, 2, 4];

function FormFieldsManager({ lang , canEdit }) {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() { setLoading(true); setItems(await fetchAll("cms_form_fields")); setLoading(false); }
  useEffect(() => { load(); }, []);

  function slugify(str) {
    return (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  }

  async function save() {
    if (!editing.label_fr) return;
    const row = { ...editing };
    if (!row.field_key) row.field_key = slugify(editing.label_fr) + "_" + Date.now().toString(36);
    await upsertRow("cms_form_fields", row);
    setEditing(null);
    load();
  }
  async function remove(id) {
    if (!window.confirm(t("confirm_delete", lang))) return;
    await deleteRow("cms_form_fields", id);
    load();
  }

  const stepLabel = (n) => ({ 1: t("step1_title", lang), 2: t("step2_title", lang), 4: t("step4_title", lang) }[n] || n);
  const typeLabel = (ty) => t("field_type_" + ty, lang);

  return (
    <div>
      {[1, 2, 4].map(stepNum => (
        <div key={stepNum} className="mb-6">
          <div className="cb-label mb-2">{stepLabel(stepNum)}</div>
          <div className="space-y-2">
            {items.filter(it => it.step === stepNum).sort((a,b) => a.display_order - b.display_order).map(it => (
              <div key={it.id} className="flex items-center justify-between bg-white border px-4 py-3" style={{ borderColor: "#CFC4A3" }}>
                <div>
                  <div className="text-sm font-semibold">{it.label_fr} {it.required && <span className="text-[10px] px-1.5 py-0.5 ml-1" style={{ background: "#FBEAEA", color: "#8A2A2A" }}>*</span>}</div>
                  <div className="text-xs text-black/50 font-mono">{it.field_key} · {typeLabel(it.field_type || "text")}</div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={it.status} />
                  {canEdit && <button onClick={() => setEditing(it)}><Pencil size={14} color="var(--vert-fonce)" /></button>}
                  {canEdit && <button onClick={() => remove(it.id)}><Trash2 size={14} color="#8A2A2A" /></button>}
                </div>
              </div>
            ))}
            {!loading && items.filter(it => it.step === stepNum).length === 0 && <p className="text-sm text-black/40">{t("no_items", lang)}</p>}
          </div>
        </div>
      ))}

      {editing ? (
        <div className="bg-white border p-5 max-w-lg space-y-4" style={{ borderColor: "#CFC4A3" }}>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label={t("name_fr", lang)}><input className="cb-input" value={editing.label_fr || ""} onChange={e=>setEditing(x=>({ ...x, label_fr: e.target.value }))} /></Field>
            <Field label={t("name_en", lang)}><input className="cb-input" value={editing.label_en || ""} onChange={e=>setEditing(x=>({ ...x, label_en: e.target.value }))} /></Field>
            <Field label={t("name_pt", lang)}><input className="cb-input" value={editing.label_pt || ""} onChange={e=>setEditing(x=>({ ...x, label_pt: e.target.value }))} /></Field>
          </div>
          {editing.id ? (
            <div className="text-xs text-black/50 font-mono">{t("field_key_label", lang)}: {editing.field_key}</div>
          ) : (
            <Field label={t("field_key_label", lang)}><input className="cb-input font-mono" value={editing.field_key || ""} onChange={e=>setEditing(x=>({ ...x, field_key: slugify(e.target.value) }))} placeholder={t("field_key_label", lang)} /></Field>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="cb-label">{t("field_type_label", lang)}</label>
              <select className="cb-input" value={editing.field_type || "text"} onChange={e=>setEditing(x=>({ ...x, field_type: e.target.value }))}>
                {FIELD_TYPE_OPTIONS.map(ty => <option key={ty} value={ty}>{typeLabel(ty)}</option>)}
              </select>
            </div>
            <div>
              <label className="cb-label">{t("field_step_label", lang)}</label>
              <select className="cb-input" value={editing.step || 1} onChange={e=>setEditing(x=>({ ...x, step: Number(e.target.value) }))}>
                {FIELD_STEP_OPTIONS.map(s => <option key={s} value={s}>{stepLabel(s)}</option>)}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!editing.required} onChange={e=>setEditing(x=>({ ...x, required: e.target.checked }))} />
            {t("required_label", lang)}
          </label>
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
        canEdit && <button onClick={() => setEditing({ label_fr: "", label_en: "", label_pt: "", field_key: "", field_type: "text", step: 1, required: false, display_order: items.length, status: "published" })} className="cb-btn text-sm"><Plus size={15} /> {t("add_new", lang)}</button>
      )}
    </div>
  );
}

const ROLE_OPTIONS = ["super_admin", "manager", "viewer"];

function UsersManager({ lang, currentUserId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setItems(await listAdminProfiles());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleRoleChange(userId, role) {
    setSavingId(userId);
    setError("");
    try {
      await updateAdminRole(userId, role);
      setItems(list => list.map(u => u.user_id === userId ? { ...u, role } : u));
    } catch (e) {
      setError(String(e.message || e));
    }
    setSavingId(null);
  }

  async function handleRemove(userId) {
    if (userId === currentUserId) {
      setError(t("cannot_remove_self", lang));
      return;
    }
    if (!window.confirm(t("confirm_remove_user", lang))) return;
    setSavingId(userId);
    setError("");
    try {
      await removeAdminProfile(userId);
      setItems(list => list.filter(u => u.user_id !== userId));
    } catch (e) {
      setError(String(e.message || e));
    }
    setSavingId(null);
  }

  return (
    <div>
      <p className="text-xs text-black/50 mb-2 max-w-xl">{t("users_help", lang)}</p>
      <div className="text-xs text-black/50 mb-6 max-w-xl space-y-1">
        <div><strong>{t("role_super_admin", lang)}</strong> — {t("role_super_admin_help", lang)}</div>
        <div><strong>{t("role_manager", lang)}</strong> — {t("role_manager_help", lang)}</div>
        <div><strong>{t("role_viewer", lang)}</strong> — {t("role_viewer_help", lang)}</div>
      </div>

      {error && <div className="text-sm px-3 py-2 mb-4" style={{ background: "#FBEAEA", color: "#8A2A2A" }}>{error}</div>}

      <div className="bg-white border overflow-auto" style={{ borderColor: "#CFC4A3" }}>
        <table className="w-full text-sm">
          <thead style={{ background: "var(--sable-deep)" }}>
            <tr className="text-left">
              <th className="px-3 py-2 font-semibold text-xs uppercase tracking-wide">{t("admin_email", lang)}</th>
              <th className="px-3 py-2 font-semibold text-xs uppercase tracking-wide">{t("role_label", lang)}</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {!loading && items.length === 0 && (
              <tr><td colSpan={3} className="px-3 py-8 text-center text-black/40">{t("no_users", lang)}</td></tr>
            )}
            {items.map(u => (
              <tr key={u.user_id} className="border-t" style={{ borderColor: "#E7DCC2" }}>
                <td className="px-3 py-2">
                  {u.email}
                  {u.user_id === currentUserId && <span className="text-[10px] px-1.5 py-0.5 ml-2" style={{ background: "var(--sable-deep)" }}>{t("you_label", lang)}</span>}
                </td>
                <td className="px-3 py-2">
                  <select className="cb-input py-1" style={{ width: "auto" }} value={u.role} disabled={savingId === u.user_id} onChange={e => handleRoleChange(u.user_id, e.target.value)}>
                    {ROLE_OPTIONS.map(r => <option key={r} value={r}>{t("role_" + r, lang)}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => handleRemove(u.user_id)} disabled={savingId === u.user_id} title={t("remove_access", lang)}>
                    <Trash2 size={14} color="#8A2A2A" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UpdateRegistration({ lang, token, hotels, orgTypes, formFields, setView }) {
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      if (!token) { setNotFound(true); setLoading(false); return; }
      const { data, error } = await supabase.rpc("get_participant_by_token", { p_token: token });
      if (error || !data) { setNotFound(true); setLoading(false); return; }
      setForm({
        lastName: data.last_name || "", firstName: data.first_name || "", position: data.position || "", organization: data.organization || "",
        orgType: data.org_type || (orgTypes[0]?.label.fr || ""), orgOther: data.org_other || "",
        country: data.country || COUNTRIES[11], city: data.city || "", phone: data.phone || "", email: data.email || "", address: data.address || "",
        wantsHotel: data.wants_hotel || "yes", hotelId: data.hotel_id || hotels[0]?.id || "", roomId: data.room_id || hotels[0]?.rooms[0]?.id || "",
        checkIn: data.check_in || "", checkOut: data.check_out || "",
        flightNumber: data.flight_number || "", airline: data.airline || "", arrivalDate: data.arrival_date || "", arrivalTime: data.arrival_time || "",
        departureDate: data.departure_date || "", departureTime: data.departure_time || "", departureFlightNumber: data.departure_flight_number || "",
        transfer: data.transfer || "yes",
      });
      setLoading(false);
    })();
  }, [token]);

  function update(field, value) { setForm(f => ({ ...f, [field]: value })); setSaved(false); }

  async function handleSave() {
    setSaving(true);
    setError("");
    const { error } = await supabase.rpc("update_participant_by_token", { p_token: token, payload: form });
    setSaving(false);
    if (error) { setError(t("submit_error", lang)); return; }
    setSaved(true);
  }

  if (loading) return <div className="max-w-xl mx-auto px-5 py-20 text-center text-black/50">…</div>;
  if (notFound) return (
    <div className="max-w-xl mx-auto px-5 py-20 text-center">
      <p className="text-black/60 mb-6">{t("update_link_invalid", lang)}</p>
      <button onClick={() => setView("public")} className="cb-btn">{t("back_home", lang)}</button>
    </div>
  );

  const selectedHotel = hotels.find(h => h.id === form.hotelId) || hotels[0];
  const selectedRoom = selectedHotel?.rooms.find(r => r.id === form.roomId) || selectedHotel?.rooms[0];
  const fieldsForStep = (n) => formFields.filter(f => f.step === n).sort((a,b) => a.display_order - b.display_order);

  return (
    <div className="max-w-3xl mx-auto px-5 py-12">
      <h2 className="font-display font-semibold text-2xl mb-2" style={{ color: "var(--navy)" }}>{t("update_title", lang)}</h2>
      <p className="text-sm text-black/50 mb-8">{t("update_intro", lang)}</p>

      <div className="space-y-8">
        <div>
          <div className="cb-label mb-3">{t("step1_title", lang)}</div>
          <div className="grid sm:grid-cols-2 gap-5">
            {fieldsForStep(1).map(f => <DynamicField key={f.id} field={f} lang={lang} value={form[f.field_key]} onChange={v => update(f.field_key, v)} />)}
            <div className="sm:col-span-2">
              <label className="cb-label">{t("org_type", lang)}</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {orgTypes.map(ot => (
                  <div key={ot.id} onClick={() => update("orgType", ot.label.fr)} className={`radio-card ${form.orgType===ot.label.fr ? "active":""}`}>
                    {form.orgType===ot.label.fr && <Check size={14} color="var(--lagune)" />} {ot.label[lang]}
                  </div>
                ))}
              </div>
            </div>
            {orgTypes.find(ot => ot.label.fr === form.orgType)?.isOther && (
              <div className="sm:col-span-2"><Field label={t("org_other", lang)}><input className="cb-input" value={form.orgOther} onChange={e=>update("orgOther", e.target.value)} /></Field></div>
            )}
          </div>
        </div>

        <div>
          <div className="cb-label mb-3">{t("step2_title", lang)}</div>
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label={t("country", lang)}>
              <select className="cb-input" value={form.country} onChange={e=>update("country", e.target.value)}>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            {fieldsForStep(2).map(f => <DynamicField key={f.id} field={f} lang={lang} value={form[f.field_key]} onChange={v => update(f.field_key, v)} />)}
          </div>
        </div>

        <div>
          <div className="cb-label mb-3">{t("step3_title", lang)}</div>
          <div className="space-y-4">
            <div className="flex gap-3">
              {["yes","no"].map(v => (
                <div key={v} onClick={() => update("wantsHotel", v)} className={`radio-card ${form.wantsHotel===v?"active":""}`}>
                  {form.wantsHotel===v && <Check size={14} color="var(--lagune)"/>} {v==="yes" ? t("yes",lang) : t("no",lang)}
                </div>
              ))}
            </div>
            {form.wantsHotel === "yes" && selectedHotel && (
              <>
                <Field label={t("nav_hotels", lang)}>
                  <select className="cb-input" value={form.hotelId} onChange={e=>{ const h = hotels.find(x=>x.id===e.target.value); update("hotelId", e.target.value); update("roomId", h.rooms[0].id); }}>
                    {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                </Field>
                <Field label={t("room_type", lang)}>
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
        </div>

        <div>
          <div className="cb-label mb-3">{t("step4_title", lang)}</div>
          <div className="grid sm:grid-cols-2 gap-5">
            {fieldsForStep(4).map(f => <DynamicField key={f.id} field={f} lang={lang} value={form[f.field_key]} onChange={v => update(f.field_key, v)} />)}
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
        </div>
      </div>

      {error && <div className="mt-6 text-sm px-4 py-3" style={{ background: "#FBEAEA", color: "#8A2A2A", border: "1px solid #E3B0B0" }}>{error}</div>}
      {saved && <div className="mt-6 text-sm px-4 py-3" style={{ background: "#EAF6EE", color: "var(--vert-fonce)" }}>{t("update_saved", lang)}</div>}

      <div className="mt-8">
        <button onClick={handleSave} className="cb-btn" disabled={saving} style={{ opacity: saving ? 0.7 : 1 }}>{saving ? t("submitting", lang) : t("update_save", lang)}</button>
      </div>
    </div>
  );
}

function EmailTemplateManager({ lang, canEdit }) {
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeLang, setActiveLang] = useState("fr");

  useEffect(() => {
    (async () => {
      const s = await getAllSettings();
      setDraft({
        email_subject_fr: s.email_subject_fr || "", email_subject_en: s.email_subject_en || "", email_subject_pt: s.email_subject_pt || "",
        email_body_fr: s.email_body_fr || "", email_body_en: s.email_body_en || "", email_body_pt: s.email_body_pt || "",
      });
    })();
  }, []);

  function set(key, value) { setDraft(d => ({ ...d, [key]: value })); setSaved(false); }

  async function handleSave() {
    setSaving(true);
    try {
      await Promise.all(Object.entries(draft).map(([key, value]) => setSetting(key, value)));
      setSaved(true);
    } catch (e) { /* best effort */ }
    setSaving(false);
  }

  if (!draft) return null;

  return (
    <div className="bg-white border p-5 max-w-2xl space-y-4" style={{ borderColor: "#CFC4A3" }}>
      {!canEdit && <div className="text-xs px-3 py-2 mb-2 inline-block" style={{ background: "#F1EEE4", color: "#8a8168" }}>{t("read_only_notice", lang)}</div>}
      <div className="flex gap-2 mb-2">
        {["fr","en","pt"].map(l => (
          <button key={l} onClick={() => setActiveLang(l)} className="px-3 py-1 text-xs" style={{ background: activeLang === l ? "var(--vert-fonce)" : "#fff", color: activeLang === l ? "#fff" : "var(--vert-fonce)", border: "1px solid var(--vert-fonce)" }}>{l.toUpperCase()}</button>
        ))}
      </div>
      <p className="text-xs text-black/50">{t("email_vars_help", lang)}</p>
      <Field label={t("email_subject_label", lang)}>
        <input className="cb-input" disabled={!canEdit} value={draft[`email_subject_${activeLang}`]} onChange={e=>set(`email_subject_${activeLang}`, e.target.value)} />
      </Field>
      <Field label={t("email_body_label", lang)}>
        <textarea className="cb-input" rows={10} disabled={!canEdit} value={draft[`email_body_${activeLang}`]} onChange={e=>set(`email_body_${activeLang}`, e.target.value)} />
      </Field>
      {canEdit && (
        <div className="flex gap-2 items-center">
          <button onClick={handleSave} className="cb-btn text-sm" disabled={saving}>{t("save", lang)}</button>
          {saved && <span className="text-xs" style={{ color: "var(--vert-fonce)" }}>✓</span>}
        </div>
      )}
    </div>
  );
}

const EVENT_TYPE_OPTIONS = ["ag", "zone1", "zone2", "other"];
const EVENT_STATUS_OPTIONS = ["draft", "open", "closed", "archived"];
const EMPTY_LANG3 = { fr: "", en: "", pt: "" };

function emptyEventDraft() {
  return {
    type: "other", year: new Date().getFullYear(), code: "", edition: "",
    ordinal: { fr: "e", en: "", pt: "ª" },
    title: { ...EMPTY_LANG3 }, theme: { ...EMPTY_LANG3 }, subtitle: { ...EMPTY_LANG3 },
    date_short: { ...EMPTY_LANG3 }, month_year: { ...EMPTY_LANG3 }, venue: { ...EMPTY_LANG3 },
    city: "", country: "", status: "draft",
    badge_header: { ...EMPTY_LANG3 }, badge_background: "", badge_pdf: { ...EMPTY_LANG3 },
  };
}

function EventsManager({ lang, activeEventId, onActiveEventChanged, eventData }) {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  async function load() { setLoading(true); setItems(await listAllEvents()); setLoading(false); }
  useEffect(() => { load(); }, []);

  function set3(key, l, value) { setEditing(x => ({ ...x, [key]: { ...x[key], [l]: value } })); }

  async function save() {
    if (!editing.code) return;
    await upsertRow("events", editing);
    setEditing(null);
    await load();
    if (editing.id === activeEventId) onActiveEventChanged();
  }

  async function remove(id) {
    if (id === activeEventId) return;
    if (!window.confirm(t("confirm_delete", lang))) return;
    await deleteRow("events", id);
    load();
  }

  async function activate(id) {
    setBusyId(id);
    try { await setActiveEvent(id); await load(); onActiveEventChanged(); }
    catch (e) { setError(String(e.message || e)); }
    setBusyId(null);
  }

  async function duplicate(ev) {
    const newYear = window.prompt(t("duplicate_event_prompt_year", lang), String(ev.year + 1));
    if (!newYear) return;
    const newCode = window.prompt(t("duplicate_event_prompt_code", lang), ev.code.replace(/\d+$/, "") + (Number(ev.year) + 1 - 1984));
    if (!newCode) return;
    setBusyId(ev.id);
    try {
      await duplicateEvent(ev.id, Number(newYear), newCode);
      await load();
      window.alert(t("duplicate_event_success", lang));
    } catch (e) { setError(String(e.message || e)); }
    setBusyId(null);
  }

  const typeLabel = (ty) => t("event_type_" + ty, lang);
  const statusLabel = (s) => t("status_" + s, lang);

  return (
    <div>
      {error && <div className="text-sm px-3 py-2 mb-4" style={{ background: "#FBEAEA", color: "#8A2A2A" }}>{error}</div>}

      <div className="space-y-2 mb-6">
        {items.map(ev => (
          <div key={ev.id} className="flex items-center justify-between bg-white border px-4 py-3 flex-wrap gap-2" style={{ borderColor: "#CFC4A3" }}>
            <div>
              <div className="text-sm font-semibold flex items-center gap-2">
                {ev.title?.fr || ev.code} <span className="text-xs text-black/40 font-mono">{ev.code} · {ev.year}</span>
                {ev.id === activeEventId && <span className="text-[10px] px-1.5 py-0.5" style={{ background: "#EAF6EE", color: "var(--vert-fonce)" }}>{t("currently_active", lang)}</span>}
              </div>
              <div className="text-xs text-black/50">{typeLabel(ev.type)} · {statusLabel(ev.status)}</div>
            </div>
            <div className="flex items-center gap-2">
              {ev.id !== activeEventId && (
                <button onClick={() => activate(ev.id)} disabled={busyId === ev.id} className="cb-btn-outline text-xs py-1 px-2">{t("set_active_event", lang)}</button>
              )}
              <button onClick={() => duplicate(ev)} disabled={busyId === ev.id} className="cb-btn-outline text-xs py-1 px-2">{t("duplicate_event_btn", lang)}</button>
              <button onClick={() => setEditing({ ...ev })}><Pencil size={14} color="var(--vert-fonce)" /></button>
              {ev.id !== activeEventId && <button onClick={() => remove(ev.id)}><Trash2 size={14} color="#8A2A2A" /></button>}
            </div>
          </div>
        ))}
        {!loading && items.length === 0 && !editing && <p className="text-sm text-black/40">{t("no_items", lang)}</p>}
      </div>

      {editing ? (
        <div className="bg-white border p-5 max-w-2xl space-y-5" style={{ borderColor: "#CFC4A3" }}>
          <div className="grid sm:grid-cols-4 gap-3">
            <div>
              <label className="cb-label">{t("event_type_label", lang)}</label>
              <select className="cb-input" value={editing.type} onChange={e=>setEditing(x=>({ ...x, type: e.target.value }))}>
                {EVENT_TYPE_OPTIONS.map(ty => <option key={ty} value={ty}>{typeLabel(ty)}</option>)}
              </select>
            </div>
            <Field label={t("event_year_label", lang)}><input type="number" className="cb-input" value={editing.year} onChange={e=>setEditing(x=>({ ...x, year: Number(e.target.value) }))} /></Field>
            <Field label={t("event_code_label", lang)}><input className="cb-input font-mono" value={editing.code} onChange={e=>setEditing(x=>({ ...x, code: e.target.value.toUpperCase() }))} /></Field>
            <Field label={t("edition_number", lang)}><input className="cb-input" value={editing.edition || ""} onChange={e=>setEditing(x=>({ ...x, edition: e.target.value }))} /></Field>
          </div>
          <div>
            <label className="cb-label">{t("event_status_label", lang)}</label>
            <select className="cb-input" value={editing.status} onChange={e=>setEditing(x=>({ ...x, status: e.target.value }))}>
              {EVENT_STATUS_OPTIONS.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
            </select>
          </div>

          <div>
            <label className="cb-label">{t("ordinal_label", lang)}</label>
            <div className="grid grid-cols-3 gap-2">
              {["fr","en","pt"].map(l => <input key={l} className="cb-input" placeholder={l.toUpperCase()} value={editing.ordinal[l]} onChange={e=>set3("ordinal", l, e.target.value)} />)}
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <Field label={t("title_fr", lang)}><input className="cb-input" value={editing.title.fr} onChange={e=>set3("title","fr",e.target.value)} /></Field>
            <Field label={t("title_en", lang)}><input className="cb-input" value={editing.title.en} onChange={e=>set3("title","en",e.target.value)} /></Field>
            <Field label={t("title_pt", lang)}><input className="cb-input" value={editing.title.pt} onChange={e=>set3("title","pt",e.target.value)} /></Field>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label={t("subtitle_fr", lang)}><textarea className="cb-input" rows={3} value={editing.subtitle.fr} onChange={e=>set3("subtitle","fr",e.target.value)} /></Field>
            <Field label={t("subtitle_en", lang)}><textarea className="cb-input" rows={3} value={editing.subtitle.en} onChange={e=>set3("subtitle","en",e.target.value)} /></Field>
            <Field label={t("subtitle_pt", lang)}><textarea className="cb-input" rows={3} value={editing.subtitle.pt} onChange={e=>set3("subtitle","pt",e.target.value)} /></Field>
          </div>
          <div>
            <p className="text-xs text-black/50 mb-3">{t("hero_theme_help", lang)}</p>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label={t("theme_fr", lang)}><textarea className="cb-input" rows={3} value={editing.theme.fr} onChange={e=>set3("theme","fr",e.target.value)} /></Field>
              <Field label={t("theme_en", lang)}><textarea className="cb-input" rows={3} value={editing.theme.en} onChange={e=>set3("theme","en",e.target.value)} /></Field>
              <Field label={t("theme_pt", lang)}><textarea className="cb-input" rows={3} value={editing.theme.pt} onChange={e=>set3("theme","pt",e.target.value)} /></Field>
            </div>
          </div>

          <div>
            <label className="cb-label mb-1 block">{t("date_short_label", lang)}</label>
            <div className="grid sm:grid-cols-3 gap-3 mb-3">
              {["fr","en","pt"].map(l => <input key={l} className="cb-input" placeholder={l.toUpperCase()} value={editing.date_short[l]} onChange={e=>set3("date_short", l, e.target.value)} />)}
            </div>
            <label className="cb-label mb-1 block">{t("month_year_label", lang)}</label>
            <div className="grid sm:grid-cols-3 gap-3 mb-3">
              {["fr","en","pt"].map(l => <input key={l} className="cb-input" placeholder={l.toUpperCase()} value={editing.month_year[l]} onChange={e=>set3("month_year", l, e.target.value)} />)}
            </div>
            <label className="cb-label mb-1 block">{t("venue_label", lang)}</label>
            <div className="grid sm:grid-cols-3 gap-3">
              {["fr","en","pt"].map(l => <input key={l} className="cb-input" placeholder={l.toUpperCase()} value={editing.venue[l]} onChange={e=>set3("venue", l, e.target.value)} />)}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={t("city_label", lang)}><input className="cb-input" value={editing.city || ""} onChange={e=>setEditing(x=>({ ...x, city: e.target.value }))} /></Field>
            <Field label={t("country_label", lang)}><input className="cb-input" value={editing.country || ""} onChange={e=>setEditing(x=>({ ...x, country: e.target.value }))} /></Field>
          </div>

          <div className="border-t pt-5" style={{ borderColor: "#E7DCC2" }}>
            <div className="cb-label mb-3">{t("badge_header_tab", lang)}</div>
            <div className="grid sm:grid-cols-3 gap-3 mb-4">
              {["fr","en","pt"].map(l => <input key={l} className="cb-input" placeholder={l.toUpperCase()} value={editing.badge_header[l]} onChange={e=>set3("badge_header", l, e.target.value)} />)}
            </div>
            <div className="mb-4">
              <ImageUploader lang={lang} value={editing.badge_background} onChange={url => setEditing(x => ({ ...x, badge_background: url }))} folder="badges" />
              <div className="cb-label mt-1">{t("badge_background_label", lang)}</div>
            </div>
            <div>
              <div className="cb-label mb-2">{t("badge_pdf_label", lang)}</div>
              <div className="grid sm:grid-cols-3 gap-3">
                <FileUploader lang={lang} value={editing.badge_pdf.fr} onChange={url => set3("badge_pdf","fr",url)} folder="badge-pdf" label="FR" />
                <FileUploader lang={lang} value={editing.badge_pdf.en} onChange={url => set3("badge_pdf","en",url)} folder="badge-pdf" label="EN" />
                <FileUploader lang={lang} value={editing.badge_pdf.pt} onChange={url => set3("badge_pdf","pt",url)} folder="badge-pdf" label="PT" />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={save} className="cb-btn text-sm">{t("save", lang)}</button>
            <button onClick={() => setEditing(null)} className="cb-btn-outline text-sm">{t("cancel", lang)}</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setEditing(emptyEventDraft())} className="cb-btn text-sm"><Plus size={15} /> {t("add_new", lang)}</button>
      )}
    </div>
  );
}

function ArchivesPage({ lang, setView }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => { setEvents(await listArchivedEvents()); setLoading(false); })();
  }, []);

  const typeLabel = (ty) => t("event_type_" + ty, lang);

  return (
    <div className="max-w-4xl mx-auto px-5 py-14">
      <h2 className="font-display font-semibold text-2xl mb-8" style={{ color: "var(--navy)" }}>{t("archives_title", lang)}</h2>
      {!loading && events.length === 0 && <p className="text-black/50 text-sm">{t("no_archived_events", lang)}</p>}
      <div className="space-y-4">
        {events.map(ev => (
          <div key={ev.id} className="bg-white border p-5 flex flex-wrap items-center justify-between gap-3" style={{ borderColor: "#CFC4A3" }}>
            <div>
              <div className="cb-label mb-1">{typeLabel(ev.type)} · {ev.year}</div>
              <div className="font-display font-semibold text-lg" style={{ color: "var(--navy)" }}>{ev.title?.[lang] || ev.title?.fr}</div>
              <div className="text-sm text-black/60 mt-1 flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1"><Calendar size={13} /> {ev.date_short?.[lang]} {ev.month_year?.[lang]}</span>
                <span className="flex items-center gap-1"><MapPin size={13} /> {ev.city}, {ev.country}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-10">
        <button onClick={() => setView("public")} className="cb-btn-outline text-sm">{t("back_home", lang)}</button>
      </div>
    </div>
  );
}
