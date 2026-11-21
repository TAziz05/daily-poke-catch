// Live play-along for viewers. Runs in the video box (live.html) and at the top of the panel (panel.html).
// The streamer starts a question from the Stream Manager; viewers answer before the timer ends; then the reveal
// shows the right answer and how chat split. Updates arrive through Twitch's extension messages, with a slow
// check-in as a backup.
(function () {
  const C = window.TWITCH_CFG || {}, T = window.Twitch && window.Twitch.ext;
  const slot = document.getElementById("live-slot");
  if (!slot || !T) return;
  const full = document.body.classList.contains("tw-live");
  let auth = null, st = { round: null }, skew = 0, err = "", busy = false, tick = null;
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const now = () => Date.now() + skew;
  const loggedOut = () => !auth || String(auth.userId || "").startsWith("A");

  function api(path, body) {
    return fetch(C.ebs + path, {
      method: body ? "POST" : "GET",
      headers: { authorization: "Bearer " + auth.token, "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }).then(r => r.json().then(j => { j._status = r.status; return j; }));
  }
  async function refresh() {
    if (!auth) return;
    try {
      const s = await api("/twitch/state");
      if (s._status !== 200) { err = s.error || ""; render(); return; }
      if (s.now) skew = s.now - Date.now();
      st = s; err = ""; render();
    } catch (e) { /* offline for a moment; the next check-in will catch up */ }
  }

  function card(inner, cls) { return `<section class="panel tw-card ${cls || ""}" aria-live="polite">${inner}</section>`; }
  function render() {
    clearInterval(tick);
    const r = st.round;
    if (!r) {
      slot.innerHTML = full ? card(`<span class="tw-kicker">${esc(C.game)} · Live play-along</span><p class="muted">Waiting for the streamer to start a question. Keep this open and it'll pop up here.</p>`, "tw-idle") : "";
      return;
    }
    const left = Math.max(0, Math.ceil((r.ends - now()) / 1000)), closed = r.revealed || left <= 0, picked = st.pick != null;
    const total = (st.counts || []).reduce((a, b) => a + b, 0);
    let opts = "";
    r.opts.forEach((o, k) => {
      let cls = "opt";
      if (r.revealed) cls += k === r.a ? " right" : k === st.pick ? " wrong" : " dim";
      else if (picked) cls += k === st.pick ? " tw-mine" : " dim";
      const pct = r.revealed && total ? Math.round(100 * (st.counts[k] || 0) / total) : null;
      opts += `<button class="${cls}${pct != null ? " tw-res" : ""}" data-k="${k}" data-p="${pct ?? ""}"${closed || picked || loggedOut() ? " disabled" : ""}><span class="k">${"ABCD"[k]}</span><span class="tw-o">${esc(o)}</span>${pct != null ? `<span class="tw-pct">${pct}%</span>` : ""}</button>`;
    });
    let foot = "";
    if (r.revealed) {
      const ok = st.pick === r.a;
      foot = `<div class="explain"><span class="verdict">${st.pick == null ? "Answer revealed" : ok ? "You got it!" : "Not this time"}</span>${r.e ? `<p>${esc(r.e)}</p>` : ""}${r.s && /^https?:/.test(r.s) ? `<span class="src"><a href="${esc(r.s)}" target="_blank" rel="noopener">Source</a></span>` : ""}
        <span class="tw-score">${total} ${total === 1 ? "viewer" : "viewers"} answered${st.you && st.you.total ? ` · You: ${st.you.right}/${st.you.total} this stream` : ""}</span></div>`;
    } else if (loggedOut()) foot = `<p class="muted">Log in to Twitch to play along.</p>`;
    else if (picked) foot = `<p class="muted tw-locked">Locked in. The answer is revealed when the streamer says so.</p>`;
    else if (closed) foot = `<p class="muted">Time's up! Waiting for the reveal.</p>`;
    if (err) foot += `<p class="muted tw-err">${esc(err)}</p>`;
    slot.innerHTML = card(`<div class="hud"><span class="chip c-${esc(r.t)}">${esc((C.tiers || {})[r.t] || r.tier)}</span><span class="tw-timer${left <= 5 && !closed ? " hot" : ""}" id="tw-timer">${r.revealed ? "Revealed" : closed ? "Time's up" : left + "s"}</span></div>
      <span class="tw-kicker">${esc(C.game)} · Live · ${esc(r.label || "")}</span>
      ${r.clue ? `<p class="clue">${esc(r.q)}</p>` : `<p class="q">${esc(r.q)}</p>`}<div class="opts">${opts}</div>${foot}`);
    // percentage bars (set through script so no inline styles are needed)
    slot.querySelectorAll(".tw-res").forEach(b => b.style.setProperty("--p", (b.dataset.p || 0) + "%"));
    slot.querySelectorAll(".opt:not([disabled])").forEach(b => b.onclick = () => answer(+b.dataset.k));
    if (!closed) tick = setInterval(() => {
      const t = document.getElementById("tw-timer"), l = Math.max(0, Math.ceil((r.ends - now()) / 1000));
      if (!t) return;
      if (l <= 0) render(); else { t.textContent = l + "s"; t.classList.toggle("hot", l <= 5); }
    }, 250);
  }
  async function answer(k) {
    if (busy || !st.round) return;
    busy = true; st.pick = k; render();
    try {
      const r = await api("/twitch/answer", { round: st.round.id, pick: k });
      if (r._status !== 200) { err = r.error || "Couldn't send that answer."; st.pick = null; }
    } catch (e) { err = "Couldn't send that answer."; st.pick = null; }
    busy = false; render();
  }

  T.onAuthorized(a => { const first = !auth; auth = a; if (first) refresh(); });
  T.listen("broadcast", (target, type, msg) => {
    let m; try { m = JSON.parse(msg); } catch (e) { return; }
    if (m.type === "round") { st = { ...st, round: m.round, pick: null, counts: null }; err = ""; render(); window.scrollTo({ top: 0, behavior: "smooth" }); }
    else if (m.type === "reveal") { st = { ...st, round: m.round, counts: m.counts }; render(); setTimeout(refresh, 400 + Math.random() * 2500); }
    else if (m.type === "end") { st = { ...st, round: null }; render(); }
  });
  // Backup check-in in case a message is missed (every 20 seconds while a question is up, 60 otherwise).
  (function loop() { setTimeout(() => { if (!document.hidden) refresh(); loop(); }, st.round && !st.round.revealed ? 20000 : 60000); })();
  render();
})();
