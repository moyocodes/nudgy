// This browser's identity for login: a random device id kept on the device, and a readable name
// ("Chrome on Mac") so the confirmation email and account list make sense.

export function deviceId() {
  try {
    let id = localStorage.getItem('nudgy:device')
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem('nudgy:device', id)
    }
    return id
  } catch {
    return 'no-storage'
  }
}

export function deviceName() {
  const ua = navigator.userAgent
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'A browser'
  const os = /iPhone|iPad/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'a device'
  return `${browser} on ${os}`
}

async function call(path, { method = 'GET', body, session } = {}) {
  const r = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await r.json().catch(() => ({}))
  if (!r.ok) throw Object.assign(new Error(json.error || r.statusText), { status: r.status })
  return json
}

export const startLogin = (email) => call('/api/auth/start', { method: 'POST', body: { email, deviceId: deviceId(), deviceName: deviceName() } })
export const submitCode = (pendingId, code) => call('/api/auth/code', { method: 'POST', body: { pendingId, code } })
// Log in with just the email (no code). Throws with status 404 if there's no such account, 403 if the server wants a code.
export const directLogin = (email) => call('/api/auth/login', { method: 'POST', body: { email, deviceId: deviceId(), deviceName: deviceName() } })
export const loginStatus = () => call(`/api/auth/status?deviceId=${encodeURIComponent(deviceId())}`)
export const logout = (session) => call('/api/auth/logout', { method: 'POST', session })
export const pullState = (session) => call('/api/sync', { session })
export const pushState = (session, state) => call('/api/sync', { method: 'PUT', session, body: { state } })
