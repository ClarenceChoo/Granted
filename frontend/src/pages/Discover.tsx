import { useState, useEffect } from 'react'
import { Search, Filter } from 'lucide-react'
import { GRANTS_DATA } from '../data'
import GrantCard from '../components/features/grants/GrantCard'
import GrantCardSkeleton from '../components/features/grants/GrantCardSkeleton'
import type { Grant } from '../types'
import { fetchGrants } from '../services/grantsService'
import { useSavedGrants } from '../contexts/SavedGrantsContext'

export default function Discover() {
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedAgency, setSelectedAgency] = useState<string | null>(null)
    const [grants, setGrants] = useState<Grant[]>(GRANTS_DATA)
    const { savedIds, save, unsave, isSaved } = useSavedGrants()
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
        // saved state is managed by SavedGrantsProvider
    }, [])

    const toggleSave = async (grantId: string) => {
        if (isSaved(grantId)) {
            await unsave(grantId)
        } else {
            await save(grantId)
        }
    }

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
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-8 overflow-hidden">
                    {/* Search Bar */}
                    <div className="p-4 border-b border-slate-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search grants by name, keywords, or agency..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent transition"
                            />
                        </div>
                    </div>

                    {/* Agency Filter */}
                    <div className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <Filter className="w-4 h-4 text-slate-500" />
                            <span className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Filter by Agency</span>
                            {selectedAgency && (
                                <button
                                    onClick={() => setSelectedAgency(null)}
                                    className="ml-auto text-xs text-[#1E3A8A] hover:text-[#0F766E] font-medium"
                                >
                                    Clear filter
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setSelectedAgency(null)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${selectedAgency === null
                                    ? 'bg-[#1E3A8A] text-white shadow-md shadow-[#1E3A8A]/30'
                                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                                    }`}
                            >
                                All Agencies ({grants.length})
                            </button>
                            {allAgencies.map(agency => {
                                const count = grants.filter(g => g.agency === agency).length
                                return (
                                    <button
                                        key={agency}
                                        onClick={() => setSelectedAgency(agency)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 max-w-xs truncate ${selectedAgency === agency
                                            ? 'bg-[#1E3A8A] text-white shadow-md shadow-[#1E3A8A]/30'
                                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                                            }`}
                                        title={agency}
                                    >
                                        {agency} ({count})
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Grid */}
                {isLoading ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 9 }).map((_, idx) => (
                            <GrantCardSkeleton key={idx} />
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredGrants.map(grant => (
                                <GrantCard key={grant.id} grant={grant} isSaved={savedIds.includes(grant.id)} onToggleSave={toggleSave} />
                            ))}
                        </div>

                        {filteredGrants.length === 0 && (
                            <div className="text-center py-20">
                                <p className="text-slate-500 text-lg">No grants found matching your criteria.</p>
                                <button
                                    onClick={() => { setSearchTerm(''); setSelectedAgency(null) }}
                                    className="mt-4 text-[#1E3A8A] font-medium hover:underline"
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
