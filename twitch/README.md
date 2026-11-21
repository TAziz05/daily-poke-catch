# Daily Poké Catch on Twitch

Two Twitch extensions, because Twitch lets one extension sit in only one slot on a channel:

- **Daily Poké Catch** (Panel + Mobile): the full game under the stream and in the phone apps. Every viewer plays their own daily,
  with the same look, secrets and achievements as the website, and live questions pop up at the top too. It loads the
  questions from the website (`twitch-data.json`), so new questions reach Twitch without a new review.
- **Daily Poké Catch Live** (Video - Component): a box on the video that shows only the current live question. You start a
  question from the Stream Manager, viewers answer before the timer runs out, then the reveal shows the right answer
  and how chat split.

Both run on the same Cloudflare Worker as the Discord bot (`/twitch/...` routes), and either one's Stream Manager
controls run the same live questions for both. The Twitch versions have no creator code or other sponsorship line,
because Twitch extensions can't show advertising.

## What's in this folder
- `dist/` – the main extension's files (`panel.html`, `mobile.html`, `live_config.html`, the game and fonts)
- `dist-live/` – the Live extension's files (`live.html`, `live_config.html` and fonts) (zip the files inside it, not the folder itself)
- `src/` – the extension's own scripts; `build/make-twitch.py` combines them with the game into `dist/`
- `ebs-url.txt` – your Worker's address, like `https://SOMETHING.workers.dev` (create this file; see step 4)

`npm run build` in `build/` rebuilds `dist/` and `../twitch-data.json` every time.

## Setup (one time)
Do these steps for each extension. Steps marked **Main** or **Live** apply to that one only.

1. **Create the extension.** dev.twitch.tv/console/extensions → **Create Extension**.
   - **Main:** name it "Daily Poké Catch", types **Panel** and **Mobile**.
   - **Live:** name it "Daily Poké Catch Live", type **Video - Component** only.
2. **Asset Hosting:**
   - **Main:** Panel Viewer Path `panel.html`, Panel Height `500`; Mobile Viewer Path `mobile.html`.
   - **Live:** Video - Component Viewer Path `live.html`; Aspect Ratio width `3`, height `4`; Target Height as high
     as it allows; Zoom on with Zoom Pixels `480`.
   - **Both:** Live Config Path `live_config.html`. Leave Config Path empty and, under **Capabilities**, set
     Broadcaster Configuration to **No Configuration**.
3. **Capabilities → Allowlist for URL Fetching Domains:** `https://taziz05.github.io` and your Worker's address.
4. **Server address:** already filled in (`twitch/ebs-url.txt`).
5. **Keys for the Worker** (Cloudflare → this game's Worker → Settings → Variables and Secrets, type **Secret**):
   - **Main:** `TWITCH_EXT_CLIENT_ID` and `TWITCH_EXT_SECRET` (from the main extension's console page and Settings →
     Extension Secrets)
   - **Live:** `TWITCH_LIVE_CLIENT_ID` and `TWITCH_LIVE_SECRET` (the same, from the Live extension)
   - **Once:** `TWITCH_EXT_OWNER_ID`, your Twitch user ID

   `/status` on the Worker shows which are set.
6. **Upload.** Zip the files inside `dist/` (Main) or `dist-live/` (Live), so `panel.html` or `live.html` is at the top
   of the zip. Files → **Upload Version**, then move the version to **Hosted Test**.
7. **Try it on your channel.** Install both, activate the main one in a **Panel** slot and the Live one in a
   **Component** slot. The live controls show up in your Stream Manager. Components only show while you're live.
8. **Submit for review** when they work. Twitch needs your channel live with the extension active during the review
   time you pick.

## Store listing (Version Details)
- **Privacy Policy URL:** `https://taziz05.github.io/daily-poke-catch/privacy.html` (required because the extension works on mobile)
- **EULA or Terms of Service URL:** `https://taziz05.github.io/daily-poke-catch/terms.html`
- **Images:** each extension needs a logo 100×100, a discovery image 300×200 and a screenshot 1024×768 (the Live one also a 24×24 taskbar icon). They're made from the game's own artwork and real screens; the Live logo carries a red LIVE badge.

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
