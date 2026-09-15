'use strict';
/* Renders content/*.md into the finished pages: index.html, hu/index.html,
   rulebook.html (a redirect), 404.html and sitemap.xml.

     node build.js
*/

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const CONFIG = require('./config.js');
const { marked } = require('./vendor/marked.min.js');

const LANGS = {
  en: { file: 'content/old-gold-en.md', dir: '', out: 'index.html' },
  hu: { file: 'content/old-gold-hu.md', dir: 'hu', out: 'index.html' },
};

const STRINGS = {
  en: {
    other: 'hu', otherName: 'Magyar', otherPath: 'hu/',
    contents: 'Contents', close: 'Close', skip: 'Skip to the rules', rules: 'Rulebook',
    title: 'Old Gold — a fantasy adventure game',
    description: 'A fantasy adventure game of daring exploration, creative problem-solving, and fast-paced tactical combat, with OSR roots and modern design. Read the full rulebook online, free.',
    ogDescription: 'A fantasy adventure game with OSR roots and modern design. Read the full rulebook online, free.',
    read: 'Read the rulebook',
    note: 'The full rulebook is free to read online. To support it, download the character sheet on itch.io and pay what you want.',
    publisher: 'Tiny Raven Press', license: 'Text licensed under CC BY 4.0',
    coverAlt: 'A dragon curled asleep atop a hoard of gold coins',
    seeWord: 'see', example: 'Example',
    notFound: 'Page not found',
    notFoundLead: 'Whatever was here has been moved, buried, or never existed.',
    notFoundBack: 'Back to the entrance',
    redirect: 'The rulebook has moved to the front page.',
  },
  hu: {
    other: 'en', otherName: 'English', otherPath: '',
    contents: 'Tartalom', close: 'Bezárás', skip: 'Ugrás a szabályokhoz', rules: 'Szabálykönyv',
    title: 'Old Gold — fantasy kalandjáték',
    description: 'Fantasy kalandjáték a merész felfedezésről, a kreatív problémamegoldásról és a pörgős, taktikus harcról. A teljes szabálykönyv ingyen olvasható online.',
    ogDescription: 'Fantasy kalandjáték OSR gyökerekkel és modern tervezéssel. A teljes szabálykönyv ingyen olvasható online.',
    read: 'Szabálykönyv olvasása',
    note: 'A teljes szabálykönyv ingyen olvasható online. Ha támogatnád, töltsd le a karakterlapot az itch.io-n, és fizess annyit, amennyit szeretnél.',
    publisher: 'Tiny Raven Press', license: 'A szöveg CC BY 4.0 licenc alatt',
    coverAlt: 'Egy sárkány alszik összegömbölyödve egy aranyhalmon',
    seeWord: 'lásd', example: 'Példa',
    notFound: 'Nincs ilyen oldal',
    notFoundLead: 'Ami itt volt, azt elvitték, eltemették, vagy sosem létezett.',
    notFoundBack: 'Vissza a bejárathoz',
    redirect: 'A szabálykönyv átköltözött a nyitóoldalra.',
  },
};

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const decode = s => String(s).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function slug(s, used) {
  let base = s.toLowerCase().trim().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-').replace(/-+/g, '-') || 'section';
  let id = base, n = 2;
  while (used.has(id)) id = base + '-' + (n++);
  used.add(id);
  return id;
}

/* the source headings are ALL CAPS: English title case, Hungarian sentence case */
const SMALL = new Set(['of', 'and', 'the', 'a', 'an', 'to', 'in', 'on', 'for', '&', 'at', 'by', 'with', 'or']);
function titleCase(s, lang) {
  const lower = s.toLowerCase();
  if (lang === 'hu') return lower.charAt(0).toUpperCase() + lower.slice(1);
  return lower.split(' ').map((w, i) => {
    if (/^d\d+$/.test(w)) return w;
    if (i > 0 && SMALL.has(w)) return w;
    return w.split('/').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('/');
  }).join(' ');
}

function pngSize(file) {
  try { const b = fs.readFileSync(file); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; }
  catch (e) { return null; }
}

