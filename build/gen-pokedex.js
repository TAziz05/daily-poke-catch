// Builds the Pokédex questions for every Pokémon from ref/pokedex.json and ref/battle.json
// (types, generation, Pokédex number, category, Abilities, evolutions, matchups, natures and
// Who's That Pokémon? clues). Writes gen/pokedex.json. Run: node gen-pokedex.js
// Facts in ref/ come from the open PokeAPI dataset; every question links the page on
// pokemon.com or Bulbapedia that states the same fact.
const fs = require("fs");
const DEX = JSON.parse(fs.readFileSync(__dirname + "/ref/pokedex.json", "utf8"));
const BAT = JSON.parse(fs.readFileSync(__dirname + "/ref/battle.json", "utf8"));
const BY = Object.fromEntries(DEX.map(p => [p.id, p]));
const BP = "https://bulbapedia.bulbagarden.net/wiki/";
const PD = "https://www.pokemon.com/us/pokedex/";
const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];
const REGION = ["", "Kanto", "Johto", "Hoenn", "Sinnoh", "Unova", "Kalos", "Alola", "Galar", "Paldea"];
const GAMES = ["", "Red, Green, Blue & Yellow", "Gold, Silver & Crystal", "Ruby, Sapphire & Emerald", "Diamond, Pearl & Platinum",
  "Black & White, Black 2 & White 2", "X & Y", "Sun & Moon, Ultra Sun & Ultra Moon", "Sword & Shield", "Scarlet & Violet"];

