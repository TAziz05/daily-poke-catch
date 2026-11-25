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
 ["bird","Early Bird","Finished the Daily Catch at dawn","The early trainer catches the question. Play as the sun comes up."],
 ["berries","Berry Picker","Shook berries out of a bush","Something in the grass is worth shaking."],
 ["birds","Bird Watcher","Startled a flock of birds","Look up during the day."],
 ["rain","Rain Dance","Made it rain","Tap the open sky like you're calling the weather."],
 ["cap","Lost and Found","Found a lost cap in the grass","Keep an eye on the grass during the day."],
 ["fireflies","Firefly Night","Woke up the fireflies","Little lights drift over the grass at night."],
 ["meteor","Stargazer","Caught three falling stars in a meteor shower","A few nights a year, the sky rains stars."],
 ["eclipse","Eclipse Chaser","Tapped the sun or moon during an eclipse","On a real eclipse day, tap whatever goes dark."],
 ["first","First Catch","Finished a Daily Catch sooner after midnight than anyone else","Be the quickest trainer after your own midnight. It's decided the next day."]];
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
    try{const opt=post?{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({dev:dev(),day:dayKey,mins:(d=>d.getHours()*60+d.getMinutes())(new Date()),ids:S.qs.map(q=>q.id),marks:S.marks})}:{};
      const r=await fetch(API+(post?"/stats/result":"/stats/daily?day="+dayKey),opt);return r.ok?await r.json():null}catch(e){return null}}
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
/* ===== Sky events on their real dates: eclipses, blood moons, supermoons, blue moons and meteor showers =====
   Dates and times are UTC. Eclipses: NASA's eclipse tables (a few times rounded). Supermoons: Fred Espenak's table via EarthSky.
   Everyone sees an event on its day, wherever they are; solar ones in the daytime, lunar ones at night. */
