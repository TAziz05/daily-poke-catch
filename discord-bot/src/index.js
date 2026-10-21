// Daily Poké Catch for Discord: slash-command bot + Activity, on one Cloudflare Worker.
// Questions come from the website's daily/YYYY-MM.json files, so the bot, the Activity
// and the website all serve the same Daily Catch each day (America/New_York date).
import ACTIVITY_JS from "./activity-bundle.js";

const TZ = "America/New_York";
const API = env => env.DISCORD_API || "https://discord.com/api/v10";
const SITE = env => (env.SITE_URL || "https://taziz05.github.io/daily-poke-catch").replace(/\/$/, "");
const YELLOW = 0xffcb05, GREEN = 0x3ba55d, RED = 0xed4245;
const LETTERS = ["A", "B", "C", "D"];
const NO_PINGS = { parse: [] };

// ---------- dates ----------
function nyDay(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
function nyHour(d = new Date()) {
  return +new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", hourCycle: "h23" }).format(d);
}
function addDays(day, n) {
  const t = Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10)) + n * 864e5;
  return new Date(t).toISOString().slice(0, 10);
}
function pretty(day) {
  const d = new Date(Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10), 12));
  return d.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" });
}

// ---------- questions ----------
async function dayQuestions(env, day) {
  const r = await fetch(`${SITE(env)}/daily/${day.slice(0, 7)}.json`, { cf: { cacheTtl: 600, cacheEverything: true } });
  if (!r.ok) return null;
  const m = await r.json();
  return m[day] || null;
}

// ---------- database ----------
let schemaReady = false;
async function db(env) {
  if (!schemaReady) {
    await env.DB.batch([
      env.DB.prepare("CREATE TABLE IF NOT EXISTS results (user_id TEXT, day TEXT, marks TEXT, score INTEGER DEFAULT 0, done INTEGER DEFAULT 0, PRIMARY KEY (user_id, day))"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS members (guild_id TEXT, user_id TEXT, name TEXT, PRIMARY KEY (guild_id, user_id))"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS channels (guild_id TEXT PRIMARY KEY, channel_id TEXT, hour INTEGER DEFAULT 9, last_day TEXT)"),
    ]);
    schemaReady = true;
  }
  return env.DB;
}
async function getResult(env, uid, day) {
  return (await db(env)).prepare("SELECT marks, score, done FROM results WHERE user_id=? AND day=?").bind(uid, day).first();
}
async function saveMember(env, guild, user, nick) {
  if (!guild) return;
  const name = nick || user.global_name || user.username;
  await (await db(env)).prepare("INSERT INTO members (guild_id,user_id,name) VALUES (?,?,?) ON CONFLICT(guild_id,user_id) DO UPDATE SET name=excluded.name")
    .bind(guild, user.id, name).run();
}
async function playedDays(env, uid) {
  const { results } = await (await db(env)).prepare("SELECT day FROM results WHERE user_id=? AND done=1 ORDER BY day DESC LIMIT 800").bind(uid).all();
  return results.map(r => r.day);
}
function streaks(days, today) {
  const set = new Set(days);
  let cur = 0, d = set.has(today) ? today : addDays(today, -1);
  while (set.has(d)) { cur++; d = addDays(d, -1); }
  let best = 0, run = 0, prev = null;
  for (const x of [...days].sort()) { run = prev && addDays(prev, 1) === x ? run + 1 : 1; best = Math.max(best, run); prev = x; }
  return { cur, best };
}
const grid = marks => [...marks].map(c => (c === "1" ? "🟢" : "🔴")).join("");