// ---------- helpers ----------
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const shuffle = (a, r) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const T = t => cap(t);
const typeStr = p => p.types.map(T).join(" / ");
const typeWord = p => p.types.map(T).join("/");
const an = w => (/^[AEIOU]/i.test(w) ? "an " : "a ") + w;
const bpPage = p => BP + encodeURIComponent((p.name + " (Pokémon)").replace(/ /g, "_")).replace(/%2F/g, "/");
const bp = t => BP + encodeURIComponent(t.replace(/ /g, "_"));
const slug = n => n.toLowerCase().replace("♀", "-female").replace("♂", "-male").normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[.'’:]/g, "").replace(/ /g, "-");
const pdPage = p => PD + slug(p.name);
const num = n => "#" + String(n).padStart(4, "0");
const stat = { hp: "HP", attack: "Attack", defense: "Defense", "special-attack": "Sp. Atk", "special-defense": "Sp. Def", speed: "Speed" };
// Pick n distinct options from a list, never the answer, deterministically.
function pickWrong(answer, pool, n, seed) {
  const r = rng(hash(seed)), out = [];
  for (const x of shuffle([...new Set(pool)], r)) { if (out.length >= n) break; if (x !== answer && !out.includes(x)) out.push(x); }
  return out.length === n ? out : null;
}

// ---------- how well known each Pokémon is (decides the tier) ----------
const famousNames = `Pikachu Raichu Pichu Eevee Vaporeon Jolteon Flareon Espeon Umbreon Leafeon Glaceon Sylveon Mewtwo Mew Snorlax Gengar Charizard Blastoise Venusaur
 Bulbasaur Charmander Squirtle Jigglypuff Psyduck Meowth Magikarp Gyarados Lapras Ditto Dragonite Mr. Mime Machamp Onix Geodude Cubone Lugia Ho-Oh Togepi Marill
 Lucario Greninja Garchomp Gardevoir Mimikyu Kyogre Groudon Rayquaza Dialga Palkia Giratina Arceus Reshiram Zekrom Xerneas Yveltal Solgaleo Lunala Zacian Zamazenta
 Koraidon Miraidon Celebi Jirachi Darkrai Wobbuffet Slowpoke Abra Gastly Haunter Butterfree Caterpie Pidgey Rattata Zubat Vulpix Ninetales Growlithe Arcanine Mudkip
 Treecko Torchic Chikorita Cyndaquil Totodile Turtwig Chimchar Piplup Snivy Tepig Oshawott Chespin Fennekin Froakie Rowlet Litten Popplio Grookey Scorbunny Sobble
 Sprigatito Fuecoco Quaxly Bidoof Magnemite Voltorb Electrode Clefairy Scyther Articuno Zapdos Moltres Tyranitar Blaziken Sceptile Swampert Infernape Empoleon Torterra
 Typhlosion Feraligatr Meganium Wooper Sudowoodo Rotom Riolu Zorua Zoroark Pawmi Lechonk Tinkaton Wooloo Yamper Corviknight Incineroar Primarina Decidueye Cinderace
 Rillaboom Inteleon Meowscarada Skeledirge Quaquaval Chesnaught Delphox Serperior Emboar Samurott Hoothoot Steelix Scizor Absol Metagross Salamence Milotic Deoxys
 Victini Necrozma Eternatus Zygarde Kyurem Regigigas Regice Regirock Registeel Latias Latios Suicune Entei Raikou Mewtwo Ralts Kirlia Gible Luxray Shinx Togekiss`.split(/\s+/).filter(Boolean);
const famous = new Set(famousNames);
const starterBase = new Set([1, 4, 7, 152, 155, 158, 252, 255, 258, 387, 390, 393, 495, 498, 501, 650, 653, 656, 722, 725, 728, 810, 813, 816, 906, 909, 912]);
const starterLine = new Set(); for (const s of starterBase) { starterLine.add(s); starterLine.add(s + 1); starterLine.add(s + 2); }
function pop(p) {
  if (famous.has(p.name) && (p.gen === 1 || starterBase.has(p.id) || p.legendary || p.mythical || ["Lucario", "Greninja", "Garchomp", "Gardevoir", "Mimikyu", "Togepi", "Marill", "Eevee", "Espeon", "Umbreon", "Sylveon", "Leafeon", "Glaceon"].includes(p.name))) return 3;
  if (p.gen === 1 || famous.has(p.name) || starterLine.has(p.id)) return 2;
  if (p.gen <= 4) return 1;
  return 0;
}
const TIERS = "emhx";
const tierAt = i => TIERS[Math.max(0, Math.min(3, i))];

// ---------- matchups ----------
const EFF = {}; for (const [a, d, f] of BAT.eff) (EFF[a] ??= {})[d] = f / 100;
const TYPES = BAT.types;
const mult = (atk, p) => p.types.reduce((m, d) => m * EFF[atk][d], 1);

// ---------- groups ----------
const GROUPS = [];
for (let g = 1; g <= 9; g++) GROUPS.push({ id: "G" + g, ch: "Pokémon by Generation", name: "Generation " + ROMAN[g], sub: REGION[g], url: bp("Generation " + ROMAN[g]), qs: [] });
const TYPEG = { id: "TYPES", ch: "Battle", name: "Battle", sub: "Types & Matchups", url: bp("Type"), qs: [] };
const NATG = { id: "NATURES", ch: "Battle", name: "Battle", sub: "Natures & Personalities", url: bp("Nature"), qs: [] };
const WHO = []; // Who's That Pokémon? clues: [tier, clue, answer, [3 wrong], explanation, source, era]
const G = g => GROUPS[g - 1];
const add = (grp, tier, q, a, w, e, s, f, mon) => { if (!w || w.length !== 3 || w.includes(a)) return; grp.qs.push([tier, q, a, w, e, s, f, mon]); };

const allTypeCombos = [...new Set(DEX.map(typeStr))];
const genus = p => p.genus.replace(/ Pokémon$/, "");
const genusCount = {}; for (const p of DEX) genusCount[p.genus] = (genusCount[p.genus] || 0) + 1;
const children = {}; for (const p of DEX) if (p.from_) (children[p.from_] ??= []).push(p.id);
const allAbilities = [...new Set(DEX.flatMap(p => [...p.abilities, ...p.hidden]))];

for (const p of DEX) {
  const P = pop(p), grp = G(p.gen), src = pdPage(p), bsrc = bpPage(p), S = p.name;
  const sameGen = DEX.filter(x => x.gen === p.gen && x.id !== p.id);
  const near = DEX.filter(x => Math.abs(x.id - p.id) <= 60 && x.id !== p.id);

  // Type
  {
    const ans = typeStr(p);
    const norm = c => c.split(" / ").sort().join("/"), same = c => norm(c) === norm(ans);
    const share = allTypeCombos.filter(c => !same(c) && p.types.some(t => c.split(" / ").includes(T(t))));
    const w = pickWrong(ans, share.length >= 6 ? share : allTypeCombos.filter(c => !same(c)), 3, "type" + p.id);
    add(grp, tierAt(3 - P), `What type is ${S}?`, ans, w, `${S} is ${an(typeWord(p))}-type Pokémon${p.types.length === 1 ? "" : " (dual type)"}.`, src, "type", p.id);
  }
  // Generation
  {
    const ans = "Generation " + ROMAN[p.gen];
    const w = pickWrong(ans, [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(g => Math.abs(g - p.gen) <= 3).map(g => "Generation " + ROMAN[g]), 3, "gen" + p.id);
    add(grp, tierAt(P >= 3 ? 1 : P === 2 ? 1 : 2), `In which generation was ${S} introduced?`, ans, w, `${S} debuted in Generation ${ROMAN[p.gen]} (${GAMES[p.gen]}), set in the ${REGION[p.gen]} region.`, bsrc, "gen", p.id);
  }
  // National Pokédex number
  {
    const ans = num(p.id), r = rng(hash("num" + p.id)), cand = new Set();
    while (cand.size < 12) { const d = Math.round((r() - .5) * 60); const n = p.id + (d || 1); if (n >= 1 && n <= DEX.length && n !== p.id) cand.add(num(n)); }
    const w = pickWrong(ans, [...cand], 3, "numw" + p.id);
    const iconic = [1, 4, 7, 25, 133, 150, 151, 143, 94, 6, 9, 3].includes(p.id);
    add(grp, iconic ? "h" : "x", `What is ${S}'s National Pokédex number?`, ans, w, `${S} is ${num(p.id)} in the National Pokédex.`, src, "num", p.id);
  }
  // Category (genus)
  if (genusCount[p.genus] === 1) {
    const pool = sameGen.filter(x => genusCount[x.genus] === 1 && x.types.some(t => p.types.includes(t))).map(x => x.genus);
    const w = pickWrong(p.genus, pool.length >= 3 ? pool : sameGen.map(x => x.genus), 3, "gen2" + p.id);
    add(grp, tierAt(P >= 3 ? 1 : P === 2 ? 2 : 2 + (P === 0)), `What is ${S}'s Pokédex category?`, p.genus, w, `The Pokédex lists ${S} as the ${p.genus}.`, src, "genus", p.id);
    // reverse, only for well-known ones
    if (P >= 2) {
      const wn = pickWrong(S, sameGen.filter(x => x.types.some(t => p.types.includes(t)) && x.genus !== p.genus).map(x => x.name), 3, "genr" + p.id);
      add(grp, tierAt(P === 3 ? 1 : 2), `Which Pokémon is known as the ${p.genus}?`, S, wn, `${S} is the ${p.genus}.`, src, "genusr", p.id);
    }
  }
  // Abilities
  if (p.abilities.length) {
    const ans = p.abilities[0];
    const mine = new Set([...p.abilities, ...p.hidden]);
    const pool = sameGen.flatMap(x => [...x.abilities]).filter(a => !mine.has(a));
    const w = pickWrong(ans, pool, 3, "ab" + p.id);
    add(grp, tierAt(P >= 3 ? 1 : P === 2 ? 2 : 2 + (P === 0)), `Which of these is one of ${S}'s Abilities?`, ans, w,
      `${S}'s standard Abilit${p.abilities.length > 1 ? "ies are " + p.abilities.join(" and ") : "y is " + ans}${p.hidden.length ? `, and its Hidden Ability is ${p.hidden[0]}` : ""}.`, bsrc, "ability", p.id);
  }
  if (p.hidden.length && P >= 1) {
    const ans = p.hidden[0], mine = new Set([...p.abilities, ...p.hidden]);
    const pool = DEX.filter(x => x.types.some(t => p.types.includes(t))).flatMap(x => x.hidden).filter(a => !mine.has(a));
    const w = pickWrong(ans, pool, 3, "hab" + p.id);
    add(grp, P >= 2 ? "h" : "x", `What is ${S}'s Hidden Ability?`, ans, w, `${S}'s Hidden Ability is ${ans}; its standard Abilit${p.abilities.length > 1 ? "ies are " + p.abilities.join(" and ") : "y is " + p.abilities[0]}.`, bsrc, "hidden", p.id);
  }
  // Evolution
  if (p.from_) {
    const pre = BY[p.from_];
    const pool = near.filter(x => x.id !== pre.id && x.id !== p.id && !(children[pre.id] || []).includes(x.id) && x.types.some(t => pre.types.includes(t) || p.types.includes(t))).map(x => x.name);
    const w = pickWrong(pre.name, pool.length >= 3 ? pool : near.map(x => x.name).filter(n => n !== pre.name), 3, "from" + p.id);
    add(grp, tierAt(P === 3 ? 0 : P === 2 ? 1 : P === 1 ? 2 : 2), `Which Pokémon evolves into ${S}?`, pre.name, w, `${pre.name} evolves into ${S}.`, bsrc, "evofrom", p.id);
    const e = p.evo;
    if (e && e.trigger === "level-up" && e.level && (children[pre.id] || []).length === 1) {
      const ans = "Level " + e.level, r = rng(hash("lv" + p.id)), c = new Set();
      while (c.size < 6) { const d = [2, 3, 4, 5, 6, 8, 10, 12][Math.floor(r() * 8)] * (r() < .5 ? -1 : 1); const L = e.level + d; if (L > 1 && L <= 100) c.add("Level " + L); }
      add(grp, tierAt(P === 3 ? 2 : P === 2 ? 2 : 3), `At what level does ${pre.name} evolve into ${S}?`, ans, pickWrong(ans, [...c], 3, "lvw" + p.id),
        `${pre.name} evolves into ${S} starting at level ${e.level}.`, bsrc, "evolevel", p.id);
    }
    if (e && e.trigger === "use-item" && e.item) {
      const stones = ["Fire Stone", "Water Stone", "Thunder Stone", "Leaf Stone", "Moon Stone", "Sun Stone", "Shiny Stone", "Dusk Stone", "Dawn Stone", "Ice Stone"];
      const pool = stones.includes(e.item) ? stones : [...stones, "Linking Cord", "Oval Stone", "King's Rock"];
      add(grp, tierAt(P === 3 ? 0 : P === 2 ? 1 : 2), `Which item makes ${pre.name} evolve into ${S}?`, e.item, pickWrong(e.item, pool, 3, "item" + p.id),
        `Using a ${e.item} on ${pre.name} evolves it into ${S}.`, bsrc, "evoitem", p.id);
    }
    if (e && e.trigger === "trade" && !e.held && P >= 1) {
      const w = ["Using a Thunder Stone", "Leveling up at night", "Reaching level 36"];
      add(grp, tierAt(P >= 2 ? 1 : 2), `How does ${pre.name} evolve into ${S}?`, "Being traded", w, `${pre.name} evolves into ${S} when it is traded.`, bsrc, "evotrade", p.id);
    }
  }
  // Evolves into (single evolution only)
  if ((children[p.id] || []).length === 1 && P >= 1) {
    const kid = BY[children[p.id][0]];
    const pool = near.filter(x => x.id !== kid.id && x.id !== p.id && x.from_ !== p.id && x.types.some(t => kid.types.includes(t))).map(x => x.name);
    add(grp, tierAt(P === 3 ? 0 : P === 2 ? 1 : 2), `Which Pokémon does ${S} evolve into?`, kid.name, pickWrong(kid.name, pool.length >= 3 ? pool : near.map(x => x.name).filter(n => n !== kid.name && n !== S), 3, "into" + p.id),
      `${S} evolves into ${kid.name}.`, bpPage(kid), "evointo", p.id);
  }
  // Which of these is a <type>-type Pokémon? (well-known ones only)
  if (P >= 2) {
    const t0 = p.types[hash("tt" + p.id) % p.types.length];
    const pool = DEX.filter(x => pop(x) >= 2 && !x.types.includes(t0)).map(x => x.name);
    add(grp, P === 3 ? "e" : "m", `Which of these is ${an(T(t0))}-type Pokémon?`, S, pickWrong(S, pool, 3, "tt" + p.id),
      `${S} is ${an(typeWord(p))}-type Pokémon.`, src, "istype", p.id);
  }
  // Matchups (by type only, ignoring Abilities)
  {
    const m = Object.fromEntries(TYPES.map(t => [t, mult(t, p)]));
    const four = TYPES.filter(t => m[t] === 4);
    if (four.length === 1 && P >= 1) {
      const w = pickWrong(T(four[0]), TYPES.filter(t => m[t] <= 1).map(T), 3, "4x" + p.id);
      add(grp, tierAt(P === 3 ? 1 : 2), `Going by its types, which attack type does 4× damage to ${S}?`, T(four[0]), w,
        `${S} is ${typeWord(p)}, and ${T(four[0])} is super effective against both of its types, so it does 4× damage.`, bp("Type"), "4x", p.id);
    }
    const se = TYPES.filter(t => m[t] >= 2), weakNot = TYPES.filter(t => m[t] <= 1);
    if (se.length) {
      const ans = T(se[hash("se" + p.id) % se.length]);
      add(grp, tierAt(P === 3 ? 0 : P === 2 ? 1 : 2), `Which of these attack types is super effective against ${S}?`, ans, pickWrong(ans, weakNot.map(T), 3, "sew" + p.id),
        `${S} is ${typeWord(p)}, so ${ans}-type moves hit it for ${m[ans.toLowerCase()]}× damage. It's weak to ${se.map(T).join(", ")}.`, src, "weak", p.id);
    }
    const imm = TYPES.filter(t => m[t] === 0);
    if (imm.length === 1 && P >= 1) {
      const w = pickWrong(T(imm[0]), TYPES.filter(t => m[t] >= 1).map(T), 3, "imm" + p.id);
      add(grp, tierAt(P >= 2 ? 1 : 2), `Going by its types, which attack type has no effect on ${S}?`, T(imm[0]), w,
        `${S} is ${typeWord(p)}, which makes it immune to ${T(imm[0])}-type moves.`, bp("Type"), "immune", p.id);
    }
  }
  // Highest base stat (no ties)
  if (P >= 1) {
    const e = Object.entries(p.stats).sort((a, b) => b[1] - a[1]);
    if (e[0][1] > e[1][1]) {
      const ans = stat[e[0][0]];
      add(grp, P >= 2 ? "h" : "x", `Which is ${S}'s highest base stat?`, ans, pickWrong(ans, Object.values(stat), 3, "st" + p.id),
        `${S}'s highest base stat is ${ans} at ${e[0][1]}.`, bsrc, "beststat", p.id);
    }
  }
  // Legendary / Mythical
  const PARADOX = new Set([984,985,986,987,988,989,990,991,992,993,994,995,1005,1006,1007,1008,1009,1010,1020,1021,1022,1023]);
  if ((p.legendary || p.mythical) && !PARADOX.has(p.id)) {
    const ans = p.mythical ? "Mythical Pokémon" : "Legendary Pokémon";
    add(grp, tierAt(P >= 2 ? 1 : 2), `Which special status does ${S} have?`, ans, ["Ultra Beast", "Paradox Pokémon", "Baby Pokémon"].filter(x => x !== ans).slice(0, 2).concat(p.mythical ? ["Legendary Pokémon"] : ["Mythical Pokémon"]),
      `${S} is classed as a ${ans}.`, bsrc, "status", p.id);
  }

  // ---------- Who's That Pokémon? ----------
  {
    const kids = (children[p.id] || []).map(i => BY[i].name), pre = p.from_ ? BY[p.from_].name : null;
    const ty = typeWord(p), tier = tierAt(P === 3 ? 0 : P === 2 ? 1 : P === 1 ? 2 : 2 + (hash("w" + p.id) % 2));
    let clue, fits;
    if (tier === "e") {
      clue = `I'm the ${p.genus}, ${an(ty)}-type Pokémon.` + (kids.length ? ` I evolve into ${kids.join(" or ")}.` : pre ? ` I evolve from ${pre}.` : p.legendary ? " I'm a Legendary Pokémon." : p.mythical ? " I'm a Mythical Pokémon." : "");
      fits = x => x.genus === p.genus && typeWord(x) === ty;
    } else if (tier === "m") {
      clue = `I'm the ${p.genus}, ${an(ty)}-type Pokémon first found in the ${REGION[p.gen]} region (Generation ${ROMAN[p.gen]}).`;
      fits = x => x.genus === p.genus;
    } else if (tier === "h") {
      clue = `I'm ${an(p.color)}, ${ty}-type Pokémon from Generation ${ROMAN[p.gen]}. My category is the ${p.genus}.`;
      fits = x => x.genus === p.genus;
    } else {
      const ab = p.abilities[0];
      clue = `I'm ${an(p.color)}, ${ty}-type Pokémon from Generation ${ROMAN[p.gen]}, and one of my Abilities is ${ab}.`;
      fits = x => x.color === p.color && typeWord(x) === ty && x.gen === p.gen && [...x.abilities, ...x.hidden].includes(ab);
    }
    let pool = DEX.filter(x => x.id !== p.id && !fits(x) && x.genus !== p.genus && x.types.some(t => p.types.includes(t)) && Math.abs(x.gen - p.gen) <= 1);
    if (pool.length < 3) pool = DEX.filter(x => x.id !== p.id && !fits(x));
    const w = pickWrong(S, pool.map(x => x.name), 3, "who" + p.id);
    if (w) WHO.push([tier, clue, S, w, `It's ${S}, the ${p.genus} (${num(p.id)}), ${an(ty)}-type Pokémon from Generation ${ROMAN[p.gen]}.`, src, "G" + p.gen]);
  }
}

// ---------- type chart ----------
{
  const name = T, starters = ["fire", "water", "grass"];
  for (const d of TYPES) {
    const se = TYPES.filter(a => EFF[a][d] === 2), nve = TYPES.filter(a => EFF[a][d] === .5), imm = TYPES.filter(a => EFF[a][d] === 0);
    const tier = starters.includes(d) || ["electric", "ground", "rock", "ice"].includes(d) ? "e" : ["dragon", "fairy", "ghost", "dark", "steel"].includes(d) ? "m" : "m";
    if (se.length) {
      const ans = name(se[hash("tc" + d) % se.length]);
      add(TYPEG, tier, `Which attack type is super effective against ${name(d)}-type Pokémon?`, ans, pickWrong(ans, TYPES.filter(a => EFF[a][d] <= 1).map(name), 3, "tcw" + d),
        `${name(d)}-type Pokémon are weak to ${se.map(name).join(", ")}.`, bp(name(d) + " (type)"), "tc-weak", null);
      if (se.length > 1) {
        const ans2 = name(se[(hash("tc2" + d) + 1) % se.length]);
        if (ans2 !== ans) add(TYPEG, "m", `${name(d)}-type Pokémon take double damage from which of these attack types?`, ans2, pickWrong(ans2, TYPES.filter(a => EFF[a][d] <= 1).map(name), 3, "tc2w" + d),
          `${name(d)}-type Pokémon are weak to ${se.map(name).join(", ")}.`, bp(name(d) + " (type)"), "tc-weak2", null);
      }
    }
    if (nve.length) {
      const ans = name(nve[hash("res" + d) % nve.length]);
      add(TYPEG, "h", `Which attack type is not very effective (½×) against ${name(d)}-type Pokémon?`, ans, pickWrong(ans, TYPES.filter(a => EFF[a][d] >= 1).map(name), 3, "resw" + d),
        `${name(d)}-type Pokémon resist ${nve.map(name).join(", ")}.`, bp(name(d) + " (type)"), "tc-resist", null);
    }
    for (const a of imm) add(TYPEG, ["ghost", "ground"].includes(d) || a === "electric" ? "m" : "h", `Which attack type has no effect on ${name(d)}-type Pokémon?`, name(a),
      pickWrong(name(a), TYPES.filter(x => EFF[x][d] >= 1).map(name), 3, "immw" + d + a), `${name(a)}-type moves don't affect ${name(d)}-type Pokémon at all.`, bp(name(d) + " (type)"), "tc-imm", null);
  }
  for (const a of TYPES) {
    const good = TYPES.filter(d => EFF[a][d] === 2);
    if (good.length) {
      const ans = name(good[hash("off" + a) % good.length]);
      add(TYPEG, ["fire", "water", "grass", "electric"].includes(a) ? "e" : "m", `${name(a)}-type moves are super effective against which type?`, ans,
        pickWrong(ans, TYPES.filter(d => EFF[a][d] <= 1).map(name), 3, "offw" + a), `${name(a)}-type moves are super effective against ${good.map(name).join(", ")}.`, bp(name(a) + " (type)"), "tc-off", null);
    }
    const zero = TYPES.filter(d => EFF[a][d] === 0);
    for (const d of zero) add(TYPEG, "h", `${name(a)}-type moves have no effect on which type?`, name(d), pickWrong(name(d), TYPES.filter(x => EFF[a][x] >= 1).map(name), 3, "zw" + a + d),
      `${name(d)}-type Pokémon are immune to ${name(a)}-type moves.`, bp(name(a) + " (type)"), "tc-zero", null);
  }
  // dual-type multipliers on random pairs
  const r = rng(77);
  const pairs = new Set(); while (pairs.size < 60) { const a = TYPES[Math.floor(r() * 18)], b = TYPES[Math.floor(r() * 18)], c = TYPES[Math.floor(r() * 18)]; if (b !== c) pairs.add([a, b, c].join(",")); }
  const lab = { 0: "No effect (0×)", 0.25: "¼×", 0.5: "½×", 1: "1× (normal)", 2: "2×", 4: "4×" };
  for (const s of pairs) {
    const [a, b, c] = s.split(","), m = EFF[a][b] * EFF[a][c];
    const ans = lab[m];
    add(TYPEG, "x", `How much damage does ${an(name(a))}-type move do to a ${name(b)}/${name(c)} Pokémon?`, ans, pickWrong(ans, Object.values(lab), 3, "dual" + s),
      `${name(a)} does ${EFF[a][b]}× to ${name(b)} and ${EFF[a][c]}× to ${name(c)}, so ${m}× in total.`, bp("Type"), "tc-dual", null);
  }
  add(TYPEG, "e", "How many types are there in the Pokémon games today?", "18", ["15", "17", "20"], "There are 18 types since Fairy joined in Generation VI.", bp("Type"), "tc-misc", null);
  add(TYPEG, "m", "Which type was added in Generation VI?", "Fairy", ["Dark", "Steel", "Dragon"], "Fairy arrived with X and Y; Dark and Steel had arrived in Generation II.", bp("Fairy (type)"), "tc-misc", null);
  add(TYPEG, "h", "Which two types were added in Generation II?", "Dark and Steel", ["Fairy and Dark", "Steel and Dragon", "Ghost and Dark"], "Gold and Silver introduced the Dark and Steel types.", bp("Type"), "tc-misc", null);
}

// ---------- natures ----------
{
  const flav = { 1: "Spicy", 2: "Dry", 3: "Sweet", 4: "Bitter", 5: "Sour" };
  const S = s => stat[s];
  const real = BAT.natures.filter(n => n.inc !== n.dec), neutral = BAT.natures.filter(n => n.inc === n.dec).map(n => n.name);
  const src = bp("Nature");
  for (const n of real) {
    const t = ["Adamant", "Modest", "Jolly", "Timid", "Bold", "Calm", "Brave", "Quiet", "Impish", "Careful"].includes(n.name) ? "m" : "h";
    const statsL = Object.values(stat).filter(x => x !== "HP");
    add(NATG, t, `Which stat does ${an(n.name)} nature raise?`, S(n.inc), pickWrong(S(n.inc), statsL.filter(x => x !== S(n.dec)), 3, "ninc" + n.name),
      `${n.name} raises ${S(n.inc)} and lowers ${S(n.dec)} by 10%.`, src, "nat-inc", null);
    add(NATG, t === "m" ? "h" : "x", `Which stat does ${an(n.name)} nature lower?`, S(n.dec), pickWrong(S(n.dec), statsL.filter(x => x !== S(n.inc)), 3, "ndec" + n.name),
      `${n.name} raises ${S(n.inc)} and lowers ${S(n.dec)} by 10%.`, src, "nat-dec", null);
    const others = real.filter(x => x.name !== n.name).map(x => x.name);
    add(NATG, t === "m" ? "h" : "x", `Which nature raises ${S(n.inc)} and lowers ${S(n.dec)}?`, n.name, pickWrong(n.name, others, 3, "nrev" + n.name),
      `${n.name} is the nature that boosts ${S(n.inc)} at the cost of ${S(n.dec)}.`, src, "nat-rev", null);
    add(NATG, "x", `Which Berry flavor does a Pokémon with ${an(n.name)} nature like?`, flav[n.likes], pickWrong(flav[n.likes], Object.values(flav).filter(f => f !== flav[n.hates]), 3, "nfl" + n.name),
      `${n.name} Pokémon like ${flav[n.likes]} food and dislike ${flav[n.hates]} food, matching the stats it raises and lowers.`, src, "nat-flavor", null);
  }
  add(NATG, "e", "How many natures are there?", "25", ["12", "20", "30"], "There are 25 natures, five of which (like Hardy) don't change any stat.", src, "nat-misc", null);
  add(NATG, "m", "Which of these natures doesn't change any stat?", neutral[0], real.slice(0, 3).map(n => n.name), `${neutral.join(", ")} are the neutral natures; they raise and lower the same stat.`, src, "nat-misc", null);
  add(NATG, "m", "Which of these natures doesn't change any stat?", neutral[3], real.slice(5, 8).map(n => n.name), `${neutral.join(", ")} are the neutral natures; they raise and lower the same stat.`, src, "nat-misc", null);
  add(NATG, "h", "By how much does a nature raise or lower a stat?", "10%", ["5%", "20%", "25%"], "A nature raises one stat by 10% and lowers another by 10%.", src, "nat-misc", null);
  add(NATG, "h", "Which stat can a nature never change?", "HP", ["Speed", "Sp. Def", "Attack"], "Natures affect Attack, Defense, Sp. Atk, Sp. Def and Speed, but never HP.", src, "nat-misc", null);
  add(NATG, "h", "In which generation were natures introduced?", "Generation III", ["Generation II", "Generation IV", "Generation I"], "Natures arrived in Ruby and Sapphire.", src, "nat-misc", null);
  add(NATG, "x", "Which item lets a Pokémon's stats act as if it had a different nature?", "Mint", ["Everstone", "Ability Capsule", "Bottle Cap"], "Mints, added in Sword and Shield, change which stats the nature boosts and lowers.", bp("Mint"), "nat-misc", null);
  add(NATG, "h", "Which held item passes a parent's nature on to an Egg?", "Everstone", ["Destiny Knot", "Power Anklet", "Lucky Egg"], "When a parent holds an Everstone at the Day Care or Nursery, the Egg inherits that parent's nature.", bp("Everstone"), "nat-misc", null);
}

const out = { groups: [...GROUPS, TYPEG, NATG], who: WHO };
fs.mkdirSync(__dirname + "/gen", { recursive: true });
fs.writeFileSync(__dirname + "/gen/pokedex.json", JSON.stringify(out));
const by = {}; for (const g of out.groups) for (const q of g.qs) by[q[0]] = (by[q[0]] || 0) + 1;
const wb = {}; for (const q of WHO) wb[q[0]] = (wb[q[0]] || 0) + 1;
console.log("pokedex groups", out.groups.map(g => g.id + ":" + g.qs.length).join(" "), "by tier", by, "who", WHO.length, wb);
