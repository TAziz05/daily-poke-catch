// Plans the daily questions for the next 200 days, starting the day after tomorrow (Eastern),
// or launch day if that is later. No question repeats until every question in its tier has been
// served: questions served the fewest times always go first (oldest first within that). Within that
// rule each day stays varied: at most 1, then 2, questions of the same kind (like "What type is X?")
// or topic per day, and never the same Pokémon twice in one day.
// Writes out/schedule.json: {"YYYY-MM-DD": {e:[ids], m:[ids], h:[ids], x:[ids], main:[ids]}}
const fs=require("fs");
const Q=JSON.parse(fs.readFileSync(__dirname+"/out/data.json","utf8")).questions;
const histFile=__dirname+"/history.json",history=fs.existsSync(histFile)?JSON.parse(fs.readFileSync(histFile,"utf8")):{};
const MIX={e:1,m:1,h:2,x:1},PER=5,DAYS=200,DAY=864e5,LAUNCH=Date.UTC(2026,9,20);
const key=q=>q.t+"|"+q.q+"|"+q.a;
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
const last={},times={};
for(const [d,sets] of Object.entries(history).sort())for(const ks of Object.values(sets))for(const k of ks){last[k]=d;times[k]=(times[k]||0)+1}
const et=new Intl.DateTimeFormat("en-CA",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const t0=Date.UTC(+et.slice(0,4),+et.slice(5,7)-1,+et.slice(8,10));
const pools={e:[],m:[],h:[],x:[]};for(const q of Q)if(pools[q.t])pools[q.t].push(q);
const sched={};
// Until the site is live (no history yet), plan from launch day itself.
const first=Object.keys(history).length?t0+(process.env.REPLAN_TOMORROW==='1'?1:2)*DAY:t0;
for(let t=Math.max(first,LAUNCH);t<t0+(DAYS+2)*DAY;t+=DAY){
  const d=new Date(t).toISOString().slice(0,10),day={},famN={},usedMon=new Set(),usedKey=new Set();
  for(const tier of ["x","h","m","e"]){
    const need=PER+MIX[tier];
    const order=pools[tier].map(q=>({q,k:key(q),n:times[key(q)]||0,l:last[key(q)]||"0000-00-00",r:hash(key(q)+"|"+d)}))
      .sort((a,b)=>a.n-b.n||(a.l<b.l?-1:a.l>b.l?1:a.r-b.r));
    const pick=[];
    // Go through the pool in "rounds" by how often each question has been served, so a question
    // only comes back once every question in the tier has had the same number of turns.
    const rounds=[...new Set(order.map(c=>c.n))];
    for(const n of rounds){
      // Spread each kind of question evenly through the round, so the small topics don't all get
      // used up early and leave the last weeks full of one kind.
      const round=order.filter(c=>c.n===n),famSize={},famPos={};
      for(const c of round){const f=c.q.f||c.q.era;famSize[f]=(famSize[f]||0)+1}
      for(const c of round){const f=c.q.f||c.q.era;famPos[f]=(famPos[f]||0)+1;c.p=(famPos[f]-1+(c.r%1000)/1000)/famSize[f]}
      round.sort((a,b)=>a.p-b.p||a.r-b.r);
      for(const cap of [1,2,99]){
        for(const c of round){if(pick.length>=need)break;if(usedKey.has(c.k))continue;
          const f=c.q.f||c.q.era,m=c.q.mon||(c.q.kind==="who"?"mon:"+c.q.a:null);
          if((famN[f]||0)>=cap)continue;if(m&&usedMon.has(m)&&cap<99)continue;
          pick.push(c);usedKey.add(c.k);famN[f]=(famN[f]||0)+1;if(m)usedMon.add(m);}
        if(pick.length>=need)break;}
      if(pick.length>=need)break;}
    for(const c of pick){last[c.k]=d;times[c.k]=(times[c.k]||0)+1}
    day[tier]=pick.slice(0,PER).map(c=>c.q.id);day["_"+tier]=pick.slice(PER).map(c=>c.q.id);
  }
  day.main=[...day._e,...day._m,...day._h,...day._x];for(const s of ["_e","_m","_h","_x"])delete day[s];
  sched[d]=day;
}
fs.writeFileSync(__dirname+"/out/schedule.json",JSON.stringify(sched));
console.log("schedule: planned",Object.keys(sched).length,"days from",Object.keys(sched)[0]);