// ---------- Discord helpers ----------
async function discord(env, method, path, body) {
  const r = await fetch(API(env) + path, {
    method,
    headers: { authorization: `Bot ${env.DISCORD_BOT_TOKEN}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) console.log("discord", method, path, r.status, await r.text());
  return r;
}
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });
const reply = (data, ephemeral) => json({ type: 4, data: { allowed_mentions: NO_PINGS, ...data, ...(ephemeral ? { flags: 64 } : {}) } });
const update = data => json({ type: 7, data: { allowed_mentions: NO_PINGS, ...data } });
const btn = (custom_id, label, style = 2, disabled = false) => ({ type: 2, custom_id, label: label.slice(0, 80), style, disabled });
const row = (...components) => ({ type: 1, components });

async function verify(req, env) {
  const sig = req.headers.get("x-signature-ed25519"), ts = req.headers.get("x-signature-timestamp");
  const body = await req.text();
  if (!sig || !ts) return null;
  const hex = h => new Uint8Array(h.match(/../g).map(b => parseInt(b, 16)));
  try {
    const key = await crypto.subtle.importKey("raw", hex(env.DISCORD_PUBLIC_KEY), { name: "Ed25519" }, false, ["verify"]);
    const ok = await crypto.subtle.verify("Ed25519", key, hex(sig), new TextEncoder().encode(ts + body));
    return ok ? JSON.parse(body) : null;
  } catch (e) { return null; }
}

// ---------- the Daily Catch inside Discord ----------
function questionView(qs, i, day) {
  const q = qs[i];
  const long = q.opts.some(o => o.length > 70);
  const desc = [`**${q.tier}**${q.tag ? ` · *${q.tag}*` : ""}`, "", ...(q.who ? ["**Who's that Pokémon?**"] : []), `### ${q.q}`];
  if (long) desc.push("", ...q.opts.map((o, k) => `**${LETTERS[k]}.** ${o}`));
  return {
    embeds: [{ title: `Daily Poké Catch · ${pretty(day)} · Question ${i + 1} of ${qs.length}`, description: desc.join("\n"), color: YELLOW }],
    components: [row(...q.opts.map((o, k) => btn(`ans|${day}|${i}|${k}`, long ? LETTERS[k] : `${LETTERS[k]}. ${o}`)))],
  };
}
function feedbackView(qs, i, day, pick, marks) {
  const q = qs[i], right = pick === q.a, last = i === qs.length - 1;
  const src = /^https?:/.test(q.s) ? `[Source](<${q.s}>)` : `Source: ${q.s}`;
  const desc = [`**${q.tier}**${q.tag ? ` · *${q.tag}*` : ""}`, "", ...(q.who ? ["**Who's that Pokémon?**"] : []), `### ${q.q}`, "",
    right ? `✅ **Gotcha!** ${q.opts[q.a]}` : `❌ **It broke free!** You picked ${q.opts[pick]}. The answer is **${q.opts[q.a]}**.`,
    "", q.e, "", src, "", grid(marks)];
  const long = q.opts.some(o => o.length > 70);
  return {
    embeds: [{ title: `Daily Poké Catch · ${pretty(day)} · Question ${i + 1} of ${qs.length}`, description: desc.join("\n"), color: right ? GREEN : RED }],
    components: [
      row(...q.opts.map((o, k) => btn(`x${k}`, long ? LETTERS[k] : `${LETTERS[k]}. ${o}`, k === q.a ? 3 : k === pick ? 4 : 2, true))),
      row(btn(last ? `res|${day}` : `next|${day}|${i + 1}`, last ? "See results" : "Next question", 1)),
    ],
  };
}
function resultsView(day, marks, st, posted) {
  const n = [...marks].filter(c => c === "1").length;
  return {
    embeds: [{
      title: `Daily Poké Catch · ${pretty(day)}`,
      description: [`## ${n}/${marks.length}`, grid(marks), "", `🔥 Streak: **${st.cur}** day${st.cur === 1 ? "" : "s"} · Best: **${st.best}**`,
        "", posted ? "Your result was posted in the channel. Come back tomorrow for a new catch!" : "Come back tomorrow for a new catch!"].join("\n"),
      color: n >= 4 ? GREEN : n >= 2 ? YELLOW : RED,
    }],
    components: [],
  };
}
function shareLine(name, day, marks, st) {
  const n = [...marks].filter(c => c === "1").length;
  return `**${name}** played Daily Poké Catch ${pretty(day)}\n**${n}/${marks.length}**  ${grid(marks)}${st.cur > 1 ? `  🔥 ${st.cur}-day streak` : ""}`;
}

async function startDaily(env, user, update_ = false) {
  const day = nyDay(), qs = await dayQuestions(env, day);
  if (!qs) return reply({ content: "Today's questions aren't available yet. Try again in a bit!" }, true);
  const r = await getResult(env, user.id, day), marks = r?.marks || "";
  if (r?.done) {
    const view = resultsView(day, marks, streaks(await playedDays(env, user.id), day), false);
    view.embeds[0].description = "You've already played today's catch.\n" + view.embeds[0].description;
    return update_ ? update(view) : reply(view, true);
  }
  const view = questionView(qs, marks.length, day);
  return update_ ? update(view) : reply(view, true);
}

async function onComponent(env, ix, ctx) {
  const user = ix.member?.user || ix.user, guild = ix.guild_id;
  const [kind, day, a, b] = ix.data.custom_id.split("|");
  if (kind === "start") return startDaily(env, user);
  if (kind === "play") return json({ type: 12 });
  const today = nyDay();
  if (day && day !== today) return update({ embeds: [{ description: "That catch has ended. Use **/daily** to play today's!", color: YELLOW }], components: [] });
  const qs = await dayQuestions(env, today);
  if (!qs) return update({ content: "Couldn't load today's questions. Try again soon.", embeds: [], components: [] });
  const r = await getResult(env, user.id, today);
  let marks = r?.marks || "";
  if (kind === "next") return update(questionView(qs, Math.min(marks.length, qs.length - 1), today));
  if (kind === "res") {
    const st = streaks(await playedDays(env, user.id), today);
    return update(resultsView(today, marks, st, true));
  }
  if (kind === "ans") {
    const i = +a, pick = +b;
    if (r?.done || i !== marks.length) {
      // Double click or old message: show where the player actually is.
      return r?.done ? update(resultsView(today, marks, streaks(await playedDays(env, user.id), today), false)) : update(questionView(qs, marks.length, today));
    }
    marks += pick === qs[i].a ? "1" : "0";
    const done = marks.length === qs.length ? 1 : 0, score = [...marks].filter(c => c === "1").length;
    await (await db(env)).prepare("INSERT INTO results (user_id,day,marks,score,done) VALUES (?,?,?,?,?) ON CONFLICT(user_id,day) DO UPDATE SET marks=excluded.marks, score=excluded.score, done=excluded.done")
      .bind(user.id, today, marks, score, done).run();
    if (done) {
      await saveMember(env, guild, user, ix.member?.nick);
      const st = streaks(await playedDays(env, user.id), today);
      const name = ix.member?.nick || user.global_name || user.username;
      // Public result in the channel, like Wordle's summary.
      ctx.waitUntil(fetch(`${API(env)}/webhooks/${env.DISCORD_APP_ID}/${ix.token}`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: shareLine(name, today, marks, st), allowed_mentions: NO_PINGS }),
      }));
    }
    return update(feedbackView(qs, i, today, pick, marks));
  }
  return update({ content: "Unknown button.", components: [] });
}

