if(typeof Element!=="undefined"&&Element.prototype.animate){
const R=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
const night=document.createElement("div");night.className="pk-night";night.setAttribute("aria-hidden","true");
night.innerHTML=`<div class="pk-stars"></div><div class="pk-stars b"></div><div class="pk-moon"></div><div class="pk-grass b"></div><div class="pk-grass"></div>`;
document.body.prepend(night);
/* logo: only the colour ring turns; the question mark stays upright */
{const em=document.querySelector(".emblem");if(em){const g=document.createElementNS("http://www.w3.org/2000/svg","g");g.setAttribute("class","ring");
  const ring=[...em.querySelectorAll(":scope > path")].filter(p=>p.getAttribute("fill")&&p.getAttribute("fill")!=="none");
  if(ring.length){ring[0].before(g);ring.forEach(p=>g.appendChild(p))}}}
/* moon: tonight's real phase, with craters and a soft glow */
{const syn=29.530588853,ref=Date.UTC(2000,0,6,18,14)/864e5,p=((((Date.now()/864e5-ref)%syn)+syn)%syn)/syn;
 const k=Math.cos(2*Math.PI*p),rx=(40*Math.abs(k)).toFixed(2),wax=p<.5;
 const lit=`M50 10A40 40 0 0 ${wax?1:0} 50 90A${rx} 40 0 0 ${wax?(k>0?0:1):(k>0?1:0)} 50 10Z`;
 const name=p<.03||p>.97?"new":p<.22?"waxing crescent":p<.28?"first quarter":p<.47?"waxing gibbous":p<.53?"full":p<.72?"waning gibbous":p<.78?"last quarter":"waning crescent";
 const CR=[[37,35,6.5],[63,29,3.5],[61,60,7.5],[33,64,4],[72,46,2.8]];
 const MARIA=[[46,44,15,10],[57,66,10,7]];
 const surf=(fill,rim,op)=>MARIA.map(([x,y,a,b])=>`<ellipse cx="${x}" cy="${y}" rx="${a}" ry="${b}" fill="${fill}" opacity="${op*.35}"/>`).join("")+CR.map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" opacity="${op}"/><circle cx="${x+r*.22}" cy="${y+r*.22}" r="${r*.78}" fill="${rim}" opacity="${op*.55}"/>`).join("");
 const m=night.querySelector(".pk-moon");m.dataset.phase=name;m.setAttribute("aria-label",`Tonight's moon: ${name}`);
 m.innerHTML=`<svg viewBox="0 0 100 100" aria-hidden="true"><defs><radialGradient id="pkml" cx="40%" cy="38%" r="65%"><stop offset="0" stop-color="#fffbe2"/><stop offset=".7" stop-color="#f6eab0"/><stop offset="1" stop-color="#e2d38a"/></radialGradient><clipPath id="pkmc"><path d="${lit}"/></clipPath></defs>
  <circle cx="50" cy="50" r="40" fill="#28305c"/><g>${surf("#1e2550","#3a4478",.9)}</g><circle cx="50" cy="50" r="40" fill="none" stroke="#4a5590" stroke-width="1" opacity=".7"/>
  <path d="${lit}" fill="url(#pkml)"/><g clip-path="url(#pkmc)">${surf("#cdbb6c","#efe2a2",1)}</g></svg>`}

/* original pixel sprite: a shadowy puffball with a question mark */
const MAP=["......kkkk......",".....kbbbbk.....","..k.kbbbbbbk.k..",".kbkbbbbbbbbkbk.",".kbbbwwbbwwbbbk.","..kbbwkbbwkbbk..",".kbbbbbbbbbbbbk.",".kbbbbwwwwbbbbk.","kbbbbwwbbwwbbbbk","kbbbbbbbbwwbbbbk","kbbbbbbbwwbbbbbk",".kbbbbbbbbbbbbk.",".kbbbbbwwbbbbbk.","..kbbbbbbbbbbk..","...kkbbkkbbkk...","....kk..kk......"];
const COL={k:"#1b1d33",b:"#4a4f86",w:"#fffdf3"};
const SPRITE=`<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">${MAP.map((row,y)=>[...row].map((c,x)=>COL[c]?`<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${COL[c]}"/>`:"").join("")).join("")}<rect x="4" y="2" width="2" height="1" fill="#6a70b0"/><rect x="3" y="3" width="1" height="2" fill="#6a70b0"/></svg>`;
const LV={e:5,m:25,h:50,x:100}, EXP={e:40,m:80,h:150,x:300};
const isNight=()=>window.SKY?SKY.isNight():(h=>h<6||h>=19)(new Date().getHours());

/* typewriter that keeps the full text for screen readers */
let typing=null;
function type(el,text,ms=22){
  if(typing)typing.done();
  const box=el.closest(".pk-dialog");el.innerHTML=`<span class="sr">${esc(text)}</span><span aria-hidden="true"></span>`;
  const vis=el.lastChild;
  if(R||!ms){vis.textContent=text;return Promise.resolve()}
  box.classList.add("typing");let i=0,tm;
  return new Promise(res=>{const done=()=>{clearInterval(tm);vis.textContent=text;box.classList.remove("typing");typing=null;res()};
    typing={done};tm=setInterval(()=>{i+=1;vis.textContent=text.slice(0,i);if(i%2===0)window.SND&&SND.play("type");if(i>=text.length)done()},ms)})}

function encounter(){if(R)return Promise.resolve();window.SND&&SND.play("wipe");
  const o=document.createElement("div");o.className="pk-enc";o.innerHTML=Array.from({length:8},(_,i)=>`<div class="bar" style="top:${i*12.5}%;height:12.6%"></div>`).join("");document.body.appendChild(o);
  o.animate([{background:"#fff"},{background:"transparent"},{background:"#fff"},{background:"transparent"},{background:"#fff"},{background:"transparent"}],{duration:420});
  const bars=[...o.children];bars.forEach(b=>b.style.transform="scaleX(0)");
  return new Promise(res=>setTimeout(()=>{
    const anims=bars.map((b,i)=>b.animate([{transform:`scaleX(0)`,transformOrigin:i%2?"right":"left"},{transform:"scaleX(1)",transformOrigin:i%2?"right":"left",offset:.45},{transform:"scaleX(1)",transformOrigin:i%2?"right":"left",offset:.6},{transform:"scaleX(0)",transformOrigin:i%2?"left":"right"}],{duration:900,easing:"steps(10)",fill:"forwards"}));
    setTimeout(res,520);anims[0].onfinish=()=>o.remove()},420))}

/* ---- the battle scene ---- */
function scene(q,label,caughtNow,total){
  const caught=caughtNow,pct=total?100*caught/total:0;
  return `<div class="pk-battle"><div class="pk-field${isNight()?" night":""}">
    <div class="pk-box e"><div class="nm"><span>${esc(label)}</span><span class="lv">Lv${LV[q.t]}</span></div>
      <div class="pk-meter"><i>HP</i><span><em id="pk-hp" style="width:100%"></em></span></div></div>
    <div class="pk-plat e"></div><div class="pk-foe" id="pk-foe">${SPRITE}</div>
    <div class="pk-plat p"></div>
    <div class="pk-box p"><div class="nm"><span>You</span><span class="lv">${esc(TIERS[q.t].tier)}</span></div>
      <div class="pk-meter exp"><i>EXP</i><span><em id="pk-exp" style="width:${pct}%"></em></span></div>
      <div class="sub" id="pk-sub">${total?`Caught ${caught}/${total}`:`Streak ${S.streak||0}`}</div></div>
    <div class="pk-ball" id="pk-ball">${orb(q.t,30)}</div><div class="pk-white" id="pk-white"></div>
  </div><div class="pk-dialog" id="pk-dlg"><p id="pk-text"></p><span class="arrow"></span></div></div>`}

let answered=false;
async function stage(q,label,total,first){
  answered=false;
  const qEl=app.querySelector(".q,.clue");if(!qEl)return;
  const text=qEl.textContent;qEl.classList.add("pk-hidden-q");
  const caught=total?S.marks.filter(Boolean).length:0;
  const head=app.querySelector(".clue-head");
  (head||qEl).insertAdjacentHTML("beforebegin",scene(q,label,caught,total));
  const foe=document.getElementById("pk-foe"),tx=document.getElementById("pk-text"),dlg=document.getElementById("pk-dlg");
  dlg.onclick=()=>{if(typing)typing.done()};
  const my=app.querySelector(".pk-battle");
  if(first){await encounter();if(!my.isConnected||answered)return}
  if(!R)foe.animate([{transform:"translateX(160px)"},{transform:"none"}],{duration:450,easing:"steps(8)"});window.SND&&SND.play(q.clue?"whos":"cry");
  if(first){await type(tx,`A wild Lv${LV[q.t]} question appeared!`,26);if(!my.isConnected||answered)return;await new Promise(r=>setTimeout(r,R?0:450));if(!my.isConnected||answered)return}
  if(!answered)type(tx,text);
}

function sleep(ms,abort){return new Promise(r=>{const t=setTimeout(r,ms);abort.push(()=>{clearTimeout(t);r()})})}
async function throwBall(ok,after){
  const ball=document.getElementById("pk-ball"),foe=document.getElementById("pk-foe"),hp=document.getElementById("pk-hp"),tx=document.getElementById("pk-text"),white=document.getElementById("pk-white"),field=app.querySelector(".pk-field");
  answered=true;
  if(!ball||!foe){after();return}
  if(typing)typing.done();
  const aborts=[],anims=[],A=(el,k,o)=>{const a=el.animate(k,o);anims.push(a);return a};
  let skipped=false;const skip=()=>{if(skipped)return;skipped=true;anims.forEach(a=>{try{a.finish()}catch(e){}});aborts.forEach(f=>f())};
  app.querySelector(".pk-battle").addEventListener("click",skip);
  if(R){window.SND&&SND.play(ok?"caught":"brokeFree");hp.style.width=ok?"0%":"100%";type(tx,ok?"Gotcha! The wild question was caught!":"Oh no! The question broke free!");after();return}
  hp.style.width=ok?"12%":"55%";hp.className=ok?"low":"mid";
  await sleep(280,aborts);
  const fr=field.getBoundingClientRect(),br=ball.getBoundingClientRect(),or=foe.getBoundingClientRect();
  const dx=or.left+or.width/2-(br.left+br.width/2),dy=or.top+or.height*.7-(br.top+br.height/2);
  ball.style.opacity=1;window.SND&&SND.play("throw");
  A(ball,[{transform:"translate(0,0) rotate(0)"},{transform:`translate(${dx*.5}px,${dy-60}px) rotate(360deg)`,offset:.5},{transform:`translate(${dx}px,${dy}px) rotate(720deg)`}],{duration:520,easing:"linear",fill:"forwards"});
  await sleep(520,aborts);
  A(white,[{opacity:0},{opacity:.85},{opacity:0}],{duration:260});
  const cap=A(foe,[{transform:"scale(1)",filter:"brightness(1)"},{transform:"scale(1.1)",filter:"brightness(3)",offset:.3},{transform:"scale(0)",filter:"brightness(3)"}],{duration:320,fill:"forwards"});
  await sleep(340,aborts);
  const base=`translate(${dx}px,${dy}px)`;
  A(ball,[{transform:base},{transform:`translate(${dx}px,${dy+14}px)`}],{duration:160,fill:"forwards",easing:"ease-in"});
  await sleep(200,aborts);
  const tb=`translate(${dx}px,${dy+14}px)`,wb=[{transform:tb+" rotate(0)"},{transform:tb+" rotate(-24deg)",offset:.25},{transform:tb+" rotate(24deg)",offset:.75},{transform:tb+" rotate(0)"}];
  for(let k=0;k<(ok?3:1);k++){if(!skipped)window.SND&&SND.play("wobble");A(ball,wb,{duration:340,easing:"ease-in-out"});await sleep(470,aborts)}
  if(!field.isConnected){after();return}
  if(ok){
    for(let k=0;k<3;k++){const s=document.createElement("span");s.className="pk-star";const cx=br.left-fr.left+dx+12,cy=br.top-fr.top+dy+10;s.style.left=cx+"px";s.style.top=cy+"px";field.appendChild(s);
      const ang=-Math.PI/2+(k-1)*.9;A(s,[{transform:"translate(0,0) scale(.3)",opacity:1},{transform:`translate(${Math.cos(ang)*34}px,${Math.sin(ang)*34}px) scale(1.2)`,opacity:1,offset:.6},{transform:`translate(${Math.cos(ang)*40}px,${Math.sin(ang)*40}px) scale(.8)`,opacity:0}],{duration:650,fill:"forwards"}).onfinish=()=>s.remove()}
    A(ball,[{filter:"brightness(1)"},{filter:"brightness(.6)"}],{duration:200,fill:"forwards"});
    const exp=document.getElementById("pk-exp"),sub=document.getElementById("pk-sub");
    if(!exp||!sub){}else if(S.qs){const c=S.marks.filter(Boolean).length;exp.style.width=100*c/S.qs.length+"%";sub.textContent=`Caught ${c}/${S.qs.length}`}else{exp.style.width=Math.min(100,S.streak*10)+"%";sub.textContent=`Streak ${S.streak}`}
    window.SND&&SND.play("caught");type(tx,"Gotcha! The wild question was caught!");
  }else{
    A(white,[{opacity:0},{opacity:.9},{opacity:0}],{duration:240});
    A(ball,[{transform:tb+" scale(1)",opacity:1},{transform:tb+" scale(1.8)",opacity:0}],{duration:240,fill:"forwards"});
    cap.cancel();A(foe,[{transform:"scale(0)",filter:"brightness(3)"},{transform:"scale(1.1)",filter:"brightness(2)",offset:.6},{transform:"scale(1)",filter:"brightness(1)"}],{duration:300});
    await sleep(320,aborts);
    A(foe,[{transform:"translateX(0)"},{transform:"translateX(-6px)"},{transform:"translateX(6px)"},{transform:"translateX(0)"}],{duration:300,iterations:2});
    hp.style.width="100%";hp.className="";
    window.SND&&SND.play("brokeFree");type(tx,"Oh no! The question broke free!");
  }
  await sleep(skipped?0:250,aborts);
  after();
}

/* ---- leaving mid-battle: you run away ---- */
let fleeing=false,letThrough=false;
document.addEventListener("click",e=>{
  if(letThrough){letThrough=false;return}
  const tab=e.target.closest&&e.target.closest(".tab");if(!tab||fleeing||R)return;
  const bt=app.querySelector(".pk-battle");if(!bt||!S||(S.qs&&S.marks.length>=S.qs.length))return;
  e.preventDefault();e.stopImmediatePropagation();fleeing=true;if(typing)typing.done();
  window.SND&&SND.play("flee");const tx=document.getElementById("pk-text");if(tx)type(tx,"Got away safely!",20);
  const ball=document.getElementById("pk-ball");if(ball)ball.style.opacity=0;
  bt.querySelectorAll(".pk-box.p,.pk-plat.p").forEach(el=>el.animate([{transform:"none",opacity:1},{transform:"translateX(-120px)",opacity:0}],{duration:520,delay:300,easing:"steps(6)",fill:"forwards"}));
  setTimeout(()=>{fleeing=false;letThrough=true;tab.click()},1150);
},true);

/* ---- wrap the game's functions ---- */
const _q=question,_a=answer,_r=results,_eq=endlessQ,_ea=endlessAnswer;
const reveal=()=>{const a=document.getElementById("after");if(a){a.classList.remove("pk-wait");const nb=document.getElementById("next");if(nb)nb.focus({preventScroll:true});a.scrollIntoView({block:"nearest",behavior:R?"auto":"smooth"})}};
const toBattle=()=>{const bt=app.querySelector(".pk-battle");if(!bt)return;if(document.activeElement)document.activeElement.blur();const r=bt.getBoundingClientRect();if(r.top<0||r.bottom>innerHeight)scrollTo({top:r.top+scrollY-12})};
question=function(){_q();const q=S.qs[S.i];stage(q,`Wild Q${S.i+1}`,S.qs.length,S.i===0)};
answer=function(btn){const q=S.qs[S.i],ok=btn.dataset.o===q.a;_a(btn);document.getElementById("after").classList.add("pk-wait");toBattle();throwBall(ok,reveal)};
endlessQ=function(){_eq();stage(S.cur,"Wild question",0,S.total===0)};
endlessAnswer=function(btn){const ok=btn.dataset.o===S.cur.a;_ea(btn);document.getElementById("after").classList.add("pk-wait");toBattle();throwBall(ok,reveal)};
results=function(fresh){_r(fresh);
  const n=S.marks.filter(Boolean).length,t=S.qs.length,title=app.querySelector(".result-title");if(!title)return;
  const exp=S.qs.reduce((a,q,k)=>a+(S.marks[k]?EXP[q.t]:0),0);
  const slots=S.qs.slice(0,6).map((q,k)=>S.marks[k]?`<span class="slot">${orb(q.t,32)}</span>`:`<span class="slot miss"></span>`).join("");
  title.insertAdjacentHTML("afterend",`${t<=6?`<div class="pk-party" aria-label="Caught ${n} of ${t}">${slots}<span class="lbl">Caught ${n}/${t}</span></div>`:""}
    <div class="pk-res-dialog"><div class="pk-dialog" id="pk-rdlg"><p id="pk-rtext"></p><span class="arrow"></span></div></div>`);
  const msg=n?`You caught ${n} of ${t}! You gained ${exp.toLocaleString()} EXP. Points!`:`Every wild question got away. Rest up and try again tomorrow!`;
  const tx=document.getElementById("pk-rtext");
  if(fresh){type(tx,msg,24);document.getElementById("pk-rdlg").onclick=()=>{if(typing)typing.done()};
    if(!R)app.querySelectorAll(".pk-party .slot").forEach((s,k)=>s.animate([{transform:"scale(0)"},{transform:"scale(1.2)",offset:.7},{transform:"scale(1)"}],{duration:380,delay:140*k,fill:"backwards",easing:"ease-out"}))}
  else type(tx,msg,0);
};
setView(view);
/* >>> day-night cycle */
/* ===== Real-time sky: dawn, day, dusk and night follow the player's own clock =====
   Sunrise and sunset are estimated from the date (for about 40° N, close for most of the US and Europe), so there is
   no location prompt. The sky colours blend smoothly between four looks, and the stars, moon, sun and clouds follow. */
const SKY=(()=>{
  const PAL={"night": ["#0b1640", "#1b3384", "#2a4fa8"], "dawn": ["#36388c", "#c2679d", "#ffb677"], "day": ["#2c6bd3", "#5aa0ee", "#b5e3ff"], "dusk": ["#29276f", "#bb4f7a", "#ff8f4f"]};
  const doy=d=>Math.floor((d-new Date(d.getFullYear(),0,0))/864e5);
  function sunTimes(d){
    const lat=40*Math.PI/180,decl=23.44*Math.PI/180*Math.sin(2*Math.PI*(284+doy(d))/365);
    const c=(Math.sin(-0.833*Math.PI/180)-Math.sin(lat)*Math.sin(decl))/(Math.cos(lat)*Math.cos(decl));
    const half=Math.acos(Math.max(-1,Math.min(1,c)))*12/Math.PI;
    const y=d.getFullYear(),std=Math.max(new Date(y,0,1).getTimezoneOffset(),new Date(y,6,1).getTimezoneOffset());
    const noon=12.2+(d.getTimezoneOffset()<std?1:0);          // solar noon on the clock, with daylight saving
    return {rise:noon-half,set:noon+half};
  }
  const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)),mix=(a,b,t)=>{const A=hex(a),B=hex(b);return "#"+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,"0")).join("")};
  const ease=t=>t*t*(3-2*t);
  // keyframes through the day: [hour, look, nightness, warmth]
  function frames(rise,set){return [[rise-1.3,"night",1,0],[rise-.35,"dawn",.55,1],[rise+.9,"day",0,0],[set-.9,"day",0,0],[set+.35,"dusk",.55,1],[set+1.3,"night",1,0]]}
  let forced=null,last=null;
  function state(d){
    const now=d||new Date(),{rise,set}=sunTimes(now);let h=forced!=null?forced:now.getHours()+now.getMinutes()/60;
    const F=frames(rise,set);let a,b,t;
    if(h<F[0][0]||h>=F[F.length-1][0]){a=b=F[0];t=0}
    else for(let i=0;i<F.length-1;i++)if(h>=F[i][0]&&h<F[i+1][0]){a=F[i];b=F[i+1];t=ease((h-a[0])/(b[0]-a[0]));break}
    const pa=PAL[a[1]],pb=PAL[b[1]];
    return {top:mix(pa[0],pb[0],t),mid:mix(pa[1],pb[1],t),bot:mix(pa[2],pb[2],t),isle:pa[3]?mix(pa[3],pb[3],t):null,isle2:pa[4]?mix(pa[4],pb[4],t):null,night:a[2]+(b[2]-a[2])*t,warm:a[3]+(b[3]-a[3])*t,hour:h,rise,set,
      phase:(a[1]===b[1]?a[1]:(t<.5?a[1]:b[1]))};
  }
  function paint(){
    const s=state(),r=document.documentElement.style;last=s;
    r.setProperty("--sky-top",s.top);r.setProperty("--sky-mid",s.mid);r.setProperty("--sky-bot",s.bot);if(s.isle){r.setProperty("--isle",s.isle);r.setProperty("--isle2",s.isle2)}
    // the sun crosses the sky from sunrise to sunset; the moon crosses it overnight (left = east, right = west)
    const arc=(p)=>({x:6+88*p,y:42-36*Math.sin(Math.PI*p)});   // one smooth arc that carries on below the horizon
    const dayLen=s.set-s.rise,ps=(s.hour-s.rise)/dayLen,pm=(((s.hour-s.set)%24)+24)%24/(24-dayLen);
    const sun=arc(Math.min(1.35,Math.max(-.35,ps))),moon=arc(pm>1.5?Math.max(-.35,pm-(24/(24-dayLen))):Math.min(1.35,pm));
    r.setProperty("--sun-x",sun.x.toFixed(2)+"vw");r.setProperty("--sun-y",sun.y.toFixed(2)+"vh");
    r.setProperty("--moon-x",moon.x.toFixed(2)+"vw");r.setProperty("--moon-y",moon.y.toFixed(2)+"vh");
    r.setProperty("--night",s.night.toFixed(3));r.setProperty("--day",(1-s.night).toFixed(3));r.setProperty("--warm",s.warm.toFixed(3));
    const tc=document.querySelector('meta[name="theme-color"]');if(tc)tc.content=s.top;
    document.documentElement.dataset.sky=s.phase;
  }
  paint();setInterval(()=>{if(forced==null)paint()},60000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&forced==null)paint()});
  return {now:()=>last||state(),isNight:()=>(last||state()).night>.5,set:h=>{forced=h;paint()},live:()=>{forced=null;paint()},sunTimes};
})();
window.SKY=SKY;

