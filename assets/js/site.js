/* OLD GOLD — shared page chrome: localStorage, the top-bar i18n applier,
   the language switch, and the collapsible nav menu. Loaded before each
   page's own script, which supplies its page-specific strings + behavior. */

const Site = (() => {
  /* localStorage wrappers — no-op in private mode */
  const store  = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} };
  const recall = (k)    => { try { return localStorage.getItem(k); } catch (e) { return null; } };

  /* strings shared by the top bar on every page; a page merges its own over these */
  const CHROME = {
    en: {
      tabHome: "Home", tabRules: "Rulebook", tabGenerators: "Generators",
      primaryNav: "Primary", langGroup: "Language",
    },
    hu: {
      tabHome: "Kezdőlap", tabRules: "Szabálykönyv", tabGenerators: "Generátorok",
      primaryNav: "Fő navigáció", langGroup: "Nyelv",
    },
  };

  /* fold a page's per-language strings onto the shared chrome strings */
  const i18n = (page = {}) => ({
    en: { ...CHROME.en, ...page.en },
    hu: { ...CHROME.hu, ...page.hu },
  });

  /* swap the static UI strings (and language-button state) to match `t` */
  function applyStrings(t) {
    document.querySelectorAll("[data-i18n]").forEach(el => {
      if (t[el.dataset.i18n] != null) el.textContent = t[el.dataset.i18n];
    });
    document.querySelectorAll("[data-i18n-html]").forEach(el => {
      if (t[el.dataset.i18nHtml] != null) el.innerHTML = t[el.dataset.i18nHtml];
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(el => {
      if (t[el.dataset.i18nAria] != null) el.setAttribute("aria-label", t[el.dataset.i18nAria]);
    });
    document.querySelectorAll(".lang-btn").forEach(btn => {
      btn.setAttribute("aria-pressed", String(btn.dataset.lang === document.documentElement.lang));
    });
  }

  /* the live language is the source of truth on <html lang> */
  const lang = () => document.documentElement.lang || "en";
  const startLang = (dict) => { const s = recall("og-lang"); return dict[s] ? s : "en"; };

  /* wire the language buttons; `handler(lang)` runs only on a real change */
  function onLang(handler) {
    document.querySelectorAll(".lang-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        if (btn.dataset.lang !== lang()) handler(btn.dataset.lang);
      });
    });
  }

  /* shared contents sidebar: the desktop collapse (persisted via og-collapsed)
     and the mobile drawer, wired to the hamburger (#navToggle), the scrim
     (#scrim), and Escape. Each page adds its own link-click behavior through the
     returned handle. Returns null on pages without a toggle (e.g. home). */
  function sidebar() {
    const body = document.body;
    const navToggle = document.getElementById("navToggle");
    if (!navToggle) return null;
    const scrim = document.getElementById("scrim");
    const mobile = window.matchMedia("(max-width: 820px)");

    const isOpen = () => mobile.matches
      ? body.classList.contains("nav-open")
      : !body.classList.contains("sidebar-collapsed");
    const syncExpanded = () => navToggle.setAttribute("aria-expanded", String(isOpen()));

    const open = () => {
      if (mobile.matches) body.classList.add("nav-open");
      else { body.classList.remove("sidebar-collapsed"); store("og-collapsed", null); }
      syncExpanded();
    };
    const close = () => {
      if (mobile.matches) body.classList.remove("nav-open");
      else if (!body.classList.contains("sidebar-collapsed")) {
        body.classList.add("sidebar-collapsed"); store("og-collapsed", "1");
      }
      syncExpanded();
    };
    /* desktop-only: hide the panel for this view without saving the preference */
    const collapseTransient = () => { body.classList.add("sidebar-collapsed"); syncExpanded(); };

    navToggle.addEventListener("click", () => (isOpen() ? close() : open()));
    if (scrim) scrim.addEventListener("click", close);
    document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
    mobile.addEventListener("change", () => { body.classList.remove("nav-open"); syncExpanded(); });
    syncExpanded();
    // the saved collapsed state is applied pre-paint by each page's inline boot script

    return { isOpen, open, close, collapseTransient, isMobile: () => mobile.matches };
  }

  /* primary nav: an expandable menu on the smallest phones (CSS-gated) */
  function setupTabs() {
    const toggle = document.getElementById("tabsToggle");
    const nav = document.querySelector(".tabs");
    if (!toggle || !nav) return;
    const close = () => { nav.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); };
    toggle.addEventListener("click", e => {
      e.stopPropagation();
      toggle.setAttribute("aria-expanded", String(nav.classList.toggle("open")));
    });
    nav.addEventListener("click", e => { if (e.target.closest(".tab")) close(); });
    document.addEventListener("click", e => { if (!nav.contains(e.target)) close(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  }

  return { store, recall, i18n, applyStrings, lang, startLang, onLang, setupTabs, sidebar };
})();
