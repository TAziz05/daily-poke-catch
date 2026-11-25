if(typeof Element!=="undefined"&&Element.prototype.animate){
/* Achievements: milestones worked out from saved play, plus hidden secrets with a counter for each. */
function makeAch(C){
  const CK=C.pfx+":eggcounts",SK=C.pfx+":secrets",AK=C.pfx+":ach";
  let counts={},found=new Set(),seen=new Set();
  const SETS=["main","e","m","h","x"],perfect=v=>v&&v.marks&&v.marks.length&&v.marks.every(Boolean);
  function stats(){const days={};
    try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i),m=k&&k.match(C.dayRe);if(!m)continue;const v=store.get(k);if(v&&v.marks)(days[m[1]]=days[m[1]]||{})[m[2]]=v}}catch(e){}
    const list=Object.values(days),sets=list.flatMap(d=>Object.values(d));
    return {days:list.length,mains:list.filter(d=>d.main).length,
      perfectMain:list.some(d=>perfect(d.main))?1:0,fullDay:list.some(d=>SETS.every(k=>d[k]))?1:0,perfectDay:list.some(d=>SETS.every(k=>perfect(d[k])))?1:0,
      topRight:sets.reduce((a,v)=>a+(v.ids||[]).filter((id,i)=>v.marks[i]&&QBYID[id]&&QBYID[id].t==="x").length,0),
      best:eStats().best,secrets:found.size,streak:(()=>{const ds=Object.keys(days).filter(d=>days[d].main).sort();let b=0,r=0;ds.forEach((d,i)=>{r=i&&Math.round((Date.parse(d)-Date.parse(ds[i-1]))/864e5)===1?r+1:1;b=Math.max(b,r)});return b})()}}
  const prog=(m,st)=>{const [c,g]=m[3](st);return [Math.min(c,g),g]};
  const earned=st=>C.miles.filter(m=>{const [c,g]=prog(m,st);return c>=g}).map(m=>m[0]);
  // Read saved state (again after the Discord Activity merges in progress from other devices).
  function load(){counts=Object.assign({},store.get(CK)||{});found=new Set((store.get(SK)||[]).filter(id=>C.eggs.some(e=>e[0]===id)));
    let s=store.get(AK);if(!Array.isArray(s)){s=earned(stats());store.set(AK,s)}seen=new Set(s)}
  load();
  function check(){const st=stats();for(const id of earned(st))if(!seen.has(id)){seen.add(id);store.set(AK,[...seen]);const m=C.miles.find(x=>x[0]===id);C.notify("Achievement unlocked",`${m[1]}: ${m[2]}`)}refresh()}
  function secret(id){counts[id]=(counts[id]||0)+1;store.set(CK,counts);
    if(!found.has(id)){found.add(id);store.set(SK,[...found]);const e=C.eggs.find(x=>x[0]===id);C.notify("Secret achievement",`${e[1]}: ${e[2]}`);check()}else refresh()}
  const times=n=>n===1?"Done once":`Done ${n.toLocaleString()} times`;
  function render(){
    const st=stats(),done=earned(st),total=C.miles.length+C.eggs.length,have=done.length+found.size,pct=Math.round(100*have/total);
    app.innerHTML=`<div id="ach-root"><h2>Achievements</h2><p class="muted">${have} of ${total} unlocked. Milestones come from playing; secrets stay hidden until you find them.</p>
     <div class="ach-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div>${window.YS?YS.mineHTML():""}
     <h3 class="ach-h">Milestones</h3><ul class="ach-list">${C.miles.map(m=>{const [c,g]=prog(m,st),ok=c>=g;
       return `<li class="${ok?"":"no"}">${C.medal(ok,"mile")}<div class="ach-txt"><b>${m[1]}</b><span>${m[2]}</span>${!ok&&g>1?`<div class="ach-mini"><span style="width:${100*c/g}%"></span></div><span class="ach-n">${c.toLocaleString()}/${g.toLocaleString()}</span>`:""}</div></li>`}).join("")}</ul>
     <h3 class="ach-h">Secrets <small>${found.size}/${C.eggs.length}</small></h3><ul class="ach-list">${C.eggs.map(([id,n,d,h])=>found.has(id)
       ?`<li>${C.medal(true,"secret")}<div class="ach-txt"><b>${n}</b><span>${d}</span><span class="ach-n">${times(counts[id]||1)}</span></div></li>`
       :`<li class="no">${C.medal(false,"secret")}<div class="ach-txt"><b>Secret achievement</b><span>Find it to reveal it.</span><details><summary>Show hint</summary><span>${h}</span></details></div></li>`).join("")}</ul></div>`}
  const tab=document.createElement("button");tab.className="tab";tab.setAttribute("role","tab");tab.id="tab-ach";tab.dataset.v="ach";tab.textContent="Achievements";
  document.querySelector(".tabs").appendChild(tab);
  tab.onclick=()=>{S=null;document.querySelectorAll(".tab").forEach(b=>b.setAttribute("aria-selected",String(b===tab)));render();scrollTo({top:0})};
  function refresh(){if(document.getElementById("ach-root"))render()}
  const _r=results;results=function(f){_r(f);if(f)check()};
  const _ee=endlessAnswer;endlessAnswer=function(b){_ee(b);check()};
  return {secret,check,has:id=>found.has(id),reload(){load();refresh()}};
}

