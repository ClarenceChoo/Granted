import { useState, useEffect } from 'react'
import { Search, Filter } from 'lucide-react'
import { GRANTS_DATA } from '../data'
import GrantCard from '../components/features/grants/GrantCard'
import type { Grant } from '../types'
import { fetchGrants } from '../services/grantsService'

export default function Discover() {
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedAgency, setSelectedAgency] = useState<string | null>(null)
    const [grants, setGrants] = useState<Grant[]>(GRANTS_DATA)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const loadGrants = async () => {
            setIsLoading(true)
            const fetchedGrants = await fetchGrants()
            if (fetchedGrants.length > 0) {
                setGrants(fetchedGrants)
            }
            setIsLoading(false)
        }
        loadGrants()
    }, [])

    const filteredGrants = grants.filter(grant => {
        const matchesSearch = grant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            grant.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            grant.agency.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesAgency = selectedAgency ? grant.agency === selectedAgency : true
        return matchesSearch && matchesAgency
    })

    const allAgencies = Array.from(new Set(grants.map(g => g.agency))).sort()

    return (
        <div className="bg-slate-50 min-h-screen py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                <div className="mb-10">
                    <h1 className="text-3xl font-bold text-slate-900 mb-4">Discover Grants</h1>
                    <p className="text-slate-600">Explore all available funding opportunities for your organization.</p>
                </div>

                {/* Search and Filter */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search grants by name, keywords, or agency..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                        />
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                        <Filter className="w-5 h-5 text-slate-400 flex-shrink-0" />
                        <button
                            onClick={() => setSelectedAgency(null)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${selectedAgency === null
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            All Agencies
                        </button>
                        {allAgencies.map(agency => (
                            <button
                                key={agency}
                                onClick={() => setSelectedAgency(agency)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${selectedAgency === agency
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                {agency}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid */}
                {isLoading ? (
                    <div className="text-center py-20">
                        <p className="text-slate-500 text-lg">Loading grants...</p>
                    </div>
                ) : (
                    <>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredGrants.map(grant => (
                                <GrantCard key={grant.id} grant={grant} />
                            ))}
                        </div>

                        {filteredGrants.length === 0 && (
                            <div className="text-center py-20">
                                <p className="text-slate-500 text-lg">No grants found matching your criteria.</p>
                                <button
                                    onClick={() => { setSearchTerm(''); setSelectedAgency(null) }}
                                    className="mt-4 text-indigo-600 font-medium hover:underline"
                                >
                                    Clear filters
                                </button>
                            </div>
                        )}
                    </>
                )}

            </div>
        </div>
    )
}