// ---------- leaderboards ----------
async function leaderboard(env, guild, period) {
  if (!guild) return reply({ content: "Leaderboards only work inside a server." }, true);
  const today = nyDay(), D = await db(env);
  if (period === "today") {
    const { results } = await D.prepare("SELECT m.name, r.marks, r.score FROM results r JOIN members m ON m.user_id=r.user_id AND m.guild_id=? WHERE r.day=? AND r.done=1 ORDER BY r.score DESC, m.name LIMIT 25")
      .bind(guild, today).all();
    const lines = results.map((x, k) => `${medal(k)} **${x.name}** · ${x.score}/5 ${grid(x.marks)}`);
    return reply({ embeds: [{ title: `Today's leaderboard · ${pretty(today)}`, description: lines.join("\n") || "Nobody has played today yet. Be the first with **/daily**!", color: YELLOW }] });
  }
  const since = period === "week" ? addDays(today, -6) : "0000-00-00";
  const { results } = await D.prepare("SELECT m.name, r.user_id, SUM(r.score) pts, COUNT(*) games, SUM(r.score=5) perfect FROM results r JOIN members m ON m.user_id=r.user_id AND m.guild_id=? WHERE r.done=1 AND r.day>=? GROUP BY r.user_id ORDER BY pts DESC, games ASC LIMIT 15")
    .bind(guild, since).all();
  const lines = [];
  for (const [k, x] of results.entries()) {
    const st = streaks(await playedDays(env, x.user_id), today);
    lines.push(`${medal(k)} **${x.name}** · ${x.pts} pts · ${x.games} played${x.perfect ? ` · ${x.perfect}× perfect` : ""}${st.cur > 1 ? ` · 🔥${st.cur}` : ""}`);
  }
  return reply({ embeds: [{ title: period === "week" ? "This week's leaderboard (last 7 days)" : "All-time leaderboard", description: lines.join("\n") || "No results yet. Play with **/daily**!", footer: { text: "1 point per correct answer in the Daily Catch" }, color: YELLOW }] });
}
const medal = k => ["🥇", "🥈", "🥉"][k] || `**${k + 1}.**`;

