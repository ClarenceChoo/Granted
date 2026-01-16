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
}

export interface Organization {
    uen: string;
    name: string;
    sector: Sector;
    mission: string;
    annualRevenue?: number;
}
