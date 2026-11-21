// Counts Discord and Twitch use in GoatCounter, in the same site as the website (https://taziz322.goatcounter.com),
// on pages that show where each use came from, like /drop-in-daily/discord/daily or /drop-in-daily/twitch/answer.
// Titles start with "Discord:" or "Twitch:" so they're easy to tell apart in the dashboard.
// Players are counted by a scrambled ID (a hash of their Discord or Twitch ID), never the ID itself.
// Settings (Cloudflare → Worker → Settings → Variables and Secrets):
//   GOATCOUNTER_TOKEN  an API key with "Record pageviews" (counting is off without it)
//   GOATCOUNTER_URL    optional; defaults to https://taziz322.goatcounter.com
const DEFAULT_URL = "https://taziz322.goatcounter.com";
const SOURCE = { discord: "Discord", twitch: "Twitch" };

async function scramble(text) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("gc-session:" + text));
  return [...new Uint8Array(d)].slice(0, 12).map(b => b.toString(16).padStart(2, "0")).join("");
}

// count(env, ctx, site, "discord/daily", "/daily", userId, country?)
export function count(env, ctx, site, what, title, who, country) {
  if (!env.GOATCOUNTER_TOKEN || !ctx) return;
  const source = SOURCE[what.split("/")[0]];
  if (!source) return;
  ctx.waitUntil((async () => {
    try {
      const base = new URL(site).pathname.replace(/\/$/, "");     // "/drop-in-daily"
      const hit = { path: `${base}/${what}`, title: `${source}: ${title}`, event: true };
      if (who) hit.session = await scramble(String(who));
      if (country && /^[A-Z]{2}$/.test(country)) hit.location = country;
      const r = await fetch((env.GOATCOUNTER_URL || DEFAULT_URL).replace(/\/$/, "") + "/api/v0/count", {
        method: "POST",
        headers: { authorization: "Bearer " + env.GOATCOUNTER_TOKEN, "content-type": "application/json" },
        body: JSON.stringify({ no_sessions: !who, hits: [hit] }),
      });
      if (!r.ok && r.status !== 202) console.log("goatcounter", r.status, (await r.text()).slice(0, 200));
    } catch (e) { console.log("goatcounter", String(e)); }
  })());
}
