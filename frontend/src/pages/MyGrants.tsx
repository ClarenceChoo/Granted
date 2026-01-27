import { GRANTS_DATA } from '../data'
import GrantCard from '../components/features/grants/GrantCard'

export default function MyGrants() {
    // Show only saved grants
    const savedGrants = GRANTS_DATA.slice(0, 2)

    return (
        <div className="min-h-screen bg-slate-50 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-8">My Grants</h1>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {savedGrants.map(grant => (
                        <GrantCard key={grant.id} grant={grant} />
                    ))}
                </div>
            </div>
        </div>
    )
}
