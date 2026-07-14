/* OLD GOLD — generators page. A set of random generators listed in a switcher,
   with the active one rendered in the main workbench
   and deep-linked by URL hash (#character). Each generator is a self-describing
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
    trait: "Advantage on HP rolls and to resist poison",
    names: ["Járnda", "Vrannik", "Grudnir", "Kelvor", "Stennig", "Ongdur", "Feldar", "Hegril", "Dáli", "Brúni", "Midrik", "Andveg"],
  },
  elf: {
    name: "Elf", move: "12m", languages: "Common, Sylvan",
    attrDice: 6, hpAdvantage: false,
    trait: "Advantage to resist mental effects",
    names: ["Varenthas", "Celindyl", "Fendalus", "Therylon", "Nyveris", "Seralyn", "Maeraphon", "Evrandir", "Aelinor", "Galrion", "Yphera", "Abrion"],
  },
  human: {
    name: "Human", move: "10m", languages: "Common",
    attrDice: 7, hpAdvantage: false,
    trait: "Starts with 7 attribute points instead of 6",
    names: ["Garric", "Mara", "Eirik", "Hegwin", "Seren", "Treven", "Connig", "Aldwen", "Haldric", "Brynn", "Wynna", "Drystan"],
  },
  halfkin: {
    name: "Halfkin", move: "8m", languages: "Common",
    attrDice: 6, hpAdvantage: false,
    trait: "May reroll natural 1s on checks",
    names: ["Bramble", "Sedge", "Poppy", "Nettle", "Thistle", "Flint", "Tansy", "Moss", "Mallow", "Rue", "Sorrel", "Clover"],
  },
};
const ANCESTRY_KEYS = ["dwarf", "elf", "human", "halfkin"];

const APPEARANCE = ["Built like an ox", "Shaved head", "Crooked nose", "Missing ear", "Wild hair", "Mismatched eyes", "Burn-scarred face", "Gold tooth", "Weather-beaten", "Lean as a whip", "Faded tattoo", "Heavily scarred", "Hoarse voice", "Freckled", "Pale as candle wax", "Tall and stooped", "Smells of smoke", "Unworked hands", "Easily overlooked", "Strikingly beautiful"];
const PERSONALITY = ["Never breaks a promise", "Laughs at danger", "Suspicious of strangers", "Speaks too loudly", "Quietly generous", "Holds grudges forever", "Has to win every argument", "Superstitiously cautious", "Relentlessly cheerful", "Cold and calculating", "Fiercely loyal", "Compulsive liar", "Talks to themselves", "Burns hot, cools fast", "Overly polite", "Painfully honest", "Flamboyant", "Ambitious", "Says very little", "Cowardly but clever"];
const BACKGROUND = ["Soldier", "Herbalist", "Pickpocket", "Sailor", "Merchant", "Blacksmith", "Charlatan", "Hunter", "Tax collector", "Scribe", "Deserter", "Spy", "Barber-surgeon", "Pit fighter", "Smuggler", "Cultist", "Troubadour", "Grave robber", "Hedge witch", "Disgraced noble"];
const MOTIVATION = ["Pay off debt", "Find someone", "Avenge something", "Prove a doubter wrong", "Earn enough to retire", "Outrun a curse", "Learn what others fear to know", "Fulfill a vow", "Recover something", "Wander for its own sake", "Greed, pure and simple", "Nothing waits for you at home", "Test your faith", "Find a place worth staying", "Look for a worthy death", "Discover the truth", "Earn back your honor", "Map the unmapped", "Protect what others won't", "Stop running from yourself"];

const ATTRS = ["Might", "Grace", "Mind", "Heart"];

/* roll attributes: N d4, each die +1 to its attribute (1=Might…4=Heart),
   capped at 4 at creation (a die that would exceed 4 is rerolled) */
function rollAttributes(n) {
  const s = { Might: 0, Grace: 0, Mind: 0, Heart: 0 };
  for (let placed = 0; placed < n;) {
    const a = ATTRS[d(4) - 1];
    if (s[a] < 4) { s[a]++; placed++; }
  }
  return s;
}

const bonus = (score) => Math.ceil(score / 2);

/* STARTING EQUIPMENT — a weapon plus one of armor / spellbook / relic, per
   CHARACTER CREATION. Weapons split by governing attribute so the generator
   arms the character to their strength; damage bakes in the bonus like a
   statblock. Spells reuse the MAGIC chapter's list. */
