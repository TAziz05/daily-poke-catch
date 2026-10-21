// 1) Records what the LIVE site (origin/main) actually served each day into history.json.
// 2) Freezes yesterday, today and tomorrow (Eastern) to exactly what the live site serves (out/pinned.json),
//    so publishing new questions never changes a day already in play.
const fs=require("fs"),{execSync}=require("child_process"),{JSDOM}=require("jsdom");
const out=__dirname+"/out/pinned.json",histFile=__dirname+"/history.json";
const history=fs.existsSync(histFile)?JSON.parse(fs.readFileSync(histFile,"utf8")):{};
let html="";
try{execSync("git fetch -q origin main",{cwd:__dirname,stdio:"ignore"})}catch(e){}
try{html=execSync("git show origin/main:index.html",{cwd:__dirname,maxBuffer:1<<28,stdio:["ignore","pipe","ignore"]}).toString()}catch(e){}
fs.mkdirSync(__dirname+"/out",{recursive:true});
if(!/function mainSet\(dn=dayNum\)/.test(html)){fs.writeFileSync(out,"{}");console.log("pin: live page not found, nothing pinned");process.exit(0)}
const w=new JSDOM(html,{runScripts:"dangerously",url:"https://example.org/",beforeParse(win){win.scrollTo=()=>{}}}).window;
const todays=w.eval("todays"),slotStart=w.eval("slotStart"),mainSet=w.eval("mainSet");
const key=q=>q.t+"|"+q.q+"|"+q.a;
const et=new Intl.DateTimeFormat("en-CA",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const t0=Date.UTC(+et.slice(0,4),+et.slice(5,7)-1,+et.slice(8,10)),day0=Date.UTC(2026,9,20),DAY=864e5;
const served=dn=>{const p={main:JSON.parse(JSON.stringify(mainSet(dn)))};
  for(const tier of ["e","m","h","x"])p[tier]=JSON.parse(JSON.stringify(todays(tier,5,undefined,slotStart(tier,dn),dn)));return p};
const known=Object.keys(history).sort(),first=known.length?Date.parse(known[known.length-1]+"T00:00:00Z")+DAY:day0;
const pins={};
for(let t=Math.min(first,t0-DAY);t<=t0+DAY;t+=DAY){
  const k=new Date(t).toISOString().slice(0,10),dn=Math.round((t-day0)/DAY);if(dn<0)continue;
  const p=served(dn);
  if(t>=t0-DAY)pins[k]=p;
  if(!history[k]||t>=t0-DAY)history[k]=Object.fromEntries(Object.entries(p).map(([s,qs])=>[s,qs.map(key)]));
}
fs.writeFileSync(out,JSON.stringify(pins));
fs.writeFileSync(histFile,JSON.stringify(Object.fromEntries(Object.entries(history).sort()),null,0).replace(/\],"/g,'],\n"'));
console.log("pin: froze",Object.keys(pins).join(", ")||"nothing","| history has",Object.keys(history).length,"days");
