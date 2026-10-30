# Nudgy

**Nudgy is the reminder app that nudges back.** Say or type everything on your mind: Muse Spark turns it into reminders, asks follow-up questions, and nudges you until it's done. Voice by Muse Voice Transcribe, photo proof checked by SAM 3.1, personal badges by Muse Image.

Dump everything on your mind, messy, by voice or text. Nudgy turns it into tidy reminders, then nudges you, cheekily and with escalating drama, until each one is done.

Built from scratch for the Meta Global AI Developer Hackathon, Oct 26 – Nov 4, 2026. 60-second walkthrough: [DEMO.md](DEMO.md).

## What it does

- **Messy in, tidy out.** "ugh dentist?? oat milk. yinka's tmrw like 5pm" becomes three reminders with times. Muse Spark fixes typos and mishearings, works out dates, priorities and repeats ("every weekday at 8"), and asks a short, punny question when something essential is missing.
- **It knows your list.** "I called mum", "move the gym to 7" or "cancel the dentist" act on the existing reminder instead of adding a duplicate. Tap **@** on a reminder to give it instructions directly. "Undo" reverses the last change.
- **Nudges until it's done.** Due reminders get a fresh, model-written line every hour, escalating from Nudge to Shove, until you tap Done or Snooze. Sleep hours hold back low-priority nudges. Nudges show as browser notifications when the tab is in the background.
- **Pics or it didn't happen.** Errands marked as photo proof earn +15 points with a photo, or can be skipped for the normal points.
- **Calm mode.** Say you're swamped and the list folds down to the one thing that matters most, with a 30-second nudge-break game.
- **Rewards.** Points, streaks and badges.
- **Every device.** Log in with just your email (each new device is confirmed by an emailed link or code), and tasks, chat and points sync.
- **Four personalities.** Chill, Cheeky, Sassy and Night owl themes, each with its own font, look and colour choices.

Nudgy is always warm and punny. Never flirty, never mean, never medical.

## How the AI is used

| Feature | Model | Call happens when |
|---|---|---|
| Voice brain-dump | Muse Voice Transcribe (live, streamed through the server) | You tap the mic |
| Turning a dump into reminders and actions | Muse Spark | You press Add tasks / Enter |
| Nudge lines | Muse Spark | A nudge is actually due, or you tap Nudge me |

Model output is never trusted blindly. The server drops tasks with no title, turns an unreadable time into a "when?" question, ignores actions that point at reminders that don't exist, and Nudgy's confirmation ("Set: Call mum, today 6 PM") is built from what was really saved, so it can't claim a reminder it didn't make. If a call fails, a local parser and canned nudges keep the app working.

## Tech

- **Frontend:** React 19, Vite, Tailwind CSS v4, Framer Motion and GSAP for motion.
- **Backend:** Express, with the OpenAI SDK pointed at the Meta Model API (`https://api.meta.ai/v1`), and a WebSocket relay for live transcription.
- **The API key stays on the server.** Vite proxies `/api` to Express, so the browser never sees it.
- **Accounts:** passwordless, per-device confirmation by email (Resend), stored in a git-ignored JSON file. Fine for a hackathon; a real database is the next step.

## Setup

1. `npm install`
2. `cp .env.example .env`, then fill in:
   - `MODEL_API_KEY`: your Meta Model API key
   - `MODEL_NAME`: defaults to `muse-spark-1.3`
   - `VOICE_MODEL_NAME`: defaults to `muse-voice-transcribe-1.0`
   - `RESEND_API_KEY` (optional): sends real confirmation emails. Without it, the link and code are printed in the server terminal.
3. `npm run dev` starts Express (port 3001) and Vite (port 5173).
4. Open http://localhost:5173.

## Project layout

```
server/index.js           Model routes: /api/extract, /api/nudge; voice relay /api/asr
server/auth.js            Email device login and sync
src/pages/                Landing, Today, Nudges, Rewards, Me, chat history, photo proof, login
src/components/           Brain dump, task card, nudge scheduler, repeat picker, mascot, story…
src/lib/                  Store, schedule and repeat maths, nudges, themes, account calls
NOTES.md                  Dev log, one entry per feature
```

## Cost rules

Every model call costs money, so the API is called only when you tap a button or a nudge is actually due, never on page load or while typing. Outputs are capped (1000 tokens for nudges, 2000 for extraction, since Muse Spark's reasoning alone used up the earlier 300 and 800), reasoning effort is low, identical dumps are cached, and the server logs model and token counts per call.
