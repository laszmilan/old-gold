/* OLD GOLD — rulebook renderer. Fetches the per-language markdown, renders it
   with marked.js, then builds the TOC, scroll-spy, and contents drawer.
   Needs http (Live Server / Pages); file:// is blocked — see showLoadError. */

const LANGS = { en: "content/old-gold-en.md", hu: "content/old-gold-hu.md" };

const I18N = Site.i18n({
  en: {
    skip: "Skip to the rules",
    titleSuffix: "Rules",
    navToggle: "Toggle contents", toc: "Table of contents",
  },
  hu: {
    skip: "Ugrás a szabályokhoz",
    titleSuffix: "Szabályok",
    navToggle: "Tartalom megnyitása", toc: "Tartalomjegyzék",
  },
});

const docEl = document.getElementById("doc");
const tocEl = document.getElementById("toc");

marked.setOptions({ gfm: true, breaks: true });

Site.setupTabs();
Site.onLang(loadLang);
setupChrome();
loadLang(Site.startLang(I18N));

/* fetch + render one language */
async function loadLang(lang) {
  document.documentElement.lang = lang;
  const t = I18N[lang] || I18N.en;
  Site.applyStrings(t);

  let markdown;
  try {
    const res = await fetch(LANGS[lang]);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    markdown = await res.text();
  } catch (err) {
    showLoadError(err, lang);
    return;
  }
  Site.store("og-lang", lang);
  render(markdown);
}

let firstRender = true;

function render(markdown) {
  docEl.innerHTML = marked.parse(markdown.trim());

  const headings = prepareHeadings();
  enhanceTables();
  enhanceStatBlocks();
  markRuleParagraphs();
  // markChapterOpeners();   // drop caps OFF for now (function + CSS kept; re-enable here)
  buildToc(headings);
  setDocTitle();
  setupScrollSpy(headings);

  // honor a #deep-link once the content exists — the browser's native anchor
  // jump ran before the fetch finished, so it found nothing to scroll to
  if (firstRender && location.hash) {
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) target.scrollIntoView({ behavior: "instant", block: "start" });
  }
  firstRender = false;
}

/* stable ids + hover § anchors for h2/h3 */
function prepareHeadings() {
  const used = new Set();
  const headings = [...docEl.querySelectorAll("h2, h3")];
  headings.forEach(h => {
    if (!h.id) h.id = slug(h.textContent, used);
    const anchor = document.createElement("a");
    anchor.className = "heading-anchor";
    anchor.href = "#" + h.id;
    anchor.setAttribute("aria-hidden", "true");
    anchor.tabIndex = -1;
    anchor.textContent = "§";
    h.prepend(anchor);
  });
  return headings;
}

const slug = (s, used) => {
  let base = s.toLowerCase().trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-") || "section";
  let id = base, n = 2;
  while (used.has(id)) id = base + "-" + (n++);
  used.add(id);
  return id;
};

/* wrap tables so wide ones scroll instead of overflowing */
function enhanceTables() {
  docEl.querySelectorAll("table").forEach(table => {
    const wrap = document.createElement("div");
    wrap.className = "table-wrap";
    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(table);
  });
}

/* monster / NPC stat blocks: leave the source paragraph exactly as written and
   just wrap it in the grey box (any emphasis lives in the Markdown) */
function enhanceStatBlocks() {
  docEl.querySelectorAll("p").forEach(p => {
    const html = p.innerHTML;
    if (!/^\s*<strong>[\s\S]*?<\/strong>\s*HP\b/.test(html)) return;
    if (!/\bDP\b/.test(html) || !/\bMorale\b/.test(html) || !/\bNA\b/.test(html)) return;
    p.classList.add("statblock");
  });
}

/* tag run-in "rule label" paragraphs (e.g. "DYING. ...") for distinct styling */
function markRuleParagraphs() {
  docEl.querySelectorAll("p").forEach(p => {
    if (p.classList.contains("statblock")) return;
    const strong = p.firstElementChild;
    if (strong && strong.tagName === "STRONG" && strong === p.firstChild) {
      const label = strong.textContent.trim();
      if (label.length <= 40 && /[.:]$/.test(label)) p.classList.add("rule");
    }
  });
}

