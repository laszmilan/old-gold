/* OLD GOLD — generators page. A set of random generators listed in the sidebar
   (the rulebook shell, reused), with the active one rendered in the main column
   and deep-linked by URL hash (#dice). Each generator is a self-describing
   module in GENERATORS; the page builds the list, the controls, and the i18n
   table from that list, so adding a generator is one entry, no extra plumbing. */

/* ===========================================================
   SHARED DICE
   =========================================================== */
const d = (n) => 1 + Math.floor(Math.random() * n);
const pick = (arr) => arr[d(arr.length) - 1];

/* ===========================================================
   CHARACTER — data drawn straight from CHARACTER CREATION (old-gold-en.md)
   =========================================================== */
const ANCESTRY = {
  dwarf: {
    name: "Dwarf", move: "8m", languages: "Common, Dwarvish",
    attrDice: 6, hpAdvantage: true,
    trait: "Sturdy and poison-hardy; rolls HP with advantage.",
    names: ["Járnda","Vrannik","Grudnir","Kelvor","Stennig","Ongdur","Feldar","Hegril","Dáli","Brúni","Midrik","Andveg"],
  },
  elf: {
    name: "Elf", move: "12m", languages: "Common, Sylvan",
    attrDice: 6, hpAdvantage: false,
    trait: "Keen senses; resists charm, sleep, and mental effects.",
    names: ["Varenthas","Celindyl","Fendalus","Therylon","Nyveris","Seralyn","Maeraphon","Evrandir","Aelinor","Galrion","Yphera","Abrion"],
  },
  human: {
    name: "Human", move: "10m", languages: "Common",
    attrDice: 7, hpAdvantage: false,
    trait: "Restless and adaptable; an extra attribute point at creation.",
    names: ["Garric","Mara","Eirik","Hegwin","Seren","Treven","Connig","Aldwen","Haldric","Brynn","Wynna","Drystan"],
  },
  halfkin: {
    name: "Halfkin", move: "8m", languages: "Common",
    attrDice: 6, hpAdvantage: false,
    trait: "Stubborn and lucky; may reroll natural 1s on checks.",
    names: ["Bramble","Sedge","Poppy","Nettle","Thistle","Flint","Tansy","Moss","Mallow","Rue","Sorrel","Clover"],
  },
};
const ANCESTRY_KEYS = ["dwarf","elf","human","halfkin"];

const APPEARANCE = ["Built like an ox","Shaved head","Crooked nose","Missing ear","Wild hair","Mismatched eyes","Burn-scarred face","Gold tooth","Weather-beaten","Lean as a whip","Faded tattoo","Heavily scarred","Hoarse voice","Freckled","Pale as candle wax","Tall and stooped","Smells of smoke","Unworked hands","Easily overlooked","Strikingly beautiful"];
const PERSONALITY = ["Never breaks a promise","Laughs at danger","Suspicious of strangers","Speaks too loudly","Quietly generous","Holds grudges forever","Has to win every argument","Superstitiously cautious","Relentlessly cheerful","Cold and calculating","Fiercely loyal","Compulsive liar","Talks to themselves","Burns hot, cools fast","Overly polite","Painfully honest","Flamboyant","Ambitious","Says very little","Cowardly but clever"];
const BACKGROUND = ["Soldier","Herbalist","Pickpocket","Sailor","Merchant","Blacksmith","Charlatan","Hunter","Tax collector","Scribe","Deserter","Spy","Barber-surgeon","Pit fighter","Smuggler","Cultist","Troubadour","Grave robber","Hedge witch","Disgraced noble"];
const MOTIVATION = ["Pay off debt","Find someone","Avenge something","Prove a doubter wrong","Earn enough to retire","Outrun a curse","Learn what others fear to know","Fulfill a vow","Recover something","Wander for its own sake","Greed, pure and simple","Nothing waits for you at home","Test your faith","Find a place worth staying","Look for a worthy death","Discover the truth","Earn back your honor","Map the unmapped","Protect what others won't","Stop running from yourself"];

const ATTRS = ["MGT","GRC","MND","HRT"];

/* roll attributes: N d4, each die +1 to its attribute (1=MGT…4=HRT),
   capped at 4 at creation (a die that would exceed 4 is rerolled) */
function rollAttributes(n) {
  const s = { MGT: 0, GRC: 0, MND: 0, HRT: 0 };
  for (let placed = 0; placed < n; ) {
    const a = ATTRS[d(4) - 1];
    if (s[a] < 4) { s[a]++; placed++; }
  }
  return s;
}

const bonus = (score) => Math.ceil(score / 2);

function generateCharacter() {
  const key = pick(ANCESTRY_KEYS);
  const anc = ANCESTRY[key];
  const attrs = rollAttributes(anc.attrDice);
  const hpRoll = anc.hpAdvantage ? Math.max(d(6), d(6)) : d(6);  // Dwarves roll with advantage
  return {
    key,
    name: pick(anc.names),
    background: pick(BACKGROUND),
    appearance: pick(APPEARANCE),
    personality: pick(PERSONALITY),
    motivation: pick(MOTIVATION),
    attrs,
    hp: 6 + 3 * attrs.MGT + hpRoll,
    dp: 0,
    move: anc.move,
    languages: anc.languages,
  };
}

