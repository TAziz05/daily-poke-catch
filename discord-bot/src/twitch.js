// Twitch extension backend (EBS) on the same Worker as the Discord bot.
// Viewers and the streamer call these routes from the extension with the JWT Twitch gives them.
// Live play-along: the streamer starts a question, viewers answer before the timer runs out, the streamer reveals it,
// and every viewer sees the right answer and how chat split. Updates reach viewers through Extension PubSub.
//
// Secrets (Cloudflare → Worker → Settings → Variables and Secrets):
//   TWITCH_EXT_CLIENT_ID  the extension's Client ID
//   TWITCH_EXT_SECRET     the extension's secret (the base64 string from the Twitch console)
//   TWITCH_EXT_OWNER_ID   the Twitch user ID of the account that owns the extension
import { GAME } from "./progress.js";

const SESSION_HOURS = 12;   // "this stream" = answers in the last 12 hours
const RECENT = 60;          // don't repeat any of the last 60 random questions in a channel
const SRC = { b: "https://bulbapedia.bulbagarden.net/wiki/", p: "https://www.pokemon.com/us/pokedex/", w: "https://en.wikipedia.org/wiki/", f: "https://pokemon.fandom.com/wiki/" };
const fullSource = s => (typeof s === "string" && /^[bpwf]:/.test(s) ? SRC[s[0]] + s.slice(2) : s || "");

// ---------- helpers ----------
const b64 = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=")), c => c.charCodeAt(0));
const b64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const enc = s => new TextEncoder().encode(s);
async function hmacKey(env, use) {
  return crypto.subtle.importKey("raw", b64(env.TWITCH_EXT_SECRET), { name: "HMAC", hash: "SHA-256" }, false, [use]);
}
// Checks the JWT Twitch signed for this viewer or streamer. Returns its claims, or null.
export async function verifyJwt(env, token) {
  const [h, p, s] = String(token || "").split(".");
  if (!s || !env.TWITCH_EXT_SECRET) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await hmacKey(env, "verify"), b64(s), enc(h + "." + p));
    if (!ok) return null;
    const claims = JSON.parse(new TextDecoder().decode(b64(p)));
    if (!claims.exp || claims.exp * 1000 < Date.now() || !claims.channel_id) return null;
    return claims;
  } catch (e) { return null; }
}
export async function signJwt(env, claims) {
  const head = b64url(enc(JSON.stringify({ alg: "HS256", typ: "JWT" }))), body = b64url(enc(JSON.stringify(claims)));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(env, "sign"), enc(head + "." + body));
  return `${head}.${body}.${b64url(sig)}`;
}
// Sends a message to every viewer of the channel who has the extension open.
async function broadcast(env, channel, message) {
  if (!env.TWITCH_EXT_CLIENT_ID || !env.TWITCH_EXT_OWNER_ID) return;
  const jwt = await signJwt(env, { exp: Math.floor(Date.now() / 1000) + 60, user_id: String(env.TWITCH_EXT_OWNER_ID), role: "external", channel_id: String(channel), pubsub_perms: { send: ["broadcast"] } });
  const r = await fetch("https://api.twitch.tv/helix/extensions/pubsub", {
    method: "POST",
    headers: { authorization: "Bearer " + jwt, "client-id": env.TWITCH_EXT_CLIENT_ID, "content-type": "application/json" },
    body: JSON.stringify({ target: ["broadcast"], broadcaster_id: String(channel), is_global_broadcast: false, message: JSON.stringify(message) }),
  }).catch(e => ({ ok: false, status: 0, text: async () => String(e) }));
  if (!r.ok) console.log("twitch pubsub", r.status, await r.text());
}

// ---------- questions ----------
let bank = null, bankAt = 0;
async function questionBank(site) {
  if (bank && Date.now() - bankAt < 10 * 60e3) return bank;
  const r = await fetch(site + "/twitch-data.json", { cf: { cacheTtl: 600, cacheEverything: true } });
  if (!r.ok) throw new Error("twitch-data.json " + r.status);
  const g = await r.json();
  bank = g.data.questions; bankAt = Date.now();
  return bank;
}
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const TIER = t => ({ e: "Easy", m: "Medium", h: "Hard", x: "Impossible" })[t] || "";

