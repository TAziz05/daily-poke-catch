// Achievements and saved progress for Discord players.
// The full game keeps progress in the browser under keys that start with PREFIX. The Activity sends those keys
// here, and they are stored per Discord account, so progress follows the player to every device that opens the Activity.
// Keep EGGS and MILES in step with the Achievements block in build/template.html.

export const GAME = {
  name: "Daily Poké Catch",
  prefix: "pokecatch",   // every saved key starts with this
  dayKey: "pokecatch1",  // results for one day's set: pokecatch1:YYYY-MM-DD:main|e|m|h|x
  topTier: "Impossible",
};

export const EGGS = [
  ["grass", "Wild Encounter", "Caught something hiding in the tall grass"],
  ["shiny", "Shiny Hunter", "Spotted a shiny wild question"],
  ["moon", "Wishing Star", "Made a wish on a shooting star"],
  ["retro", "Retro Mode", "Switched to the old four-shade screen"],
  ["evolve", "Evolution", "Watched the emblem evolve"],
];

export const MILES = [
  ["first", "First Catch", "Finish a Daily Catch", s => [s.mains, 1]],
  ["party", "Full Party", "Play all five daily sets in one day", s => [s.fullDay, 1]],
  ["perfect", "Perfect Catch", "Get a perfect Daily Catch", s => [s.perfectMain, 1]],
  ["master", "Pokémon Master", "Go 25/25 in one day", s => [s.perfectDay, 1]],
  ["d3", "Trainer", "Play on 3 different days", s => [s.days, 3]],
  ["d7", "Ace Trainer", "Play on 7 different days", s => [s.days, 7]],
  ["d30", "Champion", "Play on 30 different days", s => [s.days, 30]],
  ["mball", "Master Ball Pro", "Answer 10 Impossible questions right in daily sets", s => [s.topRight, 10]],
  ["s10", "On a Roll", "Reach a 10-question streak in Endless", s => [s.best, 10]],
  ["s25", "Unstoppable", "Reach a 25-question streak in Endless", s => [s.best, 25]],
  ["hunter", "Secret Hunter", "Find every secret", s => [s.secrets, EGGS.length]],
];

const MAX_KEYS = 4000, MAX_VALUE = 20000;
const parse = (s, d) => { try { const v = JSON.parse(s); return v ?? d; } catch (e) { return d; } };

// Combine two sets of saved keys without losing anything: secrets and achievements are added together,
// counters and Endless stats keep the higher number, and a day already played keeps its first result.
export function mergeKeys(base, add) {
  const P = GAME.prefix, out = { ...(base || {}) };
  for (const [k, v] of Object.entries(add || {})) {
    if (typeof k !== "string" || typeof v !== "string" || !k.startsWith(P) || v.length > MAX_VALUE) continue;
    const cur = out[k];
    if (cur == null) { if (Object.keys(out).length < MAX_KEYS) out[k] = v; continue; }
    if (cur === v) continue;
    if (k === P + ":endless") {
      const a = parse(cur, {}), b = parse(v, {});
      out[k] = JSON.stringify({ best: Math.max(a.best || 0, b.best || 0), ...((b.total || 0) > (a.total || 0) ? { right: b.right || 0, total: b.total || 0 } : { right: a.right || 0, total: a.total || 0 }) });
    } else if (k === P + ":secrets" || k === P + ":ach") {
      const a = parse(cur, []), b = parse(v, []);
      if (Array.isArray(a) && Array.isArray(b)) out[k] = JSON.stringify([...new Set([...a, ...b].filter(x => typeof x === "string"))]);
    } else if (k === P + ":eggcounts") {
      const a = parse(cur, {}), b = parse(v, {});
      for (const x of Object.keys(b)) if (typeof b[x] === "number") a[x] = Math.max(a[x] || 0, b[x]);
      out[k] = JSON.stringify(a);
    }
    // Anything else (a day's result, a remembered filter): keep what was saved first.
  }
  return out;
}

// Work out milestone progress from saved keys. tierOf(id) gives a question's tier ("e","m","h","x") when known.
export function statsFrom(keys, tierOf = () => null) {
  const re = new RegExp("^" + GAME.dayKey + ":(\\d{4}-\\d{2}-\\d{2}):(main|e|m|h|x)$"), days = {};
  for (const [k, v] of Object.entries(keys || {})) {
    const m = k.match(re); if (!m) continue;
    const r = parse(v, null); if (!r || !Array.isArray(r.marks)) continue;
    (days[m[1]] = days[m[1]] || {})[m[2]] = r;
  }
  const SETS = ["main", "e", "m", "h", "x"], perfect = r => r && r.marks.length && r.marks.every(Boolean);
  const list = Object.values(days);
  let topRight = 0;
  for (const d of list) for (const [t, r] of Object.entries(d))
    r.marks.forEach((ok, i) => { if (ok && (t === "x" || (t === "main" && tierOf((r.ids || [])[i]) === "x"))) topRight++; });
  const endless = parse(keys?.[GAME.prefix + ":endless"], {}), secrets = parse(keys?.[GAME.prefix + ":secrets"], []);
  return {
    days: list.length, mains: list.filter(d => d.main).length,
    perfectMain: list.some(d => perfect(d.main)) ? 1 : 0,
    fullDay: list.some(d => SETS.every(k => d[k])) ? 1 : 0,
    perfectDay: list.some(d => SETS.every(k => perfect(d[k]))) ? 1 : 0,
    topRight, best: endless.best || 0,
    secrets: Array.isArray(secrets) ? secrets.filter(id => EGGS.some(e => e[0] === id)).length : 0,
  };
}

// The /achievements reply.
export function achievementsEmbed(keys, tierOf, who, color) {
  const st = statsFrom(keys, tierOf), found = new Set(parse(keys?.[GAME.prefix + ":secrets"], []));
  const counts = parse(keys?.[GAME.prefix + ":eggcounts"], {}), seen = new Set(parse(keys?.[GAME.prefix + ":ach"], []));
  const miles = MILES.map(m => { const [c, g] = m[3](st); return { m, c: Math.min(c, g), g, ok: c >= g || seen.has(m[0]) }; });
  const have = miles.filter(x => x.ok).length + EGGS.filter(e => found.has(e[0])).length, total = MILES.length + EGGS.length;
  const bar = "🟨".repeat(Math.round(10 * have / total)) + "⬛".repeat(10 - Math.round(10 * have / total));
  const times = n => (n > 1 ? ` · done ${n}×` : "");
  return {
    title: `${GAME.name} achievements · ${who}`, color,
    description: [`**${have} of ${total} unlocked**`, bar, "", "**Milestones**",
      ...miles.map(({ m, c, g, ok }) => ok ? `✅ **${m[1]}** · ${m[2]}` : `🔒 **${m[1]}** · ${m[2]}${g > 1 ? ` (${c}/${g})` : ""}`),
      "", `**Secrets** · ${found.size ? [...found].filter(id => EGGS.some(e => e[0] === id)).length : 0}/${EGGS.length}`,
      ...EGGS.map(([id, n, d]) => found.has(id) ? `✨ **${n}** · ${d}${times(counts[id] || 1)}` : "❔ Secret achievement"),
    ].join("\n"),
    footer: { text: "Secrets are found in the full game (/play). Progress there is saved to your Discord account." },
  };
}