/* right-align columns holding only numbers, dice, ranges or prices */
const NUMERIC = /^\s*(\d[\d,.]*|\d*d\d+(\s*[+×x]\s*\d+)?|\d[\d,]*\s*[–-]\s*\d[\d,]*|—|-)?\s*(gp)?\s*$/;
function markNumericColumns(table) {
  const rows = [...table.matchAll(/<tr>([\s\S]*?)<\/tr>/g)]
    .map(r => [...r[1].matchAll(/<(t[dh])[^>]*>([\s\S]*?)<\/\1>/g)].map(c => decode(c[2]).replace(/<[^>]+>/g, '')));
  const body = rows.slice(1);
  if (!body.length) return table;
  const ncols = Math.max(...rows.map(r => r.length));
  const numeric = [];
  for (let c = 0; c < ncols; c++) numeric[c] = body.every(r => r[c] === undefined || NUMERIC.test(r[c]));
  if (!numeric.some(Boolean)) return table;
  return table.replace(/<tr>([\s\S]*?)<\/tr>/g, (m, inner) => {
    let c = 0;
    return '<tr>' + inner.replace(/<(t[dh])([^>]*)>/g, (cm, tag, attrs) => (numeric[c++] ? `<${tag}${attrs} class="numeric">` : cm)) + '</tr>';
  });
}

function renderDoc(md, lang, assets, idMap) {
  marked.setOptions({ gfm: true, breaks: true });
  let html = marked.parse(md.trim());

  /* the title and the italic pitch come out of the flow; the cover places them */
  let title = 'Old Gold', deck = '';
  html = html.replace(/^<h1>([\s\S]*?)<\/h1>\s*(?:<p><em>([\s\S]*?)<\/em><\/p>\s*)?/, (m, t, d) => {
    title = titleCase(decode(t), 'en');
    deck = d || '';
    return '';
  });

  /* idMap reuses the English ids position by position, so the language switch
     keeps the reader's place */
  const toc = [], used = new Set();
  let chap = 0, sec = 0;
  html = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (m, lvl, text) => {
    const raw = decode(text).trim();
    if (lvl === '2') { chap++; sec = 0; } else { sec++; }
    const number = lvl === '2' ? String(chap) : `${chap}.${sec}`;
    const idx = toc.length;
    let id;
    if (idMap && idMap[idx] && idMap[idx].level === +lvl) { id = idMap[idx].id; used.add(id); }
    else id = slug(raw, used);
    const t = titleCase(raw, lang);
    toc.push({ level: +lvl, number, id, title: t });
    return `<h${lvl} id="${id}"><span class="num">${number}</span><span class="t">${esc(t)}</span></h${lvl}>`;
  });

  html = html.replace(/<p>(<strong>[^<]*<\/strong>)([\s\S]*?)<\/p>/g, (m, strong, rest) => {
    const label = strong.replace(/<\/?strong>/g, '').trim();
    const isStat = /^\s*HP\b/.test(rest) && /\bDP\b/.test(rest) && /\b(Morale|Morál)\b/.test(rest) && /\bNA\b/.test(rest);
    if (isStat) return `<p class="statblock">${strong}${rest}</p>`;
    if (label.length <= 40 && /[.:]$/.test(label)) return `<p class="rule">${strong}${rest}</p>`;
    return m;
  });

  html = html.replace(/<blockquote>/g, '<aside class="example">').replace(/<\/blockquote>/g, '</aside>');
  html = html.replace(/<table>[\s\S]*?<\/table>/g, t => `<div class="table-wrap">${markNumericColumns(t)}</div>`);

  html = html.replace(/<p><img src="([^"]+)" alt="([^"]*)"\s*\/?><\/p>/g, (m, src, alt) => {
    const name = path.basename(src, path.extname(src));
    const size = pngSize(path.join(ROOT, src));
    const dims = size ? ` width="${size.w}" height="${size.h}"` : '';
    return `<figure class="plate plate-${name}"><picture>` +
      `<source type="image/webp" srcset="${assets}img/${name}.webp">` +
      `<img src="${assets}img/${name}.png" alt="${esc(alt)}" loading="lazy" decoding="async"${dims}>` +
      `</picture></figure>`;
  });

  html = html.replace(/<hr\s*\/?>\s*/g, '');

  /* links out of the rules open in a new tab, so nobody loses their place */
  html = html.replace(/<a href="(https?:\/\/[^"]+)">/g, '<a href="$1" target="_blank" rel="noopener">');

  /* longest titles first, so "Health Points" wins over "Health" */
  const see = STRINGS[lang].seeWord;
  for (const h of [...toc].sort((a, b) => b.title.length - a.title.length)) {
    const re = new RegExp(`\\b(${see}|${see.charAt(0).toUpperCase() + see.slice(1)}) (${escapeRe(h.title)})\\b`, 'g');
    html = html.replace(re, (m, s, t) => `${s} <a class="xref" href="#${h.id}">${t}</a>`);
  }

  const parts = html.split(/(?=<h2 )/);
  const front = parts[0].startsWith('<h2 ') ? '' : parts.shift();
  html = front + parts.map((p, i) => `<section class="chapter" data-number="${i + 1}">${p}</section>`).join('\n');

  return { title, deck, toc, body: html };
}

