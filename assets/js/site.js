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
    document.querySelectorAll("[data-i18n-aria]").forEach(el => {
      if (t[el.dataset.i18nAria] != null) el.setAttribute("aria-label", t[el.dataset.i18nAria]);
    });
    document.querySelectorAll(".lang-btn").forEach(btn => {
      btn.setAttribute("aria-pressed", String(btn.dataset.lang === document.documentElement.lang));
    });
  }

  /* the live language is the source of truth on <html lang> */
  const lang = () => document.documentElement.lang || "en";
  /* restore the stored language only while its switch button is enabled
     (HU is disabled for now, so a stored "hu" falls back to English) */
  const startLang = (dict) => {
    const s = recall("og-lang");
    const btn = document.querySelector(`.lang-btn[data-lang="${s}"]`);
    return dict[s] && btn && !btn.disabled ? s : "en";
  };

  /* wire the language buttons; `handler(lang)` runs only on a real change */
  function onLang(handler) {
    document.querySelectorAll(".lang-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        if (btn.dataset.lang !== lang()) handler(btn.dataset.lang);
      });
    });
  }

  /* shared contents sidebar — one behavior for the rulebook TOC and the
     generators list. The panel is a fixed overlay at every width. On wide
     desktops (≥88rem, where the centered reading column clears the panel) it
     starts open — a rulebook's contents are primary navigation — unless the
     user's last hamburger click said otherwise (og-toc). Narrower screens
     start closed. Pass the page's content element and its list of item links
     so the shared rules below can be wired uniformly:

       - the hamburger (#navToggle) toggles it (and records the choice);
         Escape and the scrim close it
       - clicking into the content closes it (on mobile the drawer overlays the
         page; on desktop it's the "done with the menu" gesture)
       - selecting an item closes it only while the panel covers the text — the
         mobile drawer, or a desktop window too narrow (<88rem) for the centered
         reading column to clear the panel; on a wide screen it stays open

     Returns null on pages without a toggle (e.g. home). */
  function sidebar({ content, selectLinks } = {}) {
    const body = document.body;
    const navToggle = document.getElementById("navToggle");
    if (!navToggle) return null;
    const scrim = document.getElementById("scrim");
    const mobile   = window.matchMedia("(max-width: 820px)");  // slide-in drawer + scrim
    const overlaps = window.matchMedia("(max-width: 88rem)");  // open panel covers the centered sheet (20rem panel vs a ~44.5rem sheet)

    const isOpen = () => mobile.matches
      ? body.classList.contains("nav-open")
      : !body.classList.contains("sidebar-collapsed");
    const syncExpanded = () => navToggle.setAttribute("aria-expanded", String(isOpen()));

    const open = () => {
      if (mobile.matches) body.classList.add("nav-open");
      else body.classList.remove("sidebar-collapsed");
      syncExpanded();
    };
    const close = () => {
      if (mobile.matches) body.classList.remove("nav-open");
      else body.classList.add("sidebar-collapsed");
      syncExpanded();
    };

    /* desktop start state: never start open where the panel would cover the
       centered sheet (<88rem), whatever the stored choice — an open panel over
       the text is the one state to avoid on load. Above that width the sheet
       clears the panel, so the user's last explicit choice wins, defaulting to
       open (a rulebook's contents are primary navigation) */
    if (!mobile.matches) {
      const pref = recall("og-toc");
      body.classList.toggle("sidebar-collapsed", overlaps.matches || (pref ? pref !== "open" : false));
    }

    navToggle.addEventListener("click", () => {
      const opening = !isOpen();
      opening ? open() : close();
      if (!mobile.matches) store("og-toc", opening ? "open" : "closed");
    });
    if (scrim) scrim.addEventListener("click", close);
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && isOpen()) { close(); navToggle.focus(); }
    });
    mobile.addEventListener("change", () => { body.classList.remove("nav-open"); syncExpanded(); });

    if (content) content.addEventListener("click", () => { if (isOpen()) close(); });
    if (selectLinks) selectLinks.addEventListener("click", e => {
      if (e.target.closest("a") && overlaps.matches) close();
    });

    syncExpanded();
    return { isOpen, open, close, isMobile: () => mobile.matches };
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
