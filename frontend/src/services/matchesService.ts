import { authFetch } from './authService'

const GET_MATCHES_URL = 'https://get-matches-kun7hshp7q-as.a.run.app'

export interface MatchResult {
  grantId: string
  similarityScore?: number
  reasoning?: string
}

export async function fetchMatchedGrants(): Promise<MatchResult[]> {
  const uid = localStorage.getItem('uid')
  const url = uid ? `${GET_MATCHES_URL}?userId=${encodeURIComponent(uid)}` : GET_MATCHES_URL
  const res = await authFetch(url, { method: 'GET' })
  const text = await res.text()
  let body: any = null
  try { body = text ? JSON.parse(text) : null } catch { body = text }

  if (!res.ok) {
    throw new Error(body?.error || body?.message || `Matches failed: ${res.status}`)
  }

  const matches = body?.matches || body?.data?.matches || body?.grants || []
  if (!Array.isArray(matches)) return []
  return matches.map((match: any) => transformMatch(match))
}

function transformMatch(api: any): MatchResult {
  const grantId = api.grant_id || api.grantId || api.id
  return {
    grantId: String(grantId || ''),
    similarityScore: api.similarity_score ?? api.score ?? api.similarityScore ?? undefined,
    reasoning: api.reasoning || undefined,
  }
}