function tocHtml(toc) {
  const chapters = [];
  for (const h of toc) {
    if (h.level === 2) chapters.push({ ...h, secs: [] });
    else if (chapters.length) chapters[chapters.length - 1].secs.push(h);
  }
  const entry = h => `<a href="#${h.id}"><span class="n">${h.number}</span><span class="t">${esc(h.title)}</span></a>`;
  return '<ol class="toc">' + chapters.map(c =>
    `<li class="ch">${entry(c)}` +
    (c.secs.length ? '<ol>' + c.secs.map(s => `<li>${entry(s)}</li>`).join('') + '</ol>' : '') +
    '</li>'
  ).join('') + '</ol>';
}

function head({ lang, t, assets, title, description, bodyClass, canonical, noindex }) {
  const alt = lang === 'en'
    ? `${CONFIG.site}/${STRINGS.en.otherPath}`
    : `${CONFIG.site}/`;
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex">\n' : ''}<meta name="theme-color" content="#faf6ee">
<link rel="icon" href="${assets}img/favicon.png">
${canonical ? `<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="${lang}" href="${canonical}">
<link rel="alternate" hreflang="${t.other}" href="${alt}">
<link rel="alternate" hreflang="x-default" href="${CONFIG.site}/">
<meta property="og:type" content="website">
<meta property="og:url" content="${canonical}">
<meta property="og:site_name" content="Old Gold">
<meta property="og:locale" content="${lang === 'hu' ? 'hu_HU' : 'en_US'}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(t.ogDescription)}">
<meta property="og:image" content="${CONFIG.site}/assets/img/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(t.coverAlt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${CONFIG.site}/assets/img/og-image.png">
` : ''}<link rel="preload" href="${assets}fonts/fraunces-normal-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${assets}fonts/familjen-grotesk-normal-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${assets}css/fonts.css">
<link rel="stylesheet" href="${assets}css/styles.css">
</head>
<body${bodyClass ? ` class="${bodyClass}"` : ''}>
`;
}

function buildPage(lang, doc) {
  const t = STRINGS[lang];
  const L = LANGS[lang];
  const assets = L.dir ? '../assets/' : 'assets/';
  const canonical = `${CONFIG.site}/${L.dir ? L.dir + '/' : ''}`;
  const index = tocHtml(doc.toc);
  const other = L.dir ? '../' : 'hu/';

  const away = (href, label) => `<a href="${href}" target="_blank" rel="noopener">${label}</a>`;

  const links = [
    CONFIG.discord ? away(CONFIG.discord, 'Discord') : '',
    CONFIG.itch ? away(CONFIG.itch, 'itch.io') : '',
  ].filter(Boolean).join('\n        ');

  const footLinks = [
    CONFIG.email ? `<a href="mailto:${CONFIG.email}">${CONFIG.email}</a>` : '',
    CONFIG.discord ? away(CONFIG.discord, 'Discord') : '',
    CONFIG.itch ? away(CONFIG.itch, 'itch.io') : '',
  ].filter(Boolean).join('\n      ');

  return head({
    lang, t, assets, title: t.title, description: t.description, canonical,
  }) + `<a class="skip" href="#rules">${t.skip}</a>

<header class="cover" id="top">
  <div class="cover-top">
    <span>${t.publisher}</span>
    <a href="${other}" hreflang="${t.other}" lang="${t.other}" data-lang-switch>${t.otherName}</a>
  </div>
  <div class="cover-main">
    <div class="cover-text">
      <h1>${esc(doc.title)}</h1>
      <p class="deck">${doc.deck}</p>
      <p class="actions">
        <a class="primary" href="#rules">${t.read}</a>
        ${links}
      </p>
      <p class="note">${t.note}</p>
    </div>
    <figure class="cover-art">
      <picture>
        <source type="image/webp" srcset="${assets}img/hero-cover-img.webp">
        <img src="${assets}img/hero-cover-img.png" alt="${esc(t.coverAlt)}" width="1450" height="1450" fetchpriority="high">
      </picture>
    </figure>
  </div>
  <div class="cover-bottom">
    <a href="#rules">${t.rules} ↓</a>
    ${CONFIG.email ? `<a href="mailto:${CONFIG.email}">${CONFIG.email}</a>` : ''}
  </div>
</header>

<div class="reading">
  <nav class="index" aria-label="${t.contents}">${index}</nav>

  <main class="rules" id="rules">
    ${doc.body}
  </main>

  <footer class="colophon">
    <p>
      <span>${t.license}</span>
      ${footLinks}
    </p>
  </footer>
</div>

<button class="pill" type="button" data-toc-open>${t.contents}</button>
<dialog id="toc-dialog" aria-label="${t.contents}">
  <div class="dialog-in">
    <div class="dialog-head">
      <span class="dialog-title">${t.contents}</span>
      <button type="button" data-close>${t.close}</button>
    </div>
    ${index}
  </div>
</dialog>

<script src="${assets}js/site.js" defer></script>
</body>
</html>
`;
}

/* the old rulebook page, kept so existing links still land */
function buildRedirect() {
  const t = STRINGS.en;
  return head({
    lang: 'en', t, assets: 'assets/', title: t.title, description: t.description, noindex: true,
  }).replace('<head>', '<head>\n<meta http-equiv="refresh" content="0; url=/#rules">') +
    `<link rel="canonical" href="${CONFIG.site}/">
<main class="plain">
  <p>${t.redirect} <a href="/#rules">${t.read}</a>.</p>
</main>
</body>
</html>
`;
}

function build404() {
  const t = STRINGS.en;
  /* served from any path, so the references here are absolute */
  return head({
    lang: 'en', t, assets: '/assets/', title: `Old Gold — ${t.notFound}`, description: t.notFoundLead, noindex: true, bodyClass: 'notfound',
  }) + `<main class="plain">
  <p class="nf-code">404</p>
  <h1>${t.notFound}</h1>
  <p class="nf-lead">${t.notFoundLead}</p>
  <p><a class="primary" href="/">${t.notFoundBack}</a></p>
</main>
</body>
</html>
`;
}

function buildSitemap() {
  const urls = [`${CONFIG.site}/`, `${CONFIG.site}/hu/`];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.map(u => `  <url>
    <loc>${u}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${CONFIG.site}/"/>
    <xhtml:link rel="alternate" hreflang="hu" href="${CONFIG.site}/hu/"/>
  </url>`).join('\n')}
</urlset>
`;
}

function main() {
  const docs = {};
  docs.en = renderDoc(fs.readFileSync(path.join(ROOT, LANGS.en.file), 'utf8'), 'en', 'assets/');
  docs.hu = renderDoc(fs.readFileSync(path.join(ROOT, LANGS.hu.file), 'utf8'), 'hu', '../assets/', docs.en.toc);

  const written = [];
  const write = (rel, contents) => {
    const file = path.join(ROOT, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, contents);
    written.push(`${rel}  ${(Buffer.byteLength(contents) / 1024).toFixed(0)} KB`);
  };

  for (const lang of Object.keys(LANGS)) {
    const L = LANGS[lang];
    write(path.join(L.dir, L.out), buildPage(lang, docs[lang]));
  }
  write('rulebook.html', buildRedirect());
  write('404.html', build404());
  write('sitemap.xml', buildSitemap());

  written.forEach(w => console.log(w));
  console.log(`\nEN ${docs.en.toc.length} headings · HU ${docs.hu.toc.length} headings`);
}

main();
