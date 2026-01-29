export type Sector = 'Social Service' | 'Arts & Heritage' | 'Sports' | 'Community' | 'Education' | 'Health' | 'Environment' | 'Other';

export interface Grant {
    id: string;
    name: string;
    agency: string;
    description: string;
    quantum: string;
    deadline: string;
    sectors: Sector[];
    eligibility: string[];
    matchScore?: number; // Calculated dynamically
    matchReasoning?: string;
    status?: string;
    agencyIconUrl?: string;
    applicableTo?: string[];
    deactivationUrl?: string;
    available?: boolean | Record<string, boolean>;
}

export interface Organization {
    uen: string;
    name: string;
    sector: Sector;
    mission: string;
    annualRevenue?: number;
}

// Extended optional fields used across the app
export interface OrganizationExtras {
    beneficiaries?: string[];
    annualBudget?: number | string;
    description?: string;
}

// Allow Organization to include optional extras
export type OrganizationWithExtras = Organization & OrganizationExtras