/* Poké Catch's scenery for the day/night cycle: stars and the moon at night, a pixel sun by day, brighter grass in daylight */
{const css=document.createElement("style");css.textContent=`
html{background:var(--sky-top) linear-gradient(180deg,var(--sky-top) 0%,var(--sky-mid) 60%,var(--sky-bot) 100%) fixed!important}
.pk-starfield{position:absolute;inset:0;opacity:var(--night)}
.pk-moon{opacity:calc((var(--night) - .45)*2.2);left:var(--moon-x,86vw)!important;top:var(--moon-y,8vh)!important;right:auto!important;margin:-44px 0 0 -44px}
.pk-sun{position:absolute;left:var(--sun-x,86vw);top:var(--sun-y,8vh);margin:-52px 0 0 -52px;width:104px;height:104px;opacity:calc((var(--day) - .35)*1.8);filter:drop-shadow(0 0 18px rgba(255,236,140,.55))}
.pk-sun svg{width:100%;height:100%;display:block;image-rendering:pixelated}
.pk-glow{position:absolute;left:-20%;right:-20%;bottom:0;height:70%;background:radial-gradient(ellipse at 50% 100%,rgba(255,170,90,.5),rgba(255,110,150,.22) 45%,transparent 70%);opacity:var(--warm)}
.pk-grass{filter:brightness(calc(.78 + var(--day)*.32)) saturate(calc(.95 + var(--day)*.25))}
.pk-grass.b{filter:brightness(calc(.56 + var(--day)*.3)) saturate(calc(.95 + var(--day)*.2))}`;document.head.appendChild(css);
 const field=document.createElement("div");field.className="pk-starfield";night.querySelectorAll(".pk-stars").forEach(s=>field.appendChild(s));night.prepend(field);
 const glow=document.createElement("div");glow.className="pk-glow";night.querySelector(".pk-grass").before(glow);
 const sun=document.createElement("div");sun.className="pk-sun";
 const rays=[0,45,90,135,180,225,270,315].map(a=>`<rect x="15" y="1" width="2" height="5" fill="#ffd23f" transform="rotate(${a} 16 16)"/>`).join("");
 sun.innerHTML=`<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true">${rays}<circle cx="16" cy="16" r="8" fill="#ffd23f"/><circle cx="16" cy="16" r="6" fill="#ffe680"/><rect x="12" y="12" width="3" height="2" fill="#fff6c8"/></svg>`;
 night.querySelector(".pk-moon").after(sun)}

/* <<< day-night cycle */
}
