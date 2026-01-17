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

const API_BASE_URL = '/api/v1'

export async function fetchGrants(): Promise<Grant[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/grant_metadata/explore_grants`)
        
        if (!response.ok) {
            throw new Error(`Failed to fetch grants: ${response.statusText}`)
        }
        
        const data: ApiResponse = await response.json()
        
        return data.grant_metadata.map(apiGrant => transformApiGrantToGrant(apiGrant))
    } catch (error) {
        console.error('Error fetching grants:', error)
        return []
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