const EV=(()=>{
  const SOLAR={"2027-02-06T16:00":"annular","2027-08-02T10:07":"total","2028-01-26T15:08":"annular","2028-07-22T02:56":"total","2029-01-14T17:13":"partial",
    "2029-06-12T04:06":"partial","2029-07-11T15:37":"partial","2029-12-05T15:03":"partial","2030-06-01T06:29":"annular","2030-11-25T06:51":"total"};
  const LUNAR={"2027-02-20T23:13":"penumbral","2027-07-18T16:03":"penumbral","2027-08-17T07:14":"penumbral","2028-01-12T04:14":"partial","2028-07-06T18:20":"partial",
    "2028-12-31T16:53":"total","2029-06-26T03:23":"total","2029-12-20T22:43":"total","2030-06-15T18:34":"partial","2030-12-09T22:28":"penumbral"};
  const SUPER=["2026-11-24","2026-12-24","2027-01-22","2027-02-20","2028-01-12","2028-02-10","2028-03-11","2029-02-28","2029-03-30","2029-04-28","2029-10-07","2030-06-15"];
  const BLUE=["2027-05-20","2028-12-31"];
  const SHOWERS=[["Quadrantids",1,3],["Lyrids",4,22],["Eta Aquariids",5,5],["Perseids",8,12],["Orionids",10,21],["Leonids",11,17],["Geminids",12,14]];
  const near=(map,now,win)=>{for(const k in map)if(Math.abs(now-Date.parse(k+":00Z"))<win)return map[k];return null};
  const nearDay=(list,now)=>list.some(d=>Math.abs(now-Date.parse(d+"T12:00:00Z"))<36*36e5);
  // window.__skyEvent lets the preview page try an event: {solar:"total"}, {lunar:"total"}, {supermoon:true}, {blue:true}, {shower:"Geminids"}
  function today(){const now=Date.now(),f=window.__skyEvent||{},d=new Date();
    let shower=f.shower||null;
    if(!f.shower&&!("shower" in f))for(const [n,m,dd] of SHOWERS){const p=new Date(d.getFullYear(),m-1,dd);if(d>=p-864e5&&d<+p+2*864e5){shower=n;break}}
    return {solar:"solar" in f?f.solar:near(SOLAR,now,14*36e5),lunar:"lunar" in f?f.lunar:near(LUNAR,now,14*36e5),
      supermoon:"supermoon" in f?f.supermoon:nearDay(SUPER,now),blue:"blue" in f?f.blue:nearDay(BLUE,now),shower}}
  let C=null,meteorT=0,caught=0;
  function init(cfg){C=cfg;
    const css=document.createElement("style");css.textContent=`
${C.moon}>.ev-shade{position:absolute;inset:0;border-radius:50%;pointer-events:none;opacity:0;transition:opacity 2s;background:radial-gradient(circle at 26% 36%,rgba(70,12,6,.9) 0 48%,rgba(70,12,6,.4) 52%,transparent 56%)}
html.ev-lunar-partial ${C.moon}>.ev-shade{opacity:1}
html.ev-lunar-total ${C.moon}>.ev-shade{opacity:.9;background:radial-gradient(circle at 42% 38%,#e06a3a,#9a2614 55%,#5e1209 72%,transparent 74%)}
html.ev-lunar-total ${C.moon}{filter:sepia(1) saturate(5) hue-rotate(-28deg) brightness(.72) drop-shadow(0 0 18px rgba(255,80,40,.6)) drop-shadow(0 0 40px rgba(255,60,30,.3))!important}
html.ev-lunar-penumbral ${C.moon}{filter:brightness(.72) sepia(.4) drop-shadow(0 0 10px rgba(255,200,170,.25))!important}
html.ev-super ${C.moon}{scale:1.3}
html.ev-blue ${C.moon}{filter:saturate(.5) hue-rotate(185deg) brightness(1.08) drop-shadow(0 0 16px rgba(140,190,255,.7)) drop-shadow(0 0 40px rgba(120,170,255,.35))!important}
${C.sun}>.ev-disc{position:absolute;left:50%;top:50%;width:${C.disc}px;height:${C.disc}px;margin:${-C.disc/2}px 0 0 ${-C.disc/2}px;border-radius:50%;background:#0b0f24;opacity:0;transition:opacity 2s,transform 2s;pointer-events:none}
html.ev-solar-total ${C.sun}>.ev-disc{opacity:1;box-shadow:0 0 0 2px rgba(255,255,240,.9),0 0 26px 8px rgba(255,250,225,.75),0 0 70px 24px rgba(220,230,255,.35)}
html.ev-solar-annular ${C.sun}>.ev-disc{opacity:1;transform:scale(.82);box-shadow:0 0 0 ${Math.round(C.disc*.09)}px #ffd56a,0 0 24px 10px rgba(255,170,60,.6)}
html.ev-solar-partial ${C.sun}>.ev-disc{opacity:.96;transform:translate(34%,-22%)}
.ev-dim{position:absolute;inset:0;pointer-events:none;background:#080a28;opacity:0;transition:opacity 3s}
html.ev-solar-total .ev-dim{opacity:.5}html.ev-solar-annular .ev-dim{opacity:.18}html.ev-solar-partial .ev-dim{opacity:.1}
.ev-aurora{position:absolute;left:-15%;right:-15%;top:-4vh;height:58vh;pointer-events:none;opacity:calc((var(--night,0) - .55)*2.2);mix-blend-mode:screen}
.ev-aurora>b{position:absolute;inset:0;filter:blur(16px);animation:evAwave 150s ease-in-out infinite}
.ev-aurora i{position:absolute;top:0;height:100%;width:var(--w);left:var(--l);border-radius:45% 45% 50% 50%/30% 30% 70% 70%;transform-origin:50% 0;
  background:linear-gradient(180deg,rgba(150,90,255,0) 0%,rgba(150,90,255,.28) 14%,rgba(70,255,170,.6) 44%,rgba(60,220,255,.28) 72%,transparent 100%);
  animation:evCurtain var(--d) ease-in-out infinite alternate;animation-delay:var(--dl)}
@keyframes evCurtain{0%{transform:skewX(-14deg) scaleY(.82) translateX(-4%);opacity:.55}50%{opacity:1}100%{transform:skewX(16deg) scaleY(1.05) translateX(6%);opacity:.7}}
@keyframes evAwave{0%,100%{opacity:.25}20%{opacity:.9}45%{opacity:.5}70%{opacity:1}}
@media (prefers-reduced-motion:reduce){.ev-aurora>b,.ev-aurora i{animation:none}}
.ev-meteor{position:fixed;z-index:2;width:150px;height:3px;border-radius:2px;pointer-events:none;background:linear-gradient(90deg,transparent,#fff 75%,#e6f0ff);box-shadow:0 0 10px #fff,0 0 20px #9cc8ff}`;
    document.head.appendChild(css);
    const m=document.querySelector(C.moon),s=document.querySelector(C.sun),sky=document.querySelector(C.sky);
    if(m&&!m.querySelector(".ev-shade"))m.insertAdjacentHTML("beforeend",'<i class="ev-shade"></i>');
    if(s&&!s.querySelector(".ev-disc"))s.insertAdjacentHTML("beforeend",'<i class="ev-disc"></i>');
    if(sky&&!sky.querySelector(".ev-dim")){const d=document.createElement("div");d.className="ev-dim";sky.appendChild(d)}
    // the northern lights shimmer across the night sky, coming and going in slow waves
    if(sky&&!sky.querySelector(".ev-aurora")){const a=document.createElement("div");a.className="ev-aurora";
      a.innerHTML="<b>"+[[2,16,17,0],[14,22,23,-6],[30,14,19,-11],[42,24,27,-3],[60,16,21,-15],[72,22,25,-8],[86,14,18,-2]].map(([l,w,d,dl])=>`<i style="--l:${l}%;--w:${w}%;--d:${d}s;--dl:${dl}s"></i>`).join("")+"</b>";
      sky.prepend(a)}
    apply();setInterval(apply,60000);
    // tap the sun or moon during an eclipse; tap a falling star during a meteor shower
    document.addEventListener("click",e=>{
      if(e.target.closest("button,a,input,select,textarea,label"))return;
      const hit=(el,p)=>{if(!el)return false;const r=el.getBoundingClientRect();return e.clientX>=r.left-p&&e.clientX<=r.right+p&&e.clientY>=r.top-p&&e.clientY<=r.bottom+p};
      const ev=today(),night=window.SKY&&SKY.isNight();
      for(const st of document.querySelectorAll(".ev-meteor"))if(!st.dataset.got&&hit(st,22)){st.dataset.got=1;e.stopImmediatePropagation();
        window.SND&&SND.play("meteor");caught++;st.style.boxShadow="0 0 18px #fff,0 0 40px #ffe27a";
        if(caught===3){C.say("Stargazer",`You caught three falling stars during the ${ev.shower||"meteor shower"}.`);C.secret("meteor")}return}
      if(e.target.closest(C.skip))return;
      const lunar=night&&ev.lunar&&hit(document.querySelector(C.moon),12),solar=!night&&ev.solar&&hit(document.querySelector(C.sun).querySelector(".ev-disc"),20);
      if(lunar||solar){e.stopImmediatePropagation();window.SND&&SND.play("eclipse");
        C.say("Eclipse Chaser",lunar?{total:"A blood moon! Earth's shadow turned the moon red tonight.",partial:"Earth's shadow is taking a bite out of the moon tonight.",penumbral:"The moon looks a little dusky tonight. Earth's faint outer shadow is passing over it."}[ev.lunar]
          :{total:"A total solar eclipse! The moon covered the sun completely.",annular:"A ring of fire! The moon is too small to cover the whole sun today.",partial:"The moon is taking a bite out of the sun today."}[ev.solar]);
        C.secret("eclipse")}
    },true);
  }
  function apply(){if(!C)return;const ev=today(),h=document.documentElement,night=!window.SKY||SKY.isNight();
    const set=(c,on)=>h.classList.toggle(c,!!on);
    ["total","partial","penumbral"].forEach(k=>set("ev-lunar-"+k,night&&ev.lunar===k));
    ["total","annular","partial"].forEach(k=>set("ev-solar-"+k,!night&&ev.solar===k));
    set("ev-super",ev.supermoon);set("ev-blue",ev.blue&&!ev.lunar);set("ev-shower",night&&ev.shower);
    clearTimeout(meteorT);if(night&&ev.shower)meteorT=setTimeout(meteor,2000+Math.random()*5000)}
  function meteor(){if(document.visibilityState==="visible"&&!R){const s=document.createElement("div");s.className="ev-meteor";
      const x=Math.random()*innerWidth*.8,y=10+Math.random()*innerHeight*.3,a=18+Math.random()*22;s.style.left=x+"px";s.style.top=y+"px";document.body.appendChild(s);
      const dx=260+Math.random()*200;s.animate([{transform:`translate(0,0) rotate(${a}deg)`,opacity:0},{opacity:1,offset:.15},{transform:`translate(${dx}px,${dx*Math.tan(a*Math.PI/180)}px) rotate(${a}deg)`,opacity:0}],{duration:1500,easing:"ease-in"}).onfinish=()=>s.remove()}
    const ev=today();if((!window.SKY||SKY.isNight())&&ev.shower)meteorT=setTimeout(meteor,3000+Math.random()*7000)}
  return {today,init,apply,meteor};
})();
window.EV=EV;
/* "First of the day": after a date is over everywhere, ask the server whether this device finished that date's Daily soonest
   after its own midnight (only the minutes after midnight are ever sent). */