const WEAPONS = {
  Might: [
    { name: "Sword", die: 6, reach: "2m" },
    { name: "Mace", die: 6, reach: "2m" },
    { name: "Spear", die: 4, reach: "4m" },
    { name: "Greataxe", die: 10, reach: "2m" },
    { name: "Halberd", die: 6, reach: "4m" },
    { name: "Handaxe", die: 4, reach: "thrown" },
  ],
  Grace: [
    { name: "Dagger", die: 6, reach: "2m" },
    { name: "Rapier", die: 6, reach: "2m" },
    { name: "Shortbow", die: 4, reach: "20m" },
    { name: "Sling", die: 4, reach: "20m" },
    { name: "Longbow", die: 6, reach: "60m" },
  ],
};
const SPELLS = ["Charm", "Sleep", "Counterspell", "Detect magic", "Fly", "Invisibility", "Mirror image", "Magic missile", "Fireball", "Elemental wall", "Web", "Telekinesis", "Mirrorwalk", "Message", "Golem"];

/* pick a weapon fitting the higher of Might/Grace, damage with its bonus baked in */
function rollWeapon(attrs) {
  const attr = attrs.Grace > attrs.Might ? "Grace" : "Might";
  const w = pick(WEAPONS[attr]);
  const b = bonus(attrs[attr]);
  const range = w.reach === "thrown" ? `${Math.max(b * 6, 2)}m` : w.reach;
  return `${w.name} (1d${w.die}${b ? `+${b}` : ""}, ${range})`;
}

/* the second starting item: a caster gets a book/relic when that is their top
   attribute, everyone else takes armor (which raises DP) */
function rollFocus(attrs) {
  if (attrs.Mind >= 3 && attrs.Mind >= attrs.Might && attrs.Mind >= attrs.Grace && attrs.Mind >= attrs.Heart) {
    return { type: "Spellbook", desc: pick(SPELLS), dp: 0 };
  }
  if (attrs.Heart >= 3 && attrs.Heart >= attrs.Might && attrs.Heart >= attrs.Grace && attrs.Heart >= attrs.Mind) {
    return { type: "Relic", desc: "a prayer of your patron", dp: 0 };
  }
  return d(2) === 1
    ? { type: "Armor", desc: "light armor", dp: 1 }
    : { type: "Armor", desc: "medium armor", dp: 2 };
}

function generateCharacter() {
  const key = pick(ANCESTRY_KEYS);
  const anc = ANCESTRY[key];
  const attrs = rollAttributes(anc.attrDice);
  const hpRoll = anc.hpAdvantage ? Math.max(d(6), d(6)) : d(6);  // Dwarves roll with advantage
  const focus = rollFocus(attrs);
  return {
    key,
    name: pick(anc.names),
    background: pick(BACKGROUND),
    appearance: pick(APPEARANCE),
    personality: pick(PERSONALITY),
    motivation: pick(MOTIVATION),
    attrs,
    hp: 6 + 3 * attrs.Might + hpRoll,
    dp: focus.dp,
    move: anc.move,
    languages: anc.languages,
    weapon: rollWeapon(attrs),
    focus,
    gold: 20 + d(20) + d(20),
  };
}

function renderCharacter(pc, t) {
  const anc = ANCESTRY[pc.key];
  const stats = ATTRS.map(a =>
    `<span class="pc-cell"><b>${a}</b><span class="pc-num">${pc.attrs[a]} <i>(+${bonus(pc.attrs[a])})</i></span></span>`
  ).join("");
  // weapon, the second item (armor/spellbook/relic) and gold read as one gear
  // line, comma-joined, so it rides a full-width row (like the ancestry bonus)
  // just under it, before the paired short traits
  const inventory = `${pc.weapon}, ${pc.focus.desc}, ${pc.gold} gp`;
  const detail = [
    [t["character.lblAncestry"], anc.trait, "pc-row--wide"],
    [t["character.lblInventory"], inventory, "pc-row--wide"],
    [t["character.lblAppearance"], pc.appearance],
    [t["character.lblPersonality"], pc.personality],
    [t["character.lblMotivation"], pc.motivation],
    [t["character.lblLanguages"], pc.languages],
  ].map(([dt, dd, cls]) => `<div${cls ? ` class="${cls}"` : ""}><dt>${dt}</dt><dd>${dd}</dd></div>`).join("");

  return `
    <article class="pc-card">
      <div class="pc-side">
        <span class="pc-cell pc-cell--wide"><b>HP</b><span class="pc-num">${pc.hp}</span></span>
        <span class="pc-cell pc-cell--wide"><b>DP</b><span class="pc-num">${pc.dp}</span></span>
        <span class="pc-cell pc-cell--wide"><b>SPD</b><span class="pc-num">${pc.move}</span></span>
        ${stats}
      </div>
      <dl class="pc-detail">${detail}</dl>
    </article>`;
}

/* the rolled name and its line ride the masthead, next to Reroll, in the
   card's own display face — the slot the pane label used to hold */
