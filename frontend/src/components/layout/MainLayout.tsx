import type { ReactNode } from 'react'
import Navbar from './Navbar'
import GrantAssistant from '../features/chat/GrantAssistant'
import type { Organization } from '../../types'

interface MainLayoutProps {
    children?: ReactNode
    chatOpen: boolean
    setChatOpen: (isOpen: boolean) => void
    orgProfile: Organization
    setOrgProfile: (profile: Organization) => void
}

export default function MainLayout({ children, chatOpen, setChatOpen, orgProfile, setOrgProfile }: MainLayoutProps) {
    return (
        <div className="min-h-screen bg-slate-50 relative font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
            <Navbar />

            <main>
                {children}
            </main>

            {/* Floating Chat Button */}
            {!chatOpen && (
                <button
                    onClick={() => setChatOpen(true)}
                    className="fixed bottom-6 right-6 p-4 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 hover:shadow-xl transition-all duration-300 z-40 group animate-bounce-short"
                    aria-label="Open Grant Assistant"
                >
                    <div className="absolute -top-2 -right-2 bg-red-500 w-4 h-4 rounded-full border-2 border-white"></div>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-6 h-6"
                    >
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-white px-4 py-2 rounded-xl shadow-md text-slate-700 text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        AI Grant Assistant
                    </span>
                </button>
            )}

            <GrantAssistant
                isOpen={chatOpen}
                onClose={() => setChatOpen(false)}
                currentProfile={orgProfile}
                onProfileUpdate={setOrgProfile}
            />
        </div>
    )
}
