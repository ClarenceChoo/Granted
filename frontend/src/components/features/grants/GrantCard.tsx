import { Clock, Percent, AlertCircle, CheckCircle } from 'lucide-react'
import type { Grant } from '../../../types'
import { Link } from 'react-router-dom'

interface GrantCardProps {
    grant: Grant
}

export default function GrantCard({ grant }: GrantCardProps) {
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
            className={`group relative bg-white rounded-2xl border border-slate-200 p-8 hover:shadow-2xl hover:shadow-slate-200/50 transition duration-300 flex flex-col h-full ${
                isClosedStatus ? 'opacity-75' : 'hover:border-indigo-100'
            }`}
        >
            {/* Agency Icon and Status */}
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
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
                    <div className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border flex items-center gap-1.5 ${getStatusColor(grant.status)}`}>
                        {getStatusIcon(grant.status)}
                        {grant.agency}
                    </div>
                </div>
                {grant.matchScore !== undefined && (
                    <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 shadow-sm">
                        <Percent className="w-3.5 h-3.5" />
                        <span className="text-xs font-bold">{grant.matchScore}% Match</span>
                    </div>
                )}
            </div>

            <h3 className="text-2xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mb-4 line-clamp-2">
                {grant.name}
            </h3>

            <p className="text-slate-500 text-sm mb-6 line-clamp-3 flex-grow">
                {grant.description}
            </p>

            {/* Eligibility Tags */}
            {grant.applicableTo && grant.applicableTo.length > 0 && (
                <div className="mb-6 flex flex-wrap gap-2">
                    {grant.applicableTo.slice(0, 2).map((type, idx) => (
                        <span key={idx} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-100">
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
                <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-2xl font-bold text-slate-900 tracking-tight">{grant.quantum}</span>
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
