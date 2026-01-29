import { useState, useEffect } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { ArrowLeft, Calendar, ExternalLink, Hash, CheckCircle, AlertCircle, X } from 'lucide-react'
import { GRANTS_DATA } from '../data'
import { fetchGrants } from '../services/grantsService'
import type { Grant } from '../types'

export default function GrantDetails() {
    const { id } = useParams<{ id: string }>()
    const location = useLocation()
    const matchState = (location.state as any) || null
    const [grant, setGrant] = useState<Grant | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [showSuccess, setShowSuccess] = useState(false)

    useEffect(() => {
        const loadGrant = async () => {
            setIsLoading(true)
            // Artificial delay for demo purposes
            await new Promise(resolve => setTimeout(resolve, 800))
            const grants = await fetchGrants()
            const foundGrant = grants.find(g => g.id === id) || GRANTS_DATA.find(g => g.id === id)
            setGrant(foundGrant || null)
            setIsLoading(false)
        }
        loadGrant()
    }, [id])

    const handleApply = () => {
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 3000)
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <h2 className="text-xl font-semibold text-slate-600">Loading grant details...</h2>
            </div>
        )
    }

    if (!grant) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Grant not found</h2>
                <Link to="/discover" className="text-[#1E3A8A] hover:underline">Back to Discover</Link>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Back Link */}
                <Link to="/discover" className="inline-flex items-center gap-2 text-slate-500 hover:text-[#1E3A8A] mb-8 transition">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Grants
                </Link>

                {/* Header Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                        <div className="flex-grow">
                            <div className="flex items-center gap-3 mb-4">
                                {grant.agencyIconUrl && (
                                    <img
                                        src={grant.agencyIconUrl}
                                        alt={grant.agency}
                                        className="h-10 w-10 object-contain"
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none'
                                        }}
                                    />
                                )}
                                <div className="inline-block bg-[#1E3A8A]/10 text-[#1E3A8A] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                    {grant.agency}
                                </div>
                                {grant.status && (
                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${grant.status === 'green' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                        grant.status === 'red' ? 'bg-red-50 text-red-700 border-red-100' :
                                            'bg-yellow-50 text-yellow-700 border-yellow-100'
                                        }`}>
                                        {grant.status === 'green' ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                        {grant.status === 'green' ? 'Active' : grant.status === 'red' ? 'Closed' : 'Limited'}
                                    </div>
                                )}
                            </div>
                            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">{grant.name}</h1>
                            <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                                <div className="flex items-center gap-1">
                                    <Hash className="w-4 h-4" />
                                    Grant ID: {grant.id.substring(0, 12)}...
                                </div>
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    Deadline: {grant.deadline}
                                </div>
                            </div>
                        </div>
                        <div className="flex-shrink-0">
                            <button
                                onClick={handleApply}
                                className="w-full md:w-auto bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                            >
                                {showSuccess ? 'Applied!' : 'Apply Now'}
                                {showSuccess ? <CheckCircle className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="grid md:grid-cols-3 gap-8">

                    {/* Main Info */}
                    <div className="md:col-span-2 space-y-8">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                            <h3 className="text-xl font-bold text-slate-900 mb-4">About this Grant</h3>
                            <p className="text-slate-600 leading-relaxed text-lg">
                                {grant.description}
                            </p>
                        </div>

                        {matchState?.from === 'top-matched' && matchState?.matchReasoning && (
                            <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-8 shadow-sm">
                                <div className="flex items-center justify-between gap-3 mb-3">
                                    <h3 className="text-lg font-bold text-emerald-900">Why this matches you</h3>
                                    {matchState?.matchScore !== undefined && (
                                        <span className="text-xs font-semibold text-emerald-700 bg-white/70 px-3 py-1 rounded-full border border-emerald-200">
                                            Match {matchState.matchScore}%
                                        </span>
                                    )}
                                </div>
                                <p className="text-emerald-900/90 leading-relaxed">
                                    {matchState.matchReasoning}
                                </p>
                            </div>
                        )}

                        {(grant.eligibility.length > 0 || (grant.applicableTo && grant.applicableTo.length > 0)) && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                                <h3 className="text-xl font-bold text-slate-900 mb-6">Eligibility</h3>

                                {grant.applicableTo && grant.applicableTo.length > 0 && (
                                    <div className="mb-6">
                                        <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Applicable To</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {grant.applicableTo.map((type, idx) => (
                                                <span key={idx} className="bg-[#1E3A8A]/10 text-[#1E3A8A] px-3 py-1.5 rounded-lg text-sm font-medium border border-[#1E3A8A]/20">
                                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {grant.eligibility.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Requirements</h4>
                                        <ul className="space-y-3">
                                            {grant.eligibility.map((item, idx) => (
                                                <li key={idx} className="flex items-start gap-3">
                                                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                                    <span className="text-slate-700">{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Grant Quantum</h3>
                            <p className="text-3xl font-bold text-[#0F766E]">{grant.quantum}</p>
                            <p className="text-xs text-slate-400 mt-2">Maximum funding amount per application.</p>
                        </div>

                        {grant.sectors.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Target Sectors</h3>
                                <div className="flex flex-wrap gap-2">
                                    {grant.sectors.map(sector => (
                                        <span key={sector} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg text-sm font-medium">
                                            {sector}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                </div>

            </div>

            {/* Success Toast */}
            {showSuccess && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
                    <div className="bg-slate-900 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3">
                        <div className="bg-emerald-500 rounded-full p-1">
                            <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-sm">Application Submitted</h4>
                            <p className="text-slate-400 text-xs">The agency will be in touch shortly.</p>
                        </div>
                        <button onClick={() => setShowSuccess(false)} className="ml-2 p-1 hover:bg-white/10 rounded-full transition">
                            <X className="w-4 h-4 text-slate-400" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