const R=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
const EGGS=[
 ["grass","Wild Encounter","Caught something hiding in the tall grass","Walk through the tall grass. Tap it."],
 ["shiny","Shiny Hunter","Spotted a shiny wild question","Some wild ones sparkle and come in gold. Very rare."],
 ["moon","Wishing Star","Made a wish on a shooting star","Look up at the night sky."],
 ["retro","Retro Mode","Switched to the old four-shade screen","An old cheat code, or hold the date for a couple of seconds."],
 ["evolve","Evolution","Watched the emblem evolve","Something in the header spins. Tap it until it changes."],
 ["owl","Night Owl","Finished the Daily Catch after midnight","Trainers who play after midnight see things others don't."],
 ["fullmoon","Full Moon","Saw a shadow cross the full moon","Once a month, look up at the full moon."],
 ["sunny","Sunny Day","Made the sunlight harsh","Look up while the sun is out."],
 ["bird","Early Bird","Finished the Daily Catch at dawn","The early trainer catches the question. Play as the sun comes up."]];
let queue=[];
/* dialog-box messages, typed out, tap to continue */
let dEl=null,dTimer;
function say(title,text,extra=""){queue.unshift([title,text,extra]);if(dEl){dEl.remove();dEl=null}next()}
function next(){clearTimeout(dTimer);const m=queue.shift();if(!m)return;
  const d=document.createElement("div");d.className="egg-dlg";d.setAttribute("role","status");
  d.innerHTML=`<b>${esc(m[0])}</b><p><span class="sr">${esc(m[1])}</span><span aria-hidden="true"></span></p>${m[2]}<span class="arrow"></span>`;document.body.appendChild(d);dEl=d;
  const vis=d.querySelector("p span[aria-hidden]");let i=0,tm=null;
  const finish=()=>{clearInterval(tm);tm=null;vis.textContent=m[1]};
  if(R)finish();else tm=setInterval(()=>{vis.textContent=m[1].slice(0,++i);if(i%2===0)window.SND&&SND.play("type");if(i>=m[1].length)finish()},22);
  const close=()=>{if(dEl!==d)return;d.classList.add("out");setTimeout(()=>d.remove(),200);dEl=null;next()};
  d.onclick=e=>{if(e.target.closest("a"))return;if(tm)finish();else close()};dTimer=setTimeout(close,9000)}
const fact=()=>{const pool=Q.filter(q=>(q.t==="e"||q.t==="m")&&!q.clue&&q.q.length<120&&!/these|this one/i.test(q.q)),q=pool[Math.random()*pool.length|0];
  return [`${q.q} ${q.a}.`,`<span class="src">${srcLink(q.s)}</span>`]};
const playing=()=>!!app.querySelector(".opt");

