// Builds out/data.json: every question with id, tier, group tag and source.
// Pokédex questions come from gen/pokedex.json (made by gen-pokedex.js); series questions
// come from the hand-written group files listed below.
const fs = require("fs");
const B = t => "https://bulbapedia.bulbagarden.net/wiki/" + encodeURIComponent(t.replace(/ /g, "_"));
const W = t => "https://en.wikipedia.org/wiki/" + t;
const F = t => "https://pokemon.fandom.com/wiki/" + encodeURIComponent(t.replace(/ /g, "_"));
const HAND = ["world.js", "people.js", "series.js"]; // new files must be added here
const GROUPS = [];
new Function("GROUPS", "B", "W", "F", HAND.map(f => fs.readFileSync(__dirname + "/" + f, "utf8")).join("\n"))(GROUPS, B, W, F);
const DEX = JSON.parse(fs.readFileSync(__dirname + "/gen/pokedex.json", "utf8"));

const out = [], groupList = [];
for (const g of [...DEX.groups, ...GROUPS]) {
  groupList.push({ id: g.id, ch: g.ch, name: g.name, sub: g.sub, url: g.url });
  for (const r of g.qs) out.push({ t: r[0], q: r[1], a: r[2], w: r[3], e: r[4], s: r[5] || g.url, era: g.id, f: r[6] || g.id, mon: r[7] || undefined, grp: g.id });
}
for (const r of DEX.who) out.push({ t: r[0], q: r[1], a: r[2], w: r[3], e: r[4], s: r[5], era: r[6], kind: "who", clue: true, f: "who", grp: "W" + r[6].slice(1) });

// Stable ids: group + running number within group.
const cnt = {};
for (const q of out) { cnt[q.grp] = (cnt[q.grp] || 0) + 1; q.id = `${q.grp}-${String(cnt[q.grp]).padStart(3, "0")}`; delete q.grp; if (q.mon === undefined) delete q.mon; }

// Validation
const errs = [], seen = new Set();
for (const q of out) {
  if (!["e", "m", "h", "x"].includes(q.t)) errs.push("tier " + q.id);
  if (!Array.isArray(q.w) || q.w.length !== 3) errs.push("needs 3 wrong " + q.id);
  else if (q.w.includes(q.a) || new Set(q.w).size !== 3) errs.push("dup option " + q.id + " " + q.q);
  if (!/^https:\/\/(bulbapedia\.bulbagarden\.net|www\.pokemon\.com|pokemon\.fandom\.com|en\.wikipedia\.org)\//.test(q.s)) errs.push("source " + q.id + " " + q.s);
  if (!q.e) errs.push("no explanation " + q.id);
  const key = q.era + "|" + q.q + "|" + q.a;
  if (seen.has(key)) errs.push("dup question " + q.id + " " + q.q); seen.add(key);
}
if (errs.length) { console.error(errs.join("\n")); process.exit(1); }
fs.mkdirSync(__dirname + "/out", { recursive: true });
fs.writeFileSync(__dirname + "/out/data.json", JSON.stringify({ questions: out, groups: groupList }));
const by = {}; for (const q of out) by[q.t] = (by[q.t] || 0) + 1;
const per = {}; for (const q of out) per[q.era] = (per[q.era] || 0) + 1;
console.log("total", out.length, "by tier", by);
console.log("per group", Object.entries(per).map(([k, v]) => k + ":" + v).join(" "));
