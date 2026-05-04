const translations = {
  fr: {
    hero_title: "Transformez votre idée en serveur DayZ prêt à jouer.",
    hero_subtitle: "DayZ Mapping Lab accompagne les créateurs de serveurs avec des mappings personnalisés, des configurations propres, des bots Discord et des serveurs Discord complets.",
    cta_packs: "Voir les offres",
    cta_quote: "Demander un devis",
    trust_text: "Paiement sécurisé • Devis verrouillé • Livraison selon validation du projet",

    nav_services: "Services",
    nav_packs: "Packs",
    nav_quote: "Devis",
    nav_process: "Process",
    nav_pay_quote: "Payer un devis",
    nav_contact: "Contact",

    services_title: "Nos services",
    packs_title: "Nos packs",
    process_title: "Comment ça marche",
    contact_title: "Parlez-nous de votre projet",

    mapping_title: "Mapping DayZ sur mesure",
    bot_title: "Bots Discord personnalisés",
    discord_setup_title: "Création serveur Discord complet",
    files_title: "Codage fichiers serveur",
    premium_title: "Accès Premium",

    form_name: "Nom",
    form_email: "Email",
    form_discord: "Pseudo ou ID Discord",
    form_budget: "Budget estimé",
    form_message: "Décrivez votre projet",
    form_submit: "Envoyer la demande"
  },

  en: {
    hero_title: "Turn your idea into a ready-to-play DayZ server.",
    hero_subtitle: "DayZ Mapping Lab helps server creators with custom mapping, clean configurations, Discord bots and complete Discord servers.",
    cta_packs: "View offers",
    cta_quote: "Request a quote",
    trust_text: "Secure payment • Locked quote • Delivery after project validation",

    nav_services: "Services",
    nav_packs: "Packs",
    nav_quote: "Quote",
    nav_process: "Process",
    nav_pay_quote: "Pay a quote",
    nav_contact: "Contact",

    services_title: "Our services",
    packs_title: "Our packs",
    process_title: "How it works",
    contact_title: "Tell us about your project",

    mapping_title: "Custom DayZ Mapping",
    bot_title: "Custom Discord Bots",
    discord_setup_title: "Complete Discord Server Setup",
    files_title: "Server File Coding",
    premium_title: "Premium Access",

    form_name: "Name",
    form_email: "Email",
    form_discord: "Discord username or ID",
    form_budget: "Estimated budget",
    form_message: "Describe your project",
    form_submit: "Send request"
  },

  de: {
    hero_title: "Verwandle deine Idee in einen spielbereiten DayZ-Server.",
    hero_subtitle: "DayZ Mapping Lab unterstützt Server-Ersteller mit individuellem Mapping, sauberer Konfiguration, Discord-Bots und kompletten Discord-Servern.",
    cta_packs: "Angebote ansehen",
    cta_quote: "Angebot anfragen",
    trust_text: "Sichere Zahlung • Festes Angebot • Lieferung nach Projektbestätigung",

    nav_services: "Leistungen",
    nav_packs: "Pakete",
    nav_quote: "Angebot",
    nav_process: "Ablauf",
    nav_pay_quote: "Angebot bezahlen",
    nav_contact: "Kontakt",

    services_title: "Unsere Leistungen",
    packs_title: "Unsere Pakete",
    process_title: "So funktioniert es",
    contact_title: "Erzähl uns von deinem Projekt",

    mapping_title: "Individuelles DayZ-Mapping",
    bot_title: "Individuelle Discord-Bots",
    discord_setup_title: "Komplette Discord-Server-Erstellung",
    files_title: "Serverdateien konfigurieren",
    premium_title: "Premium-Zugang",

    form_name: "Name",
    form_email: "E-Mail",
    form_discord: "Discord-Name oder ID",
    form_budget: "Geschätztes Budget",
    form_message: "Beschreibe dein Projekt",
    form_submit: "Anfrage senden"
  },

  es: {
    hero_title: "Convierte tu idea en un servidor DayZ listo para jugar.",
    hero_subtitle: "DayZ Mapping Lab ayuda a creadores de servidores con mappings personalizados, configuraciones limpias, bots de Discord y servidores Discord completos.",
    cta_packs: "Ver ofertas",
    cta_quote: "Solicitar presupuesto",
    trust_text: "Pago seguro • Presupuesto bloqueado • Entrega tras validación del proyecto",

    nav_services: "Servicios",
    nav_packs: "Packs",
    nav_quote: "Presupuesto",
    nav_process: "Proceso",
    nav_pay_quote: "Pagar presupuesto",
    nav_contact: "Contacto",

    services_title: "Nuestros servicios",
    packs_title: "Nuestros packs",
    process_title: "Cómo funciona",
    contact_title: "Cuéntanos tu proyecto",

    mapping_title: "Mapping DayZ personalizado",
    bot_title: "Bots Discord personalizados",
    discord_setup_title: "Creación completa de servidor Discord",
    files_title: "Configuración de archivos del servidor",
    premium_title: "Acceso Premium",

    form_name: "Nombre",
    form_email: "Email",
    form_discord: "Usuario o ID de Discord",
    form_budget: "Presupuesto estimado",
    form_message: "Describe tu proyecto",
    form_submit: "Enviar solicitud"
  }
};

function setLanguage(lang) {
  if (!translations[lang]) lang = "fr";

  localStorage.setItem("dml_lang", lang);

  document.documentElement.lang = lang;

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (translations[lang][key]) {
      el.textContent = translations[lang][key];
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (translations[lang][key]) {
      el.placeholder = translations[lang][key];
    }
  });

  document.querySelectorAll(".language-switcher button").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-lang") === lang);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const savedLang = localStorage.getItem("dml_lang") || "fr";
  setLanguage(savedLang);

  document.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setLanguage(btn.getAttribute("data-lang"));
    });
  });
});