import os,re,json,shutil
# Builds the Twitch extension (../twitch/dist, the folder you zip and upload to Twitch) and ../twitch-data.json
# (the questions the extension loads from the website). Settings live in twitch.json; the Worker address in ../twitch/ebs-url.txt.
R=os.path.dirname(os.path.abspath(__file__))+'/'
ROOT=os.path.abspath(R+'..')+'/'
CFG=json.load(open(R+'twitch.json'))
SRC,DIST=ROOT+'twitch/src/',ROOT+'twitch/dist/'
ebs_file=ROOT+'twitch/ebs-url.txt'
ebs=open(ebs_file).read().strip().rstrip('/') if os.path.exists(ebs_file) else ''
if not ebs: ebs='https://YOUR-WORKER.workers.dev'

shutil.copy(R+'out/twitch-data.json',ROOT+'twitch-data.json')

t=open(R+'template.html').read()
t=re.sub(r'<link [^>]*>\s*','',t)                      # no outside fonts inside Twitch
styles=re.findall(r'<style>(.*?)</style>',t,re.S)
scripts=re.findall(r'<script>(.*?)</script>',t,re.S)
assert len(scripts)==3,f'expected 3 scripts in template.html, found {len(scripts)}'
markup=t[t.index('</style>')+len('</style>'):t.index('<script>')]
markup=re.sub(r'<style>.*?</style>','',markup,flags=re.S).strip()
markup=markup.replace('<!--VERSION-->','<div class="ver"><span id="ver-label"></span></div>')
markup=re.sub(r'<br><span class="creator">.*?</span>','',markup,flags=re.S)  # Twitch extensions can't carry sponsorship or creator codes
markup=markup.replace('<div class="wrap">','<div class="wrap">\n  <div id="live-slot"></div>',1)
assert 'id="live-slot"' in markup

game=scripts[0]
for a,b in [('/*DATA*/null','window.__G.data'),('/*PIN*/{}','window.__G.pin'),('/*SCHED*/{}','window.__G.sched')]:
  assert a in game,a; game=game.replace(a,b)

if os.path.exists(DIST): shutil.rmtree(DIST)
os.makedirs(DIST)
w=lambda name,text: open(DIST+name,'w').write(text)
w('game.css','\n'.join(s.strip() for s in styles)+'\n')
w('game.js',game.strip()+'\n'); w('theme.js',scripts[1].strip()+'\n'); w('eggs.js',scripts[2].strip()+'\n')
for f in ['loader.js','live.js','live_config.js','twitch.css']: shutil.copy(SRC+f,DIST+f)
for f in os.listdir(ROOT+'twitch/fonts/'): shutil.copy(ROOT+'twitch/fonts/'+f,DIST+f)  # bundled fonts (Twitch blocks Google Fonts)
w('config.js','window.TWITCH_CFG='+json.dumps({'game':CFG['game'],'data':CFG['site'].rstrip('/')+'/twitch-data.json','ebs':ebs,'tiers':CFG['tiers']},ensure_ascii=False)+';\n')
HELPER='<script src="https://extension-files.twitch.tv/helper/v1/twitch-ext.min.js"></script>'
def page(title,body_cls,body,css,js):
  return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
{''.join(f'<link rel="stylesheet" href="{c}">' for c in css)}
{HELPER}
</head>
<body class="{body_cls}">
{body}
{''.join(f'<script src="{s}"></script>' for s in js)}
</body>
</html>
'''
g=CFG['game']
w('panel.html',page(g,'tw-panel',markup,['fonts.css','game.css','twitch.css'],['config.js','loader.js']))
# Mobile: the same game and live play-along, sized for the chat area of Twitch's phone apps (portrait and landscape).
w('mobile.html',page(g,'tw-panel tw-mobile',markup,['fonts.css','game.css','twitch.css'],['config.js','loader.js']))
w('live_config.html',page(g+' · Live controls','tw-config','<main id="cfg"></main>',['twitch.css'],['config.js','live_config.js']))

# The Live extension (a separate Twitch extension, because one extension can sit in only one slot): a video component
# that shows just the current live question, plus the same streamer controls. Zip the files inside ../twitch/dist-live.
LIVE=ROOT+'twitch/dist-live/'
if os.path.exists(LIVE): shutil.rmtree(LIVE)
os.makedirs(LIVE)
for f in ['config.js','live.js','live_config.js','twitch.css','game.css','live_config.html']: shutil.copy(DIST+f,LIVE+f)
for f in os.listdir(ROOT+'twitch/fonts/'): shutil.copy(ROOT+'twitch/fonts/'+f,LIVE+f)
open(LIVE+'live.html','w').write(page(g+' · Live','tw-live','<div id="live-slot"></div>',['fonts.css','game.css','twitch.css'],['config.js','live.js']))
print('twitch: built',len(os.listdir(DIST)),'+',len(os.listdir(LIVE)),'files for',ebs if 'YOUR-WORKER' not in ebs else 'a placeholder server address (fill in twitch/ebs-url.txt)')