async function stats(env, ix) {
  const target = ix.data.options?.find(o => o.name === "player")?.value;
  const user = target ? ix.data.resolved.users[target] : ix.member?.user || ix.user;
  const today = nyDay();
  const { results } = await (await db(env)).prepare("SELECT day, score, marks FROM results WHERE user_id=? AND done=1 ORDER BY day DESC LIMIT 800").bind(user.id).all();
  if (!results.length) return reply({ content: `${target ? "They haven't" : "You haven't"} finished a Daily Catch yet.` }, true);
  const st = streaks(results.map(r => r.day), today);
  const total = results.reduce((s, r) => s + r.score, 0), dist = [0, 0, 0, 0, 0, 0];
  results.forEach(r => dist[r.score]++);
  const maxd = Math.max(...dist);
  const bars = dist.map((n, s) => `\`${s}/5\` ${"🟨".repeat(Math.round((n / maxd) * 8)) || "▫️"} ${n}`).reverse();
  return reply({ embeds: [{
    title: `Daily Poké Catch stats · ${user.global_name || user.username}`,
    description: [`**Played:** ${results.length} · **Average:** ${(total / results.length).toFixed(1)}/5 · **Perfect days:** ${dist[5]}`,
      `🔥 **Streak:** ${st.cur} · **Best:** ${st.best}`, "", ...bars].join("\n"),
    color: YELLOW,
  }] });
}

// ---------- daily post ----------
async function dailyPost(env, guild, channel, day) {
  const D = await db(env);
  const y = addDays(day, -1);
  const { results } = await D.prepare("SELECT m.name, r.score FROM results r JOIN members m ON m.user_id=r.user_id AND m.guild_id=? WHERE r.day=? AND r.done=1 ORDER BY r.score DESC, m.name")
    .bind(guild, y).all();
  const recap = results.length
    ? `**Yesterday:** ${results.length} player${results.length === 1 ? "" : "s"} · top score ${results[0].score}/5 by ${results.filter(r => r.score === results[0].score).slice(0, 3).map(r => r.name).join(", ")}`
    : "";
  return discord(env, "POST", `/channels/${channel}/messages`, {
    embeds: [{ title: `🎯 Daily Poké Catch · ${pretty(day)}`, description: ["Today's catch is live: **1 Easy (Poké Ball), 1 Medium (Great Ball), 2 Hard (Ultra Ball) and 1 Impossible (Master Ball)** question.", recap].filter(Boolean).join("\n\n"), color: YELLOW }],
    components: [row(btn("start", "Play here", 1), btn("play", "Open the full game", 2), { type: 2, style: 5, label: "Website", url: SITE(env) + "/" })],
    allowed_mentions: NO_PINGS,
  });
}
async function cron(env) {
  const day = nyDay(), hour = nyHour();
  const { results } = await (await db(env)).prepare("SELECT guild_id, channel_id FROM channels WHERE hour=? AND (last_day IS NULL OR last_day<>?)").bind(hour, day).all();
  for (const c of results) {
    const r = await dailyPost(env, c.guild_id, c.channel_id, day);
    if (r.ok) await env.DB.prepare("UPDATE channels SET last_day=? WHERE guild_id=?").bind(day, c.guild_id).run();
  }
}

