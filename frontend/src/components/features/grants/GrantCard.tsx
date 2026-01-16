import { Clock, Percent } from 'lucide-react'
import type { Grant } from '../../../types'
import { Link } from 'react-router-dom'

interface GrantCardProps {
    grant: Grant
}

export default function GrantCard({ grant }: GrantCardProps) {
    return (
        <Link to={`/grant/${grant.id}`} className="group relative bg-white rounded-2xl border border-slate-200 p-8 hover:shadow-2xl hover:shadow-slate-200/50 hover:border-indigo-100 transition duration-300 flex flex-col h-full">
            <div className="flex justify-between items-start mb-6">
                <div className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
                    {grant.agency}
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

            <div className="mt-auto">
                <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-2xl font-bold text-slate-900 tracking-tight">{grant.quantum}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-500 pt-5 border-t border-slate-100">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>Apply before <span className="font-semibold text-slate-700">{grant.deadline}</span></span>
                </div>
            </div>
        </Link>
    )
}