// ---------- database ----------
let ready = false;
async function tdb(env) {
  if (!ready) {
    await env.DB.batch([
      env.DB.prepare("CREATE TABLE IF NOT EXISTS twitch_rounds (channel_id TEXT PRIMARY KEY, data TEXT, recent TEXT)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS twitch_answers (round_id TEXT, viewer TEXT, channel_id TEXT, pick INTEGER, ok INTEGER, ts INTEGER, PRIMARY KEY (round_id, viewer))"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS twitch_answers_viewer ON twitch_answers (channel_id, viewer, ts)"),
    ]);
    ready = true;
  }
  return env.DB;
}
async function getRound(env, channel) {
  const r = await (await tdb(env)).prepare("SELECT data, recent FROM twitch_rounds WHERE channel_id=?").bind(String(channel)).first();
  if (!r) return { round: null, recent: [] };
  let round = null, recent = [];
  try { round = JSON.parse(r.data); } catch (e) {}
  try { recent = JSON.parse(r.recent || "[]"); } catch (e) {}
  return { round, recent };
}
async function saveRound(env, channel, round, recent) {
  await (await tdb(env)).prepare("INSERT INTO twitch_rounds (channel_id,data,recent) VALUES (?,?,?) ON CONFLICT(channel_id) DO UPDATE SET data=excluded.data, recent=excluded.recent")
    .bind(String(channel), JSON.stringify(round), JSON.stringify(recent.slice(-RECENT))).run();
}
async function counts(env, roundId) {
  const { results } = await (await tdb(env)).prepare("SELECT pick, COUNT(*) n FROM twitch_answers WHERE round_id=? GROUP BY pick").bind(roundId).all();
  const c = [0, 0, 0, 0];
  for (const r of results) if (r.pick >= 0 && r.pick < 4) c[r.pick] = r.n;
  return c;
}
async function sessionScore(env, channel, viewer) {
  const since = Date.now() - SESSION_HOURS * 3600e3;
  const r = await (await tdb(env)).prepare("SELECT COUNT(*) total, SUM(ok) correct FROM twitch_answers WHERE channel_id=? AND viewer=? AND ts>?").bind(String(channel), viewer, since).first();
  return { right: r?.correct || 0, total: r?.total || 0 };
}
async function sessionSummary(env, channel) {
  const since = Date.now() - SESSION_HOURS * 3600e3;
  const r = await (await tdb(env)).prepare("SELECT COUNT(DISTINCT round_id) rounds, COUNT(DISTINCT viewer) players, COUNT(*) answers, SUM(ok) correct FROM twitch_answers WHERE channel_id=? AND ts>?").bind(String(channel), since).first();
  return { rounds: r?.rounds || 0, players: r?.players || 0, answers: r?.answers || 0, right: r?.correct || 0 };
}

// What a viewer may see: no answer until it's revealed.
function publicRound(round) {
  if (!round) return null;
  const { a, e, s, ...rest } = round;
  return round.revealed ? { ...rest, a, e, s } : rest;
}

// Live play-along answers are kept for 30 days (see privacy.html), then deleted on the hourly check.
export async function twitchCleanup(env) {
  await (await tdb(env)).prepare("DELETE FROM twitch_answers WHERE ts<?").bind(Date.now() - 30 * 864e5).run();
}

// ---------- routes ----------
function cors(req) {
  const o = req.headers.get("origin") || "";
  return {
    "access-control-allow-origin": /^https:\/\/[a-z0-9]+\.ext-twitch\.tv$/.test(o) || /^https?:\/\/localhost(:\d+)?$/.test(o) ? o : "https://extension-files.twitch.tv",
    "access-control-allow-headers": "authorization, content-type",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}
export async function twitch(env, req, path, ctx, site) {
  const H = cors(req);
  const out = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...H, "content-type": "application/json", "cache-control": "no-store" } });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: H });
  if (!env.TWITCH_EXT_SECRET) return out({ error: "The Twitch extension secret isn't set on the Worker yet." }, 503);
  const claims = await verifyJwt(env, (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, ""));
  if (!claims) return out({ error: "not signed in" }, 401);
  const channel = String(claims.channel_id), viewer = claims.opaque_user_id || "", isStreamer = claims.role === "broadcaster";
  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const now = Date.now();

  if (path === "/twitch/state") {
    const { round } = await getRound(env, channel);
    const res = { game: GAME.name, round: publicRound(round), now };
    if (round && viewer) {
      const mine = await (await tdb(env)).prepare("SELECT pick FROM twitch_answers WHERE round_id=? AND viewer=?").bind(round.id, viewer).first();
      res.pick = mine ? mine.pick : null;
    }
    if (round && (round.revealed || isStreamer)) res.counts = round.revealed && round.counts ? round.counts : await counts(env, round.id);
    if (isStreamer) { res.answer = round ? round.a : null; res.session = await sessionSummary(env, channel); }
    if (viewer && !viewer.startsWith("A")) res.you = await sessionScore(env, channel, viewer);
    return out(res);
  }

  if (path === "/twitch/answer" && req.method === "POST") {
    if (!viewer || viewer.startsWith("A")) return out({ error: "Log in to Twitch to play along." }, 403);
    const { round } = await getRound(env, channel);
    const pick = body.pick | 0;
    if (!round || round.id !== body.round || round.revealed) return out({ error: "That question is closed." }, 409);
    if (now > round.ends + 1500) return out({ error: "Time's up for that one." }, 409);
    if (pick < 0 || pick >= round.opts.length) return out({ error: "bad pick" }, 400);
    const r = await (await tdb(env)).prepare("INSERT OR IGNORE INTO twitch_answers (round_id,viewer,channel_id,pick,ok,ts) VALUES (?,?,?,?,?,?)")
      .bind(round.id, viewer, channel, pick, pick === round.a ? 1 : 0, now).run();
    return out({ ok: true, locked: !(r.meta?.changes ?? 1) });
  }

  if (!isStreamer) return out({ error: "Only the streamer can do that." }, 403);

  if (path === "/twitch/start" && req.method === "POST") {
    const seconds = Math.max(10, Math.min(120, body.seconds | 0 || 30));
    const { recent } = await getRound(env, channel);
    let q;
    if (body.source === "daily") {
      // One of today's Daily set questions (the same five everyone gets on the site and in Discord).
      const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
      const r = await fetch(`${site}/daily/${day.slice(0, 7)}.json`, { cf: { cacheTtl: 600, cacheEverything: true } });
      const qs = r.ok ? (await r.json())[day] : null;
      const d = qs && qs[Math.max(0, Math.min(qs.length - 1, body.index | 0))];
      if (!d) return out({ error: "Today's daily questions aren't available yet." }, 503);
      q = { qid: d.id, t: d.t, q: d.q, opts: d.opts, a: d.a, e: d.e, s: fullSource(d.s), clue: !!(d.clue || d.who), label: `Today's Daily · Question ${(body.index | 0) + 1}` };
    } else {
      const t = ["e", "m", "h", "x"].includes(body.tier) ? body.tier : "m";
      const all = await questionBank(site);
      let pool = all.filter(x => x.t === t && !recent.includes(x.id));
      if (!pool.length) pool = all.filter(x => x.t === t);
      const x = pool[Math.floor(Math.random() * pool.length)];
      const opts = shuffle([x.a, ...x.w]);
      q = { qid: x.id, t, q: x.q, opts, a: opts.indexOf(x.a), e: x.e || "", s: fullSource(x.s), clue: !!x.clue, label: `Random · ${TIER(t)}` };
    }
    const round = { id: crypto.randomUUID(), ...q, tier: TIER(q.t), started: now, ends: now + seconds * 1000, seconds, revealed: false };
    await saveRound(env, channel, round, [...recent, q.qid]);
    ctx.waitUntil(broadcast(env, channel, { type: "round", round: publicRound(round) }));
    return out({ ok: true, round, answer: round.a });
  }

  if (path === "/twitch/reveal" && req.method === "POST") {
    const { round, recent } = await getRound(env, channel);
    if (!round) return out({ error: "No question is running." }, 409);
    if (!round.revealed) {
      round.revealed = true; round.counts = await counts(env, round.id); round.ends = Math.min(round.ends, now);
      await saveRound(env, channel, round, recent);
    }
    ctx.waitUntil(broadcast(env, channel, { type: "reveal", round: publicRound(round), counts: round.counts }));
    return out({ ok: true, round, counts: round.counts });
  }

  if (path === "/twitch/end" && req.method === "POST") {
    const { recent } = await getRound(env, channel);
    await (await tdb(env)).prepare("UPDATE twitch_rounds SET data='null' WHERE channel_id=?").bind(channel).run();
    ctx.waitUntil(broadcast(env, channel, { type: "end" }));
    return out({ ok: true, recent: recent.length });
  }

  return out({ error: "not found" }, 404);
}