// ---------- commands ----------
const COMMANDS = [
  { name: "daily", description: "Play today's Daily Poké Catch (5 questions, only you can see them)" },
  { name: "leaderboard", description: "See this server's Daily Poké Catch leaderboard", options: [{ type: 3, name: "period", description: "Which leaderboard", required: false, choices: [{ name: "Today", value: "today" }, { name: "This week", value: "week" }, { name: "All time", value: "all" }] }] },
  { name: "stats", description: "Daily Poké Catch stats for you or another player", options: [{ type: 6, name: "player", description: "Whose stats to show", required: false }] },
  { name: "play", description: "Open the full Daily Poké Catch game inside Discord" },
  { name: "setchannel", description: "Post the Daily Catch in a channel every morning", default_member_permissions: "32", contexts: [0],
    options: [{ type: 7, name: "channel", description: "Where to post (defaults to this channel)", required: false, channel_types: [0, 5] },
      { type: 4, name: "hour", description: "Hour to post, Eastern time, 0-23 (default 9 = 9 AM)", required: false, min_value: 0, max_value: 23 }] },
  { name: "stopdaily", description: "Stop the morning Daily Catch post in this server", default_member_permissions: "32", contexts: [0] },
  { name: "help", description: "How Daily Poké Catch works" },
];
const ENTRY_POINT = { name: "launch", description: "Play Daily Poké Catch", type: 4, handler: 2 };

async function onCommand(env, ix) {
  const user = ix.member?.user || ix.user, guild = ix.guild_id, opt = n => ix.data.options?.find(o => o.name === n)?.value;
  if (guild) await saveMember(env, guild, user, ix.member?.nick);
  switch (ix.data.name) {
    case "daily": return startDaily(env, user);
    case "leaderboard": return leaderboard(env, guild, opt("period") || "today");
    case "stats": return stats(env, ix);
    case "play": return json({ type: 12 });
    case "setchannel": {
      const ch = opt("channel") || ix.channel_id, hour = opt("hour") ?? 9;
      await (await db(env)).prepare("INSERT INTO channels (guild_id,channel_id,hour) VALUES (?,?,?) ON CONFLICT(guild_id) DO UPDATE SET channel_id=excluded.channel_id, hour=excluded.hour")
        .bind(guild, ch, hour).run();
      const h = hour % 12 || 12, ap = hour < 12 ? "AM" : "PM";
      return reply({ content: `Done! I'll post the Daily Catch in <#${ch}> every day at ${h} ${ap} Eastern. Make sure I can send messages there.` }, true);
    }
    case "stopdaily":
      await (await db(env)).prepare("DELETE FROM channels WHERE guild_id=?").bind(guild).run();
      return reply({ content: "Okay, I've stopped the morning post. You can still play with **/daily**." }, true);
    case "help":
      return reply({ embeds: [{ title: "🎯 Daily Poké Catch", color: YELLOW, description: [
        "A daily Pokémon trivia catch: **1 Easy, 1 Medium, 2 Hard and 1 Impossible** question, the same for everyone. A new catch starts at midnight Eastern.",
        "", "**/daily** · play right here (only you see the questions, your result is shared)",
        "**/play** · open the full game with every mode",
        "**/leaderboard** · today, this week or all time", "**/stats** · your streak and score history",
        "**/setchannel** · admins: post the catch every morning", "", `Website: ${SITE(env)}/`].join("\n") }] }, true);
  }
  return reply({ content: "Unknown command." }, true);
}

