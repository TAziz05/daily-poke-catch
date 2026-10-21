import os,json,html
R=os.path.dirname(os.path.abspath(__file__))+'/'
D=json.load(open(R+'out/data.json'))
# Shorten source links and drop build-only fields to keep the page small.
P=[('https://bulbapedia.bulbagarden.net/wiki/','b:'),('https://www.pokemon.com/us/pokedex/','p:'),('https://en.wikipedia.org/wiki/','w:'),('https://pokemon.fandom.com/wiki/','f:')]
for q in D['questions']:
  for full,short in P:
    if q['s'].startswith(full): q['s']=short+q['s'][len(full):];break
  q.pop('f',None);q.pop('mon',None)
d=json.dumps(D,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
t=open(R+'template.html').read()
V=json.load(open(R+'versions.json'))
cur,build=V[-1][0],len(V)
ver=f'<div class="ver"><span>{cur} · update #{build}</span></div>'
pin=open(R+'out/pinned.json').read().replace('</','<\\/') if os.path.exists(R+'out/pinned.json') else '{}'
sch=open(R+'out/schedule.json').read() if os.path.exists(R+'out/schedule.json') else '{}'
assert '/*SCHED*/{}' in t and '/*PIN*/{}' in t and '/*DATA*/null' in t and '<!--VERSION-->' in t
t=t.replace('/*SCHED*/{}',sch).replace('/*PIN*/{}',pin)
open(R+'out/daily-poke-catch.html','w').write(t.replace('/*DATA*/null',d).replace('<!--VERSION-->',ver))