function renderCharacter(pc, t) {
  const anc = ANCESTRY[pc.key];
  const stats = ATTRS.map(a =>
    `<span class="pc-stat"><b>${a}</b> ${pc.attrs[a]} <i>(+${bonus(pc.attrs[a])})</i></span>`
  ).join("");
  const detail = [
    [t["character.lblLanguages"], pc.languages],
    [t["character.lblAppearance"], pc.appearance],
    [t["character.lblPersonality"], pc.personality],
    [t["character.lblMotivation"], pc.motivation],
    [anc.name, anc.trait],
  ].map(([dt, dd]) => `<div><dt>${dt}</dt><dd>${dd}</dd></div>`).join("");

  return `
    <article class="pc-card">
      <header class="pc-head">
        <h2 class="pc-name">${pc.name}</h2>
        <p class="pc-sub">${anc.name} &middot; ${pc.background} &middot; ${t["character.lvl1"]}</p>
      </header>
      <div class="pc-stats">${stats}</div>
      <div class="pc-vitals">
        <span><b>HP</b> ${pc.hp}</span>
        <span><b>DP</b> ${pc.dp}</span>
        <span><b>MOV</b> ${pc.move}</span>
      </div>
      <dl class="pc-detail">${detail}</dl>
    </article>`;
}

/* ===========================================================
   DICE ROLLER — parse "NdM(+/-K)", roll, show total + the dice
   =========================================================== */
function parseDice(str) {
  const m = /^\s*(\d*)\s*d\s*(\d+)\s*([+-]\s*\d+)?\s*$/i.exec(str || "");
  if (!m) return null;
  const count = m[1] ? parseInt(m[1], 10) : 1;
  const sides = parseInt(m[2], 10);
  const modifier = m[3] ? parseInt(m[3].replace(/\s+/g, ""), 10) : 0;
  if (count < 1 || count > 100 || sides < 2 || sides > 1000) return null;
  return { count, sides, modifier };
}

const signLabel = (n) => (n > 0 ? ` + ${n}` : n < 0 ? ` − ${Math.abs(n)}` : "");

function rollDice({ count, sides, modifier }) {
  const dice = Array.from({ length: count }, () => d(sides));
  const sum = dice.reduce((a, b) => a + b, 0);
  return { dice, modifier, total: sum + modifier, label: `${count}d${sides}${signLabel(modifier)}` };
}

function renderDice(r) {
  return `
    <article class="dice-result">
      <p class="dice-expr">${r.label}</p>
      <span class="dice-total">${r.total}</span>
      <p class="dice-breakdown">[${r.dice.join(", ")}]${signLabel(r.modifier)}</p>
    </article>`;
}

const diceModule = {
  i18n: {
    en: { label: "Dice", lead: "Roll any dice expression — like 2d6+1 — or tap a die.", roll: "Roll", error: "Try an expression like 2d6+1." },
    hu: { label: "Kocka", lead: "Dobj bármilyen kifejezést — pl. 2d6+1 — vagy koppints egy kockára.", roll: "Dobás", error: "Próbálj egy kifejezést, pl. 2d6+1." },
  },
  mount({ stage, t, id, state, save }) {
    const s = state || { expr: "1d6", result: null };
    stage.innerHTML = `
      <h1 class="gen-heading">${t[id + ".label"]}</h1>
      <p class="gen-lead">${t[id + ".lead"]}</p>
      <div class="gen-controls dice-controls">
        <div class="dice-quick">
          ${[4, 6, 8, 10, 12, 20].map(n => `<button class="dice-chip" type="button" data-die="${n}">d${n}</button>`).join("")}
        </div>
        <div class="dice-entry">
          <input class="dice-input" type="text" spellcheck="false" autocomplete="off" aria-label="${t[id + ".roll"]}">
          <button class="btn btn-solid" type="button" data-roll>${t[id + ".roll"]}</button>
        </div>
      </div>
      <div class="gen-out" data-out></div>`;

    const input = stage.querySelector(".dice-input");
    const out = stage.querySelector("[data-out]");
    input.value = s.expr;   // set as a property, never interpolated into HTML

    const draw = () => { out.innerHTML = s.result ? renderDice(s.result) : ""; };
    const roll = () => {
      const parsed = parseDice(input.value);
      if (!parsed) { s.result = null; out.innerHTML = `<p class="dice-error">${t[id + ".error"]}</p>`; save(s); return; }
      s.expr = input.value.trim();
      s.result = rollDice(parsed);
      save(s);
      draw();
    };

    draw();   // restore the last result after a language switch
    stage.querySelector("[data-roll]").addEventListener("click", roll);
    input.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); roll(); } });
    stage.querySelectorAll(".dice-chip").forEach(c =>
      c.addEventListener("click", () => { input.value = "1d" + c.dataset.die; roll(); }));
    save(s);
  },
};