/* drop cap on a chapter's opening paragraph — but only when it's a real prose
   lead-in (long enough, plain text), never a run-in rule label, stat block, or
   a chapter that jumps straight to a sub-heading / table / list */
function markChapterOpeners() {
  docEl.querySelectorAll("h2").forEach(h => {
    const p = h.nextElementSibling;
    if (!p || p.tagName !== "P") return;
    if (p.classList.contains("rule") || p.classList.contains("statblock")) return;
    if (!/^[A-Za-z]/.test(p.textContent.trim())) return;   // need a letter to cap
    if (p.textContent.trim().length >= 120) p.classList.add("dropcap");
  });
}

function buildToc(headings) {
  tocEl.innerHTML = "";
  const ol = document.createElement("ol");

  // the masthead leads the contents as chapter 01, so the front-matter sections
  // (the h3s before the first chapter) nest under the book title instead of
  // floating above CHARACTER CREATION as orphaned sub-entries
  const h1 = docEl.querySelector("h1");
  if (h1) {
    if (!h1.id) h1.id = slug(h1.textContent, new Set());
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = "#" + h1.id;
    a.textContent = h1.textContent.trim();
    a.className = "lvl-2";
    a.dataset.target = h1.id;
    li.appendChild(a);
    ol.appendChild(li);
  }

  headings.forEach(h => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = "#" + h.id;
    a.textContent = h.textContent.replace(/^§/, "").trim();   // drop the § glyph
    a.className = h.tagName === "H2" ? "lvl-2" : "lvl-3";
    a.dataset.target = h.id;
    li.appendChild(a);
    ol.appendChild(li);
  });
  tocEl.appendChild(ol);
}

function setDocTitle() {
  const h1 = docEl.querySelector("h1");
  const suffix = (I18N[Site.lang()] || I18N.en).titleSuffix;
  if (h1) document.title = h1.textContent + " — " + suffix;
}

/* scroll-spy: highlight the chapter you're reading */
function setupScrollSpy(headings) {
  const links = new Map([...tocEl.querySelectorAll("a")].map(a => [a.dataset.target, a]));
  let current = null;
  const setActive = id => {
    if (id === current) return;
    links.forEach(a => a.classList.remove("active"));
    const a = links.get(id);
    if (a) { a.classList.add("active"); current = id; a.scrollIntoView({ block: "nearest" }); }
  };

  const spy = new IntersectionObserver((entries) => {
    const visible = entries.filter(e => e.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (visible.length) setActive(visible[0].target.id);
  }, { root: document.getElementById("scrollarea"), rootMargin: "0px 0px -70% 0px", threshold: 0 });
  // observe the masthead too, so "00" lights up while you're at the top
  const h1 = docEl.querySelector("h1");
  const spied = h1 ? [h1, ...headings] : headings;
  spied.forEach(h => spy.observe(h));
  if (spied[0]) setActive(spied[0].id);
}

/* contents toggle — unified panel behavior (toggle, scrim, Escape,
   click-to-dismiss, close-on-select-when-covering-the-text) lives in Site.sidebar */
function setupChrome() {
  Site.sidebar({ content: document.querySelector("main"), selectLinks: tocEl });
}

/* friendly message if the file can't be fetched — the Live Server hint is for
   local file:// viewing only; visitors on the live site get a retry instead */
function showLoadError(err, lang) {
  const esc = s => String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const hint = location.protocol === "file:"
    ? `This page reads the rulebook from a local file, which browsers only allow
       when the site is served over <strong>http</strong>, not opened directly
       from disk.<br><br>
       <strong>To view it:</strong> in VS Code, install the
       <strong>Live Server</strong> extension, then right-click
       <code>index.html</code> → <strong>Open with Live Server</strong>.`
    : `This is usually a connection hiccup.
       <button class="inline-link" type="button" data-retry>Try again</button>`;
  docEl.innerHTML = `
    <h1>OLD GOLD</h1>
    <p class="doc-status">
      <strong>Couldn't load the rulebook (<code>${esc(LANGS[lang])}</code>).</strong><br><br>
      ${hint}<br><br>
      <span style="opacity:.7">(${esc(err.message)})</span>
    </p>`;
  const retry = docEl.querySelector("[data-retry]");
  if (retry) retry.addEventListener("click", () => loadLang(lang));
}
