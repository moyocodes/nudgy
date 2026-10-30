## Mon Oct 26 — Project set up after the kickoff; Meta Model API connected.

## Mon Oct 26 — Designed the UI in code (branding, brain-dump, task list, poke card) with mock data; no API calls. Stuck: sed -i failed on macOS for the fonts link, fixed by editing directly.

## Mon Oct 26 — Added pages (/, /tasks, /settings) with React Router, and mic input with Muse Voice Transcribe over the realtime WebSocket (relayed through the server to keep the key private): transcribes live, sends only on the Send button or saying "send". First tried the free browser Web Speech API; swapped to Muse for the hackathon. Also hit a 404 because MODEL_NAME was set to "pokey".

## Mon Oct 26 — Clickable prototype on mock data (no API calls): onboarding, home, poke feed, photo proof, rewards. Four personality themes (Cheeky, Sassy, Chill, Night owl) switchable on the Me page; first pink pass felt too girly, so the look moved to theme tokens. No follow-ups: snooze only clears the poke.
- Motion pass: three.js shader backdrop (theme-coloured, lazy-loaded), Framer Motion for page/list/nav/toast animations, GSAP for the mascot, confetti and points counter. Theme switch moved to the top bar.

## Mon Oct 26 – Tue Oct 27 — The app itself (client): Today, Pokes, Rewards, Me, chat history, login and landing pages; calm mode, recurring reminders, @ instructions, undo, coins that the game costs and ignored pokes lose, poke scheduler with alarm and notifications, rain/fire/waves and rundown music on one volume, installable. Hardest part: the three.js background looked ten times stronger than its setting (colour management), so it is off.
- Server and docs: /api/extract and /api/poke (Muse Spark; Muse Spark spent 798 of 800 tokens on reasoning, so limits are 2000 and 1000), /api/asr voice relay, passwordless device login with sync, render.yaml, and a README and DEMO.md for judges. Output from the model is checked server-side before the app trusts it.
- Photo proof with SAM 3.1: the server uploads the photo and asks SAM 3.1 to find the task's object (e.g. "oat milk" from "Buy oat milk"); the client shrinks the photo to a small JPEG first and the same photo is never checked twice.
- Personal badge art with Muse Image: one picture per earned badge, made only when the user taps "Create my badge", in their theme colours and based on what they actually did. An optional script makes a default set.
- Account menu: shows you're signed in and opens a small menu with Today, Me and Log out.

## Wed Oct 28 — Renamed the app from Pokey to Nudgy, and "poke" to "nudge", everywhere (UI, server prompts, storage keys, manifest, docs, wake word spellings). Saved local data and the device id reset because the storage keys changed. Older entries above keep the old name on purpose.
- Daily goals: recurring reminders due today show as a checklist with progress on Today; ticking moves them to the next slot and records lastDoneAt, and photo-proof goals go to the proof page first.
- Reminder groups (Overdue, Today, Later, Someday, Done) are always open now, split into pages of 10, and one person can have at most 30 open reminders; extras are skipped and Nudgy says so.
- Alarm chime fixed: it played at the same moment as the spoken nudge and before audio was unlocked, so it was never heard. Now the chime is off until the user allows it (which also unlocks audio), it plays first and the voice waits for it, and "Alarm sound" is a row in Set Nudgy up.
- Removed the "hey Nudgy" wake word and hands-free conversations (component, listener, Me toggle, permission text).
- Snooze choices and no coin penalties: nudges and the Today banner now offer Snooze 30 min / 1 hour / 2 hours, and neither snoozing nor ignoring a nudge takes coins any more (the stern lines and the coins explainer were reworded to match).
- Photo proof can be skipped: "Skip photo" on the task card, nudge row, Today banner and proof page (and saying "done" in chat) finishes the task for the normal coins, just without the +15 bonus. Before, proof tasks could not be finished without a photo.
- Chat snooze asks "how long?" (30 min, 1 hour or 2 hours) unless the message already says, and the answer is read locally with no model call.
- Nudgy's speech bubble now stays up 6s plus 70ms per character (up to 20s), and 5s after the voice finishes, so longer answers can be read.
- Priority is now read from the stakes and tone of what the user says (deadline, money/health/work, someone relying on them, how strongly they say it) through the extract prompt, instead of just "urgent" or "maybe". No new model calls.
- Recurring tasks no longer pile up as overdue: a slot missed on an earlier day is skipped and the task moves to its next slot (checked on load and every 5 minutes). Today's slot stays until ticked so its nudges still fire.
- Better badge art: Muse Spark now writes the Muse Image prompt (composition, details from the tasks, lighting, mood) from a short brief, one low-reasoning call (cap 1000 tokens) per new badge; if it fails the plain brief is used. Same cache and daily cap as before.
- Removed the "overwhelmed" mood and Calm mode (model mood field, folded one-task view, "deep breath" line, onboarding tile, README/DEMO text, practice scenario), so nothing in Nudgy reads like wellbeing advice. Hackathon rules ban AI medical advice.
