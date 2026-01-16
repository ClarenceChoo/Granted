import type { Grant, Organization } from '../types';

/**
 * Calculates a match score (0-100) for a grant based on the organization's profile.
 */
export function calculateMatchScore(grant: Grant, org: Organization): number {
    let score = 0;
    const maxScore = 100;

    // 1. Sector Match (High Impact: 60 points)
    // If the org's sector matches one of the grant's target sectors.
    if (grant.sectors.includes(org.sector)) {
        score += 60;
    } else if (grant.sectors.includes('Community') || grant.sectors.includes('Other')) {
        // Partial match for general grants
        score += 30;
    }

    // 2. Keyword Match (Medium Impact: 40 points)
    // Simple check if mission keywords appear in grant description.
    const keywords = org.mission.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const grantText = (grant.description + ' ' + grant.name).toLowerCase();

    let keywordMatches = 0;
    keywords.forEach(word => {
        if (grantText.includes(word)) {
            keywordMatches++;
        }
    });

    // Cap keyword bonus at 40 points (e.g., 4 keyword matches = max bonus)
    score += Math.min(keywordMatches * 10, 40);

    return Math.min(score, maxScore);
}

/**
 * Sorts grants by match score for a given organization.
 */
export function getMatchedGrants(allGrants: Grant[], org: Organization): Grant[] {
    return allGrants.map(grant => {
        return {
            ...grant,
            matchScore: calculateMatchScore(grant, org) // Augment with score
        };
    })
        .filter(g => (g.matchScore || 0) > 0) // Filter out zero matches
        .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0)); // Sort descending
}
