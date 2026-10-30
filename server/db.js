// Storage for accounts, logins and each user's synced data.
// MySQL (e.g. the database on a cPanel host) when DATABASE_URL is set: mysql://user:pass@host:3306/dbname.
// Without it, the old JSON file (server/data/db.json), so the repo still runs locally with no setup.
// Session tokens are stored hashed: a leaked database can't be used to sign in.
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

export const hashSession = (s) => crypto.createHash('sha256').update(String(s)).digest('hex')

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    email VARCHAR(200) PRIMARY KEY,
    created_at BIGINT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS devices (
    id VARCHAR(100) PRIMARY KEY,
    email VARCHAR(200) NOT NULL,
    name VARCHAR(60) NOT NULL,
    session_hash CHAR(64) NOT NULL UNIQUE,
    confirmed_at BIGINT NOT NULL,
    last_seen BIGINT NOT NULL,
    INDEX (email)
  )`,
  `CREATE TABLE IF NOT EXISTS pending_logins (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(200) NOT NULL,
    device_id VARCHAR(100) NOT NULL,
    device_name VARCHAR(60) NOT NULL,
    code CHAR(6) NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    sent_at BIGINT NOT NULL,
    expires BIGINT NOT NULL,
    INDEX (email), INDEX (device_id)
  )`,
  `CREATE TABLE IF NOT EXISTS user_state (
    email VARCHAR(200) PRIMARY KEY,
    state LONGTEXT NOT NULL,
    updated_at BIGINT NOT NULL
  )`,
  // Badge art and photo thumbnails, one row each, so the synced state carries a link instead of the picture.
  `CREATE TABLE IF NOT EXISTS images (
    email VARCHAR(200) NOT NULL,
    image_key VARCHAR(100) NOT NULL,
    mime VARCHAR(40) NOT NULL,
    data MEDIUMBLOB NOT NULL,
    updated_at BIGINT NOT NULL,
    PRIMARY KEY (email, image_key)
  )`,
]

async function mysqlStore(url) {
  const mysql = (await import('mysql2/promise')).default
  const pool = mysql.createPool({ uri: url, connectionLimit: 5, ssl: process.env.DB_SSL === 'true' ? {} : undefined })
  for (const sql of SCHEMA) await pool.query(sql)
  const one = async (sql, args) => (await pool.query(sql, args))[0][0] ?? null
  const run = (sql, args) => pool.query(sql, args)
  const device = (r) => r && { id: r.id, email: r.email, name: r.name, confirmedAt: Number(r.confirmed_at), lastSeen: Number(r.last_seen) }
  const pending = (r) => r && { id: r.id, email: r.email, deviceId: r.device_id, deviceName: r.device_name, code: r.code, attempts: r.attempts, sentAt: Number(r.sent_at), expires: Number(r.expires) }
  console.log('[db] using MySQL')
  return {
    deviceBySession: async (session) => device(await one('SELECT * FROM devices WHERE session_hash = ?', [hashSession(session)])),
    deviceById: async (id) => device(await one('SELECT * FROM devices WHERE id = ?', [id])),
    async saveDevice(id, { email, name, session }) {
      const now = Date.now()
      await run('INSERT IGNORE INTO users (email, created_at) VALUES (?, ?)', [email, now])
      await run(
        `INSERT INTO devices (id, email, name, session_hash, confirmed_at, last_seen) VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE email = VALUES(email), name = VALUES(name), session_hash = VALUES(session_hash), confirmed_at = VALUES(confirmed_at), last_seen = VALUES(last_seen)`,
        [id, email, name, hashSession(session), now, now],
      )
    },
    deleteDevice: (id) => run('DELETE FROM devices WHERE id = ?', [id]),
    touchDevice: (id) => run('UPDATE devices SET last_seen = ? WHERE id = ?', [Date.now(), id]),
    userExists: async (email) => !!(await one('SELECT email FROM users WHERE email = ?', [email])),
    savePending: (p) =>
      run(
        `INSERT INTO pending_logins (id, email, device_id, device_name, code, attempts, sent_at, expires) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE attempts = VALUES(attempts)`,
        [p.id, p.email, p.deviceId, p.deviceName, p.code, p.attempts, p.sentAt, p.expires],
      ),
    pendingById: async (id) => pending(await one('SELECT * FROM pending_logins WHERE id = ?', [id])),
    recentPending: async (email, since) => pending(await one('SELECT * FROM pending_logins WHERE email = ? AND sent_at > ?', [email, since])),
    hasPendingFor: async (deviceId) => !!(await one('SELECT id FROM pending_logins WHERE device_id = ? AND expires > ?', [deviceId, Date.now()])),
    deletePending: (id) => run('DELETE FROM pending_logins WHERE id = ?', [id]),
    async getState(email) {
      const r = await one('SELECT state, updated_at FROM user_state WHERE email = ?', [email])
      return r && { state: JSON.parse(r.state), updatedAt: Number(r.updated_at) }
    },
    async getImage(email, key) {
      const r = await one('SELECT mime, data FROM images WHERE email = ? AND image_key = ?', [email, key])
      return r && { mime: r.mime, data: r.data }
    },
    putImage: (email, key, mime, data) =>
      run('INSERT INTO images (email, image_key, mime, data, updated_at) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE mime = VALUES(mime), data = VALUES(data), updated_at = VALUES(updated_at)', [email, key, mime, data, Date.now()]),
    putState: (email, state) =>
      run('INSERT INTO user_state (email, state, updated_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE state = VALUES(state), updated_at = VALUES(updated_at)', [email, JSON.stringify(state), Date.now()]),
  }
}

// The same interface over one JSON file.
function fileStore() {
  const file = process.env.NUDGY_DB || path.join(import.meta.dirname, 'data', 'db.json')
  let db
  try { db = JSON.parse(fs.readFileSync(file, 'utf8')) } catch { db = {} }
  db = { users: db.users ?? {}, devices: db.devices ?? {}, pending: db.pending ?? {}, data: db.data ?? {}, images: db.images ?? {} }
  const save = () => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(db)) }
  const device = (id) => { const d = db.devices[id]; return d && { id, email: d.email, name: d.name, confirmedAt: d.confirmedAt, lastSeen: d.lastSeen } }
  console.log('[db] using the JSON file (set DATABASE_URL for MySQL)')
  return {
    deviceBySession: async (session) => device(Object.keys(db.devices).find((id) => db.devices[id].sessionHash === hashSession(session))),
    deviceById: async (id) => device(id),
    async saveDevice(id, { email, name, session }) {
      const now = Date.now()
      db.users[email] ??= { createdAt: now }
      db.devices[id] = { email, name, sessionHash: hashSession(session), confirmedAt: now, lastSeen: now }
      save()
    },
    async deleteDevice(id) { delete db.devices[id]; save() },
    async touchDevice(id) { if (db.devices[id]) db.devices[id].lastSeen = Date.now() },
    userExists: async (email) => !!db.users[email] || !!db.data[email],
    async savePending(p) { db.pending[p.id] = p; save() },
    pendingById: async (id) => db.pending[id] ?? null,
    recentPending: async (email, since) => Object.values(db.pending).find((p) => p.email === email && p.sentAt > since) ?? null,
    hasPendingFor: async (deviceId) => Object.values(db.pending).some((p) => p.deviceId === deviceId && p.expires > Date.now()),
    async deletePending(id) { delete db.pending[id]; save() },
    async getImage(email, key) {
      const i = db.images[`${email}|${key}`]
      return i && { mime: i.mime, data: Buffer.from(i.data, 'base64') }
    },
    async putImage(email, key, mime, data) { db.images[`${email}|${key}`] = { mime, data: data.toString('base64') }; save() },
    getState: async (email) => db.data[email] ?? null,
    async putState(email, state) { db.data[email] = { state, updatedAt: Date.now() }; save() },
  }
}

export const store = process.env.DATABASE_URL ? await mysqlStore(process.env.DATABASE_URL) : fileStore()
