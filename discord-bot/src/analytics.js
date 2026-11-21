// Counts Discord and Twitch use in GoatCounter, each in its own GoatCounter site (separate from the website's).
// Discord use goes to the Discord site and Twitch use to the Twitch site, under this game's path,
// like /drop-in-daily/daily (Discord) or /drop-in-daily/answer (Twitch).
// Players are counted by a scrambled ID (a hash of their Discord or Twitch ID), never the ID itself.
// Settings (Cloudflare → Worker → Settings → Variables and Secrets):
//   GOATCOUNTER_TOKEN        an API key with "Record pageviews" for both sites (counting is off without it)
//   GOATCOUNTER_DISCORD_URL  optional; defaults to https://taziz322-discord.goatcounter.com
//   GOATCOUNTER_TWITCH_URL   optional; defaults to https://taziz322-twitch.goatcounter.com
const SITES = {
  discord: env => env.GOATCOUNTER_DISCORD_URL || "https://taziz322-discord.goatcounter.com",
  twitch: env => env.GOATCOUNTER_TWITCH_URL || "https://taziz322-twitch.goatcounter.com",
};

async function scramble(text) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("gc-session:" + text));
  return [...new Uint8Array(d)].slice(0, 12).map(b => b.toString(16).padStart(2, "0")).join("");
}

// count(env, ctx, site, "discord/daily", "/daily", userId, country?)  ("twitch/..." goes to the Twitch site)
export function count(env, ctx, site, what, title, who, country) {
  if (!env.GOATCOUNTER_TOKEN || !ctx) return;
  const [platform, ...rest] = what.split("/");
  if (!SITES[platform]) return;
  ctx.waitUntil((async () => {
    try {
      const base = new URL(site).pathname.replace(/\/$/, "");     // "/drop-in-daily"
      const hit = { path: `${base}/${rest.join("/")}`, title, event: true };
      if (who) hit.session = await scramble(String(who));
      if (country && /^[A-Z]{2}$/.test(country)) hit.location = country;
      const r = await fetch(SITES[platform](env).replace(/\/$/, "") + "/api/v0/count", {
        method: "POST",
        headers: { authorization: "Bearer " + env.GOATCOUNTER_TOKEN, "content-type": "application/json" },
        body: JSON.stringify({ no_sessions: !who, hits: [hit] }),
      });
      if (!r.ok && r.status !== 202) console.log("goatcounter", platform, r.status, (await r.text()).slice(0, 200));
    } catch (e) { console.log("goatcounter", String(e)); }
  })());
}
