const translations = {
  fr: {
    hero_title: "Transformez votre idée en serveur DayZ prêt à jouer."
  },
  en: {
    hero_title: "Turn your idea into a ready-to-play DayZ server"
  },
  de: {
    hero_title: "Verwandle deine Idee in einen spielbereiten DayZ-Server"
  }
};

function setLanguage(lang) {
  localStorage.setItem("dml_lang", lang);

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (translations[lang] && translations[lang][key]) {
      el.textContent = translations[lang][key];
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const savedLang = localStorage.getItem("dml_lang") || "fr";
  setLanguage(savedLang);

  document.querySelectorAll("[data-lang]").forEach(btn => {
    btn.addEventListener("click", () => {
      setLanguage(btn.getAttribute("data-lang"));
    });
  });
});