async function registerCommands(env) {
  const path = `/applications/${env.DISCORD_APP_ID}/commands`;
  let r = await discord(env, "PUT", path, [...COMMANDS, ENTRY_POINT]);
  if (r.ok) return "Commands registered, including the Activity launch command. You're all set!";
  const err = await r.text();
  r = await discord(env, "PUT", path, COMMANDS);
  return r.ok ? `Commands registered. The Activity launch command didn't register (turn on Activities in the Developer Portal, then visit this page again). Discord said: ${err}`
    : `Couldn't register commands: ${await r.text()}`;
}

// ---------- Activity ----------
async function activityPage(env) {
  const r = await fetch(SITE(env) + "/", { cf: { cacheTtl: 600, cacheEverything: true } });
  let html = await r.text();
  const day = nyDay();
  html = html
    .replace(/<script data-goatcounter[^>]*><\/script>\s*/g, "")
    .replace(/<link rel="(?:preconnect|stylesheet)" href="https:\/\/fonts\.[^>]*>\s*/g, "")
    .replace("<head>", `<head>\n<script>window.__NOW=new Date(${+day.slice(0, 4)},${+day.slice(5, 7) - 1},${+day.slice(8, 10)},12);window.__DD=${JSON.stringify({ clientId: env.DISCORD_APP_ID, day })};</script>`)
    .replace("</html>", `<script src="/activity.js"></script>\n</html>`);
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
async function whoAmI(env, req) {
  const auth = req.headers.get("authorization");
  if (!auth) return null;
  const r = await fetch(API(env) + "/users/@me", { headers: { authorization: auth } });
  return r.ok ? r.json() : null;
}
async function api(env, req, path, ctx) {
  if (path === "/api/token" && req.method === "POST") {
    const { code } = await req.json();
    const r = await fetch(API(env) + "/oauth2/token", {
      method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: env.DISCORD_APP_ID, client_secret: env.DISCORD_CLIENT_SECRET, grant_type: "authorization_code", code }),
    });
    const t = await r.json();
    return json({ access_token: t.access_token || null }, r.ok ? 200 : 400);
  }
  const user = await whoAmI(env, req);
  if (!user) return json({ error: "not signed in" }, 401);
  const day = nyDay();
  if (path === "/api/status") {
    const r = await getResult(env, user.id, day), qs = await dayQuestions(env, day);
    return json(r?.done && qs ? { marks: [...r.marks].map(c => c === "1"), ids: qs.map(q => q.id), day } : { day });
  }
  if (path === "/api/result" && req.method === "POST") {
    const b = await req.json(), qs = await dayQuestions(env, day);
    if (!qs || !Array.isArray(b.marks) || b.marks.length !== qs.length || JSON.stringify(b.ids) !== JSON.stringify(qs.map(q => q.id)))
      return json({ error: "not today's catch" }, 400);
    const existing = await getResult(env, user.id, day);
    if (existing?.done) return json({ ok: true, already: true });
    const marks = b.marks.map(x => (x ? "1" : "0")).join(""), score = [...marks].filter(c => c === "1").length;
    await (await db(env)).prepare("INSERT INTO results (user_id,day,marks,score,done) VALUES (?,?,?,?,1) ON CONFLICT(user_id,day) DO UPDATE SET marks=excluded.marks, score=excluded.score, done=1")
      .bind(user.id, day, marks, score).run();
    if (b.guild_id) {
      // Use the server nickname when Discord gives us one.
      let nick = null;
      const m = await discord(env, "GET", `/guilds/${b.guild_id}/members/${user.id}`);
      if (m.ok) nick = (await m.json()).nick;
      await saveMember(env, b.guild_id, user, nick);
      if (b.channel_id) {
        const st = streaks(await playedDays(env, user.id), day);
        ctx.waitUntil(discord(env, "POST", `/channels/${b.channel_id}/messages`, { content: shareLine(nick || user.global_name || user.username, day, marks, st), allowed_mentions: NO_PINGS }));
      }
    }
    return json({ ok: true });
  }
  return json({ error: "not found" }, 404);
}