const medal=(on,kind)=>on?orb(kind==="secret"?"x":"e",32):`<svg width="32" height="32" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.5" fill="#efe8d8" stroke="#b9b2a0" stroke-width="1.6" stroke-dasharray="2.4 1.6"/>${kind==="secret"?`<text x="10" y="13.6" text-anchor="middle" font-size="10" font-weight="700" fill="#9a937f">?</text>`:`<path d="M7.5 9.5v-2a2.5 2.5 0 0 1 5 0v2M7 9.5h6v4.5H7z" fill="none" stroke="#9a937f" stroke-width="1.3"/>`}</svg>`;
const ACH=makeAch({pfx:"pokecatch",dayRe:/^pokecatch1:(\d{4}-\d{2}-\d{2}):(main|e|m|h|x)$/,eggs:EGGS,medal,
  notify:(t,txt)=>{queue.push([t+"!",txt,""]);if(!dEl)next();const sec=t.startsWith("Secret");setTimeout(()=>window.SND&&SND.play(sec?"secret":"achievement"),sec?700:0)},
  miles:[
   ["first","First Catch","Finish a Daily Catch",s=>[s.mains,1]],
   ["party","Full Party","Play all five daily sets in one day",s=>[s.fullDay,1]],
   ["perfect","Perfect Catch","Get a perfect Daily Catch",s=>[s.perfectMain,1]],
   ["master","Pokémon Master","Go 25/25 in one day",s=>[s.perfectDay,1]],
   ["d3","Trainer","Play on 3 different days",s=>[s.days,3]],
   ["d7","Ace Trainer","Play on 7 different days",s=>[s.days,7]],
   ["d30","Champion","Play on 30 different days",s=>[s.days,30]],
   ["mball","Master Ball Pro","Answer 10 Impossible questions right in daily sets",s=>[s.topRight,10]],
   ["s10","On a Roll","Reach a 10-question streak in Endless",s=>[s.best,10]],
   ["s25","Unstoppable","Reach a 25-question streak in Endless",s=>[s.best,25]],
   ["w7","Steady Trainer","Play the Daily Catch 7 days in a row",s=>[s.streak,7]],
   ["w30","Dedicated Trainer","Play the Daily Catch 30 days in a row",s=>[s.streak,30]],
   ["hunter","Secret Hunter","Find every secret",s=>[s.secrets,EGGS.length]]]});
window.gameAch=ACH;
const secret=id=>ACH.secret(id);

/* the game's own wild-question mascot, small */
const MAP=["......kkkk......",".....kbbbbk.....","..k.kbbbbbbk.k..",".kbkbbbbbbbbkbk.",".kbbbwwbbwwbbbk.","..kbbwkbbwkbbk..",".kbbbbbbbbbbbbk.",".kbbbbwwwwbbbbk.","kbbbbwwbbwwbbbbk","kbbbbbbbbwwbbbbk","kbbbbbbbwwbbbbbk",".kbbbbbbbbbbbbk.",".kbbbbbwwbbbbbk.","..kbbbbbbbbbbk..","...kkbbkkbbkk...","....kk..kk......"];
const sprite=(body,eye="#fffdf3")=>`<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">${MAP.map((r,y)=>[...r].map((c,x)=>c==="."?"":`<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${c==="k"?"#1b1d33":c==="b"?body:eye}"/>`).join("")).join("")}</svg>`;
function sparkle(x,y,n=6){if(R)return;for(let k=0;k<n;k++){const s=document.createElement("span");s.className="egg-spark";s.style.left=x+"px";s.style.top=y+"px";document.body.appendChild(s);
  const a=Math.random()*6.28,r=24+Math.random()*30;s.animate([{transform:"translate(-50%,-50%) scale(.2)",opacity:1},{transform:`translate(calc(-50% + ${Math.cos(a)*r}px),calc(-50% + ${Math.sin(a)*r}px)) scale(1)`,opacity:0}],{duration:700,delay:k*60,fill:"backwards"}).onfinish=()=>s.remove()}}

/* 1 + 2. tall grass: rustle, wild encounters, shinies */
let mon=null;
function rustle(x){window.SND&&SND.play("rustle");const y=innerHeight-60;if(!R)for(let k=0;k<5;k++){const l=document.createElement("span");l.className="egg-leaf";l.style.left=(x-10+Math.random()*20)+"px";l.style.top=y+"px";document.body.appendChild(l);
  l.animate([{transform:"translate(0,0) rotate(0)"},{transform:`translate(${(Math.random()-.5)*60}px,${-30-Math.random()*40}px) rotate(${Math.random()*360}deg)`,opacity:0}],{duration:600}).onfinish=()=>l.remove()}}
