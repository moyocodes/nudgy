import 'dotenv/config'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import express from 'express'
import OpenAI from 'openai'
import { WebSocket, WebSocketServer } from 'ws'
import { mountAuth } from './auth.js'

const app = express()
// Synced state carries small photo thumbnails, so allow more than the 100kb default.
app.use(express.json({ limit: '2mb' }))
mountAuth(app)

// Created on first request, not at startup.
let client
function getClient() {
  if (!client) {
    client = new OpenAI({
      baseURL: 'https://api.meta.ai/v1',
      apiKey: process.env.MODEL_API_KEY,
    })
  }
  return client
}

app.post('/api/test', async (_req, res) => {
  try {
    const model = process.env.MODEL_NAME
    if (!model || !process.env.MODEL_API_KEY) {
      return res.status(500).json({ error: 'Set MODEL_API_KEY and MODEL_NAME in .env' })
    }
    const r = await getClient().responses.create({
      model,
      input: 'Say hi in one cheeky sentence. Never flirty.',
      max_output_tokens: 300,
      reasoning: { effort: 'low' },
    })
    console.log(
      `[usage] model=${model} input_tokens=${r.usage?.input_tokens} output_tokens=${r.usage?.output_tokens}`,
    )
    res.json({ reply: r.output_text })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// Brain-dump -> tasks plus a one-line reply in Pokey's voice.
// Only called when the user presses Add tasks / Enter. Same text on the same day is served from cache.
const EXTRACT_PROMPT = `You are Pokey, a cheeky, warm reminder buddy (never flirty, mean or medical). Input may be messy speech-to-text; work out what they mean.
Return ONLY compact JSON, omitting null/false/empty fields:
{"reply":str,"mood"?:"overwhelmed","actions"?:[{"type":"done"|"delete"|"snooze"|"update"|"undo","n":num,"due"?,"title"?,"priority"?,"repeat"?}],"tasks"?:[{"title":str,"due"?,"priority":"low"|"medium"|"high","proof"?:true,"ask"?:{"kind":"when"|"who"|"what"|"how"|"why","text":str},"repeat"?:[{"days":[0-6],"time":"HH:mm"}]}]}
- Only items in tasks/actions get saved. Each new reminder is one task.
- reminders: user's open list, numbered. Text about one (done, cancel, move, rename, snooze) = action with its n, never a duplicate task. "undo" = {"type":"undo"}. [asked: …] = waiting on your question; an answer = update actions (due, or title for who/what). selected = text is instructions for that n. "split into X and Y" = delete + 2 tasks.
- recent chat is context only; don't re-add from it. Greetings or chat ("hey Pokey", "thanks") are not tasks; just reply.
- title: short imperative, filler dropped, mishearings fixed. due: local "YYYY-MM-DDTHH:mm" from now; bare 1-6 = PM; a shared time applies to joined tasks. priority: high if urgent, low if "maybe", else medium.
- repeat: recurring only; days 0=Sun; no time = one daily time (due, else 09:00); due = next slot. repeat:null in an update stops it.
- proof: physical errands a photo could prove.
- ask: one short punny question only if essential info is missing; don't ask what you can infer.
- mood overwhelmed: stressed/swamped/wants things cleared. Then reply gently says the list is folded to one thing.
- reply: one witty sentence using their name; never list tasks or claim you saved anything.`

const extractCache = new Map()
const ASK_KINDS = ['when', 'who', 'what', 'how', 'why']

// The model's output is only trusted after this: no title means no task, and a due that
// isn't a real "YYYY-MM-DDTHH:mm" is dropped and turned into a "when" question instead.
function cleanTask(t) {
  const title = typeof t?.title === 'string' ? t.title.trim() : ''
  if (!title) return null
  const due = typeof t.due === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(t.due) && !isNaN(new Date(t.due)) ? t.due.slice(0, 16) : null
  let ask = t.ask?.text ? { kind: ASK_KINDS.includes(t.ask.kind) ? t.ask.kind : 'what', text: String(t.ask.text) } : null
  if (t.due && !due && !ask) ask = { kind: 'when', text: `When should I poke you about "${title}"? I lost the time somewhere.` }
  return { title, due, priority: ['low', 'medium', 'high'].includes(t.priority) ? t.priority : 'medium', proof: !!t.proof, ask, repeat: cleanRepeat(t.repeat) }
}

// Actions on existing reminders: known types only, n must point at a listed reminder.
const ACTION_TYPES = ['done', 'delete', 'snooze', 'update', 'undo']
function cleanActions(actions, count) {
  if (!Array.isArray(actions)) return []
  return actions
    .filter((a) => ACTION_TYPES.includes(a?.type) && (a.type === 'undo' || (Number.isInteger(a.n) && a.n >= 1 && a.n <= count)))
    .map((a) => {
      if (a.type !== 'update') return { type: a.type, n: a.n }
      const changes = {}
      if (typeof a.due === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(a.due) && !isNaN(new Date(a.due))) changes.due = a.due.slice(0, 16)
      if (typeof a.title === 'string' && a.title.trim()) changes.title = a.title.trim()
      if (['low', 'medium', 'high'].includes(a.priority)) changes.priority = a.priority
      // repeat: slots to start/change repeating, null to stop; absent means leave it alone.
      if ('repeat' in a) changes.repeat = cleanRepeat(a.repeat)
      return { type: 'update', n: a.n, ...changes }
    })
    .filter((a) => a.type !== 'update' || Object.keys(a).length > 2)
}

// Repeat slots must be real weekdays (0-6) and "HH:mm" times, or the task just doesn't repeat.
function cleanRepeat(repeat) {
  if (!Array.isArray(repeat)) return null
  const slots = repeat
    .map((s) => ({
      days: [...new Set((Array.isArray(s?.days) ? s.days : []).map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort(),
      time: typeof s?.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s.time) ? s.time : null,
    }))
    .filter((s) => s.days.length && s.time)
  return slots.length ? slots : null
}

app.post('/api/extract', async (req, res) => {
  const { text, now, name, history, reminders, selected } = req.body ?? {}
  if (!text?.trim()) return res.status(400).json({ error: 'No text' })
  const model = process.env.MODEL_NAME
  if (!model || !process.env.MODEL_API_KEY) {
    return res.status(500).json({ error: 'Set MODEL_API_KEY and MODEL_NAME in .env' })
  }

  // The last few messages, trimmed, so follow-ups make sense without resending the whole chat.
  const recent = (Array.isArray(history) ? history : [])
    .slice(-4)
    .map((m) => `${m?.from === 'you' ? 'user' : 'pokey'}: ${String(m?.text ?? '').slice(0, 150)}`)
    .join('\n')

  // Open reminders, one short line each, so "I called mum" can tick off the right one.
  const list = (Array.isArray(reminders) ? reminders : [])
    .slice(0, 25)
    .map((r, i) => `${i + 1}. ${String(r?.title ?? '').slice(0, 80)}${r?.due ? ` (${String(r.due).slice(0, 16)})` : ''}${r?.ask ? ` [asked: ${String(r.ask).slice(0, 120)}]` : ''}`)
  const listCount = list.length
  const pick = Number.isInteger(selected) && selected >= 1 && selected <= listCount ? selected : null

  const key = `${String(now).slice(0, 10)}|${name}|${recent}|${list.join(';')}|${pick}|${text.trim().toLowerCase()}`
  if (extractCache.has(key)) return res.json(extractCache.get(key))

  try {
    const r = await getClient().responses.create({
      model,
      instructions: EXTRACT_PROMPT,
      input: `now: ${now}\nname: ${name || 'friend'}\n${listCount ? `reminders:\n${list.join('\n')}\n` : ''}${pick ? `selected: ${pick}\n` : ''}${recent ? `recent chat:\n${recent}\n` : ''}text: ${text.trim()}`,
      // Muse Spark can spend ~800 tokens just reasoning on "low", so 800 left nothing for the JSON.
      max_output_tokens: 2000,
      reasoning: { effort: 'low' },
    })
    console.log(`[usage] model=${model} input_tokens=${r.usage?.input_tokens} output_tokens=${r.usage?.output_tokens}`)
    if (!r.output_text?.includes('{')) {
      console.error('[extract] no JSON in reply', r.status, JSON.stringify(r.incomplete_details), JSON.stringify(r.usage), JSON.stringify(r.output_text?.slice(0, 300)))
      throw new Error(`Model returned no JSON (status ${r.status}${r.incomplete_details ? `, ${r.incomplete_details.reason}` : ''})`)
    }
    const json = JSON.parse(r.output_text.slice(r.output_text.indexOf('{'), r.output_text.lastIndexOf('}') + 1))
    const result = { reply: String(json.reply ?? ''), mood: json.mood === 'overwhelmed' ? 'overwhelmed' : null, actions: cleanActions(json.actions, listCount), tasks: (Array.isArray(json.tasks) ? json.tasks : []).map(cleanTask).filter(Boolean) }
    extractCache.set(key, result)
    res.json(result)
  } catch (err) {
    console.error('[extract]', err.message)
    res.status(502).json({ error: err.message })
  }
})

// One poke line for a task that's due. Called by the browser's scheduler (one task per minute at most)
// or the "Poke me" button. The browser keeps a canned line as backup if this fails.
const POKE_PROMPT = `You are Pokey, a cheeky, warm reminder buddy. Punny, never flirty, mean or medical.
Write ONE reminder line, max 20 words, to the user by name about their task. Level 1 is a gentle nudge, 4 is dramatic and over the top. Reply with the line only.`

app.post('/api/poke', async (req, res) => {
  const { name, title, level, due, now } = req.body ?? {}
  if (!title) return res.status(400).json({ error: 'No task' })
  const model = process.env.MODEL_NAME
  if (!model || !process.env.MODEL_API_KEY) {
    return res.status(500).json({ error: 'Set MODEL_API_KEY and MODEL_NAME in .env' })
  }
  try {
    const r = await getClient().responses.create({
      model,
      instructions: POKE_PROMPT,
      input: `name: ${name || 'friend'}\ntask: ${title}\nlevel: ${level}\n${due ? `due: ${due}\nnow: ${now}` : 'no due time'}`,
      // 300 was all spent on reasoning, leaving no line; raised with the user's OK.
      max_output_tokens: 1000,
      reasoning: { effort: 'low' },
    })
    console.log(`[usage] model=${model} input_tokens=${r.usage?.input_tokens} output_tokens=${r.usage?.output_tokens}`)
    const text = r.output_text?.trim().replace(/^"|"$/g, '')
    if (!text) throw new Error(`Model returned no text (status ${r.status}${r.incomplete_details ? `, ${r.incomplete_details.reason}` : ''})`)
    res.json({ text })
  } catch (err) {
    console.error('[poke]', err.message)
    res.status(502).json({ error: err.message })
  }
})

// In production (Render) this one server also serves the built app from dist/.
// Locally Vite serves the app and proxies /api here, so dist/ usually doesn't exist.
const dist = path.join(import.meta.dirname, '..', 'dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  // Client-side routes (/pokes, /settings…) all load index.html.
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

const server = http.createServer(app)

// Live speech-to-text: the browser streams 16 kHz PCM here, and we relay it to
// Muse Voice Transcribe so the API key never leaves the server.
// Only opened when the user taps the mic; closed when they stop.
const asr = new WebSocketServer({ server, path: '/api/asr' })
asr.on('connection', (browser) => {
  const model = process.env.VOICE_MODEL_NAME
  if (!model || !process.env.MODEL_API_KEY) {
    browser.send(JSON.stringify({ type: 'error', message: 'Set MODEL_API_KEY and VOICE_MODEL_NAME in .env' }))
    return browser.close()
  }

  const upstream = new WebSocket('wss://api.meta.ai/v1/asr/realtime')
  let ready = false
  let pending = []
  let audioBytes = 0

  upstream.on('open', () => {
    upstream.send(
      JSON.stringify({
        authorization: { accessToken: `Bearer ${process.env.MODEL_API_KEY}` },
        audioEncoding: 'PCM_16KHZ',
        model,
        mode: 'ENDPOINTING',
        partialMode: 'CUMULATIVE',
        emitAudioProgress: false,
      }),
    )
  })

  upstream.on('message', (data, isBinary) => {
    if (isBinary) return
    const msg = JSON.parse(data.toString())
    if (!ready && msg.sessionId && !msg.type) {
      ready = true
      pending.forEach((chunk) => upstream.send(chunk))
      pending = []
      return
    }
    if (browser.readyState === WebSocket.OPEN) browser.send(data.toString())
  })

  upstream.on('close', () => browser.close())
  upstream.on('error', (err) => {
    console.error('[asr] upstream error', err.message)
    browser.close()
  })

  browser.on('message', (data, isBinary) => {
    if (!isBinary) return
    audioBytes += data.length
    if (ready) upstream.send(data)
    else pending.push(data)
  })

  browser.on('close', () => {
    // 16 kHz * 2 bytes per sample
    console.log(`[usage] model=${model} audio_seconds=${(audioBytes / 32000).toFixed(1)}`)
    if (upstream.readyState === WebSocket.OPEN) {
      upstream.send(JSON.stringify({ type: 'endStream' }))
      upstream.close()
    } else {
      upstream.terminate()
    }
  })
})

const port = process.env.PORT || 3001
server.listen(port, () => console.log(`Pokey server on http://localhost:${port}`))
