# How I Vibe-Coded Daily Poké Catch

*By Towfiq Aziz · last updated November 23, 2026*

## What it is

Daily Poké Catch is a daily Pokémon trivia game I built with Claude without writing the code myself. It's the sibling of my Fortnite game, [Drop-In Daily](https://taziz05.github.io/drop-in-daily), and has **10,310 questions** (625 Poké Ball, 1,815 Great Ball, 4,584 Ultra Ball and 3,286 Master Ball). You can play it at [taziz05.github.io/daily-poke-catch](https://taziz05.github.io/daily-poke-catch), inside Discord, and on Twitch.

- **Daily Catch:** the same 5 questions for everyone each day, from Poké Ball (Easy) up to Master Ball (Impossible), new at midnight.
- **Modes:** By Difficulty, Generations & Topics (Gens I–IX plus topics like Types, Gyms, the Anime and Music), Who's That Pokémon? with a clue for every Pokémon from Bulbasaur to Pecharunt, Endless with streaks, and a searchable Question Bank.
- **Extras:** battle-style question screens, an Achievements tab with hidden secrets, sound effects and music, and device sync.

## How it grew

| Version | Date | Milestone |
|---|---|---|
| 1.00 | Oct 20, 2026 | Launch: every mode, Sync devices and the Discord bot |
| 1.01 | Oct 21, 2026 | New logo: a ring of the 18 type colors |
| 1.02 | Oct 30, 2026 | Nothing repeats until a difficulty's whole pool has been played |
| 2.00 | Nov 21, 2026 | A whole new look, an Achievements tab with 5 secrets, and question fixes |
| 2.01 | Nov 21, 2026 | Discord: /achievements, and progress saved to your Discord account |
| 2.10 | Nov 22, 2026 | Sound effects and music |
| 2.11 | Nov 23, 2026 | Fixed the Arcanine questions |

Because I'd already built Drop-In Daily, a lot carried over: the daily rotation, day-pinning, the Discord bot and the Question Bank. That's why Poké Catch launched with every mode on day one.

## How I worked with Claude

I acted as the product owner and fact-checker. Claude wrote the code and drafted the questions.

- **Sourcing rules.** Questions come from Bulbapedia, the official Pokédex on pokemon.com, the Pokémon Fandom wiki and Wikipedia, and every answer links its source.
- **I checked by hand.** For example, I caught a question with two right answers (Rattata and Raticate) and an Arcanine question that treated its "Legendary Pokémon" Pokédex category as if it were a Legendary.
- **Its own identity.** I didn't want it to look like a reskin of Drop-In Daily, so Claude designed a separate Pokémon-game feel from scratch.
- **Try it before it ships.** Big changes started as preview pages I could play with. The new look, the secrets and the sounds all went through rounds of feedback before touching the real game.
- **Claude connected to my accounts.** Once linked to GitHub and Cloudflare, Claude pushed updates and fixed things directly.

## The new look, secrets and achievements (November 2026)

- **A night route** with tall grass, twinkling stars and a moon that shows the real phase for tonight.
- **Battle screens:** each question is a wild encounter. You throw a ball to answer, it wobbles, and the question is either caught or breaks free. The first question opens with a flash-and-wipe like the classic games.
- **A logo** whose type-color ring spins while the question mark stays upright, plus retro pixel fonts and game-style dialog boxes with typing text.
- **Five hidden secrets,** including wild questions that appear in the grass (sometimes shiny), a shooting star by the moon, a retro mode, and an emblem that evolves.
- **An Achievements tab** that keeps secrets hidden until you find them, with hints and counters.
- **Little touches:** wild questions duck back into the grass instead of vanishing, none appear while you're in a game, and switching tabs mid-battle shows "Got away safely!"

## Sound effects and music

There are 8-bit style sounds for almost everything: typing blips, the ball throw and wobbles, caught or broke free, a random wild cry for every question, results jingles and every secret. Music plays on menus, in battles (with a different song for Mythic-only sets) and on the Endless summary. In retro mode, everything goes through a crunchy old-speaker filter. It all starts off until a player turns it on with the speaker button.

I didn't want AI-generated music, so every sound and song is **written as code**: each note is an instruction the browser plays. The songs are saved in my [coded-music](https://github.com/TAziz05/coded-music) repo, along with versions for my YouTube videos.

## Discord, Twitch and stats

- **Discord:** a bot with /achievements and more, and a Discord Activity that opens the full game inside Discord. Progress is saved to each player's Discord account.
- **Twitch:** two extensions. **Daily Poke Catch** is a panel where every viewer plays the full game, including on mobile. **Daily Poke Catch Live** puts one question at a time on the stream: I start it from Stream Manager, chat answers before the timer ends, then everyone sees the answer and how chat split. (Twitch doesn't allow "é" in extension names, so they're spelled "Poke" there.)
- **Stats:** GoatCounter counts the website, Discord and Twitch separately, so I can see where players come from.

## The tech

- **Website:** a static single page plus question files, hosted free on GitHub Pages from the TAziz05/daily-poke-catch repo.
- **Backend:** one Cloudflare Worker with a D1 database runs the Discord bot and Activity and the Twitch live play-along.
- **Release schedule:** Claude pushes to a staging branch, `not-live-till-night`, and a GitHub Action merges it into `main` at midnight, so a day's questions never change mid-day. Days already in play are pinned.
- **No do-overs:** daily sets save after every answer, so leaving partway and coming back picks up at the next question.

## What went wrong and what I learned

- **Repeating daily questions:** early on, questions repeated too soon. Claude changed the rotation so nothing repeats until a whole difficulty pool has been played.
- **Answers that were too easy or ambiguous:** I flagged questions with two right answers and fixed facts like the Arcanine category.
- **Twitch learning curve:** extension names can't have special characters, and a video overlay has to be designed for small screens, so we built a full panel plus a separate live-question box.
- **Retro sound:** the first retro filter crushed quiet sounds into silence. Claude fixed it by boosting the sound before crunching it.

What I'd tell someone else: reuse what worked in your last project, keep the new one's identity separate, and play your own game a lot. That's where the best fixes come from.

## Credits

Coded with Claude (Opus 5.5) by Anthropic. Ideas, sourcing rules, design direction and fact-checking by Towfiq Aziz (TAziz322). Daily Poké Catch is an unofficial fan game. Pokémon and all related names are trademarks of Nintendo, Game Freak, Creatures Inc. and The Pokémon Company; this game is not affiliated with or endorsed by them.
