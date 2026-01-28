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

export function getStoredIdToken() {
  // Prefer standard idToken but fall back to legacy `granted_token` if present
  return localStorage.getItem('idToken') || localStorage.getItem('granted_token')
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

  const res = await fetch(input, { ...init, headers })
  return res
}

