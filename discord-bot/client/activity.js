// Runs inside the Discord Activity: signs the player in, syncs today's Daily Catch with the bot,
// reports the result, and opens source links in the browser.
import { DiscordSDK } from "@discord/embedded-app-sdk";
import { GAME, mergeKeys } from "../src/progress.js";

// Saved progress follows the Discord account: pull it down and merge it in, then send changes back up as you play.
async function syncProgress(H) {
  const P = GAME.prefix;
  const local = () => { const o = {}; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(P)) o[k] = localStorage.getItem(k); } } catch (e) {} return o; };
  let timer = null;
  const push = () => { clearTimeout(timer); timer = setTimeout(() => fetch("/api/progress", { method: "POST", headers: H, body: JSON.stringify({ keys: local() }) }).catch(() => {}), 1500); };
  try {
    const r = await (await fetch("/api/progress", { headers: H })).json();
    if (r && r.keys) {
      const before = local(), merged = mergeKeys(before, r.keys);
      let changed = false;
      for (const [k, v] of Object.entries(merged)) if (before[k] !== v) { try { localStorage.setItem(k, v); changed = true; } catch (e) {} }
      if (changed) {
        try { window.gameAch && window.gameAch.reload(); } catch (e) {}
        // Redraw the open menu so it shows the merged progress (never in the middle of a question).
        const sel = document.querySelector('.tab[aria-selected="true"]');
        if (sel && !document.querySelector(".opt:not(:disabled)")) sel.click();
      }
    }
  } catch (e) { console.log("Progress sync skipped", e); }
  push();
  try {
    if (typeof store !== "undefined" && store && store.set) {
      const orig = store.set.bind(store);
      store.set = (k, v) => { orig(k, v); if (String(k).startsWith(P)) push(); };
    }
  } catch (e) {}
}

(async () => {
  const P = window.__DD || {};
  let sdk;
  try { sdk = new DiscordSDK(P.clientId); await sdk.ready(); } catch (e) { console.log("Not running inside Discord", e); return; }

  // Discord blocks normal navigation, so send outside links through the SDK.
  document.addEventListener("click", e => {
    const a = e.target.closest && e.target.closest('a[href^="http"]');
    if (!a) return;
    e.preventDefault();
    sdk.commands.openExternalLink({ url: a.href }).catch(() => {});
  }, true);

  try {
    const { code } = await sdk.commands.authorize({ client_id: P.clientId, response_type: "code", state: "", prompt: "none", scope: ["identify"] });
    const tr = await fetch("/api/token", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) });
    const { access_token } = await tr.json();
    if (!access_token) return;
    await sdk.commands.authenticate({ access_token });
    const H = { "content-type": "application/json", authorization: "Bearer " + access_token };

    // Already played today (here or with /daily)? Show that result instead of a fresh catch.
    const st = await (await fetch("/api/status", { headers: H })).json();
    if (st.marks && st.ids) {
      try { localStorage.setItem(`pokecatch1:${P.day}:main`, JSON.stringify({ marks: st.marks, ids: st.ids })); } catch (e) {}
      const onMain = document.querySelector('#tab-main[aria-selected="true"]');
      if (onMain && typeof window.setView === "function") window.setView("main");
    }
    await syncProgress(H);
    window.catchDone = (marks, ids) => fetch("/api/result", { method: "POST", headers: H,
      body: JSON.stringify({ marks, ids, guild_id: sdk.guildId, channel_id: sdk.channelId }) }).catch(() => {});
  } catch (e) { console.log("Discord sign-in skipped", e); }
})();
