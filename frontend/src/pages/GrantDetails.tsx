import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Calendar, ExternalLink, Hash, CheckCircle } from 'lucide-react'
import { GRANTS_DATA } from '../data'

export default function GrantDetails() {
    const { id } = useParams<{ id: string }>()
    const grant = GRANTS_DATA.find(g => g.id === id)

    if (!grant) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Grant not found</h2>
                <Link to="/discover" className="text-indigo-600 hover:underline">Back to Discover</Link>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Back Link */}
                <Link to="/discover" className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 mb-8 transition">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Grants
                </Link>

                {/* Header Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                        <div>
                            <div className="inline-block bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                                {grant.agency}
                            </div>
                            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">{grant.name}</h1>
                            <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                                <div className="flex items-center gap-1">
                                    <Hash className="w-4 h-4" />
                                    Grant ID: {grant.id}
                                </div>
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    Deadline: {grant.deadline}
                                </div>
                            </div>
                        </div>
                        <div className="flex-shrink-0">
                            <button className="w-full md:w-auto bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2">
                                Apply Now
                                <ExternalLink className="w-4 h-4" />
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

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                            <h3 className="text-xl font-bold text-slate-900 mb-6">Eligibility Criteria</h3>
                            <ul className="space-y-3">
                                {grant.eligibility.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                        <span className="text-slate-700">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Grant Quantum</h3>
                            <p className="text-3xl font-bold text-indigo-600">{grant.quantum}</p>
                            <p className="text-xs text-slate-400 mt-2">Maximum funding amount per application.</p>
                        </div>

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
                    </div>

                </div>

            </div>
        </div>
    )
}