function headCharacter(pc, t) {
  const anc = ANCESTRY[pc.key];
  return `
    <h2 class="pc-name">${pc.name}</h2>
    <p class="pc-sub">${anc.name} &middot; ${pc.background} &middot; ${t["character.lvl1"]}</p>`;
}

/* ===========================================================
   MODULE HELPERS + REGISTRY
   =========================================================== */
/* the shared masthead action: the solid roll button with the circling-arrow
   icon, dropped into the .gen-head action slot by every pane */
const rollButton = (label) => `
  <button class="btn btn-solid gen-reroll" type="button" data-roll>
    <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 12a8 8 0 1 1-2.34-5.66"></path>
      <polyline points="20 4 20 10 14 10"></polyline>
    </svg>
    <span>${label}</span>
  </button>`;

/* the common "one Roll button" generator: roll() makes state, render() draws
   it into the pane; an optional head() draws the pane's masthead title. The
   reroll button lives in the masthead's action slot. An optional announce()
   supplies a short line for screen readers on each reroll. */
function rollModule(def) {
  return {
    i18n: def.i18n,
    mount({ stage, actions, head, t, id, state, save }) {
      if (state == null) { state = def.roll(); save(state); }
      stage.innerHTML = `
        ${t[id + ".lead"] ? `<p class="gen-lead">${t[id + ".lead"]}</p>` : ""}
        <div class="gen-out" data-out></div>
        <p class="sr-only" data-status role="status"></p>`;
      actions.innerHTML = rollButton(t[id + ".reroll"]);
      const out = stage.querySelector("[data-out]");
      const status = stage.querySelector("[data-status]");
      const draw = () => {
        out.innerHTML = def.render(state, t);
        if (head && def.head) head.innerHTML = def.head(state, t);
      };
      draw();
      actions.querySelector("[data-roll]").addEventListener("click", () => {
        state = def.roll();
        save(state);
        draw();
        if (def.announce) status.textContent = def.announce(state, t);
      });
    },
  };
}

const GENERATORS = [
  Object.assign({ id: "character" }, rollModule({
    i18n: {
      en: {
        label: "Character", roll: "Roll a character", reroll: "Reroll",
        lead: "",
        lvl1: "Level 1",
        lblAncestry: "Ancestry bonus",
        lblLanguages: "Languages", lblAppearance: "Appearance",
        lblPersonality: "Personality", lblMotivation: "Motivation",
        lblWeapon: "Weapon", lblArmor: "Armor", lblSpellbook: "Spellbook",
        lblRelic: "Relic", lblGold: "Gold", lblInventory: "Inventory",
      },
      hu: {
        label: "Karakter", roll: "Karakter dobása", reroll: "Újradobás",
        lead: "",
        lvl1: "1. szint",
        lblAncestry: "Származási bónusz",
        lblLanguages: "Nyelvek", lblAppearance: "Külső",
        lblPersonality: "Jellem", lblMotivation: "Motiváció",
        lblWeapon: "Fegyver", lblArmor: "Páncél", lblSpellbook: "Varázskönyv",
        lblRelic: "Ereklye", lblGold: "Arany", lblInventory: "Felszerelés",
      },
    },
    roll: generateCharacter,
    render: renderCharacter,
    head: headCharacter,
    announce: (pc) => `${pc.name} — ${ANCESTRY[pc.key].name}, ${pc.background}`,
  })),
];
const GENS = Object.fromEntries(GENERATORS.map(g => [g.id, g]));

/* fold every module's strings into one namespaced i18n table (character.lead …),
   merged onto the page-level + shared chrome strings */
const PAGE_I18N = {
  en: { skip: "Skip to content", titleSuffix: "Generators", genPageTitle: "Generators" },
  hu: { skip: "Ugrás a tartalomhoz", titleSuffix: "Generátorok", genPageTitle: "Generátorok" },
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
const genActions = document.getElementById("genActions");
const genTitle = document.getElementById("genTitle");
const paneState = {};   // last result, kept per generator so it survives switches/lang changes
let active = null;

const strings = () => I18N[Site.lang()] || I18N.en;
const fromHash = () => { const id = location.hash.slice(1); return GENS[id] ? id : GENERATORS[0].id; };

function renderActive() {
  active = fromHash();
  const t = strings();
  genActions.innerHTML = "";   // panes without an action leave the slot empty
  GENS[active].mount({
    stage: genStage, actions: genActions, head: genTitle, t, id: active,
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
  renderActive();   // re-render the active generator in the new language, keeping its result
}

Site.setupTabs();
Site.onLang(applyLang);
window.addEventListener("hashchange", renderActive);
if (!GENS[location.hash.slice(1)]) history.replaceState(null, "", "#" + GENERATORS[0].id);
applyLang(Site.startLang(I18N));
