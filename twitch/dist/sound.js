/* ===== Sound effects and music (added v2.10). Every sound is made live by code with the Web Audio API: no audio files.
   Off by default; the speaker button in the corner turns effects and music on, and the choice is saved on this device. ===== */
(function(){
"use strict";
const G={"pfx": "pokecatch", "font": "\"Nunito\",system-ui,sans-serif", "bg": "#1b2a6b", "fg": "#fff", "edge": "#0c1640", "accent": "#ffcb05", "skipTap": ".egg-mon,.egg-dlg", "songs": {"lobby": "pkMenu", "match": "pkB", "og": "pk", "endless": "pkTown"}, "musicBase": "music/", "music": {}};
const noop=()=>{};
const SND={play:noop,music:noop,on:()=>false};window.SND=SND;
const AC=typeof window!=="undefined"&&(window.AudioContext||window.webkitAudioContext);
if(!AC||typeof document==="undefined"||!document.body)return;
const KEY=G.pfx+":sound";
let st={fx:false,mu:false,vol:.8};try{Object.assign(st,JSON.parse(localStorage.getItem(KEY))||{})}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(st))}catch(e){}};
let NIGHT=0,nightLP,nightVerb;
function setNight(n){NIGHT=n;if(!A||!nightLP)return;const t=A.currentTime;nightLP.frequency.setTargetAtTime(20000*Math.pow(2300/20000,n),t,.4);nightVerb.gain.setTargetAtTime(.5*n,t,.4)}
let A=null,master,sfxBus,musRoot,musBus,noiseBuf,dry,wet,retroOn=false,holdUntil=0;
function setRetro(on){retroOn=on;if(!A)return;const t=A.currentTime;dry.gain.setTargetAtTime(on?0:1,t,.03);wet.gain.setTargetAtTime(on?1:0,t,.03)}
function ctx(){
  if(A)return A;
  try{A=new AC({latencyHint:"playback"})}catch(e){A=new AC()}
  master=A.createGain();master.gain.value=.9*st.vol;
  const comp=A.createDynamicsCompressor();comp.threshold.value=-12;comp.ratio.value=4;comp.connect(A.destination);
  // retro mode: the same sounds through a crunchy 4-bit, small-speaker filter
  dry=A.createGain();wet=A.createGain();wet.gain.value=0;master.connect(dry);dry.connect(comp);
  const crush=A.createWaveShaper(),c=new Float32Array(4096);for(let i=0;i<c.length;i++){const x=i/(c.length-1)*2-1,y=Math.tanh(x*1.5);c[i]=Math.round(y*28)/28}crush.curve=c;
  const lp=A.createBiquadFilter();lp.type="lowpass";lp.frequency.value=3800;const hp=A.createBiquadFilter();hp.type="highpass";hp.frequency.value=180;
  const pre=A.createGain();pre.gain.value=4;const post=A.createGain();post.gain.value=.3;master.connect(pre);pre.connect(crush);crush.connect(lp);lp.connect(hp);hp.connect(post);post.connect(wet);wet.connect(comp);setRetro(retroOn);
  sfxBus=A.createGain();sfxBus.gain.value=.7;sfxBus.connect(master);
  musRoot=A.createGain();musRoot.gain.value=.27;musBus=musRoot;
  // night versions of the songs: darker, softer drums, a little slower, more echo and a few twinkles, following the sky
  nightLP=A.createBiquadFilter();nightLP.type="lowpass";nightLP.Q.value=.5;nightLP.frequency.value=20000;musRoot.connect(nightLP);nightLP.connect(master);
  {const len=A.sampleRate*2.6,b=A.createBuffer(2,len,A.sampleRate);for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.5)}
   const cv=A.createConvolver();cv.buffer=b;nightVerb=A.createGain();nightVerb.gain.value=0;musRoot.connect(nightVerb);nightVerb.connect(cv);cv.connect(master)}
  noiseBuf=A.createBuffer(1,A.sampleRate,A.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  return A;
}
const hz=n=>440*Math.pow(2,(n-69)/12);
function pulse(d){pulse.c=pulse.c||{};if(pulse.c[d])return pulse.c[d];const N=32,re=new Float32Array(N),im=new Float32Array(N);for(let k=1;k<N;k++){re[k]=Math.sin(2*Math.PI*k*d)/(k*Math.PI);im[k]=(1-Math.cos(2*Math.PI*k*d))/(k*Math.PI)}return pulse.c[d]=ctx().createPeriodicWave(re,im)}
function tone({t=0,n,f,type="square",dur=.12,vol=.3,slide,bus=sfxBus,detune=0,att=.005,cut}){
  const a=ctx(),s=a.currentTime+t,o=a.createOscillator(),g=a.createGain();
  if(type.startsWith("pulse"))o.setPeriodicWave(pulse(type==="pulse"?.25:.125));else o.type=type;o.frequency.setValueAtTime(f||hz(n),s);o.detune.value=detune;
  if(slide)o.frequency.exponentialRampToValueAtTime(slide,s+dur);
  g.gain.setValueAtTime(0.0001,s);g.gain.exponentialRampToValueAtTime(vol,s+att);g.gain.exponentialRampToValueAtTime(0.0001,s+dur);
  let last=o; o.connect(g);
  if(cut){const fl=a.createBiquadFilter();fl.type="lowpass";fl.frequency.value=cut;g.connect(fl);last=fl}else last=g;
  last.connect(bus);o.start(s);o.stop(s+dur+.05);
}
function noise({t=0,dur=.1,vol=.25,type="highpass",freq=6000,sweep,bus=sfxBus,q=1}){if(bus!==sfxBus&&bus!==verb.n)vol*=1-.55*NIGHT;
  const a=ctx(),s=a.currentTime+t,src=a.createBufferSource(),fl=a.createBiquadFilter(),g=a.createGain();
  src.buffer=noiseBuf;src.loop=true;fl.type=type;fl.frequency.setValueAtTime(freq,s);fl.Q.value=q;
  if(sweep)fl.frequency.exponentialRampToValueAtTime(sweep,s+dur);
  g.gain.setValueAtTime(0.0001,s);g.gain.linearRampToValueAtTime(vol,s+.002);g.gain.exponentialRampToValueAtTime(0.0001,s+dur);
  src.connect(fl);fl.connect(g);g.connect(bus);src.start(s,Math.random()*.8);src.stop(s+dur+.05);
}
function verb(){const a=ctx();if(verb.n)return verb.n;const len=a.sampleRate*1.5,b=a.createBuffer(2,len,a.sampleRate);
  for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3)}
  const cv=a.createConvolver();cv.buffer=b;const g=a.createGain();g.gain.value=.35;cv.connect(g);g.connect(master);
  const send=a.createGain();send.connect(sfxBus);send.connect(cv);return verb.n=send}
