import { Clock, AlertCircle, CheckCircle } from 'lucide-react'
import type { Grant } from '../../../types'
import { Link } from 'react-router-dom'

interface GrantCardProps {
    grant: Grant
    isSaved?: boolean
    onToggleSave?: (grantId: string) => Promise<void> | void
    linkState?: any
    matchBadgeLabel?: string
    showMatchScore?: boolean
}

export default function GrantCard({
    grant,
    isSaved = false,
    onToggleSave,
    linkState,
    matchBadgeLabel,
    showMatchScore = true
}: GrantCardProps) {
    const getStatusColor = (status?: string) => {
        switch (status?.toLowerCase()) {
            case 'green':
                return 'bg-emerald-50 text-emerald-700 border-emerald-100'
            case 'red':
                return 'bg-red-50 text-red-700 border-red-100'
            case 'yellow':
            case 'orange':
                return 'bg-yellow-50 text-yellow-700 border-yellow-100'
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200'
        }
    }

    const getStatusIcon = (status?: string) => {
        if (status?.toLowerCase() === 'green') {
            return <CheckCircle className="w-3.5 h-3.5" />
        }
        if (status?.toLowerCase() === 'red') {
            return <AlertCircle className="w-3.5 h-3.5" />
        }
        return null
    }

    const isClosedStatus = grant.deadline === 'Closed' || grant.status?.toLowerCase() === 'red'

    return (
        <Link 
            to={`/grant/${grant.id}`} 
            state={linkState}
            className={`group relative bg-white rounded-2xl border border-slate-200 p-8 hover:shadow-2xl hover:shadow-slate-200/50 transition duration-300 flex flex-col h-full animate-fadeIn ${
                isClosedStatus ? 'opacity-75' : 'hover:border-[#1E3A8A]/20'
            }`}
        >
            {/* Save / Unsave button */}
            {onToggleSave && (
                <button
                    onClick={async (e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        try {
                            await onToggleSave(grant.id)
                        } catch (err) {
                            // swallow - parent handles errors
                        }
                    }}
                    className={`absolute top-3 right-3 text-xs font-medium px-3 py-1 rounded-lg transition ${isSaved ? 'bg-[#1E3A8A] text-white' : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'}`}
                >
                    {isSaved ? 'Saved' : 'Save'}
                </button>
            )}
            {/* Agency Icon and Status */}
            <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
                <div className="flex items-center gap-3 min-w-0">
                    {grant.agencyIconUrl && (
                        <img 
                            src={grant.agencyIconUrl} 
                            alt={grant.agency}
                            className="h-8 w-8 object-contain"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none'
                            }}
                        />
                    )}
                    <div className={`px-3 py-2 rounded-xl text-[11px] font-semibold tracking-wide border flex items-center gap-1.5 leading-[1.25] whitespace-normal break-words ${getStatusColor(grant.status)}`}>
                        {getStatusIcon(grant.status)}
                        {grant.agency}
                    </div>
                </div>
            </div>

            <h3 className="text-2xl font-bold text-slate-900 group-hover:text-[#1E3A8A] transition-colors mb-4 line-clamp-2 leading-[1.4] pb-1 pt-0.5">
                {grant.name}
            </h3>

            <p className="text-slate-500 text-sm leading-[1.7] mb-6 line-clamp-4 pb-1 pt-0.5 flex-grow">
                {grant.description}
            </p>

            {/* Eligibility Tags */}
            {grant.applicableTo && grant.applicableTo.length > 0 && (
                <div className="mb-6 flex flex-wrap gap-2">
                    {grant.applicableTo.slice(0, 2).map((type, idx) => (
                        <span key={idx} className="text-xs bg-[#1E3A8A]/10 text-[#1E3A8A] px-2 py-1 rounded border border-[#1E3A8A]/20">
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                        </span>
                    ))}
                    {grant.applicableTo.length > 2 && (
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                            +{grant.applicableTo.length - 2} more
                        </span>
                    )}
                </div>
            )}

            <div className="mt-auto">
                <div className="flex items-end justify-between gap-3 mb-6">
                    <span className="text-2xl font-bold text-slate-900 tracking-tight">{grant.quantum}</span>
                    {matchBadgeLabel ? (
                        <div className="ml-auto inline-flex items-center text-emerald-800 bg-emerald-50/80 px-3 py-1.5 rounded-lg border border-emerald-100 shadow-sm whitespace-nowrap">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700/90">
                                {matchBadgeLabel}
                            </span>
                        </div>
                    ) : (showMatchScore && grant.matchScore !== undefined) ? (
                        <div className="ml-auto inline-flex items-center gap-2 text-emerald-800 bg-emerald-50/80 px-3 py-1.5 rounded-lg border border-emerald-100 shadow-sm whitespace-nowrap">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700/90">Match</span>
                            <span className="text-xs font-bold leading-none">{grant.matchScore}%</span>
                        </div>
                    ) : null}
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-500 pt-5 border-t border-slate-100">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>
                        {grant.deadline === 'Closed' ? (
                            <span className="font-semibold text-red-700">Applications Closed</span>
                        ) : (
                            <>Apply before <span className="font-semibold text-slate-700">{grant.deadline}</span></>
                        )}
                    </span>
                </div>
            </div>

            {isClosedStatus && (
                <div className="absolute inset-0 rounded-2xl bg-slate-900/5 flex items-center justify-center">
                    <span className="text-sm font-semibold text-slate-600 bg-white px-4 py-2 rounded-lg">
                        Applications Closed
                    </span>
                </div>
            )}
        </Link>
    )
}
