export default function GrantCardSkeleton() {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 h-full animate-pulse">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div className="h-6 w-20 bg-slate-200 rounded-lg"></div>
                <div className="h-6 w-24 bg-slate-200 rounded-full"></div>
            </div>

            {/* Title */}
            <div className="space-y-3 mb-6">
                <div className="h-7 bg-slate-200 rounded w-3/4"></div>
                <div className="h-7 bg-slate-200 rounded w-1/2"></div>
            </div>

            {/* Description */}
            <div className="space-y-2 mb-6">
                <div className="h-4 bg-slate-200 rounded w-full"></div>
                <div className="h-4 bg-slate-200 rounded w-full"></div>
                <div className="h-4 bg-slate-200 rounded w-2/3"></div>
            </div>

            {/* Tags */}
            <div className="flex gap-2 mb-6">
                <div className="h-6 w-20 bg-slate-200 rounded"></div>
                <div className="h-6 w-24 bg-slate-200 rounded"></div>
            </div>

            {/* Footer */}
            <div className="mt-auto pt-6 border-t border-slate-100">
                <div className="h-8 bg-slate-200 rounded w-32 mb-6"></div>
                <div className="h-4 bg-slate-200 rounded w-48"></div>
            </div>
        </div>
    )
}