function brass({t=0,n,dur=.4,vol=.12,bus}){const a=ctx(),s=a.currentTime+t,out=bus||verb(),fl=a.createBiquadFilter(),g=a.createGain();
  fl.type="lowpass";fl.Q.value=2;fl.frequency.setValueAtTime(500,s);fl.frequency.linearRampToValueAtTime(3200,s+.06);fl.frequency.exponentialRampToValueAtTime(1400,s+dur);
  g.gain.setValueAtTime(.0001,s);g.gain.exponentialRampToValueAtTime(vol,s+.04);g.gain.setValueAtTime(vol,s+dur*.8);g.gain.exponentialRampToValueAtTime(.0001,s+dur+.15);
  const lfo=a.createOscillator(),lg=a.createGain();lfo.frequency.value=5.5;lg.gain.setValueAtTime(0,s);lg.gain.linearRampToValueAtTime(dur>.35?12:0,s+dur);lfo.connect(lg);
  [-9,0,9].forEach(dt=>{const o=a.createOscillator();o.type="sawtooth";o.frequency.value=hz(n);o.detune.value=dt;lg.connect(o.detune);o.connect(fl);o.start(s);o.stop(s+dur+.2)});
  lfo.start(s);lfo.stop(s+dur+.2);fl.connect(g);g.connect(out)}
function boom(t=0,vol=.5){tone({t,f:110,slide:48,type:"sine",dur:.7,vol,bus:verb()});noise({t,dur:.25,vol:.12,type:"lowpass",freq:300,bus:verb()})}
function aah({t=0,ns,dur=1,vol=.06}){const a=ctx(),s=a.currentTime+t,g=a.createGain(),out=verb();
  g.gain.setValueAtTime(.0001,s);g.gain.exponentialRampToValueAtTime(vol,s+dur*.4);g.gain.exponentialRampToValueAtTime(.0001,s+dur);
  const f1=a.createBiquadFilter();f1.type="bandpass";f1.frequency.value=750;f1.Q.value=5;const f2=a.createBiquadFilter();f2.type="bandpass";f2.frequency.value=1150;f2.Q.value=7;f1.connect(g);f2.connect(g);
  ns.forEach((n,k)=>[-6,6].forEach(dt=>{const o=a.createOscillator();o.type="sawtooth";o.frequency.value=hz(n);o.detune.value=dt+k;o.connect(f1);o.connect(f2);o.start(s);o.stop(s+dur+.05)}));
  g.connect(out)}
function fadeBus(start,len){const a=ctx(),g=a.createGain(),s0=a.currentTime;g.gain.setValueAtTime(1,s0+start);g.gain.linearRampToValueAtTime(.0001,s0+start+len);g.connect(verb());return g}
function pluck(t,n,vol=.14,dur=.3){tone({t,n,type:"triangle",dur,vol,att:.002,cut:2200,bus:verb()});tone({t,n:n+12,type:"sine",dur:dur*.4,vol:vol*.3,att:.002,bus:verb()})}
function mallet(t,n,vol=.14){tone({t,n,type:"sine",dur:.45,vol,att:.002,bus:verb()});tone({t,f:hz(n)*4,type:"sine",dur:.06,vol:vol*.35,att:.001})}
function glock(t,n,vol=.1){tone({t,n,type:"sine",dur:1.1,vol,att:.002,bus:verb()});tone({t,f:hz(n)*2.76,type:"sine",dur:.3,vol:vol*.25,att:.001,bus:verb()})}
function flute({t=0,n,dur=.3,vol=.08}){const a=ctx(),s0=a.currentTime+t,o=a.createOscillator(),g=a.createGain(),l=a.createOscillator(),lg=a.createGain();
  o.type="sine";o.frequency.value=hz(n);l.frequency.value=5.2;lg.gain.setValueAtTime(0,s0);lg.gain.linearRampToValueAtTime(dur>.3?10:3,s0+dur);l.connect(lg);lg.connect(o.detune);
  g.gain.setValueAtTime(.0001,s0);g.gain.exponentialRampToValueAtTime(vol,s0+.05);g.gain.setValueAtTime(vol,s0+dur*.8);g.gain.exponentialRampToValueAtTime(.0001,s0+dur+.1);
  o.connect(g);g.connect(verb());o.start(s0);l.start(s0);o.stop(s0+dur+.15);l.stop(s0+dur+.15);noise({t,dur:.06,vol:vol*.4,type:"bandpass",freq:hz(n)*2,q:3,bus:verb()})}
function horn({t=0,n,dur=.4,vol=.1}){const a=ctx(),s0=a.currentTime+t,fl=a.createBiquadFilter(),g=a.createGain();
  fl.type="lowpass";fl.Q.value=.7;fl.frequency.setValueAtTime(400,s0);fl.frequency.linearRampToValueAtTime(1500,s0+.08);fl.frequency.exponentialRampToValueAtTime(900,s0+dur);
  g.gain.setValueAtTime(.0001,s0);g.gain.exponentialRampToValueAtTime(vol,s0+.07);g.gain.setValueAtTime(vol,s0+dur*.85);g.gain.exponentialRampToValueAtTime(.0001,s0+dur+.2);
  [-5,5].forEach(dt=>{const o=a.createOscillator();o.type="sawtooth";o.frequency.value=hz(n);o.detune.value=dt;o.connect(fl);o.start(s0);o.stop(s0+dur+.25)});
  const o2=a.createOscillator();o2.type="triangle";o2.frequency.value=hz(n);o2.connect(fl);o2.start(s0);o2.stop(s0+dur+.25);fl.connect(g);g.connect(verb())}
function strings({t=0,ns,dur=1,vol=.03}){ns.forEach((n,k)=>[-10,10].forEach(dt=>tone({t,n,type:"sawtooth",dur,vol,att:.25,cut:1800,detune:dt+k*2,bus:verb()})))}
function swell(t,dur,vol=.12){const a=ctx(),s0=a.currentTime+t,src=a.createBufferSource(),fl=a.createBiquadFilter(),g=a.createGain();src.buffer=noiseBuf;src.loop=true;fl.type="highpass";fl.frequency.value=5000;
  g.gain.setValueAtTime(.0001,s0);g.gain.exponentialRampToValueAtTime(vol,s0+dur);g.gain.exponentialRampToValueAtTime(.0001,s0+dur+.8);src.connect(fl);fl.connect(g);g.connect(verb());src.start(s0);src.stop(s0+dur+.9)}