function encounter(x){
  if(mon)return;const shiny=Math.random()<1/12;
  const b=document.createElement("button");b.type="button";b.className="egg-mon";b.setAttribute("aria-label",shiny?"A shiny wild question. Tap to catch":"A wild question. Tap to catch");
  b.innerHTML=sprite(shiny?"#e0a92a":"#5b8f5a");b.style.left=Math.max(4,Math.min(innerWidth-52,x-23))+"px";document.body.appendChild(b);mon=b;window.SND&&SND.play(shiny?"shiny":"wild");
  const dir=x<innerWidth/2?1:-1,dist=dir*(innerWidth*.5);
  if(shiny)setTimeout(()=>{const r=b.getBoundingClientRect();sparkle(r.left+23,r.top+20,8)},250);
  const run=b.animate(R?[{opacity:1},{opacity:1}]:[{transform:"translate(0,40px)"},{transform:"translate(0,0)",offset:.08},...Array.from({length:10},(_,k)=>({transform:`translate(${dist*(k+1)/10}px,${k%2?0:-10}px)`,offset:.12+.088*(k+1)}))],{duration:7000,easing:"steps(24)",fill:"forwards"});
  run.onfinish=()=>hideInGrass(b);setTimeout(()=>{if(b.isConnected&&!b.disabled)hideInGrass(b)},R?6900:6600);  // duck into the grass just before the walk ends
  b.onclick=()=>{run.pause();b.disabled=true;window.SND&&SND.play("throw");const r=b.getBoundingClientRect();
    const o=document.createElement("span");o.style.cssText=`position:fixed;left:${r.left+11}px;top:${r.top+11}px;width:24px;height:24px;z-index:991;pointer-events:none`;o.innerHTML=orb(shiny?"x":"e",24);
    if(!R){b.animate([{transform:getComputedStyle(b).transform+" scale(1)",filter:"brightness(1)"},{transform:getComputedStyle(b).transform+" scale(0)",filter:"brightness(3)"}],{duration:300,fill:"forwards"});
      setTimeout(()=>{[0,380,760].forEach(d=>setTimeout(()=>window.SND&&SND.play("wobble"),d));document.body.appendChild(o);o.animate([{transform:"rotate(0)"},{transform:"rotate(-24deg)"},{transform:"rotate(24deg)"},{transform:"rotate(0)"}],{duration:380,iterations:3}).onfinish=()=>{sparkle(r.left+23,r.top+23,4);setTimeout(()=>o.remove(),300)}},300)}
    setTimeout(()=>{window.SND&&SND.play("correct");b.remove();if(mon===b)mon=null;const [t,src]=fact();
      say(shiny?"Gotcha! A shiny!":"Gotcha!",`${shiny?"The shiny":"The wild"} question had a fact: ${t}`,src);secret("grass");if(shiny)secret("shiny")},R?0:1600)};
}
/* occasional wanderer when you're not mid-question */
function wander(){if(!playing()&&!document.hidden)encounter(Math.random()<.5?20:innerWidth-20);setTimeout(wander,45000+Math.random()*30000)}
setTimeout(wander,12000);

/* no wild questions in the grass during a game: one that's running away is cleared when a question starts */
function hideMon(){if(mon&&!mon.disabled)hideInGrass(mon)}
// a wild question that wasn't caught ducks back into the tall grass
function hideInGrass(b){if(!b.isConnected)return;b.disabled=true;const r=b.getBoundingClientRect();rustle(r.left+r.width/2);
  b.getAnimations().forEach(x=>{try{if(x.commitStyles)x.commitStyles();x.cancel()}catch(e){}});   // stop walking where it stands, then duck down from there
  if(!R)b.animate([{transform:"translateY(0)"},{transform:"translateY(-6px)",offset:.3},{transform:"translateY(46px)"}],{duration:420,easing:"steps(6)",fill:"forwards",composite:"add"});
  const a=b.animate([{opacity:1},{opacity:1,offset:.4},{opacity:0}],{duration:R?10:420,fill:"forwards"});
  a.onfinish=()=>{b.remove();if(mon===b)mon=null}}

