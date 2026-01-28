import type { Grant } from '../types'

export interface ApiGrantMetadata {
    id: string
    name: string
    desc: string
    agency_name: string
    agency_code: string
    agency_icon_url: string
    status: string
    active: string
    enabled: string
    grant_amount: number | null
    closing_dates: Record<string, string>
    applicable_to: string[]
    available: boolean | Record<string, boolean>
    deactivation_url: string
    [key: string]: any
}

interface ApiResponse {
    grant_metadata: ApiGrantMetadata[]
}

import grantsData from '../assets/grants.json'
import { authFetch } from './authService'

const SAVE_GRANT_URL = 'https://save-grant-kun7hshp7q-as.a.run.app'
const UNSAVE_GRANT_URL = 'https://unsave-grant-kun7hshp7q-as.a.run.app'
const GET_SAVED_GRANTS_URL = 'https://get-saved-grants-kun7hshp7q-as.a.run.app'

export async function fetchGrants(): Promise<Grant[]> {
    try {
        // Use local JSON data instead of API fetch
        const data = grantsData as unknown as ApiResponse

        return data.grant_metadata.map(apiGrant => transformApiGrantToGrant(apiGrant))
    } catch (error) {
        console.error('Error loading grants:', error)
        return []
    }
}

export async function saveGrant(grantId: string) {
    try {
        const res = await authFetch(SAVE_GRANT_URL, {
            method: 'POST',
            body: JSON.stringify({ grant_id: grantId }),
        })
        const text = await res.text()
        let body: any = null
        try { body = text ? JSON.parse(text) : null } catch { body = text }
        if (!res.ok) {
            const err = new Error(body?.error || body?.message || `Save failed: ${res.status}`)
            ;(err as any).status = res.status
            ;(err as any).body = body
            throw err
        }
        return body
    } catch (err) {
        console.error('saveGrant error', err)
        throw err
    }
}

export async function unsaveGrant(grantId: string) {
    try {
        const res = await authFetch(UNSAVE_GRANT_URL, {
            method: 'POST',
            body: JSON.stringify({ grant_id: grantId }),
        })
        const text = await res.text()
        let body: any = null
        try { body = text ? JSON.parse(text) : null } catch { body = text }
        if (!res.ok) {
            const err = new Error(body?.error || body?.message || `Unsave failed: ${res.status}`)
            ;(err as any).status = res.status
            ;(err as any).body = body
            throw err
        }
        return body
    } catch (err) {
        console.error('unsaveGrant error', err)
        throw err
    }
}

export async function fetchSavedGrantIds(): Promise<string[]> {
    // Backwards-compatible: fetch saved grants and return ids
    try {
        const grants = await fetchSavedGrants()
        return grants.map(g => g.id)
    } catch (err) {
        console.error('fetchSavedGrantIds error', err)
        return []
    }
}

/**
 * Fetch saved grants (full objects) from backend and transform to frontend `Grant` shape.
 */
export async function fetchSavedGrants(): Promise<Grant[]> {
    try {
        const res = await authFetch(GET_SAVED_GRANTS_URL, { method: 'GET' })
        if (!res.ok) {
            console.error('fetchSavedGrants failed', await res.text())
            return []
        }
        const data = await res.json()

        // If API returns { saved_grants: [ ...full grant objects...] } or { grants: [...] }
        const saved = Array.isArray(data) ? data : data.saved_grants || data.grants || []

        if (!Array.isArray(saved) || saved.length === 0) return []

        // If API returned an array of IDs (strings), map them to local grants from `fetchGrants()`.
        if (typeof saved[0] === 'string') {
            try {
                const all = await fetchGrants()
                const idSet = new Set(saved as string[])
                return all.filter(g => idSet.has(g.id))
            } catch (err) {
                console.error('Failed to map saved IDs to local grants', err)
                return (saved as string[]).map(id => ({ id, name: '', agency: '', description: '', quantum: 'Varies', deadline: 'Rolling', sectors: [], eligibility: [], status: undefined, agencyIconUrl: undefined, applicableTo: [], deactivationUrl: undefined, available: true }))
            }
        }

        // Map API saved grant objects to our `Grant` type
        return saved.map((sg: any) => transformSavedApiGrantToGrant(sg))
    } catch (err) {
        console.error('fetchSavedGrants error', err)
        return []
    }
}

function transformSavedApiGrantToGrant(api: any): Grant {
    // API uses fields like id, title, description, funder, amount_min/amount_max, deadline, eligibility, categories, url
    const quantum = api.amount_max ? `Up to $${Number(api.amount_max).toLocaleString()}` : (api.amount_min ? `$${Number(api.amount_min).toLocaleString()}` : 'Varies')
    const deadline = api.deadline || 'Rolling'

    return {
        id: api.id || api.grant_id || api._id,
        name: api.title || api.name || api.name || '',
        agency: api.agency_name || api.funder || api.agency || '',
        description: api.description || api.desc || api.desc || '',
        quantum,
        deadline,
        sectors: api.categories || [],
        eligibility: api.eligibility || api.applicable_to || [],
        status: api.status || undefined,
        agencyIconUrl: api.agency_icon_url || api.icon || api.agencyIconUrl || undefined,
        applicableTo: api.applicable_to || api.eligibility || [],
        deactivationUrl: api.url || api.deactivation_url || undefined,
        available: api.available || true,
    }
}

function transformApiGrantToGrant(apiGrant: ApiGrantMetadata): Grant {
    // Determine the deadline from closing_dates
    let deadline = 'Rolling'
    if (apiGrant.closing_dates) {
        const closingDate = Object.values(apiGrant.closing_dates)[0]
        if (closingDate && closingDate !== 'Open for Applications' && closingDate !== 'Applications closed') {
            deadline = closingDate
        } else if (closingDate === 'Applications closed') {
            deadline = 'Closed'
        } else if (closingDate === 'Open for Applications') {
            deadline = 'Open'
        }
    }

    // Format the grant amount
    let quantum = 'Varies'
    if (apiGrant.grant_amount !== null && apiGrant.grant_amount !== undefined) {
        quantum = `Up to $${apiGrant.grant_amount.toLocaleString()}`
    }

    return {
        id: apiGrant.id,
        name: apiGrant.name,
        agency: apiGrant.agency_name || apiGrant.agency_code,
        description: apiGrant.desc || '',
        quantum,
        deadline,
        sectors: [], // API doesn't have explicit sector mapping, can be enhanced
        eligibility: apiGrant.applicable_to || [],
        status: apiGrant.status,
        agencyIconUrl: apiGrant.agency_icon_url,
        applicableTo: apiGrant.applicable_to,
        deactivationUrl: apiGrant.deactivation_url,
        available: apiGrant.available,
    }
}
