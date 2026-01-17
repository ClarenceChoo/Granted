import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Grant, Organization } from '../types'
import GrantCard from '../components/features/grants/GrantCard'
import GrantCardSkeleton from '../components/features/grants/GrantCardSkeleton'

interface HomeProps {
    matchedGrants: Grant[]
    orgProfile: Organization
    onOpenChat: () => void
    isSubscribed: boolean
    setIsSubscribed: (val: boolean) => void
    isComplete: boolean
    isLoading: boolean
}

export default function Home({ matchedGrants, orgProfile, onOpenChat, isSubscribed, setIsSubscribed, isComplete, isLoading }: HomeProps) {
    return (
        <>
            {/* Hero Section */}
            <section className="relative pt-20 pb-32 overflow-hidden">
                {/* Abstract Background Shapes */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-10 pointer-events-none">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                    <div className="absolute top-20 right-10 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
                    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-wide mb-8 shadow-sm">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                        </span>
                        AI-Powered Grant Matching
                    </div>
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 leading-[1.1]">
                        Automating Grant Discovery <br className="hidden md:block" />
                        for <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Singaporean NPOs</span>.
                    </h1>
                    <p className="text-xl text-slate-600 max-w-2xl mb-12 leading-relaxed font-light">
                        Stop searching, start applying. Our <span className="font-semibold text-slate-900">Grant Assistant</span> analyzes your mission and matches you with the perfect funding opportunities from NCSS, MCCY, and more.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                        <button
                            onClick={onOpenChat}
                            className="group px-8 py-4 rounded-xl bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:shadow-indigo-500/50 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2"
                        >
                            Get Started with AI Onboarding
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                        <a href="#grant-feed" className="px-8 py-4 rounded-xl bg-white text-slate-700 font-semibold border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all duration-300">
                            View All Grants
                        </a>
                    </div>
                </div>
            </section>

            {/* Top-K Grant Feed */}
            <section id="grant-feed" className="py-24 bg-white relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-900 mb-3">
                                {isComplete ? `Top Matches for ${orgProfile.sector}` : 'Top Matched Grants'}
                            </h2>
                            <p className="text-slate-500 text-lg">
                                {isComplete
                                    ? 'Personalized opportunities based on your mission statement.'
                                    : 'Curated opportunities for Singaporean Non-Profits.'}
                            </p>
                        </div>

                        {/* Subscription Toggle */}
                        <div className="flex items-center gap-4 bg-slate-50 p-2 pl-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-slate-900">Instant Alerts</span>
                                <span className="text-xs text-slate-500">Via Email & Telegram</span>
                            </div>
                            <button
                                onClick={() => setIsSubscribed(!isSubscribed)}
                                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${isSubscribed ? 'bg-indigo-600' : 'bg-slate-300'}`}
                            >
                                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${isSubscribed ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {isLoading ? (
                            // Show skeleton loaders while loading
                            Array.from({ length: 3 }).map((_, idx) => (
                                <GrantCardSkeleton key={idx} />
                            ))
                        ) : matchedGrants.length > 0 ? (
                            matchedGrants.map((grant) => (
                                <GrantCard key={grant.id} grant={grant} />
                            ))
                        ) : (
                            <div className="col-span-3 text-center py-12">
                                <p className="text-slate-500 text-lg">No grants available at the moment.</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-12 text-center">
                        <Link to="/discover" className="text-indigo-600 font-semibold hover:text-indigo-700 flex items-center justify-center gap-2 mx-auto group">
                            View all relevant grants
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </div>
            </section>
        </>
    )
}
