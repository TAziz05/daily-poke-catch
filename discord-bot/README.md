# Daily Poké Catch for Discord

The bot and the Activity both run on one free Cloudflare Worker. They read today's questions
from the website's `daily/` files, so the website, `/daily` and the Activity all serve the
same Daily Catch. The day changes at midnight Eastern time.

## What players get
- `/daily` – play today's 5 questions with buttons. Only you see the questions, and your
  result grid is posted in the channel when you finish.
- `/play` (or the rocket/Activities button) – open the full game inside Discord.
  Finishing the Daily Catch there also posts your result and counts on the leaderboard.
- `/leaderboard` – today, this week or all time.
- `/stats` – streak, average and score spread for you or someone else.
- `/setchannel` (admins) – post "today's catch is live" every morning, with yesterday's recap.
- `/stopdaily` (admins) and `/help`.

Each player gets one go per day. Whichever they finish first (`/daily` or the Activity) is the one that counts.

## Setup (one time)
This is a separate Discord app and Worker from Drop-In Daily's, so they don't share commands or leaderboards.
1. **Discord:** at discord.com/developers/applications make a New Application (e.g. "Daily Poké Catch"), then copy:
   - General Information: **Application ID** and **Public Key**
   - Bot: **Reset Token** → copy the token
   - OAuth2: **Reset Secret** → copy the Client Secret, and add the redirect `https://127.0.0.1`
2. **Cloudflare:** Workers & Pages → Create → Import a repository → pick `daily-poke-catch`, set
   **Root directory** to `discord-bot`, then deploy. The database is created automatically.
3. In the Worker go to **Settings → Variables and Secrets** and add these as type **Secret**:
   `DISCORD_APP_ID`, `DISCORD_PUBLIC_KEY`, `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_SECRET`,
   and `SETUP_KEY` (any password you make up).
4. **Discord → General Information → Interactions Endpoint URL:**
   `https://YOUR-WORKER.workers.dev/interactions` → Save.
5. **Discord → Activities → Settings:** turn on Activities. **Activities → URL Mappings:**
   Root mapping `/` → `YOUR-WORKER.workers.dev`
6. Open `https://YOUR-WORKER.workers.dev/setup?key=YOUR_SETUP_KEY`. It registers the commands
   and gives you the link to add the bot to your server.
7. In your server, run `/setchannel` in the channel you want the morning post in.

`https://YOUR-WORKER.workers.dev/status` shows which settings are in place (never their values).
If the deploy ever says it can't create the database, create a D1 database named
`daily-poke-catch` in Cloudflare (Storage & Databases → D1) and add
`database_id = "..."` under `[[d1_databases]]` in `wrangler.toml`.

## Updating questions
The website build writes `index.html` and the `daily` folder together. The bot picks them up
within about 10 minutes; it doesn't need redeploying.

## Files
- `src/index.js` – the Worker (commands, buttons, leaderboards, Activity sign-in, morning post)
- `client/activity.js` – the script that runs inside the Activity
- `src/activity-bundle.js` – `client/activity.js` bundled with Discord's Embedded App SDK
  (rebuild: `npx esbuild client/activity.js --bundle --minify --format=iife`, then wrap it as `export default "..."`)