/* shiny foe in battles, 1 in 64 */
const _q2=question;
question=function(){_q2();hideMon();if(Math.random()<1/64)setTimeout(shinyFoe,R?0:1500)};
const _eq2=endlessQ;endlessQ=function(){_eq2();hideMon();if(Math.random()<1/64)setTimeout(shinyFoe,R?0:600)};
function shinyFoe(){const f=document.getElementById("pk-foe");if(!f)return;window.SND&&SND.play("shiny");
  f.querySelectorAll("rect").forEach(r=>{const c=r.getAttribute("fill");if(c==="#4a4f86")r.setAttribute("fill","#e0a92a");else if(c==="#6a70b0")r.setAttribute("fill","#ffe27a")});
  const r=f.getBoundingClientRect();sparkle(r.left+r.width/2,r.top+r.height/2,10);
  const nm=app.querySelector(".pk-box.e .nm span");if(nm)nm.textContent+=" ★";secret("shiny")}

/* background taps: grass and moon */
document.addEventListener("click",e=>{
  if(e.target.closest("button,a,input,select,textarea,label,.panel,.tabs,.egg-dlg,.emblem,#date"))return;
  const moon=document.querySelector(".pk-moon").getBoundingClientRect();
  if((!window.SKY||SKY.isNight())&&e.clientX>=moon.left-10&&e.clientX<=moon.right+10&&e.clientY>=moon.top-10&&e.clientY<=moon.bottom+10){shootingStar();return}
  if(e.clientY>innerHeight-96){rustle(e.clientX);if(!playing()&&(Math.random()<.35||!ACH.has("grass")&&Math.random()<.6))setTimeout(()=>encounter(e.clientX),250)}
});

/* 3. wishing star */
function shootingStar(){window.SND&&SND.play("star");const s=document.createElement("div");s.className="egg-star";const y=20+Math.random()*innerHeight*.25;s.style.top=y+"px";s.style.left="-140px";document.body.appendChild(s);
  s.animate([{transform:"translate(0,0) rotate(12deg)",opacity:0},{opacity:1,offset:.15},{transform:`translate(${innerWidth+280}px,${innerWidth*.22}px) rotate(12deg)`,opacity:0}],{duration:R?10:1100,easing:"ease-in"}).onfinish=()=>s.remove();
  setTimeout(()=>{say("Shooting star",`You made a wish under a ${document.querySelector(".pk-moon").dataset.phase||"bright"} moon. May every wild question stay in the ball today.`);secret("moon")},R?0:900)}

