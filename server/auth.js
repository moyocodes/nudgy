// Accounts without passwords: each device is confirmed by an emailed link or 6-digit code,
// then gets its own session token. Tasks, chat and points sync per account.
// Storage is one JSON file (server/data/db.json, git-ignored). Fine for a hackathon, not for scale.
// Email goes through Resend when RESEND_API_KEY is set; otherwise the link and code are logged here.
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const DB_FILE = process.env.NUDGY_DB || path.join(import.meta.dirname, 'data', 'db.json')
const CODE_TTL_MS = 15 * 60 * 1000
const RESEND_GAP_MS = 60 * 1000

function load() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
  } catch {
    return { devices: {}, pending: {}, data: {} }
  }
}
const db = load()
function save() {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true })
  fs.writeFileSync(DB_FILE, JSON.stringify(db))
}

// A fixed code for demos. On when no email service is connected (nobody could receive a real one), or when
// DEMO_CODE is set. Set DEMO_CODE= (empty) to switch it off. Real emails still work either way.
const demoCode = () => (process.env.DEMO_CODE !== undefined ? process.env.DEMO_CODE.trim() : process.env.RESEND_API_KEY ? '' : '123456')

const token = () => crypto.randomBytes(24).toString('base64url')
const validEmail = (e) => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length < 200

async function sendEmail(to, link, code) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[auth] no RESEND_API_KEY, so here's the confirmation for ${to}: ${link} (code ${code})`)
    return
  }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'Nudgy <onboarding@resend.dev>',
      to,
      subject: `Your Nudgy code: ${code}`,
      text: `Someone (hopefully you) wants to use Nudgy on a new device.\n\nConfirm it: ${link}\nOr type this code: ${code}\n\nNot you? Ignore this and nothing happens.`,
    }),
  })
  if (!r.ok) throw new Error(`Email failed: ${r.status} ${await r.text()}`)
}

// The device behind a request's "Authorization: Bearer <session>", if it's confirmed.
function deviceFor(req) {
  const session = req.get('authorization')?.replace(/^Bearer /, '')
  if (!session) return null
  const entry = Object.entries(db.devices).find(([, d]) => d.session === session && d.verified)
  return entry ? { id: entry[0], ...entry[1] } : null
}

function confirm(pendingId) {
  const p = db.pending[pendingId]
  if (!p || p.expires < Date.now()) return null
  db.devices[p.deviceId] = { email: p.email, name: p.deviceName, verified: true, session: token(), confirmedAt: Date.now(), lastSeen: Date.now() }
  delete db.pending[pendingId]
  save()
  return db.devices[p.deviceId]
}

