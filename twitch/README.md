# Daily Poké Catch on Twitch

One Twitch extension with two parts, on computers and in the Twitch phone and tablet apps:

- **Panel** (under the stream): the full Daily Poké Catch game. Every viewer plays their own daily, with the same look,
  secrets and achievements as the website. It loads the questions from the website (`twitch-data.json`), so new
  questions reach Twitch with every website update, without a new Twitch review.
- **Live play-along** (a box on the video, plus your controls in the Stream Manager): you start a question, viewers
  answer before the timer runs out, then the reveal shows the right answer and how chat split. It runs on the same
  Cloudflare Worker as the Discord bot (`/twitch/...` routes).

The Twitch version has no creator code or other sponsorship line, because Twitch extensions can't show advertising.

## What's in this folder
- `dist/` – the files you upload to Twitch (`panel.html`, `live.html`, `mobile.html`, `live_config.html` and their scripts) (zip the files inside it, not the folder itself)
- `src/` – the extension's own scripts; `build/make-twitch.py` combines them with the game into `dist/`
- `ebs-url.txt` – your Worker's address, like `https://SOMETHING.workers.dev` (create this file; see step 4)

`npm run build` in `build/` rebuilds `dist/` and `../twitch-data.json` every time.

## Setup (one time)
1. **Create the extension.** Go to dev.twitch.tv/console/extensions → **Create Extension**, name it (for example
   "Daily Poké Catch"), and choose these types: **Panel**, **Video - Component** and **Mobile** (so viewers on the Twitch phone and tablet apps can play too).
2. **Asset Hosting** (in the version's settings):
   - Panel Viewer Path: `panel.html` · Panel Height: `500`
   - Video - Component Viewer Path: `live.html`
   - Mobile Viewer Path: `mobile.html`
   - Live Config Path: `live_config.html`
   - Leave Config Path empty. Under **Capabilities**, set Broadcaster Configuration to **No Configuration**.
3. **Capabilities → Allowlist for URL Fetching Domains:** add both of these:
   - `https://taziz05.github.io`
   - your Worker's address, like `https://SOMETHING.workers.dev` (the same one the Discord Activity uses)
4. **Server address:** put your Worker's address in `twitch/ebs-url.txt` and run the build, or open `dist/config.js`
   and replace `https://YOUR-WORKER.workers.dev` with it.
5. **Keys for the Worker.** In the Twitch console copy the **Client ID**, and under Settings → **Extension Secrets**
   create a secret and copy it. You also need your **Twitch user ID** (the number, not your username; search for
   "Twitch username to user ID" to look it up). In Cloudflare → this game's Worker → Settings → Variables and Secrets,
   add these as type **Secret**:
   - `TWITCH_EXT_CLIENT_ID` – the Client ID
   - `TWITCH_EXT_SECRET` – the extension secret, exactly as Twitch shows it
   - `TWITCH_EXT_OWNER_ID` – your Twitch user ID

   Open `https://SOMETHING.workers.dev/status` to check that all three show ✅.
6. **Upload.** Zip the files inside `dist/` (`panel.html` should be at the top of the zip). In the Twitch console:
   Files → **Upload Version**, then move the version to **Hosted Test**.
**Which slot?** Twitch lets an extension sit in only one desktop slot at a time (the mobile view is always on top of
that), so both the component and the panel show the full game, with live questions popping up at the top. A
**Component** is easier for viewers to spot while you're live; a **Panel** stays visible even when you're offline.

7. **Try it on your channel.** Creator Dashboard → Extensions → find it under Invite Only / In Development → Install,
   then activate it in a **Component** or **Panel** slot. The Live Config controls show up in your Stream Manager as a
   quick action. Components only show while you're live, so test the live play-along on a stream (an unlisted test
   stream is fine).
8. **Submit for review** when it works. Twitch needs your channel live with the extension active during the review
   time you pick. Mention in the notes that it's an unofficial fan trivia game with the disclaimer in the footer.

## Store listing (Version Details)
- **Privacy Policy URL:** `https://taziz05.github.io/daily-poke-catch/privacy.html` (required because the extension works on mobile)
- **EULA or Terms of Service URL:** `https://taziz05.github.io/daily-poke-catch/terms.html`
- **Images:** logo 100×100, taskbar icon 24×24, discovery image 300×200 and screenshot 1024×768 are made from the game's own artwork and real screens.

## How the live play-along works
- **Start:** pick one of today's 5 Daily questions or a random question by difficulty, and how long viewers get
  (15–60 seconds).
- **While it runs:** only you see the live answer counts and which one is right.
- **Reveal:** happens automatically when time's up (you can turn that off), or press Reveal. Viewers then see the
  answer, the explanation and the split.
- **This stream:** viewers see their own score ("You: 3/4 this stream"), and you see the totals. A "stream" means the
  last 12 hours.
- Logged-out viewers can watch but need to log in to answer. Each viewer gets one answer per question.
- Updates reach viewers instantly through Twitch's extension messages, with a slow check-in as a backup.

## Updating
- **New questions:** nothing to do. The extension reads them from the website.
- **Changes to the game's look or code:** rebuild, zip `dist/` again, upload it as a new version and submit it for
  review again.
