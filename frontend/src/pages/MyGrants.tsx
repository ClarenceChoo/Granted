import GrantCard from '../components/features/grants/GrantCard'
import GrantCardSkeleton from '../components/features/grants/GrantCardSkeleton'
// Using saved grants from context; no local React state needed here
import { useSavedGrants } from '../contexts/SavedGrantsContext'
import { getStoredIdToken } from '../services/authService'
import { Link } from 'react-router-dom'

export default function MyGrants() {
    const { savedGrants, isLoading, unsave } = useSavedGrants()
    const isAuthenticated = !!getStoredIdToken()

    const handleToggleUnsave = async (grantId: string) => {
        try {
            await unsave(grantId)
        } catch (err) {
            console.error('Unsave failed', err)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-8">My Grants</h1>

                {!isAuthenticated ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                        <h2 className="text-xl font-semibold text-slate-900 mb-3">Sign in to view your saved grants</h2>
                        <p className="text-slate-500 mb-6">Your saved grants are linked to your account.</p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <Link
                                to="/signin"
                                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-[#1E3A8A] text-white font-semibold shadow-lg shadow-[#1E3A8A]/25 hover:bg-[#162b6f] transition"
                            >
                                Sign in
                            </Link>
                            <Link
                                to="/discover"
                                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-[#0F172A] font-semibold border border-[#E2E8F0] shadow-sm hover:bg-slate-50 hover:border-slate-300 transition"
                            >
                                Browse all grants
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {isLoading ? (
                            Array.from({ length: 6 }).map((_, idx) => <GrantCardSkeleton key={idx} />)
                        ) : savedGrants.length === 0 ? (
                            <p className="text-slate-500">You have no saved grants yet.</p>
                        ) : (
                            savedGrants.map(grant => (
                                <GrantCard key={grant.id} grant={grant} isSaved={true} onToggleSave={handleToggleUnsave} />
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
