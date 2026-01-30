export async function loginNPO(email: string, password: string) {
  const response = await fetch('https://asia-southeast1-granted-6590c.cloudfunctions.net/login_npo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const data = await response.json()
  if (response.ok) {
    const payload = data.data || data
    // store tokens from server
    if (payload.idToken) localStorage.setItem('idToken', payload.idToken)
    if (payload.refreshToken) localStorage.setItem('refreshToken', payload.refreshToken)
    if (payload.uid) localStorage.setItem('uid', payload.uid)
    return payload
  }

  throw new Error(data.error || 'Login failed')
}

export function logoutLocal() {
  localStorage.removeItem('idToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('uid')
  localStorage.removeItem('granted_token')
}

export function clearLocalSession(email?: string | null) {
  logoutLocal()
  localStorage.removeItem('granted_user_email')
  localStorage.removeItem('granted_user_profile')
  localStorage.removeItem('granted_org_profile')

  if (!email) return
  const usersRaw = localStorage.getItem('granted_users')
  if (!usersRaw) return
  try {
    const users = JSON.parse(usersRaw)
    if (users && users[email]) {
      delete users[email]
      localStorage.setItem('granted_users', JSON.stringify(users))
    }
  } catch {
    // ignore parse errors
  }
}

export function getStoredIdToken() {
  // Prefer standard idToken but fall back to legacy `granted_token` if present
  return localStorage.getItem('idToken') || localStorage.getItem('granted_token')
}

const AUTH_DEBUG =
  !import.meta.env.DEV &&
  typeof window !== 'undefined' &&
  typeof window.localStorage !== 'undefined' &&
  window.localStorage.getItem('debug_auth') === '1'

const authNow = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now())

function debugAuth(data: Record<string, any>) {
  if (!AUTH_DEBUG) return
  console.debug('[authFetch]', data)
}

/**
 * Fetch wrapper that attaches `idToken` from localStorage.
 * Removed Firebase SDK dependency — backend must return/manage tokens.
 */
export async function authFetch(input: RequestInfo, init: RequestInit = {}) {
  const idToken = getStoredIdToken()
  const headers = new Headers(init.headers || {})
  if (idToken) headers.set('Authorization', `Bearer ${idToken}`)
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  const startedAt = AUTH_DEBUG ? authNow() : 0
  const res = await fetch(input, { ...init, headers })
  if (AUTH_DEBUG) {
    const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : 'request')
    const method = init.method || (input instanceof Request ? input.method : 'GET')
    debugAuth({
      url,
      method,
      status: res.status,
      redirected: res.redirected,
      ms: Math.round(authNow() - startedAt),
    })
  }
  return res
}