/* 4. retro mode: Konami code or hold the date */
function retro(){const on=document.body.classList.toggle("pk-retro");window.SND&&(SND.retro(on),SND.play(on?"retro":"colour"));say("Retro mode",on?"The screen switched to four shades of green. Do it again to switch back.":"Colour is back on.");if(on)secret("retro")}
const CODE=["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];let keys=[];
addEventListener("keydown",e=>{keys.push(e.key.length===1?e.key.toLowerCase():e.key);keys=keys.slice(-CODE.length);if(keys.join()===CODE.join()){keys=[];retro()}});
const date=document.getElementById("date");let holdT;date.style.userSelect="none";date.style.webkitUserSelect="none";
date.style.webkitTouchCallout="none";
const holdGo=()=>{clearTimeout(holdT);holdT=setTimeout(retro,1500)},holdStop=()=>clearTimeout(holdT);
date.addEventListener("touchstart",holdGo,{passive:true});["touchend","touchcancel"].forEach(ev=>date.addEventListener(ev,holdStop));
date.addEventListener("mousedown",holdGo);["mouseup","mouseleave"].forEach(ev=>date.addEventListener(ev,holdStop));
date.addEventListener("contextmenu",e=>e.preventDefault());

/* 5. evolving emblem */
const em=document.querySelector(".emblem");let taps=0,tapT,evolving=false;
em.addEventListener("click",()=>{if(evolving||em.classList.contains("evolved"))return;clearTimeout(tapT);tapT=setTimeout(()=>taps=0,2500);
  if(!R)em.animate([{transform:"scale(1)"},{transform:"scale(1.15)"},{transform:"scale(1)"}],{duration:200});
  if(++taps<5){window.SND&&SND.play("spin");return}evolving=true;window.SND&&SND.play("evolve");em.classList.add("fast");say("What?","The emblem is evolving!");
  if(!R)em.animate(Array.from({length:12},(_,k)=>({filter:k%2?"brightness(3)":"brightness(1)"})),{duration:2200});
  setTimeout(()=>{em.classList.remove("fast");em.classList.add("evolved");const r=em.getBoundingClientRect();sparkle(r.left+r.width/2,r.top+r.height/2,10);
    say("Congratulations!","Your emblem evolved into a glowing emblem! It stays that way until you reload.");secret("evolve");evolving=false},R?0:2300)});
/* >>> stats and new secrets */
/* ===== Your Daily stats (from this device), and how everyone did today (anonymous, from the game's server) ===== */
const YS=(()=>{
  const DAYRE=new RegExp("^pokecatch1:(\\d{4}-\\d{2}-\\d{2}):main$"),API=location.hostname.endsWith("discordsays.com")?"":"https://daily-poke-catch-bot.towfiq-aziz11.workers.dev";
  const t=d=>Date.parse(d+"T12:00:00Z"),gap=(a,b)=>Math.round((t(b)-t(a))/864e5);
  function mine(){const days=[];
    try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i),m=k&&k.match(DAYRE);if(!m)continue;const v=store.get(k);if(v&&Array.isArray(v.marks)&&v.marks.length)days.push({d:m[1],s:v.marks.filter(Boolean).length,n:v.marks.length})}}catch(e){}
    days.sort((a,b)=>a.d<b.d?-1:1);
    let best=0,run=0;days.forEach((x,i)=>{run=i&&gap(days[i-1].d,x.d)===1?run+1:1;best=Math.max(best,run)});
    let cur=0;const last=days[days.length-1];
    if(last&&gap(last.d,dayKey)<=1){cur=1;for(let i=days.length-1;i>0&&gap(days[i-1].d,days[i].d)===1;i--)cur++}
    const dist=[0,0,0,0,0,0];days.forEach(x=>{if(x.n===5)dist[x.s]++});
    let full=0;try{const sets=["main","e","m","h","x"];for(const x of days)if(sets.every(k=>{const v=store.get(`pokecatch1:${x.d}:${k}`);return v&&v.marks&&v.marks.length&&v.marks.every(Boolean)}))full++}catch(e){}
    return {played:days.length,perfect:dist[5],full,cur,best,dist,today:(days.find(x=>x.d===dayKey)||{}).s};
  }
  const bars=(dist,hi,unit)=>{const max=Math.max(1,...dist);return `<div class="ys-dist">${[5,4,3,2,1,0].map(s=>`<div class="ys-row${s===hi?" hi":""}"><span class="ys-l">${s}/5</span><span class="ys-b"><i style="width:${Math.max(dist[s]?6:0,100*dist[s]/max)}%"></i></span><span class="ys-c">${dist[s]}${unit}</span></div>`).join("")}</div>`};
  function mineHTML(){const m=mine();if(!m.played)return `<section class="ys"><h3>Your Daily Catch stats</h3><p class="ys-note">Finish today's Daily Catch to start your stats.</p></section>`;
    return `<section class="ys"><h3>Your Daily Catch stats</h3>
     <div class="ys-grid"><div><b>${m.played}</b><span>Played</span></div><div><b>${m.perfect}</b><span>Perfect 5/5</span></div><div><b>${m.cur}</b><span>Current streak</span></div><div><b>${m.best}</b><span>Best streak</span></div></div>
     ${bars(m.dist,m.today,"")}${m.full?`<p class="ys-note">Perfect 25/25 days: <b>${m.full}</b></p>`:""}</section>`}
  // a random ID for this device, so its result counts once; nothing else about the player is sent
  const dev=()=>{let v=store.get("pokecatch:dev");if(typeof v!=="string"||!/^[a-z0-9]{24}$/.test(v)){v=Array.from(crypto.getRandomValues(new Uint8Array(24)),b=>"abcdefghijklmnopqrstuvwxyz0123456789"[b%36]).join("");store.set("pokecatch:dev",v)}return v};
  async function everyone(post){
    try{const opt=post?{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({dev:dev(),ids:S.qs.map(q=>q.id),marks:S.marks})}:{};
      const r=await fetch(API+(post?"/stats/result":"/stats/daily"),opt);return r.ok?await r.json():null}catch(e){return null}}
  function everyoneHTML(g,score){
    if(!g)return "";
    if(!g.dist)return `<section class="gs"><h3>How everyone did today</h3><p class="ys-note">Everyone's results show up once ${g.min} players have finished today's Daily Catch (${g.n} so far). Check back later!</p></section>`;
    const lower=g.dist.slice(0,score).reduce((a,b)=>a+b,0),same=Math.round(100*g.dist[score]/g.n);
    const line=score===5?`You're one of the <b>${same}%</b> who got a perfect 5/5.`:score===0?`Tough one! <b>${same}%</b> of players also got 0/5.`:`You did better than <b>${Math.round(100*lower/g.n)}%</b> of players.`;
    return `<section class="gs"><h3>How everyone did today</h3><p>${line} <span class="ys-note">${g.n} players</span></p>${bars(g.dist,score,"")}</section>`}
  async function addToResults(fresh){
    if(!S||S.mode!=="main"||!S.qs||S.marks.length<S.qs.length)return;
    const score=S.marks.filter(Boolean).length,box=document.createElement("div");box.className="ys-wrap";box.innerHTML=mineHTML()+`<div class="gs-slot"></div>`;app.appendChild(box);
    const g=await everyone(!!fresh&&!window.catchDone);if(!box.isConnected||!g)return;
    box.querySelector(".gs-slot").innerHTML=everyoneHTML(g,score);
    if(g.q)app.querySelectorAll(".recap li").forEach((li,i)=>{const tx=li.lastElementChild||li;if(g.q[i]!=null&&!li.querySelector(".gs-pct"))tx.insertAdjacentHTML("beforeend",`<span class="gs-pct">${g.q[i]}% of players got this</span>`)})}
  const css=document.createElement("style");css.textContent=`
.ys-wrap{margin-top:18px;display:grid;gap:14px}
.ys,.gs{background:var(--ys-bg);border:var(--ys-border);border-radius:var(--ys-r);padding:14px 16px;color:var(--ys-ink)}
.ys h3,.gs h3{margin:0 0 10px;font:var(--ys-h)}
.ys p,.gs p{margin:0 0 8px}
.ys-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;text-align:center;margin-bottom:10px}
.ys-grid b{display:block;font:var(--ys-num)}.ys-grid span{font-size:12px;opacity:.75}
.ys-dist{display:grid;gap:4px}
.ys-row{display:grid;grid-template-columns:34px 1fr 30px;align-items:center;gap:8px;font-size:13px}
.ys-b{height:16px;background:var(--ys-track);border-radius:4px;overflow:hidden}.ys-b i{display:block;height:100%;background:var(--ys-bar);border-radius:4px}
.ys-row.hi .ys-b i{background:var(--ys-acc)}.ys-row.hi .ys-l{font-weight:800}
.ys-c{text-align:right;opacity:.8}.ys-note{font-size:13px;opacity:.75}
.gs-pct{display:block;font-size:12px;opacity:.7;margin-top:2px}
@media (max-width:420px){.ys-grid b{font-size:22px}}`;document.head.appendChild(css);
  return {mine,mineHTML,addToResults};
})();
window.YS=YS;
const _rys=results;results=function(fresh){_rys.apply(this,arguments);YS.addToResults(fresh);
  // Night Owl: finish the daily set between midnight and 4 am
  // (uses the sky clock, which is the real time in the game; the preview's time bar can move it for testing)
  if(fresh&&S&&S.mode==="main"){const d=new Date(),h=window.SKY?SKY.now().hour:d.getHours()+d.getMinutes()/60;
    if(h<4)setTimeout(()=>secret("owl"),1200);
    // Early Bird: finish the daily set at dawn, from an hour before sunrise to an hour after
    else if(window.SKY){const st=SKY.sunTimes(d);if(h>=st.rise-1&&h<=st.rise+1)setTimeout(()=>secret("bird"),1200)}}};
