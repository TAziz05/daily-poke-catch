# Twitch store listing (Daily Poke Catch)

Images are in `store/`; upload zips are in `zips/` (rebuild with `npm run build`, then zip `dist/` and `dist-live/`).
Twitch doesn't allow "é" in extension names, so the names are "Daily Poke Catch" and "Daily Poke Catch Live".

Privacy: https://taziz05.github.io/daily-poke-catch/privacy.html
Terms: https://taziz05.github.io/daily-poke-catch/terms.html
Allowlisted fetch domains: https://taziz05.github.io and https://daily-poke-catch-bot.towfiq-aziz11.workers.dev

## Daily Poke Catch (Panel + Mobile)

Panel Viewer Path `panel.html` (height 500) · Mobile Viewer Path `mobile.html` · Live Config Path `live_config.html` · Config Path empty · No Configuration

**Summary**
Daily Pokémon trivia for your viewers, plus live play-along questions you start from Stream Manager.

**Description**
Daily Poké Catch brings a daily Pokémon trivia game to your channel.

Panel: every viewer plays today's Daily Catch (5 questions from Poké Ball to Master Ball difficulty), picks a difficulty, plays Who's That Pokémon?, or chases an Endless streak. Results, achievements and hidden secrets are saved on their device. It works in the Twitch mobile apps too.

Live play-along: start a question from Stream Manager, either one of today's Daily questions or a random one by difficulty, and give chat 15 to 60 seconds. The question pops up at the top of the panel. Only you see the live counts until the reveal; then everyone sees the answer, the explanation and how chat split. Add Daily Poké Catch Live to show live questions on the video too.

Questions come from Bulbapedia, the official Pokédex and Wikipedia, and every answer links its source.

Unofficial fan game. Pokémon and related names are trademarks of Nintendo, Game Freak, Creatures Inc. and The Pokémon Company. Not affiliated with or endorsed by them.

**Viewer Summary**
Play today's Pokémon trivia in the panel, and answer the streamer's live questions before the timer runs out.

## Daily Poke Catch Live (Video - Component + Mobile)

Component Viewer Path `live.html` · Aspect 3:4 · Zoom on, Zoom Pixels 480 · Mobile Viewer Path `live.html` · Live Config Path `live_config.html` · Config Path empty · No Configuration

**Summary**
Live Pokémon trivia on your stream: start a question, chat answers before the timer ends, then reveal how everyone did.

**Description**
Daily Poké Catch Live puts Pokémon trivia right on your stream. From Stream Manager, start one of today's Daily questions or a random one by difficulty and give chat 15 to 60 seconds. Viewers answer in a box on the video or in the mobile app. Only you see the live counts and the answer until the reveal; then everyone sees the right answer, the explanation and how chat split, plus their score for the stream.

Pair it with the Daily Poké Catch panel so viewers can play the full daily game anytime.

Unofficial fan game. Pokémon and related names are trademarks of Nintendo, Game Freak, Creatures Inc. and The Pokémon Company. Not affiliated with or endorsed by them.

**Viewer Summary**
Answer the streamer's live Pokémon trivia questions before the timer runs out, then see how chat did.

## Cloudflare secrets (daily-poke-catch-bot)

TWITCH_EXT_CLIENT_ID, TWITCH_EXT_SECRET (main extension's Extension Secret) · TWITCH_LIVE_CLIENT_ID, TWITCH_LIVE_SECRET (Live extension's Extension Secret) · TWITCH_EXT_OWNER_ID (your Twitch user ID)