// Pasted secrets sometimes carry spaces or line breaks; clean them once.
function clean(env) {
  const out = { ...env };
  for (const k of ["DISCORD_APP_ID", "DISCORD_PUBLIC_KEY", "DISCORD_BOT_TOKEN", "DISCORD_CLIENT_SECRET", "SETUP_KEY"])
    if (typeof out[k] === "string") out[k] = out[k].trim().replace(/^["']|["']$/g, "");
  return out;
}

export default {
  async fetch(req, rawEnv, ctx) {
    const env = clean(rawEnv);
    const url = new URL(req.url), path = url.pathname;
    try {
      if (path === "/interactions" && req.method === "POST") {
        const ix = await verify(req, env);
        if (!ix) return new Response("bad signature", { status: 401 });
        if (ix.type === 1) return json({ type: 1 });
        if (ix.type === 2) return await onCommand(env, ix);
        if (ix.type === 3) return await onComponent(env, ix, ctx);
        return json({ type: 1 });
      }
      if (path === "/setup") {
        if (!env.SETUP_KEY || url.searchParams.get("key") !== env.SETUP_KEY) return new Response("Add ?key=YOUR_SETUP_KEY to the address.", { status: 403 });
        const msg = await registerCommands(env);
        const invite = `https://discord.com/oauth2/authorize?client_id=${env.DISCORD_APP_ID}&scope=bot+applications.commands&permissions=19456`;
        return new Response(`<!doctype html><meta name="viewport" content="width=device-width"><body style="font-family:system-ui;padding:20px;max-width:640px"><h2>Daily Poké Catch bot</h2><p>${msg}</p><p><a href="${invite}">Add the bot to your server</a></p>`, { headers: { "content-type": "text/html" } });
      }
      if (path === "/status") {
        // Safe health check: shows which settings exist, never their values.
        const pk = env.DISCORD_PUBLIC_KEY || "";
        let dbOk = false; try { await db(env); dbOk = true; } catch (e) {}
        const lines = [
          ["Bot code is running", true],
          ["DISCORD_APP_ID set", !!env.DISCORD_APP_ID && /^\d+$/.test(env.DISCORD_APP_ID)],
          ["DISCORD_PUBLIC_KEY looks right (64 letters/numbers)", /^[0-9a-f]{64}$/i.test(pk)],
          ["DISCORD_BOT_TOKEN set", !!env.DISCORD_BOT_TOKEN],
          ["DISCORD_CLIENT_SECRET set", !!env.DISCORD_CLIENT_SECRET],
          ["SETUP_KEY set", !!env.SETUP_KEY],
          ["Database connected", dbOk],
          ["Today's questions found", !!(await dayQuestions(env, nyDay()).catch(() => null))],
        ];
        return new Response(`<!doctype html><meta name="viewport" content="width=device-width"><body style="font-family:system-ui;padding:20px"><h2>Daily Poké Catch bot status</h2>${lines.map(([t, ok]) => `<p>${ok ? "✅" : "❌"} ${t}</p>`).join("")}${pk && !/^[0-9a-f]{64}$/i.test(pk) ? `<p>Your public key is ${pk.length} characters long. It should be exactly 64.</p>` : ""}`, { headers: { "content-type": "text/html; charset=utf-8" } });
      }
      if (path.startsWith("/api/")) return await api(env, req, path, ctx);
      if (path === "/activity.js") return new Response(ACTIVITY_JS, { headers: { "content-type": "text/javascript", "cache-control": "max-age=300" } });
      if (path === "/" || path === "/index.html") return await activityPage(env);
      return new Response("Not found", { status: 404 });
    } catch (e) {
      console.log("error", e.stack || e);
      if (path === "/interactions") return reply({ content: "Something went wrong. Try again in a moment." }, true);
      return new Response("Error", { status: 500 });
    }
  },
  async scheduled(event, rawEnv, ctx) {
    ctx.waitUntil(cron(clean(rawEnv)));
  },
};