export function mountAuth(app) {
  // Step 1: email in, confirmation out.
  app.post('/api/auth/start', async (req, res) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase()
    const { deviceId, deviceName } = req.body ?? {}
    if (!validEmail(email) || typeof deviceId !== 'string' || deviceId.length > 100) return res.status(400).json({ error: 'Check that email' })
    const recent = Object.values(db.pending).find((p) => p.email === email && Date.now() - p.sentAt < RESEND_GAP_MS)
    if (recent) return res.status(429).json({ error: 'Email sent less than a minute ago. Check your inbox (and spam).' })

    const id = token()
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0')
    db.pending[id] = { email, deviceId, deviceName: String(deviceName ?? 'A device').slice(0, 60), code, attempts: 0, sentAt: Date.now(), expires: Date.now() + CODE_TTL_MS }
    save()
    const link = `${req.get('origin') || `http://${req.get('host')}`}/api/auth/confirm?t=${id}`
    try {
      await sendEmail(email, link, code)
      res.json({ pendingId: id, demoCode: demoCode() || undefined })
    } catch (err) {
      console.error('[auth]', err.message)
      delete db.pending[id]
      save()
      res.status(502).json({ error: "Couldn't send the email. Try again in a bit." })
    }
  })

  // Log in: an email that already has an account gets in right away, no code. This is for the hackathon demo; it
  // means anyone who knows an email can open that account. Set REQUIRE_LOGIN_CODE=true to ask for the emailed
  // code on login too (the client then falls back to the code flow).
  const loginTries = new Map()
  app.post('/api/auth/login', (req, res) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase()
    const { deviceId, deviceName } = req.body ?? {}
    if (!validEmail(email) || typeof deviceId !== 'string' || deviceId.length > 100) return res.status(400).json({ error: 'Check that email' })
    if (process.env.REQUIRE_LOGIN_CODE === 'true') return res.status(403).json({ error: 'A code is needed', needsCode: true })
    // A little brake on guessing emails: 10 tries a minute per email.
    const now = Date.now()
    const recent = (loginTries.get(email) ?? []).filter((t) => now - t < 60000)
    if (recent.length >= 10) return res.status(429).json({ error: 'Too many tries. Wait a minute.' })
    loginTries.set(email, [...recent, now])

    const exists = !!db.data[email] || Object.values(db.devices).some((d) => d.verified && d.email === email)
    if (!exists) return res.status(404).json({ error: "I don't know that email. Sign up instead?" })
    db.devices[deviceId] = { email, name: String(deviceName ?? 'A device').slice(0, 60), verified: true, session: token(), confirmedAt: now, lastSeen: now }
    save()
    res.json({ email, session: db.devices[deviceId].session })
  })

  // Step 2a: the link in the email.
  app.get('/api/auth/confirm', (req, res) => {
    const ok = confirm(String(req.query.t ?? ''))
    res.type('html').send(`<!doctype html><meta name="viewport" content="width=device-width"><body style="font-family:system-ui;display:grid;place-items:center;min-height:90vh;text-align:center">
      <div><h1>${ok ? 'Device confirmed 👉' : 'That link has expired'}</h1><p>${ok ? 'Head back to Nudgy on that device. It signs itself in.' : 'Ask Nudgy for a new one.'}</p></div>`)
  })

  // Step 2b: or the 6-digit code typed into the app.
  app.post('/api/auth/code', (req, res) => {
    const { pendingId, code } = req.body ?? {}
    const p = db.pending[pendingId]
    if (!p || p.expires < Date.now()) return res.status(400).json({ error: 'That code expired. Send a new one.' })
    if (++p.attempts > 5) {
      delete db.pending[pendingId]
      save()
      return res.status(429).json({ error: 'Too many tries. Send a new code.' })
    }
    const demo = demoCode()
    if (String(code).trim() !== p.code && !(demo && String(code).trim() === demo)) {
      save()
      return res.status(400).json({ error: "That's not the code. Close, maybe?" })
    }
    const device = confirm(pendingId)
    res.json({ email: device.email, session: device.session })
  })

  // The waiting device polls this until the link is clicked (possibly on another device).
  app.get('/api/auth/status', (req, res) => {
    const deviceId = String(req.query.deviceId ?? '')
    const pending = Object.values(db.pending).some((p) => p.deviceId === deviceId)
    const d = db.devices[deviceId]
    if (d?.verified && !pending) return res.json({ email: d.email, session: d.session })
    res.json({ waiting: true })
  })

  app.post('/api/auth/logout', (req, res) => {
    const device = deviceFor(req)
    if (device) {
      delete db.devices[device.id]
      save()
    }
    res.json({ ok: true })
  })

  // Sync: the whole saved state per account, last write wins.
  app.get('/api/sync', (req, res) => {
    const device = deviceFor(req)
    if (!device) return res.status(401).json({ error: 'Signed out' })
    db.devices[device.id].lastSeen = Date.now()
    res.json(db.data[device.email] ?? null)
  })

  app.put('/api/sync', (req, res) => {
    const device = deviceFor(req)
    if (!device) return res.status(401).json({ error: 'Signed out' })
    const state = req.body?.state
    if (!state || typeof state !== 'object') return res.status(400).json({ error: 'No state' })
    db.data[device.email] = { state, updatedAt: Date.now() }
    db.devices[device.id].lastSeen = Date.now()
    save()
    res.json({ ok: true })
  })
}
