# Daily Poké Catch – build folder

Everything that makes the game lives here. Run `npm install` once, then `npm run build`.
That writes `../index.html` (the website) and `../daily/*.json` (each day's Daily Catch for the Discord bot).

## Where questions live
- `gen-pokedex.js` makes the Pokédex questions for all 1,025 Pokémon from `ref/pokedex.json` and `ref/battle.json`:
  type, generation, National Pokédex number, category, Abilities and Hidden Abilities, evolutions (from/into, level, item, trade),
  matchups (super effective, 4×, immunities), highest base stat, Legendary/Mythical status, the type chart, natures, and one
  **Who's That Pokémon?** clue per Pokémon. Output: `gen/pokedex.json`. Groups `G1`–`G9` are the generations, plus `TYPES` and `NATURES`.
- Hand-written series questions: `world.js` (towns, Gyms & Badges, Elite Four & Champions), `people.js` (professors, characters,
  villain teams), `series.js` (anime, movies, music & songs, manga, series basics). New files must be added to `HAND` in `build-data.js`.
- `ref/*.json` was extracted from the open PokeAPI dataset (github.com/PokeAPI/pokeapi, `data/v2/csv`), which the shell could reach.
  Each question links the matching page on pokemon.com (type, number, category, weaknesses) or Bulbapedia (everything else).

Group format: `GROUPS.push({id,ch,name,sub,url,qs:[[tier,question,answer,[3 wrong],explanation,source],...]})`
Tiers: `e` Easy (Poké Ball), `m` Medium (Great Ball), `h` Hard (Ultra Ball), `x` Impossible (Master Ball).
Helpers in the group files: `B("Page title")` = Bulbapedia, `W("Page")` = Wikipedia, `F("Page")` = Pokémon Fandom wiki.

## Rules
- Sources: Bulbapedia, pokemon.com (Pokédex), pokemon.fandom.com and Wikipedia only. Every question links its source.
- "The series" means everything official: the games, the anime, the movies, Pokémon Adventures and other manga.
- Never remove old questions unless they're wrong. Options in one question use a consistent style.
- Pokédex questions describe the Pokémon's default form; matchup questions go by types only (not Abilities).
- Don't use rumors or leaks.

## Versions
`versions.json` holds `[label, date, note]`. Major change `vX.00`, minor `vX.10`, small additions or fixes `vX.01`.

## Publishing
Work goes on the `not-live-till-night` branch. The "Midnight release" GitHub Action merges it into `main` at midnight Eastern.
Only push straight to `main` if Towsif asks for it.

## Days in play never change
`pin.js` (part of `npm run build`) reads the live site from `origin/main` and freezes yesterday's, today's and tomorrow's
questions (Eastern) exactly as players see them now. New questions only start appearing in daily sets from the day after
tomorrow, so a publish never swaps a day someone has already played. Other modes use new questions right away.

## How daily questions are chosen
`schedule.js` plans the next 200 days at every build, using `history.json` (what the live site actually served, recorded by
`pin.js`). It always picks the questions that have gone longest without appearing, so nothing repeats until a tier's pool is
used up. Each day stays varied: at most two questions of the same kind (like "What type is X?") or topic, and never the same
Pokémon twice in one day. Commit `history.json`.