function roll(t,dur,vol=.35){for(let k=0;k*.05<dur;k++)tone({t:t+k*.05,f:98,slide:80,type:"sine",dur:.12,vol:vol*(.3+.7*k*.05/dur),att:.003})}
function harp(t,ns,gap=.035,vol=.1){ns.forEach((n,i)=>pluck(t+i*gap,n,vol,.6))}
function wub(t,n,{vol=.14,dur=.22,peak=1400,type="sawtooth",slide}={}){const a=ctx(),s0=a.currentTime+t,o=a.createOscillator(),fl=a.createBiquadFilter(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(hz(n),s0);if(slide)o.frequency.exponentialRampToValueAtTime(hz(slide),s0+dur);
  fl.type="lowpass";fl.Q.value=7;fl.frequency.setValueAtTime(180,s0);fl.frequency.linearRampToValueAtTime(peak,s0+Math.min(.07,dur*.4));fl.frequency.exponentialRampToValueAtTime(200,s0+dur);
  g.gain.setValueAtTime(.0001,s0);g.gain.linearRampToValueAtTime(vol,s0+.004);g.gain.setValueAtTime(vol,s0+dur*.7);g.gain.exponentialRampToValueAtTime(.0001,s0+dur);o.connect(fl);fl.connect(g);g.connect(sfxBus);o.start(s0);o.stop(s0+dur+.05)}
function stab(t,ns,vol=.05,dur=.16){ns.forEach(n=>{brass({t,n,dur,vol});tone({t,n:n+12,type:"sawtooth",dur:dur*.8,vol:vol*.35,cut:3200,bus:verb()})})}
function snare(t,vol=.2){noise({t,dur:.13,vol,type:"bandpass",freq:1900,q:.9,bus:verb()});tone({t,f:220,slide:150,type:"triangle",dur:.07,vol:vol*.8})}
function riser(t,dur,vol=.12){const a=ctx(),s0=a.currentTime+t,src=a.createBufferSource(),fl=a.createBiquadFilter(),g=a.createGain();src.buffer=noiseBuf;src.loop=true;fl.type="bandpass";fl.Q.value=3;fl.frequency.setValueAtTime(300,s0);fl.frequency.exponentialRampToValueAtTime(7000,s0+dur);
  g.gain.setValueAtTime(.0001,s0);g.gain.exponentialRampToValueAtTime(vol,s0+dur);g.gain.exponentialRampToValueAtTime(.0001,s0+dur+.05);src.connect(fl);fl.connect(g);g.connect(sfxBus);src.start(s0);src.stop(s0+dur+.1)}
const D={
  tap(){tone({n:84,dur:.05,vol:.15})},
  correct(){[76,79,84].forEach((n,i)=>tone({t:i*.06,n,dur:.09,vol:.16}))},
  wrong(){[67,63,58].forEach((n,i)=>tone({t:i*.08,n,dur:.12,vol:.18}));tone({f:200,slide:80,type:"triangle",dur:.25,vol:.25})},
  perfect(){const m=[[72,.1],[72,.1],[72,.1],[79,.3],[77,.1],[76,.1],[77,.1],[84,.5]];let t=0;m.forEach(([n,d])=>{tone({t,n,dur:d*.95,vol:.14});tone({t,n:n-12,type:"triangle",dur:d*.95,vol:.2});t+=d})},
  results(){[[72,.12],[76,.12],[74,.12],[71,.35]].reduce((t,[n,d])=>{tone({t,n,dur:d*.9,vol:.14});tone({t,n:n-24,type:"triangle",dur:d*.9,vol:.2});return t+d},0)},
  achievement(){[72,76,79,84,79,84,88].forEach((n,i)=>tone({t:i*.06,n,dur:.08,vol:.13,type:i%2?"square":"triangle"}))},
  secret(){[96,100,103,108,103,108].forEach((n,i)=>tone({t:i*.08,n,type:"triangle",dur:.25,vol:.12}));tone({t:.5,n:84,type:"square",dur:.4,vol:.06})},
  wipe(){[0,.14,.28].forEach(t=>{tone({t,n:96,type:"pulse",dur:.05,vol:.1});noise({t,dur:.04,vol:.08,freq:6000})});
   for(let k=0;k<10;k++)tone({t:.42+k*.045,n:60+k*3,type:"pulse",dur:.04,vol:.08});noise({t:.42,dur:.45,vol:.08,type:"bandpass",freq:800,sweep:4000,q:1});
   for(let k=0;k<6;k++)tone({t:.95+k*.05,n:90-k*4,type:"pulse12",dur:.04,vol:.07})},
  perfectDay(){for(let k=0;k<12;k++)noise({t:k*.04,dur:.03,vol:.06+k*.008,type:"bandpass",freq:1800,q:2});
   const m=[[72,.12],[76,.12],[79,.12],[84,.3],[79,.12],[84,.12],[88,.3],[86,.12],[84,.12],[86,.12],[91,.8]];let t=.5;
   m.forEach(([n,d])=>{tone({t,n,dur:d*.95,vol:.13});tone({t,n:n-5,type:"pulse",dur:d*.95,vol:.06});tone({t,n:n-24,type:"triangle",dur:d*.95,vol:.2});t+=d});
   [96,100,103,108].forEach((n,i)=>tone({t:t-.6+i*.06,n,type:"triangle",dur:.4,vol:.06}))},
  streak(){[[0,79],[.06,83],[.12,86],[.18,91]].forEach(([t,n])=>tone({t,n,dur:.07,vol:.12}));tone({t:.26,n:91,type:"pulse",dur:.25,vol:.1})},
  streakBig(){[[0,72,.1],[.1,76,.1],[.2,79,.1],[.3,84,.1],[.4,88,.1],[.5,91,.4]].forEach(([t,n,d])=>{tone({t,n,dur:d,vol:.12});tone({t,n:n-24,type:"triangle",dur:d,vol:.2})});[96,103].forEach((n,i)=>tone({t:.6+i*.08,n,type:"triangle",dur:.3,vol:.07}))},
  runover(){tone({f:900,slide:110,dur:.7,vol:.12});[[.75,60],[.9,55],[1.05,48]].forEach(([t,n])=>tone({t,n,type:"triangle",dur:.14,vol:.22}))},
  throw(){tone({f:300,slide:1400,type:"pulse",dur:.25,vol:.07});noise({dur:.25,vol:.08,type:"bandpass",freq:1000,sweep:5000,q:2});noise({t:.28,dur:.04,vol:.25,type:"bandpass",freq:1800,q:4});tone({t:.3,n:91,dur:.05,vol:.1})},
  cry(){const b=200+Math.random()*500,a=ctx(),s0=a.currentTime,o=a.createOscillator(),g=a.createGain(),l=a.createOscillator(),lg=a.createGain();
   o.setPeriodicWave(pulse(.25));o.frequency.setValueAtTime(b,s0);o.frequency.linearRampToValueAtTime(b*(1.3+Math.random()),s0+.12);o.frequency.linearRampToValueAtTime(b*.8,s0+.45);
   l.frequency.value=18+Math.random()*20;lg.gain.value=b*.15;l.connect(lg);lg.connect(o.frequency);
   g.gain.setValueAtTime(.0001,s0);g.gain.exponentialRampToValueAtTime(.1,s0+.02);g.gain.setValueAtTime(.1,s0+.35);g.gain.exponentialRampToValueAtTime(.0001,s0+.5);
   o.connect(g);g.connect(sfxBus);o.start(s0);l.start(s0);o.stop(s0+.55);l.stop(s0+.55)},
  exp(){for(let k=0;k<20;k++)tone({t:k*.04,n:60+k*1.5,type:"pulse",dur:.035,vol:.05});tone({t:.85,n:91,dur:.3,vol:.1})},
  whos(){for(let k=0;k<14;k++)noise({t:k*.035,dur:.03,vol:.05+k*.006,type:"bandpass",freq:2000,q:2});noise({t:.5,dur:.15,vol:.25,freq:3000});[[.52,72],[.62,79],[.72,84]].forEach(([t,n])=>{tone({t,n,dur:.12,vol:.13});tone({t,n:n-12,type:"triangle",dur:.12,vol:.18})})},
  copied(){tone({n:84,dur:.05,vol:.12});tone({t:.07,n:91,dur:.1,vol:.12})},
  hint(){[88,91].forEach((n,i)=>tone({t:i*.07,n,type:"triangle",dur:.2,vol:.1}))},
  tab(){[76,72].forEach((n,i)=>tone({t:i*.04,n,type:"pulse",dur:.04,vol:.09}))},
  wobble3(){[0,.35,.7].forEach(t=>{noise({t,dur:.05,vol:.25,type:"bandpass",freq:1800,q:5});tone({t:t+.02,f:300,slide:180,type:"triangle",dur:.08,vol:.2})});tone({t:1.05,n:96,dur:.06,vol:.15});noise({t:1.05,dur:.04,vol:.3,type:"highpass",freq:3000})},
  wild(){for(let i=0;i<8;i++)tone({t:i*.045,n:88-i*3,dur:.04,vol:.12});
   noise({t:.36,dur:.12,vol:.15,type:"highpass",freq:3000});
   [[.42,69,.09],[.51,72,.09],[.6,76,.09],[.69,75,.24]].forEach(([t,n,d])=>{tone({t,n,dur:d,vol:.14});tone({t,n:n-24,type:"triangle",dur:d,vol:.22})})},
  shiny(){for(let i=0;i<8;i++)tone({t:i*.045,n:88-i*3,dur:.04,vol:.1});
   [0,.11,.22].forEach((t0,k)=>{[100,104,107].forEach((n,i)=>tone({t:.4+t0+i*.03,n:n+k*2,type:"triangle",dur:.18,vol:.1}));noise({t:.4+t0,dur:.05,vol:.08,freq:8000})});
   [[.8,84,.1],[.9,88,.1],[1,91,.1],[1.1,96,.4]].forEach(([t,n,d])=>{tone({t,n,dur:d,vol:.12});tone({t,n:n-24,type:"triangle",dur:d,vol:.2})})},
  rustle(){[0,.09,.2].forEach(t=>noise({t,dur:.07,vol:.2,type:"bandpass",freq:2500+Math.random()*1500,q:2}))},
  star(){tone({f:3000,slide:900,type:"triangle",dur:.6,vol:.08});noise({dur:.6,vol:.06,type:"bandpass",freq:6000,sweep:1500,q:3});[[.62,84],[.72,88],[.82,91],[.92,96]].forEach(([t,n])=>tone({t,n,type:"pulse",dur:.4,vol:.08}));[96,100,103].forEach((n,i)=>tone({t:1+i*.07,n,type:"triangle",dur:.5,vol:.06}))},
  retro(){noise({dur:.03,vol:.25,type:"bandpass",freq:1500,q:4});tone({t:.05,f:60,type:"square",dur:.1,vol:.06});[[.3,84,.08],[.4,88,.08],[.5,96,.5]].forEach(([t,n,d])=>tone({t,n,type:"pulse",dur:d,vol:.1}))},
  colour(){[96,88,84].forEach((n,i)=>tone({t:i*.08,n,type:"pulse",dur:.07,vol:.08}));noise({t:.24,dur:.4,vol:.08,type:"bandpass",freq:500,sweep:7000,q:2});
   [[.3,"square",72],[.36,"pulse",76],[.42,"triangle",79],[.48,"pulse",84]].forEach(([t,type,n])=>tone({t,n,type,dur:.6,vol:.07}));[96,100,103,108].forEach((n,i)=>tone({t:.55+i*.05,n,type:"triangle",dur:.35,vol:.05}))},
  evolve(){let t=0,d=.2;for(let k=0;k<14;k++){tone({t,n:k%2?76:72,type:"pulse",dur:d*.8,vol:.09});tone({t,n:k%2?64:60,type:"triangle",dur:d*.8,vol:.15});t+=d;d=Math.max(.06,d*.85)}
   noise({t,dur:.25,vol:.2,freq:4000});[[0,72,.12],[.12,76,.12],[.24,79,.12],[.36,84,.12],[.48,83,.12],[.6,84,.6]].forEach(([o,n,dd])=>{tone({t:t+.1+o,n,dur:dd*.95,vol:.12});tone({t:t+.1+o,n:n-24,type:"triangle",dur:dd*.95,vol:.2})})},
};
// Daily Poké Catch timing-matched pieces
D.wobble=()=>{noise({dur:.05,vol:.25,type:"bandpass",freq:1800,q:5});tone({t:.02,f:300,slide:180,type:"triangle",dur:.08,vol:.2})};
D.type=()=>tone({n:84+(Math.random()*3|0),type:"pulse12",dur:.02,vol:.045});
let evoTap=0;D.spin=()=>{evoTap++;const n=72+(evoTap%6)*2;for(let k=0;k<5;k++)tone({t:k*.03,n:n+k,type:"pulse12",dur:.025,vol:.07})};
let after=null;const flush=()=>{const f=after;after=null;if(f)setTimeout(()=>SND.play(f),450)};
D.caught=()=>{D.correct();flush()};
D.brokeFree=()=>{D.wrong();flush()};

// a made-up cry for the shadow that crosses the full moon (not any real Pokémon's cry): a low growl that rises into a roar and a fading scream
D.moonCry=()=>{
  [-28,0,31].forEach(dt=>tone({f:70,slide:118,type:"sawtooth",dur:.55,vol:.13,att:.08,cut:700,detune:dt}));
  noise({dur:.7,vol:.22,type:"bandpass",freq:260,sweep:520,q:6});
  [-35,0,22,48].forEach(dt=>tone({t:.45,f:150,slide:300,type:"sawtooth",dur:.55,vol:.12,att:.03,cut:2600,detune:dt}));
  for(let k=0;k<9;k++)tone({t:.5+k*.06,f:240+k*12,type:"square",dur:.05,vol:.05,cut:1800});
  noise({t:.45,dur:.6,vol:.16,type:"bandpass",freq:900,sweep:1800,q:3});
  [-20,0,25].forEach(dt=>tone({t:.98,f:620,slide:140,type:"sawtooth",dur:1.3,vol:.1,att:.02,cut:3000,detune:dt}));
  tone({t:.98,f:1240,slide:300,type:"square",dur:.9,vol:.035,cut:3500});
  noise({t:.98,dur:1.2,vol:.1,type:"bandpass",freq:1600,sweep:300,q:2});
  tone({t:.95,f:55,slide:32,type:"sine",dur:1.8,vol:.3,att:.02});noise({t:.95,dur:.5,vol:.18,type:"lowpass",freq:180})};
// sky events
D.meteor=()=>{[0,.05,.1,.15,.2].forEach((t,k)=>tone({t,n:96-k*2,type:"triangle",dur:.12,vol:.07-k*.01}));noise({dur:.35,vol:.05,type:"highpass",freq:5000})};
D.eclipse=()=>{tone({f:110,slide:82,type:"triangle",dur:2.2,vol:.16,att:.6});tone({f:165,slide:123,type:"sine",dur:2.2,vol:.1,att:.8});[0,.5,1,1.5].forEach((t,k)=>tone({t:.3+t,n:84-k*3,type:"sine",dur:.6,vol:.05}))};
// out in the field
D.flap=()=>{for(let k=0;k<10;k++)noise({t:k*.05,dur:.035,vol:.16-k*.012,type:"bandpass",freq:1400+Math.random()*600,q:2})};
D.rain=()=>{noise({dur:3,vol:.12,type:"highpass",freq:3500,att:.8});[0,.3,.7,1.1,1.6].forEach(t=>tone({t,n:88+(Math.random()*6|0),type:"sine",dur:.08,vol:.04}))};
D.berry=()=>{[0,.12,.22,.3].forEach((t,k)=>tone({t,n:76-k*2,type:"pulse12",dur:.06,vol:.08}))};
D.cap=()=>{[72,76,79,84].forEach((n,k)=>tone({t:k*.07,n,type:"pulse",dur:.08,vol:.08}))};
D.fireflies=()=>{for(let k=0;k<12;k++)tone({t:k*.09,n:84+[0,4,7,11,12,16][k%6],type:"sine",dur:.3,vol:.05})};
// collection: the Pokédex and Badge Case
D.dexNew=()=>{[[72,0],[76,.08],[79,.16],[84,.26]].forEach(([n,t])=>tone({t,n,type:"pulse",dur:.1,vol:.08}));tone({t:.26,n:88,type:"pulse12",dur:.3,vol:.06});tone({t:0,n:48,type:"triangle",dur:.4,vol:.12})};
D.dexSeen=()=>{tone({n:76,type:"pulse12",dur:.06,vol:.05});tone({t:.07,n:71,type:"pulse12",dur:.08,vol:.04})};
D.dexMaster=()=>{[79,83,86,91,95,98].forEach((n,k)=>tone({t:k*.06,n,type:"pulse",dur:.12,vol:.07}));tone({t:.36,n:103,type:"triangle",dur:.5,vol:.05})};
D.badge=()=>{[[67,0,.14],[67,.15,.08],[67,.24,.08],[72,.33,.5]].forEach(([n,t,d])=>{tone({t,n,type:"pulse",dur:d,vol:.08});tone({t,n:n-12,type:"triangle",dur:d,vol:.12})});[76,79].forEach(n=>tone({t:.33,n,type:"pulse12",dur:.5,vol:.05}))};
D.flee=()=>{[0,.07,.14,.21].forEach((t,k)=>noise({t,dur:.04,vol:.18,type:"bandpass",freq:900+k*150,q:4}));[[.32,79],[.4,76],[.48,72],[.56,67]].forEach(([t,n])=>tone({t,n,type:"pulse",dur:.07,vol:.1}));noise({t:.3,dur:.35,vol:.08,type:"bandpass",freq:3000,sweep:600,q:1.5})};

/* ---- music: a small step sequencer that plans a little ahead, and skips late notes rather than cramming them in ---- */
const SONGS={
 pkMenu:{bpm:140,steps:64,play(i,t){ // route theme, now the menu song: C Am F G chiptune
   const bar=Math.floor(i/16),s=i%16;
   const mel=[[76,79,84,0,83,79,76,79],[81,0,84,81,76,0,72,76],[77,81,84,86,84,81,77,0],[79,83,86,0,84,83,79,74]][bar];
   if(s%2===0){const n=mel[s/2];if(n)tone({t,n,dur:.17,vol:.07,bus:musBus})}
   const bass=[48,45,41,43][bar];
   if(s%2===0)tone({t,n:bass+(s%4===2?12:0),type:"triangle",dur:.18,vol:.22,bus:musBus});
   if(s%4===0)tone({t,f:120,slide:50,type:"triangle",dur:.08,vol:.25,bus:musBus});
   if(s===4||s===12)noise({t,dur:.08,vol:.1,type:"highpass",freq:2500,bus:musBus});
   if(s%2===1)noise({t,dur:.025,vol:.04,freq:9000,bus:musBus});
 }},
 pkB:{bpm:120,steps:64,play(i,t){ // Battle B, "legendary": slow, heavy, ominous (Dm Bb Gm A)
   const bar=Math.floor(i/16),s=i%16;
   const mel=[[74,0,0,0,77,0,76,0],[74,0,72,0,70,0,0,0],[70,0,72,74,75,0,74,72],[73,0,0,0,76,0,79,0]][bar];
   if(s%2===0){const n=mel[s/2];if(n){const len=(mel[s/2+1]===0?(mel[s/2+2]===0?3:2):1)*.25;tone({t,n,type:"pulse",dur:len,vol:.08,bus:musBus});tone({t,n:n-12,type:"pulse12",dur:len,vol:.03,bus:musBus})}}
   const root=[38,34,43,45][bar];if(s%2===0)tone({t,n:root-12+(s%4===2?12:0),type:"triangle",dur:.2,vol:.24,bus:musBus});
   const tri=[[62,65,69],[58,62,65],[55,58,62],[57,61,64]][bar];tone({t,n:tri[s%3]+12,type:"pulse12",dur:.05,vol:.018,bus:musBus});
   if(s%8===0)tone({t,f:110,slide:40,type:"triangle",dur:.18,vol:.35,bus:musBus});
   if(s%8===4)noise({t,dur:.16,vol:.15,type:"highpass",freq:1500,bus:musBus});
   if(s%4===2)noise({t,dur:.02,vol:.04,freq:9000,bus:musBus});
   if(bar===3&&s>=8&&s%2===0)tone({t,f:180-s*6,slide:70,type:"triangle",dur:.12,vol:.25,bus:musBus});
 }},
 pk:{bpm:166,steps:64,play(i,t){ // battle theme for questions: Am F G E, driving and tense
   const bar=Math.floor(i/16),s=i%16;
   const mel=[[69,72,76,0,74,72,71,72],[77,0,76,74,72,0,69,72],[74,76,79,0,77,76,74,71],[76,0,80,0,83,0,80,76]][bar];
   if(s%2===0){const n=mel[s/2];if(n)tone({t,n,type:"pulse",dur:.13,vol:.075,bus:musBus})}
   const root=[45,41,43,40][bar];tone({t,n:root+(s%2?12:0),type:"triangle",dur:.08,vol:.2,bus:musBus});
   const tri=[[69,72,76],[65,69,72],[67,71,74],[64,68,71]][bar];tone({t,n:tri[s%3]+12,type:"pulse12",dur:.05,vol:.022,bus:musBus});
   if(s%4===0)tone({t,f:130,slide:45,type:"triangle",dur:.08,vol:.3,bus:musBus});
   if(s%8===4)noise({t,dur:.1,vol:.13,type:"highpass",freq:2000,bus:musBus});
   if(s%2===1)noise({t,dur:.02,vol:.04,freq:9000,bus:musBus});
   if(bar===3&&s>=12)noise({t,dur:.05,vol:.08,type:"highpass",freq:2500,bus:musBus});
 }},
 pkTown:{bpm:104,steps:64,play(i,t){ // cozy town tune for the Endless screen: F Dm Bb C
   const bar=Math.floor(i/16),s=i%16;
   const mel=[[72,0,69,72,77,0,76,74],[74,0,72,69,65,0,0,0],[70,74,77,0,79,77,74,72],[72,0,74,76,79,0,0,0]][bar];
   if(s%2===0){const n=mel[s/2];if(n)tone({t,n,type:"pulse",dur:.24,vol:.07,bus:musBus})}
   const root=[41,38,46,48][bar];if(s%4===0)tone({t,n:root+(s%8===4?7:0),type:"triangle",dur:.3,vol:.22,bus:musBus});
   const tri=[[65,69,72],[62,65,69],[62,65,70],[64,67,72]][bar];if(s%4===2)tri.forEach(n=>tone({t,n,type:"pulse12",dur:.12,vol:.02,bus:musBus}));
   if(s%2===0)noise({t,dur:.02,vol:.025,freq:9000,bus:musBus});
 }},
 mEclipse:{bpm:72,steps:64,play(i,t){ // Poké eclipse: an eerie chiptune in C minor, a slow pulse lead, a tritone arpeggio and a ticking clock
   const bar=Math.floor(i/16),s=i%16;const root=[36,32,34,31][bar];
   if(s%4===0)tone({t,n:root+(s===8?6:0),type:"triangle",dur:.6,vol:.2,bus:musBus});
   if(s%2===0){const ar=[0,3,6,3][s/2%4];tone({t,n:root+24+ar,type:"pulse12",dur:.12,vol:.03,bus:musBus})}
   const lead={0:72,6:71,8:68,12:66}[s];if(lead&&bar!==2)tone({t,n:lead-(bar===3?1:0),type:"pulse",dur:.9,vol:.045,cut:2200,bus:musBus});
   if(s%4===2)noise({t,dur:.02,vol:.035,type:"highpass",freq:7000,bus:musBus});
   if(s===0&&bar===3)noise({t,dur:1.2,vol:.04,type:"bandpass",freq:400,sweep:1600,q:5,bus:musBus});
 }},
 mBlood:{bpm:104,steps:64,play(i,t){ // Poké blood moon: a frantic 8-bit battle loop in E phrygian with a pounding square bass and a shrieking arpeggio
   const bar=Math.floor(i/16),s=i%16;const root=[40,41,40,38][bar];
   tone({t,n:root+([0,0,12,0,1,0,12,0][s%8]),type:"square",dur:.1,vol:.06,cut:1400,bus:musBus});
   if(s%4===0)tone({t,f:130,slide:45,type:"triangle",dur:.12,vol:.3,bus:musBus});
   if(s===4||s===12)noise({t,dur:.1,vol:.13,type:"bandpass",freq:1800,q:.8,bus:musBus});
   if(s%2===1)noise({t,dur:.02,vol:.04,freq:9000,bus:musBus});
   if(bar%2===1&&s>=8){const ar=[0,1,4,7,10,7,4,1][s-8];tone({t,n:76+ar,type:"pulse12",dur:.08,vol:.035,bus:musBus})}
   if(s===0&&bar%2===0)[64,70].forEach(n=>tone({t,n,type:"pulse",dur:1.1,vol:.03,cut:2600,bus:musBus}));
 }},
 mCalm:{bpm:64,steps:64,play(i,t){ // Poké calm moon: a soft 8-bit lullaby in G, triangle arpeggios and a quiet pulse melody, no drums
   const bar=Math.floor(i/16),s=i%16;const ch=[[55,59,62],[52,55,59],[48,52,55],[50,54,57]][bar];
   if(s%2===0)tone({t,n:ch[(s/2)%3]+12,type:"triangle",dur:.5,vol:.07,bus:musBus});
   if(s===0||s===8)tone({t,n:ch[0]-12,type:"triangle",dur:1.2,vol:.14,bus:musBus});
   const mel={0:79,4:78,6:76,10:74,12:71}[s];if(mel&&bar!==3)tone({t,n:mel-(bar===2?2:0),type:"pulse12",dur:.7,vol:.03,cut:2600,bus:musBus});
 }},
 mRain:{bpm:76,steps:64,play(i,t){ // rain: a soft, wistful chiptune in A minor with plinking raindrops and a gentle pulse
   const bar=Math.floor(i/16),s=i%16;const ch=[[57,60,64],[53,57,60],[48,52,55],[55,59,62]][bar];
   if(s===0)ch.forEach(n=>tone({t,n,type:"triangle",dur:2.8,vol:.03,att:.4,bus:musBus}));
   if(s%4===0)tone({t,n:ch[0]-12+(s===8?7:0),type:"triangle",dur:.5,vol:.13,bus:musBus});
   const mel=[[0,76],[4,74],[6,72],[10,71],[12,69]];if(bar!==3)mel.forEach(([q,n])=>{if(q===s)tone({t,n:n-(bar===1?2:0),type:"pulse",dur:.45,vol:.035,cut:2400,bus:musBus})});
   if(Math.random()<.22)tone({t:t+Math.random()*.1,n:[84,88,91,93,96][Math.random()*5|0],type:"sine",dur:.12,vol:.025,att:.002,bus:musBus});
   if(s%2===1)noise({t,dur:.06,vol:.018,type:"highpass",freq:6500,bus:musBus});
 }}
};
let want="lobby",cur=null,timer=null,step=0,nextT=0,src=null;
/* Songs play from small recorded loops of the same code-made music (smoother on slow devices). Until a file has loaded,
   or if it can't load, the song is made live by the sequencer instead. */
// Test switch: the recorded loops are only used with ?music=files in the address; everyone else gets the live code music.
const FILEMODE=false;  // recorded loops are parked on the possible-updates branch
const FILES=FILEMODE?(G.music||{}):{},BUF={},LOADING={};
const decode=ab=>new Promise((res,rej)=>{const p=A.decodeAudioData(ab,res,rej);if(p&&p.then)p.then(res,rej)});
function load(k){if(!FILES[k]||BUF[k]||LOADING[k])return LOADING[k];
  LOADING[k]=fetch(G.musicBase+k+".mp3").then(r=>{if(!r.ok)throw 0;return r.arrayBuffer()}).then(decode).then(b=>{BUF[k]=b;if(cur===k&&!src)startSong(k)}).catch(noop);return LOADING[k]}
function preload(){if(!A)return;const ks=[...new Set(Object.values(G.songs))];ks.sort((a,b)=>(b===G.songs[want])-(a===G.songs[want]));ks.reduce((p,k)=>p.then(()=>load(k)),Promise.resolve())}
function schedule(){const S=SONGS[cur];if(!S)return;const n=window.SKY?SKY.now().night:0;if(Math.abs(n-NIGHT)>.01)setNight(n);const dt=60/(S.bpm*(1-.1*NIGHT))/4,now=A.currentTime;
  if(nextT<now+.02){const skip=Math.ceil((now+.05-nextT)/dt);step=(step+skip)%S.steps;nextT+=skip*dt}
  while(nextT<now+.6){try{S.play(step,nextT-now);if(NIGHT>.05&&step%32===0)tone({t:nextT-now,n:[84,86,88,91,93,96][Math.random()*6|0],type:"sine",dur:1.6,vol:.03*NIGHT,att:.01,bus:musBus})}catch(e){}step=(step+1)%S.steps;nextT+=dt}}
function startSong(k){
  clearInterval(timer);timer=null;if(src){const s=src;src=null;try{s.stop(A.currentTime+1.2)}catch(e){}}
  if(musBus&&musBus!==musRoot){const g=musBus;g.gain.setTargetAtTime(0,A.currentTime,.12);setTimeout(()=>{try{g.disconnect()}catch(e){}},1500)}
  musBus=musRoot;cur=k;delete SONGS.pad;if(!k)return;
  musBus=A.createGain();musBus.gain.setValueAtTime(.0001,A.currentTime);musBus.gain.setTargetAtTime(1,A.currentTime,.2);musBus.connect(musRoot);
  const f=FILES[k],b=BUF[k];
  if(f&&b){src=A.createBufferSource();src.buffer=b;src.loop=true;src.loopStart=f.pad;src.loopEnd=f.pad+f.L;const g=A.createGain();g.gain.value=f.gain;src.connect(g);g.connect(musBus);src.start(A.currentTime+.03,f.pad);return}
  load(k);step=0;nextT=A.currentTime+.12;timer=setInterval(schedule,90)}
// sky events change the menu and summary music: something darker during an eclipse, scarier for a blood moon, calmer for a super or blue moon
function moodSong(w){if(w!=="lobby"&&w!=="endless")return null;if(window.__raining&&SONGS.mRain)return "mRain";const e=window.EV&&EV.today&&EV.today();if(!e)return null;const n=window.SKY?SKY.isNight():false;
  if(!n&&e.solar)return "mEclipse";if(n&&e.lunar==="total")return "mBlood";if(n&&e.lunar)return "mEclipse";if(n&&(e.supermoon||e.blue))return "mCalm";return null}
function applyMusic(){const k=st.mu&&A&&A.state==="running"&&!document.hidden&&Date.now()>=holdUntil?(moodSong(want)||G.songs[want]||null):null;if(k!==cur)startSong(k)}
SND.refresh=()=>{if(A)applyMusic()};setInterval(()=>{if(A&&st.mu)applyMusic()},30000);
function wake(){if(!(st.fx||st.mu))return;ctx();if(st.mu)preload();if(A.state!=="running")A.resume().then(applyMusic,noop);else applyMusic()}
SND.on=()=>st.fx;
SND.state=()=>({music:cur,want,audio:A?A.state:"none",file:!!src});
SND.play=(name,...a)=>{if(!st.fx||document.hidden)return;const f=D[name];if(!f)return;ctx();if(A.state!=="running")A.resume().catch(noop);try{f(...a)}catch(e){}};
SND.music=k=>{want=k;if(A)applyMusic()};
SND.hold=ms=>{holdUntil=Date.now()+ms;if(A)applyMusic();setTimeout(()=>{if(A)applyMusic()},ms+50)};
SND.retro=on=>setRetro(!!on);
["pointerdown","touchend","keydown","click"].forEach(ev=>addEventListener(ev,wake,{capture:true,passive:true}));
document.addEventListener("visibilitychange",()=>{if(!A)return;if(document.hidden){applyMusic();A.suspend().catch(noop)}else if(st.fx||st.mu)A.resume().then(applyMusic,noop)});

/* ---- taps on buttons, tabs and links ---- */
document.addEventListener("click",e=>{
  const el=e.target.closest&&e.target.closest("button,summary,a,[role=tab]");if(!el||el.closest("#snd"))return;
  if(el.matches(".opt")||el.closest(G.skipTap))return;
  if(el.matches(".tab")){SND.music("lobby");return SND.play("tab")}
  if(/copy/i.test(el.id||""))return SND.play("copied");
  if(el.matches("summary")&&el.closest("#ach-root"))return SND.play("hint");
  SND.play("tap");
},true);

/* ---- the speaker button and its two switches ---- */
const SPK='<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/>';
const ICON_ON=SPK+'<path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const ICON_OFF=SPK+'<path d="m16 9 6 6m0-6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const css=document.createElement("style");css.textContent=`
#snd{position:fixed;bottom:calc(14px + env(safe-area-inset-bottom));right:14px;z-index:1003;font:600 14px/1.3 ${G.font}}
#snd-btn{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;cursor:pointer;border:2px solid ${G.edge};background:${G.bg};color:${G.fg};box-shadow:0 3px 0 ${G.edge}}
#snd-btn:focus-visible{outline:3px solid ${G.accent};outline-offset:2px}
#snd-pop{position:absolute;right:0;bottom:52px;min-width:210px;padding:12px 14px;border-radius:12px;background:${G.bg};color:${G.fg};border:2px solid ${G.edge};box-shadow:0 8px 24px rgba(0,0,0,.35)}
#snd-pop[hidden]{display:none}
#snd-pop label{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:6px 0;cursor:pointer}
#snd-pop input{width:20px;height:20px;accent-color:${G.accent};cursor:pointer}
#snd-pop .vol input{width:110px;height:auto}
body.tw-panel #snd{bottom:8px;right:8px}body.tw-panel #snd-btn{width:34px;height:34px}`;
document.head.appendChild(css);
const box=document.createElement("div");box.id="snd";
box.innerHTML=`<button id="snd-btn" type="button" aria-haspopup="true" aria-expanded="false" aria-label="Sound settings"></button>
<div id="snd-pop" hidden><label>Sound effects <input type="checkbox" id="snd-fx"></label><label>Music <input type="checkbox" id="snd-mu"></label><label class="vol">Volume <input type="range" id="snd-vol" min="0" max="1" step="0.05" aria-label="Volume"></label></div>`;
document.body.appendChild(box);
const btn=box.querySelector("#snd-btn"),pop=box.querySelector("#snd-pop"),fx=box.querySelector("#snd-fx"),mu=box.querySelector("#snd-mu"),vol=box.querySelector("#snd-vol");vol.value=st.vol;
vol.oninput=()=>{st.vol=+vol.value;if(master)master.gain.setTargetAtTime(.9*st.vol,A.currentTime,.03)};vol.onchange=()=>{save();SND.play("tap")};
const paint=()=>{fx.checked=st.fx;mu.checked=st.mu;btn.innerHTML=st.fx||st.mu?ICON_ON:ICON_OFF;btn.setAttribute("aria-label","Sound settings: "+(st.fx||st.mu?"on":"off"))};paint();
btn.onclick=()=>{pop.hidden=!pop.hidden;btn.setAttribute("aria-expanded",String(!pop.hidden))};
document.addEventListener("click",e=>{if(!pop.hidden&&!box.contains(e.target)){pop.hidden=true;btn.setAttribute("aria-expanded","false")}});
fx.onchange=()=>{st.fx=fx.checked;save();paint();wake();if(st.fx)SND.play("tap")};
mu.onchange=()=>{st.mu=mu.checked;save();paint();wake();if(A)applyMusic()};

/* ---- hooks into the game ---- */
const allX=qs=>!!qs&&qs.length>0&&qs.every(q=>q&&q.t==="x");
const matchSong=()=>S&&(allX(S.qs)||allX(S.pool))?"og":"match";
const _q=question;question=function(){_q.apply(this,arguments);SND.music(matchSong())};
const _eq=endlessQ;endlessQ=function(){_eq.apply(this,arguments);SND.music(matchSong())};
const _ea=endlessAnswer;endlessAnswer=function(btn){const ok=!!(S&&S.cur)&&btn.dataset.o===S.cur.a,prev=S?S.streak:0;_ea.apply(this,arguments);
  const s=S?S.streak:0;after=ok?(s>0&&s%5===0?(s===10||s%25===0?"streakBig":"streak"):null):(prev>=3?"runover":null)};
const _r=results;results=function(fresh){_r.apply(this,arguments);SND.music("lobby");if(!fresh||!S||!S.qs)return;
  const n=S.marks.filter(Boolean).length,t=S.qs.length,dailyish=S.mode==="main"||S.mode==="daily";
  if(n===t&&t>0){let day=false;try{day=dailyish&&typeof allPerfectToday==="function"&&allPerfectToday()}catch(e){}SND.play(day?"perfectDay":"perfect")}
  else{SND.play("results");setTimeout(()=>SND.play("exp"),700)}};
const _sv=setView;setView=function(){_sv.apply(this,arguments);SND.music("lobby")};
const _ev=endlessView;endlessView=function(){_ev.apply(this,arguments);SND.music("lobby")};
const _ee=endlessEnd;endlessEnd=function(){_ee.apply(this,arguments);SND.music("endless")};
const _a=answer;answer=function(){after=null;_a.apply(this,arguments)};

})();
