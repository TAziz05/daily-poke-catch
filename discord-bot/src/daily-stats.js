// How everyone did on today's Daily, so each player can see how they compare.
// Website and Twitch-panel players send only their answers for today's Daily and a random device ID (so each device
// counts once). Discord players are counted from the results the bot already keeps. Nothing else is stored, and
// rows older than 60 days are deleted. Numbers are only shown once at least MIN players have finished that day.

const MIN = 4;
const ORIGIN = /^https:\/\/(taziz05\.github\.io|[a-z0-9]+\.ext-twitch\.tv)$/;

function cors(req) {
  const o = req.headers.get("origin") || "";
  return {
    "access-control-allow-origin": ORIGIN.test(o) || /^https?:\/\/localhost(:\d+)?$/.test(o) ? o : "https://taziz05.github.io",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

let ready = false;
export async function dailyStats(env, req, path, { db, day, questions }) {
  const h = cors(req);
  const out = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...h, "content-type": "application/json", "cache-control": "no-store" } });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
  const D = await db(env);
  if (!ready) { await D.prepare("CREATE TABLE IF NOT EXISTS web_results (dev TEXT, day TEXT, marks TEXT, score INTEGER, PRIMARY KEY (dev, day))").run(); ready = true; }

  if (path === "/stats/result" && req.method === "POST") {
    const b = await req.json().catch(() => null), qs = await questions(env, day);
    if (!b || !qs || typeof b.dev !== "string" || !/^[a-z0-9]{16,40}$/.test(b.dev) || !Array.isArray(b.marks) || b.marks.length !== qs.length
      || JSON.stringify(b.ids) !== JSON.stringify(qs.map(q => q.id))) return out({ error: "not today's daily" }, 400);
    const marks = b.marks.map(x => (x ? "1" : "0")).join("");
    const cutoff = new Date(Date.parse(day + "T12:00:00Z") - 60 * 864e5).toISOString().slice(0, 10);
    await D.batch([
      D.prepare("INSERT OR IGNORE INTO web_results (dev, day, marks, score) VALUES (?, ?, ?, ?)").bind(b.dev, day, marks, [...marks].filter(c => c === "1").length),
      D.prepare("DELETE FROM web_results WHERE day < ?").bind(cutoff),
    ]);
    return out(await summary(D, day));
  }
  if (path === "/stats/daily") return out(await summary(D, day));
  return out({ error: "not found" }, 404);
}

async function summary(D, day) {
  const r = await D.prepare("SELECT marks FROM web_results WHERE day = ?1 UNION ALL SELECT marks FROM results WHERE day = ?1 AND done = 1").bind(day).all();
  const rows = (r.results || []).map(x => x.marks).filter(m => typeof m === "string" && /^[01]{5}$/.test(m));
  const n = rows.length;
  if (n < MIN) return { day, n, min: MIN };
  const dist = [0, 0, 0, 0, 0, 0], q = [0, 0, 0, 0, 0];
  for (const m of rows) { let s = 0; [...m].forEach((c, i) => { if (c === "1") { s++; q[i]++; } }); dist[s]++; }
  return { day, n, min: MIN, dist, q: q.map(v => Math.round((100 * v) / n)) };
}
