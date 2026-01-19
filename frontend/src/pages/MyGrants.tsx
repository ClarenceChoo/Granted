import { useState } from 'react'
import { FileText, Bookmark, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { GRANTS_DATA } from '../data'
import GrantCard from '../components/features/grants/GrantCard'

export default function MyGrants() {
    const [activeTab, setActiveTab] = useState<'saved' | 'applications'>('saved')

    // Mock "Saved" grants - just take the first 2
    const savedGrants = GRANTS_DATA.slice(0, 2)

    // Mock "Applications"
    const applications = [
        {
            id: 'app-001',
            grantName: 'Arts Creation Fund',
            agency: 'NAC',
            submittedDate: '2025-12-10',
            status: 'Approved',
            amount: '$45,000'
        },
        {
            id: 'app-002',
            grantName: 'Community Sports Fund',
            agency: 'SportSG',
            submittedDate: '2026-01-05',
            status: 'Pending',
            amount: '$12,000'
        },
        {
            id: 'app-003',
            grantName: 'Tech for Good Initiative',
            agency: 'GovTech',
            submittedDate: '2026-01-15',
            status: 'Under Review',
            amount: '$80,000'
        }
    ]

    return (
        <div className="min-h-screen bg-slate-50 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-8">My Grants</h1>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 mb-8">
                    <button
                        onClick={() => setActiveTab('saved')}
                        className={`pb-4 px-6 text-sm font-medium transition-colors relative ${activeTab === 'saved' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <span className="flex items-center gap-2">
                            <Bookmark className="w-4 h-4" />
                            Saved Grants
                        </span>
                        {activeTab === 'saved' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600"></div>}
                    </button>
                    <button
                        onClick={() => setActiveTab('applications')}
                        className={`pb-4 px-6 text-sm font-medium transition-colors relative ${activeTab === 'applications' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <span className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Applications
                        </span>
                        {activeTab === 'applications' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600"></div>}
                    </button>
                </div>

                {/* Content */}
                {activeTab === 'saved' && (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {savedGrants.map(grant => (
                            <GrantCard key={grant.id} grant={grant} />
                        ))}
                    </div>
                )}

                {activeTab === 'applications' && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Grant Name</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Agency</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date Submitted</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Requested Amount</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {applications.map(app => (
                                    <tr key={app.id} className="hover:bg-slate-50 transition">
                                        <td className="py-4 px-6 font-medium text-slate-900">{app.grantName}</td>
                                        <td className="py-4 px-6 text-slate-600">{app.agency}</td>
                                        <td className="py-4 px-6 text-slate-600">{app.submittedDate}</td>
                                        <td className="py-4 px-6 text-slate-600 font-mono">{app.amount}</td>
                                        <td className="py-4 px-6">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${app.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                    app.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                        'bg-blue-50 text-blue-700 border-blue-100'
                                                }`}>
                                                {app.status === 'Approved' && <CheckCircle className="w-3 h-3" />}
                                                {app.status === 'Pending' && <Clock className="w-3 h-3" />}
                                                {app.status === 'Under Review' && <AlertCircle className="w-3 h-3" />}
                                                {app.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
