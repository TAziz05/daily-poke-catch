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
const isNight=()=>{const h=new Date().getHours();return h<6||h>=19};

/* typewriter that keeps the full text for screen readers */
let typing=null;
function type(el,text,ms=22){
  if(typing)typing.done();
  const box=el.closest(".pk-dialog");el.innerHTML=`<span class="sr">${esc(text)}</span><span aria-hidden="true"></span>`;
  const vis=el.lastChild;
  if(R||!ms){vis.textContent=text;return Promise.resolve()}
  box.classList.add("typing");let i=0,tm;
  return new Promise(res=>{const done=()=>{clearInterval(tm);vis.textContent=text;box.classList.remove("typing");typing=null;res()};
    typing={done};tm=setInterval(()=>{i+=1;vis.textContent=text.slice(0,i);if(i>=text.length)done()},ms)})}

function encounter(){if(R)return Promise.resolve();
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
  if(!R)foe.animate([{transform:"translateX(160px)"},{transform:"none"}],{duration:450,easing:"steps(8)"});
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
  if(R){hp.style.width=ok?"0%":"100%";type(tx,ok?"Gotcha! The wild question was caught!":"Oh no! The question broke free!");after();return}
  hp.style.width=ok?"12%":"55%";hp.className=ok?"low":"mid";
  await sleep(280,aborts);
  const fr=field.getBoundingClientRect(),br=ball.getBoundingClientRect(),or=foe.getBoundingClientRect();
  const dx=or.left+or.width/2-(br.left+br.width/2),dy=or.top+or.height*.7-(br.top+br.height/2);
  ball.style.opacity=1;
  A(ball,[{transform:"translate(0,0) rotate(0)"},{transform:`translate(${dx*.5}px,${dy-60}px) rotate(360deg)`,offset:.5},{transform:`translate(${dx}px,${dy}px) rotate(720deg)`}],{duration:520,easing:"linear",fill:"forwards"});
  await sleep(520,aborts);
  A(white,[{opacity:0},{opacity:.85},{opacity:0}],{duration:260});
  const cap=A(foe,[{transform:"scale(1)",filter:"brightness(1)"},{transform:"scale(1.1)",filter:"brightness(3)",offset:.3},{transform:"scale(0)",filter:"brightness(3)"}],{duration:320,fill:"forwards"});
  await sleep(340,aborts);
  const base=`translate(${dx}px,${dy}px)`;
  A(ball,[{transform:base},{transform:`translate(${dx}px,${dy+14}px)`}],{duration:160,fill:"forwards",easing:"ease-in"});
  await sleep(200,aborts);
  const tb=`translate(${dx}px,${dy+14}px)`,wb=[{transform:tb+" rotate(0)"},{transform:tb+" rotate(-24deg)",offset:.25},{transform:tb+" rotate(24deg)",offset:.75},{transform:tb+" rotate(0)"}];
  for(let k=0;k<(ok?3:1);k++){A(ball,wb,{duration:340,easing:"ease-in-out"});await sleep(470,aborts)}
  if(!field.isConnected){after();return}
  if(ok){
    for(let k=0;k<3;k++){const s=document.createElement("span");s.className="pk-star";const cx=br.left-fr.left+dx+12,cy=br.top-fr.top+dy+10;s.style.left=cx+"px";s.style.top=cy+"px";field.appendChild(s);
      const ang=-Math.PI/2+(k-1)*.9;A(s,[{transform:"translate(0,0) scale(.3)",opacity:1},{transform:`translate(${Math.cos(ang)*34}px,${Math.sin(ang)*34}px) scale(1.2)`,opacity:1,offset:.6},{transform:`translate(${Math.cos(ang)*40}px,${Math.sin(ang)*40}px) scale(.8)`,opacity:0}],{duration:650,fill:"forwards"}).onfinish=()=>s.remove()}
    A(ball,[{filter:"brightness(1)"},{filter:"brightness(.6)"}],{duration:200,fill:"forwards"});
    const exp=document.getElementById("pk-exp"),sub=document.getElementById("pk-sub");
    if(!exp||!sub){}else if(S.qs){const c=S.marks.filter(Boolean).length;exp.style.width=100*c/S.qs.length+"%";sub.textContent=`Caught ${c}/${S.qs.length}`}else{exp.style.width=Math.min(100,S.streak*10)+"%";sub.textContent=`Streak ${S.streak}`}
    type(tx,"Gotcha! The wild question was caught!");
  }else{
    A(white,[{opacity:0},{opacity:.9},{opacity:0}],{duration:240});
    A(ball,[{transform:tb+" scale(1)",opacity:1},{transform:tb+" scale(1.8)",opacity:0}],{duration:240,fill:"forwards"});
    cap.cancel();A(foe,[{transform:"scale(0)",filter:"brightness(3)"},{transform:"scale(1.1)",filter:"brightness(2)",offset:.6},{transform:"scale(1)",filter:"brightness(1)"}],{duration:300});
    await sleep(320,aborts);
    A(foe,[{transform:"translateX(0)"},{transform:"translateX(-6px)"},{transform:"translateX(6px)"},{transform:"translateX(0)"}],{duration:300,iterations:2});
    hp.style.width="100%";hp.className="";
    type(tx,"Oh no! The question broke free!");
  }
  await sleep(skipped?0:250,aborts);
  after();
}

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
}
