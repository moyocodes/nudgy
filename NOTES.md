## Mon Oct 26 — Project set up after the kickoff; Meta Model API connected.

## Mon Oct 26 — Designed the UI in code (branding, brain-dump, task list, poke card) with mock data; no API calls. Stuck: sed -i failed on macOS for the fonts link, fixed by editing directly.

## Mon Oct 26 — Added pages (/, /tasks, /settings) with React Router, and mic input with Muse Voice Transcribe over the realtime WebSocket (relayed through the server to keep the key private): transcribes live, sends only on the Send button or saying "send". First tried the free browser Web Speech API; swapped to Muse for the hackathon. Also hit a 404 because MODEL_NAME was set to "pokey".

## Mon Oct 26 — Clickable prototype on mock data (no API calls): onboarding, home, poke feed, photo proof, rewards. Four personality themes (Cheeky, Sassy, Chill, Night owl) switchable on the Me page; first pink pass felt too girly, so the look moved to theme tokens. No follow-ups: snooze only clears the poke.
- Motion pass: three.js shader backdrop (theme-coloured, lazy-loaded), Framer Motion for page/list/nav/toast animations, GSAP for the mascot, confetti and points counter. Theme switch moved to the top bar.

## Mon Oct 26 – Tue Oct 27 — The app itself (client): Today, Pokes, Rewards, Me, chat history, login and landing pages; calm mode, recurring reminders, @ instructions, undo, coins that the game costs and ignored pokes lose, poke scheduler with alarm and notifications, rain/fire/waves and rundown music on one volume, installable. Hardest part: the three.js background looked ten times stronger than its setting (colour management), so it is off.
- Server and docs: /api/extract and /api/poke (Muse Spark; Muse Spark spent 798 of 800 tokens on reasoning, so limits are 2000 and 1000), /api/asr voice relay, passwordless device login with sync, render.yaml, and a README and DEMO.md for judges. Output from the model is checked server-side before the app trusts it.
- Photo proof with SAM 3.1: the server uploads the photo and asks SAM 3.1 to find the task's object (e.g. "oat milk" from "Buy oat milk"); the client shrinks the photo to a small JPEG first and the same photo is never checked twice.