YS.checkFirst=async function(onWin){
  if(window.catchDone||!navigator.onLine)return;const key="pokecatch:firstchk",done=store.get(key)||[];
  const add=(d,n)=>new Date(Date.parse(d+"T12:00:00Z")+n*864e5).toISOString().slice(0,10);
  for(const d of [add(dayKey,-1),add(dayKey,-2),add(dayKey,-3)]){
    if(done.includes(d)||!store.get(`pokecatch1:${d}:main`))continue;
    try{const API=location.hostname.endsWith("discordsays.com")?"":"https://daily-poke-catch-bot.towfiq-aziz11.workers.dev",dev=store.get("pokecatch:dev");if(!dev)return;
      const r=await fetch(`${API}/stats/first?day=${d}&dev=${dev}`);if(!r.ok)continue;const j=await r.json();if(j.pending)continue;
      done.push(d);store.set(key,done.slice(-10));if(j.first)onWin(d)}catch(e){}}
};
/* Poké Catch: sky events, the first-of-the-day award, and five new secrets out in the field:
   a berry bush, a flock of birds, a rain dance, a lost cap, and fireflies. All made up and generic. */
{EV.init({moon:".pk-moon",sun:".pk-sun",sky:".pk-night",disc:58,skip:"button,a,input,select,textarea,label,.panel,.tabs,.egg-dlg,.emblem,#date",
  say:(t,m)=>say(t,m),secret:id=>secret(id)});
 const prettyDay=d=>new Date(d+"T12:00:00").toLocaleDateString(undefined,{month:"long",day:"numeric"});
 setTimeout(()=>YS.checkFirst(d=>{say("First Catch",`You finished the ${prettyDay(d)} Daily Catch sooner after your midnight than any other trainer did after theirs.`);secret("first")}),4000);
 window.__checkFirst=()=>YS.checkFirst(d=>{say("First Catch",`You finished the ${prettyDay(d)} Daily Catch sooner after your midnight than any other trainer did after theirs.`);secret("first")});

 const css=document.createElement("style");css.textContent=`
.pk-bush{position:fixed;z-index:-1;bottom:26px;left:6vw;width:84px;height:62px;pointer-events:none;image-rendering:pixelated;transform-origin:50% 100%}
.pk-bush svg,.pk-cap svg,.pk-birds svg{width:100%;height:100%;display:block}
.pk-berry{position:fixed;z-index:2;width:12px;height:12px;border-radius:50%;background:#e8384f;box-shadow:inset -2px -2px 0 #a81f33;pointer-events:none}
.pk-birds{position:fixed;z-index:1;left:-160px;width:140px;height:70px;border:0;padding:0;background:none;cursor:pointer}
.pk-bird{position:fixed;z-index:2;width:22px;height:12px;pointer-events:none}
.pk-rain{position:fixed;inset:0;z-index:-1;pointer-events:none;opacity:0;transition:opacity 1.5s;background:repeating-linear-gradient(105deg,transparent 0 22px,rgba(190,215,255,.55) 22px 24px,transparent 24px 46px);background-size:46px 46px;animation:pkRain .35s linear infinite}
.pk-rain.on{opacity:1}
@keyframes pkRain{to{background-position:-12px 46px}}
body.pk-rainy .pk-night{filter:brightness(.82) saturate(.8)}
.pk-rainbow{position:fixed;z-index:-1;left:50%;bottom:40px;width:min(900px,120vw);height:min(450px,60vw);margin-left:calc(min(900px,120vw)/-2);border-radius:50% 50% 0 0/100% 100% 0 0;pointer-events:none;opacity:0;transition:opacity 2s;
  background:radial-gradient(circle at 50% 100%,transparent 0 55%,rgba(148,0,211,.4) 55% 58%,rgba(75,0,130,.4) 58% 61%,rgba(0,0,255,.4) 61% 64%,rgba(0,200,0,.4) 64% 67%,rgba(255,255,0,.45) 67% 70%,rgba(255,127,0,.45) 70% 73%,rgba(255,0,0,.45) 73% 76%,transparent 76%)}
.pk-rainbow.on{opacity:1}
.pk-cap{position:fixed;z-index:-1;bottom:30px;width:44px;height:28px;pointer-events:none;transform:translateY(22px);transition:transform .6s}
.pk-cap.peek{transform:translateY(0)}
.pk-fly{position:fixed;z-index:-1;width:6px;height:6px;border-radius:50%;background:#f6ff9a;box-shadow:0 0 8px 3px rgba(240,255,120,.75);pointer-events:none;animation:pkFly 3s ease-in-out infinite alternate}
@keyframes pkFly{0%{opacity:.15;translate:0 0}50%{opacity:1}100%{opacity:.3;translate:18px -22px}}`;document.head.appendChild(css);

 // a berry bush in the grass: shake it three times and berries fall
 const bush=document.createElement("div");bush.className="pk-bush";bush.innerHTML=`<svg viewBox="0 0 42 31" shape-rendering="crispEdges"><path d="M4 31V18h2v-4h4v-3h5V8h12v3h5v3h4v4h2v13z" fill="#2f7d32"/><path d="M8 31V20h3v-4h5v-3h10v3h5v4h3v11z" fill="#3fa043"/>
   <rect x="12" y="16" width="3" height="3" fill="#e8384f"/><rect x="25" y="13" width="3" height="3" fill="#e8384f"/><rect x="30" y="21" width="3" height="3" fill="#e8384f"/><rect x="17" y="23" width="3" height="3" fill="#e8384f"/></svg>`;
 document.body.appendChild(bush);let shakes=0;
 // a flock of birds now and then by day
 const birdPath='<path d="M0 6Q5 0 11 6Q17 0 22 6Q17 3 11 8Q5 3 0 6Z" fill="#1d2a4d"/>';
 let flock=null;
 function birds(){if(flock||(window.SKY&&SKY.isNight())||document.visibilityState!=="visible")return;
   const b=document.createElement("button");b.className="pk-birds";b.setAttribute("aria-label","A flock of birds");flock=b;b.style.top=8+Math.random()*16+"vh";
   b.innerHTML=`<svg viewBox="0 0 140 70">${[[0,30],[24,20],[48,10],[24,42],[48,52]].map(([x,y])=>`<g transform="translate(${x+40} ${y})">${birdPath}</g>`).join("")}</svg>`;
   document.body.appendChild(b);const fly=b.animate([{transform:"translate(0,0)"},{transform:`translate(${innerWidth+320}px,-30px)`}],{duration:R?10:20000,easing:"linear"});
   fly.onfinish=()=>{b.remove();flock=null};
   b.onclick=()=>{if(b.dataset.hit)return;b.dataset.hit=1;fly.cancel();const r=b.getBoundingClientRect();b.remove();flock=null;window.SND&&SND.play("flap");
     for(let k=0;k<5;k++){const s=document.createElement("div");s.className="pk-bird";s.innerHTML=`<svg viewBox="0 0 22 12">${birdPath}</svg>`;s.style.left=r.left+r.width/2+"px";s.style.top=r.top+r.height/2+"px";document.body.appendChild(s);
       const a=-Math.PI*(.1+.8*k/4),d=300+Math.random()*200;s.animate([{transform:"translate(0,0) scale(1)"},{transform:`translate(${Math.cos(a)*d}px,${Math.sin(a)*d}px) scale(.6)`,opacity:0}],{duration:R?10:1400,easing:"ease-out"}).onfinish=()=>s.remove()}
     say("Bird Watcher","You startled a flock of birds. They scattered in every direction.");secret("birds")}}
 (function loop(){setTimeout(()=>{if(Math.random()<.35&&!playing())birds();loop()},60000+Math.random()*60000)})();
 window.__birds=birds;
 // rain dance: tap the open daytime sky five times quickly
 const rain=document.createElement("div");rain.className="pk-rain";document.body.appendChild(rain);
 const bow=document.createElement("div");bow.className="pk-rainbow";document.querySelector(".pk-night").after(bow);
 let taps=[],raining=false;
 function rainDance(){raining=true;document.body.classList.remove("pk-sunny");document.body.classList.add("pk-rainy");rain.classList.add("on");window.SND&&SND.play("rain");
   say("Rain Dance","It started to rain!");secret("rain");
   setTimeout(()=>{rain.classList.remove("on");document.body.classList.remove("pk-rainy");bow.classList.add("on");window.SND&&SND.play("star");
     setTimeout(()=>{bow.classList.remove("on");raining=false},14000)},R?100:22000)}
 // a lost cap sometimes peeks out of the grass
 const cap=document.createElement("div");cap.className="pk-cap";cap.innerHTML=`<svg viewBox="0 0 22 14" shape-rendering="crispEdges"><path d="M4 12V6h2V4h2V2h8v2h2v2h1v6z" fill="#2f6fd6"/><path d="M6 12V7h2V5h4v7z" fill="#5b93ee"/><path d="M14 10h8v2h-8z" fill="#1f4fa8"/><rect x="10" y="1" width="2" height="2" fill="#1f4fa8"/></svg>`;
 document.body.appendChild(cap);
 function peekCap(){if(cap.classList.contains("peek")||(window.SKY&&SKY.isNight()))return;cap.style.left=20+Math.random()*(innerWidth-120)+"px";cap.classList.add("peek");
   setTimeout(()=>cap.classList.remove("peek"),25000)}
 if(Math.random()<.45)setTimeout(peekCap,30000+Math.random()*60000);
 window.__peekCap=peekCap;
 // fireflies drift over the grass at night; tap one and the whole field lights up
 let flies=[];
 function fireflies(n){flies.forEach(f=>f.remove());flies=[];if(!(window.SKY&&SKY.isNight()))return;
   for(let k=0;k<n;k++){const f=document.createElement("i");f.className="pk-fly";f.style.left=Math.random()*innerWidth+"px";f.style.bottom=30+Math.random()*90+"px";
     f.style.animationDuration=2+Math.random()*3+"s";f.style.animationDelay=-Math.random()*3+"s";document.body.appendChild(f);flies.push(f)}}
 fireflies(4);setInterval(()=>{const n=window.SKY&&SKY.isNight();if(!n&&flies.length&&!lit)fireflies(0);else if(n&&!flies.length)fireflies(4)},30000);
 let lit=false;

 document.addEventListener("click",e=>{
   if(e.target.closest("button,a,input,select,textarea,label,.panel,.tabs,.egg-dlg,.emblem,#date"))return;
   const hit=(el,p)=>{const r=el.getBoundingClientRect();return r.width&&e.clientX>=r.left-p&&e.clientX<=r.right+p&&e.clientY>=r.top-p&&e.clientY<=r.bottom+p};
   if(hit(bush,8)){e.stopImmediatePropagation();shakes++;window.SND&&SND.play("rustle");
     bush.animate([{transform:"rotate(0)"},{transform:"rotate(-6deg)"},{transform:"rotate(6deg)"},{transform:"rotate(0)"}],{duration:R?10:360});
     if(shakes%3===0){const r=bush.getBoundingClientRect();window.SND&&SND.play("berry");
       for(let k=0;k<4;k++){const b=document.createElement("i");b.className="pk-berry";b.style.left=r.left+14+k*16+"px";b.style.top=r.top+18+"px";document.body.appendChild(b);
         b.animate([{transform:"translate(0,0)"},{transform:`translate(${(k-1.5)*18}px,${r.height-10}px)`,offset:.6},{transform:`translate(${(k-1.5)*26}px,${r.height-18}px)`,offset:.8},{transform:`translate(${(k-1.5)*30}px,${r.height-10}px)`,opacity:0}],{duration:R?10:1500,easing:"ease-in"}).onfinish=()=>b.remove()}
       say("Berry Picker","A few berries fell out of the bush. Any wild question would love one.");secret("berries")}return}
   if(cap.classList.contains("peek")&&hit(cap,10)){e.stopImmediatePropagation();cap.classList.remove("peek");window.SND&&SND.play("cap");
     const c=cap.cloneNode(true);c.classList.add("peek");document.body.appendChild(c);
     c.animate([{transform:"translateY(0) rotate(0)"},{transform:"translateY(-160px) rotate(720deg)",offset:.6},{transform:"translateY(-120px) rotate(720deg)",opacity:0}],{duration:R?10:1200,easing:"ease-out"}).onfinish=()=>c.remove();
     say("Lost and Found","You found someone's lost cap in the grass. They'll be glad to have it back.");secret("cap");return}
   if(!lit)for(const f of flies)if(hit(f,16)){e.stopImmediatePropagation();lit=true;window.SND&&SND.play("fireflies");fireflies(36);
     say("Firefly Night","You woke up the fireflies. The whole field is glowing.");secret("fireflies");setTimeout(()=>{lit=false;fireflies(4)},30000);return}
   // open daytime sky, away from the grass, the sun and the page itself
   if(window.SKY&&!SKY.isNight()&&!raining&&e.clientY<innerHeight-110&&!hit(document.querySelector(".pk-sun"),14)){const now=performance.now();taps=taps.filter(t=>now-t<3000);taps.push(now);
     if(taps.length>=5){taps=[];rainDance()}}
 },true);
 window.__rainDance=rainDance;
}
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
