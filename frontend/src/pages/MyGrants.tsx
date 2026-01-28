import GrantCard from '../components/features/grants/GrantCard'
// Using saved grants from context; no local React state needed here
import { useSavedGrants } from '../contexts/SavedGrantsContext'

export default function MyGrants() {
    const { savedGrants, isLoading, unsave } = useSavedGrants()

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

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isLoading ? (
                        <p className="text-slate-500">Loading...</p>
                    ) : savedGrants.length === 0 ? (
                        <p className="text-slate-500">You have no saved grants yet.</p>
                    ) : (
                        savedGrants.map(grant => (
                            <GrantCard key={grant.id} grant={grant} isSaved={true} onToggleSave={handleToggleUnsave} />
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
