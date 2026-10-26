# Pokey

Built from scratch for the Meta Global AI Developer Hackathon, Oct 26 – Nov 4, 2026.

Speak or type everything on your mind; Pokey turns it into tasks and sends cheeky, playful reminders ("pokes").

## Setup

1. `npm install`
2. `cp .env.example .env` and fill in `MODEL_API_KEY` (and `MODEL_NAME` if different).
3. `npm run dev` — starts the Express server (port 3001) and Vite (port 5173; proxies `/api` to the server).
4. Open http://localhost:5173 and click **Say hi** to test the Meta Model API connection.

The API key stays on the server; the frontend never sees it.