/* ===========================================================
   MODULE HELPERS + REGISTRY
   =========================================================== */
/* the common "one Roll button" generator: roll() makes state, render() draws it */
function rollModule(def) {
  return {
    i18n: def.i18n,
    mount({ stage, t, id, state, save }) {
      if (state == null) { state = def.roll(); save(state); }
      stage.innerHTML = `
        <h1 class="gen-heading">${t[id + ".label"]}</h1>
        <p class="gen-lead">${t[id + ".lead"]}</p>
        <div class="gen-controls">
          <button class="btn btn-solid" type="button" data-roll>${t[id + ".roll"]}</button>
        </div>
        <div class="gen-out" data-out></div>`;
      const out = stage.querySelector("[data-out]");
      out.innerHTML = def.render(state, t);
      stage.querySelector("[data-roll]").addEventListener("click", () => {
        state = def.roll();
        save(state);
        out.innerHTML = def.render(state, t);
      });
    },
  };
}

const GENERATORS = [
  Object.assign({ id: "character" }, rollModule({
    i18n: {
      en: {
        label: "Character", roll: "Roll a character",
        lead: "Roll up a ready-to-play level 1 adventurer for Old Gold.",
        lvl1: "Level 1",
        lblLanguages: "Languages", lblAppearance: "Appearance",
        lblPersonality: "Personality", lblMotivation: "Motivation",
      },
      hu: {
        label: "Karakter", roll: "Karakter dobása",
        lead: "Dobj egy játékra kész, 1. szintű kalandozót az Old Goldhoz.",
        lvl1: "1. szint",
        lblLanguages: "Nyelvek", lblAppearance: "Külső",
        lblPersonality: "Jellem", lblMotivation: "Motiváció",
      },
    },
    roll: generateCharacter,
    render: renderCharacter,
  })),
  Object.assign({ id: "dice" }, diceModule),
];
const GENS = Object.fromEntries(GENERATORS.map(g => [g.id, g]));

/* fold every module's strings into one namespaced i18n table (character.lead …),
   merged onto the page-level + shared chrome strings */
const PAGE_I18N = {
  en: { skip: "Skip to content", titleSuffix: "Generators", navToggle: "Toggle generators", genListLabel: "Generators" },
  hu: { skip: "Ugrás a tartalomhoz", titleSuffix: "Generátorok", navToggle: "Generátorok megnyitása", genListLabel: "Generátorok" },
};
const I18N = (() => {
  const en = { ...PAGE_I18N.en }, hu = { ...PAGE_I18N.hu };
  for (const g of GENERATORS) {
    for (const k in g.i18n.en) en[`${g.id}.${k}`] = g.i18n.en[k];
    for (const k in g.i18n.hu) hu[`${g.id}.${k}`] = g.i18n.hu[k];
  }
  return Site.i18n({ en, hu });
})();

/* ===========================================================
   PAGE CONTROLLER
   =========================================================== */
const genStage = document.getElementById("genStage");
const genList = document.getElementById("genList");
const paneState = {};   // last result, kept per generator so it survives switches/lang changes
let active = null;

const strings = () => I18N[Site.lang()] || I18N.en;
const fromHash = () => { const id = location.hash.slice(1); return GENS[id] ? id : GENERATORS[0].id; };

/* the sidebar list is built once; entries are real #hash links (deep-linkable) */
function buildList() {
  const t = strings();
  genList.innerHTML = "<ol>" + GENERATORS.map(g =>
    `<li><a class="lvl-2" href="#${g.id}" data-gen="${g.id}">${t[g.id + ".label"]}</a></li>`
  ).join("") + "</ol>";
}

function renderActive() {
  active = fromHash();
  genList.querySelectorAll("a").forEach(a => {
    const on = a.dataset.gen === active;
    a.classList.toggle("active", on);
    a.setAttribute("aria-current", on ? "true" : "false");
  });
  GENS[active].mount({
    stage: genStage, t: strings(), id: active,
    state: paneState[active],
    save: (s) => { paneState[active] = s; },
  });
}

function applyLang(lang) {
  document.documentElement.lang = lang;
  Site.store("og-lang", lang);
  const t = I18N[lang] || I18N.en;
  Site.applyStrings(t);
  document.title = "Old Gold — " + t.titleSuffix;
  genList.querySelectorAll("a").forEach(a => { a.textContent = t[a.dataset.gen + ".label"]; });
  renderActive();   // re-render the active generator in the new language, keeping its result
}

/* contents panel — same unified behavior as the rulebook's TOC: the shared
   logic in Site.sidebar handles the toggle, scrim, Escape, click-to-dismiss,
   and closing on selection only while the list is covering the content */
function setupChrome() {
  Site.sidebar({ content: document.querySelector("main"), selectLinks: genList });
}

buildList();
Site.setupTabs();
Site.onLang(applyLang);
setupChrome();
window.addEventListener("hashchange", renderActive);
if (!GENS[location.hash.slice(1)]) history.replaceState(null, "", "#" + GENERATORS[0].id);
applyLang(Site.startLang(I18N));
