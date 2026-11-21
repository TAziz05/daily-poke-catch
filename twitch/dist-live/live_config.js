// The streamer's controls (Live Config view in the Stream Manager): start a question, watch answers come in,
// reveal it, and see how this stream is going.
(function () {
  const C = window.TWITCH_CFG || {}, T = window.Twitch && window.Twitch.ext;
  const app = document.getElementById("cfg");
  if (!app || !T) return;
  let auth = null, st = { round: null }, skew = 0, secs = 30, auto = true, busy = false, revealing = false, msg = "", tick = null, poll = null;
  try { secs = +localStorage.getItem("tw:secs") || 30; auto = localStorage.getItem("tw:auto") !== "0"; } catch (e) {}
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const now = () => Date.now() + skew;
  const api = (path, body) => fetch(C.ebs + path, {
    method: body ? "POST" : "GET", headers: { authorization: "Bearer " + auth.token, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => r.json().then(j => { j._status = r.status; return j; }));

  async function refresh() {
    if (!auth) return;
    try {
      const s = await api("/twitch/state");
      if (s._status !== 200) { msg = s.error || "Couldn't reach the game server."; render(); return; }
      if (s.now) skew = s.now - Date.now();
      st = s; render();
    } catch (e) { msg = "Couldn't reach the game server. Check the extension's server address."; render(); }
    schedule();
  }
  function schedule() { clearTimeout(poll); poll = setTimeout(refresh, st.round && !st.round.revealed ? 2000 : 15000); }
  async function act(path, body) {
    if (busy) return; busy = true; msg = ""; render();
    try { const r = await api(path, body || {}); if (r._status !== 200) msg = r.error || "That didn't work."; }
    catch (e) { msg = "Couldn't reach the game server."; }
    busy = false; revealing = false; await refresh();
  }

  function render() {
    clearInterval(tick);
    const r = st.round, total = (st.counts || []).reduce((a, b) => a + b, 0);
    const left = r ? Math.max(0, Math.ceil((r.ends - now()) / 1000)) : 0;
    const ses = st.session || { rounds: 0, players: 0, answers: 0, right: 0 };
    let cur = `<p class="tw-muted">No question running. Pick one below and it pops up for your viewers.</p>`;
    if (r) {
      cur = `<div class="tw-row"><b>${esc(r.label)}</b><span class="tw-pill">${esc(r.tier)}</span><span class="tw-time" id="tw-left">${r.revealed ? "Revealed" : left > 0 ? left + "s left" : "Time's up"}</span></div>
        <p class="tw-q">${esc(r.q)}</p><ol class="tw-ans">${r.opts.map((o, k) => {
          const n = (st.counts || [])[k] || 0, p = total ? Math.round(100 * n / total) : 0;
          return `<li class="${k === st.answer ? "ok" : ""}" data-p="${p}"><span>${"ABCD"[k]}. ${esc(o)}${k === st.answer ? " ✓" : ""}</span><b>${n} · ${p}%</b></li>`;
        }).join("")}</ol>
        <p class="tw-muted">${total} ${total === 1 ? "answer" : "answers"} so far. Only you can see the counts and the ✓ until you reveal.</p>
        <div class="tw-row">${r.revealed ? "" : `<button class="tw-btn go" id="tw-reveal"${busy ? " disabled" : ""}>Reveal answer</button>`}<button class="tw-btn" id="tw-end"${busy ? " disabled" : ""}>${r.revealed ? "Clear it" : "Cancel question"}</button></div>`;
    }
    app.innerHTML = `<h1>${esc(C.game)} · Live play-along</h1>
      <section class="tw-box">${cur}</section>
      <section class="tw-box"><h2>Start a question</h2>
        <p class="tw-label">Today's Daily set</p><div class="tw-row">${[0, 1, 2, 3, 4].map(i => `<button class="tw-btn" data-daily="${i}"${busy ? " disabled" : ""}>Q${i + 1}</button>`).join("")}</div>
        <p class="tw-label">Random question</p><div class="tw-row">${Object.entries(C.tiers || {}).map(([t, n]) => `<button class="tw-btn tier-${t}" data-tier="${t}"${busy ? " disabled" : ""}>${esc(n)}</button>`).join("")}</div>
        <p class="tw-label">Time to answer</p><div class="tw-row">${[15, 30, 45, 60].map(s => `<button class="tw-btn${s === secs ? " on" : ""}" data-secs="${s}">${s}s</button>`).join("")}</div>
        <label class="tw-check"><input type="checkbox" id="tw-auto"${auto ? " checked" : ""}> Reveal automatically when time's up</label>
        ${r && !r.revealed ? `<p class="tw-muted">Starting a new question replaces the one that's running.</p>` : ""}</section>
      <section class="tw-box"><h2>This stream</h2><p>${ses.rounds} ${ses.rounds === 1 ? "question" : "questions"} · ${ses.players} ${ses.players === 1 ? "player" : "players"} · ${ses.answers ? Math.round(100 * ses.right / ses.answers) : 0}% right</p></section>
      ${msg ? `<p class="tw-err">${esc(msg)}</p>` : ""}`;
    app.querySelectorAll(".tw-ans li").forEach(li => li.style.setProperty("--p", li.dataset.p + "%"));
    app.querySelectorAll("[data-daily]").forEach(b => b.onclick = () => act("/twitch/start", { source: "daily", index: +b.dataset.daily, seconds: secs }));
    app.querySelectorAll("[data-tier]").forEach(b => b.onclick = () => act("/twitch/start", { source: "random", tier: b.dataset.tier, seconds: secs }));
    app.querySelectorAll("[data-secs]").forEach(b => b.onclick = () => { secs = +b.dataset.secs; try { localStorage.setItem("tw:secs", secs); } catch (e) {} render(); });
    const a = document.getElementById("tw-auto"); if (a) a.onchange = () => { auto = a.checked; try { localStorage.setItem("tw:auto", auto ? "1" : "0"); } catch (e) {} };
    const rv = document.getElementById("tw-reveal"); if (rv) rv.onclick = () => act("/twitch/reveal");
    const en = document.getElementById("tw-end"); if (en) en.onclick = () => act("/twitch/end");
    if (r && !r.revealed) tick = setInterval(() => {
      const l = Math.max(0, Math.ceil((r.ends - now()) / 1000)), el = document.getElementById("tw-left");
      if (el) el.textContent = l > 0 ? l + "s left" : "Time's up";
      if (l <= 0 && auto && !revealing && !busy) { revealing = true; clearInterval(tick); setTimeout(() => act("/twitch/reveal"), 1200); }
    }, 250);
  }
  T.onAuthorized(a => { const first = !auth; auth = a; if (first) refresh(); });
  render();
})();
