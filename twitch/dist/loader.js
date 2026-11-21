// Panel start-up: fetch the latest questions from the website, then start the game, its look, and live play-along.
// The game code is packaged with the extension; the questions are not, so new questions show up without a new Twitch review.
(function () {
  const C = window.TWITCH_CFG || {};
  const load = src => new Promise(res => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = res; document.body.appendChild(s); });
  const fail = () => { const a = document.getElementById("app"); if (a) a.innerHTML = '<h2>Almost there</h2><p class="muted">Couldn\'t load today\'s questions. Check your connection and reopen the panel in a minute.</p>'; load("live.js"); };
  fetch(C.data, { cache: "no-cache" })
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(async g => {
      window.__G = g;
      const v = document.getElementById("ver-label"); if (v) v.textContent = g.ver || "";
      for (const f of ["game.js", "theme.js", "eggs.js", "live.js"]) await load(f);
    })
    .catch(fail);
})();
