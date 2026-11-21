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
To re-plan tomorrow as well (only for a release that lands before anyone has played it, like the midnight release),
build with `REPLAN_TOMORROW=1 npm run build`.

## How daily questions are chosen
`schedule.js` plans the next 200 days at every build, using `history.json` (what the live site actually served, recorded by
`pin.js`). No question repeats until every question in its tier has been served the same number of times. Within that, each
kind of question (like "What type is X?") is spread evenly through the pool, each day gets at most one, then two, of the same
kind or topic where possible, and never the same Pokémon twice. Commit `history.json`.

## Look, secrets and achievements
The block at the end of `template.html` (after the main script) adds the themed look, the animations, five hidden secrets,
and the Achievements tab. It only wraps the game's own functions, so the game still works if the block is removed.
- Milestones are worked out from saved results in this browser (`*:YYYY-MM-DD:*` keys and Endless stats).
- Secrets, their counters and seen achievements are saved under `pokecatch:secrets`, `pokecatch:eggcounts` and `pokecatch:ach`,
  so Sync devices carries them too.
