import os
R=os.path.dirname(os.path.abspath(__file__))+'/'
# Builds ../index.html: the published page plus link-preview tags for iMessage, Discord, etc.
BASE="https://taziz05.github.io/daily-poke-catch/"
head=f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="A new Pokémon trivia catch every day. Easy to Impossible questions on every Pokémon, the games, the anime and the manga, sourced from Bulbapedia and the official Pokédex.">
<meta name="theme-color" content="#13235a">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Daily Poké Catch">
<meta property="og:title" content="Daily Poké Catch · Pokémon Trivia">
<meta property="og:description" content="A new Pokémon trivia catch every day. Can you go 5 for 5?">
<meta property="og:url" content="{BASE}">
<meta property="og:image" content="{BASE}preview.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Daily Poké Catch: a new Pokémon trivia catch every day">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Daily Poké Catch · Pokémon Trivia">
<meta name="twitter:description" content="A new Pokémon trivia catch every day. Can you go 5 for 5?">
<meta name="twitter:image" content="{BASE}preview.png">
<link rel="icon" type="image/png" href="favicon.png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
'''
body=open(R+'out/daily-poke-catch.html').read()
body=body.replace('<meta charset="utf-8">\n','',1).replace('<meta name="viewport" content="width=device-width, initial-scale=1">\n','',1)
# GoatCounter: same counter as Drop-In Daily; visits show up under the /daily-poke-catch/ path.
GC='<script data-goatcounter="https://taziz322.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>\n'
open(R+'../index.html','w').write(head+body+'\n'+GC+'</html>\n')