// the real moon phase (0 = new, 0.5 = full); a full moon is within about a day of 0.5
const moonPhase=()=>{const syn=29.530588853,ref=Date.UTC(2000,0,6,18,14)/864e5;return((((Date.now()/864e5-ref)%syn)+syn)%syn)/syn};
const fullMoon=()=>window.__fullMoon===true||Math.abs(moonPhase()-.5)<.034;
/* Poké Catch: a mysterious shadow crosses the full moon, and tapping the sun makes the sunlight harsh (Sunny Day) */
{const css=document.createElement("style");css.textContent=`
:root{--ys-bg:#fffaf0;--ys-border:3px solid #2b2f55;--ys-r:12px;--ys-ink:#1b1f3b;--ys-h:400 20px/1.1 "Lilita One",sans-serif;--ys-num:400 28px/1 "Lilita One",sans-serif;--ys-track:#efe6d2;--ys-bar:#7f8fd0;--ys-acc:#ffcb05}
.pk-shadow{position:fixed;left:0;top:0;z-index:1004;pointer-events:none;width:150px;height:75px;filter:drop-shadow(0 0 6px rgba(255,246,210,.5))}
.pk-shadow svg{width:100%;height:100%;display:block}
body.pk-sunny .pk-sun{animation:pkSunny 1.4s ease-in-out infinite alternate}
@keyframes pkSunny{to{transform:scale(1.25);filter:drop-shadow(0 0 30px #fff2a0) drop-shadow(0 0 60px #ffb84d)}}
.pk-sunlight{position:fixed;inset:0;z-index:2;pointer-events:none;background:radial-gradient(circle at var(--sun-x,86vw) var(--sun-y,8vh),rgba(255,236,150,.55),rgba(255,200,90,.18) 40%,transparent 70%);mix-blend-mode:screen;opacity:0;transition:opacity 1.2s}
body.pk-sunny .pk-sunlight{opacity:1}
body.pk-sunny .pk-grass{filter:brightness(1.25) saturate(1.3)}`;document.head.appendChild(css);
 const light=document.createElement("div");light.className="pk-sunlight";document.body.appendChild(light);
 // original shadow shapes that glide across the full moon (made up, not any particular Pokémon)
 const SHADOWS={
  wing:`<svg viewBox="0 0 120 60"><path d="M60 28c-6-3-12-12-26-14C24 13 12 16 2 24c12-2 20 0 26 4-8 0-14 3-18 8 8-3 16-3 22 0-4 2-6 5-6 9 6-5 14-7 22-6l6 9 6-9c8-1 16 1 22 6 0-4-2-7-6-9 6-3 14-3 22 0-4-5-10-8-18-8 6-4 14-6 26-4-10-8-22-11-32-10-14 2-20 11-26 14z" fill="#0b1030"/></svg>`
};
 function moonShadow(){const kind="wing",m=document.querySelector(".pk-moon").getBoundingClientRect(),s=document.createElement("div");s.className="pk-shadow";
   s.innerHTML=SHADOWS[kind]||SHADOWS.wing;
   document.body.appendChild(s);const y=m.top+m.height/2-30;
   s.animate([{transform:`translate(${m.left-260}px,${y+40}px) scale(.7)`,opacity:0},{opacity:.95,offset:.2},{transform:`translate(${m.left+m.width/2-75}px,${y}px) scale(1)`,opacity:.95,offset:.5},{opacity:.9,offset:.8},{transform:`translate(${m.right+200}px,${y-50}px) scale(.8)`,opacity:0}],{duration:R?10:1700,easing:"ease-in-out"}).onfinish=()=>s.remove();
   window.SND&&SND.play("moonCry");
   setTimeout(()=>{say("Full moon","A mysterious shadow glided across the full moon... then it was gone.");secret("fullmoon")},R?0:1400)}
 let sunnyT;
 function sunnyDay(){window.SND&&SND.play("star");document.body.classList.add("pk-sunny");clearTimeout(sunnyT);sunnyT=setTimeout(()=>document.body.classList.remove("pk-sunny"),60000);
   say("Sunny Day","The sunlight turned harsh!");secret("sunny")}
 document.addEventListener("click",e=>{
   if(e.target.closest("button,a,input,select,textarea,label,.tabs,.egg-dlg,.emblem,#app"))return;
   const hit=el=>{if(!el)return false;const r=el.getBoundingClientRect();return e.clientX>=r.left-10&&e.clientX<=r.right+10&&e.clientY>=r.top-10&&e.clientY<=r.bottom+10};
   if(window.SKY&&!SKY.isNight()&&hit(document.querySelector(".pk-sun"))){e.stopImmediatePropagation();sunnyDay();return}
   if(window.SKY&&SKY.isNight()&&fullMoon()&&hit(document.querySelector(".pk-moon"))){e.stopImmediatePropagation();
     // the shadow only passes once per full moon for each player
     const cyc=Math.round((Date.now()/864e5-Date.UTC(2000,0,6,18,14)/864e5)/29.530588853-.5),seen=store.get("pokecatch:moonshadow");
     if(seen===cyc&&!window.__fullMoon)return;store.set("pokecatch:moonshadow",cyc);moonShadow()}
 },true);
 window.__moonShadow=moonShadow;
}
/* <<< stats and new secrets */
}
