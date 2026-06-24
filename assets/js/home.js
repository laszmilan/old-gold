/* OLD GOLD — home / landing page. The site root, and the one place the site
   makes its calls to action. */

const I18N = Site.i18n({
  en: {
    skip: "Skip to content",
    homeTagline: "A fantasy adventure game of daring exploration, creative problem-solving, and fast-paced tactical combat.",
    homeRead: "Read the rulebook",
    homeDiscord: "Join the Discord",
    homeItch: "Get it on itch.io",
    homeArt: "Cover art coming soon",
    homeFree: "Pay what you want on itch.io",
  },
  hu: {
    skip: "Ugrás a tartalomhoz",
    homeTagline: "Fantasy kalandjáték a merész felfedezésről, a kreatív problémamegoldásról és a pörgős, taktikus harcról.",
    homeRead: "Szabálykönyv olvasása",
    homeDiscord: "Csatlakozz a Discordhoz",
    homeItch: "Töltsd le az itch.io-n",
    homeArt: "A borító hamarosan",
    homeFree: "Fizess annyit, amennyit szeretnél az itch.io-n",
  },
});

/* wire the CTAs from the central config; a CTA with no configured link is
   removed outright (a class-set display would defeat [hidden], so we remove) */
const setHref = (id, href) => {
  const el = document.getElementById(id);
  if (!el) return;
  if (href) el.href = href;
  else el.remove();
};
setHref("discordLink", CONFIG.discord);
setHref("itchLink", CONFIG.itch);
const emailLink = document.getElementById("emailLink");
if (emailLink) {
  if (CONFIG.email) { emailLink.href = "mailto:" + CONFIG.email; emailLink.textContent = CONFIG.email; }
  else emailLink.closest(".hero-contact").remove();
}

function applyLang(lang) {
  document.documentElement.lang = lang;
  Site.store("og-lang", lang);
  Site.applyStrings(I18N[lang] || I18N.en);
}

Site.setupTabs();
Site.onLang(applyLang);
applyLang(Site.startLang(I18N));
