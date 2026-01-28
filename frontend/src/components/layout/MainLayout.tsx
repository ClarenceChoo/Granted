import type { ReactNode, Dispatch, SetStateAction } from 'react'
import Navbar from './Navbar'
import { useSavedGrants } from '../../contexts/SavedGrantsContext'
import { CheckCircle, XCircle, Info } from 'lucide-react'
import GrantAssistant from '../features/chat/GrantAssistant'
import { useNavigate } from 'react-router-dom'
import type { Organization } from '../../types'

interface MainLayoutProps {
    children?: ReactNode
    chatOpen: boolean
    setChatOpen: (isOpen: boolean) => void
    orgProfile: Organization
    setOrgProfile: (profile: Organization) => void
    isAuthenticated?: boolean
    setIsAuthenticated?: Dispatch<SetStateAction<boolean>>
    user?: { name?: string; email?: string } | null
    setUser?: (u: any) => void
}

export default function MainLayout({ children, chatOpen, setChatOpen, orgProfile, setOrgProfile, isAuthenticated, setIsAuthenticated, user, setUser }: MainLayoutProps) {
    const savedCtx = (() => {
        try {
            return useSavedGrants()
        } catch {
            return null
        }
    })()
    const navigate = (() => { try { return useNavigate() } catch { return null as any } })()

    return (
        <div className="min-h-screen bg-[#F8FAFC] relative font-sans text-[#0F172A] selection:bg-[#1E3A8A]/10 selection:text-[#1E3A8A]">
            <Navbar isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} user={user} setUser={setUser} />

            <main>
                {/* Global notification for saved-grants actions */}
                {savedCtx?.notification && (
                    <div className="fixed top-6 right-6 z-50 max-w-sm w-full">
                        <div className={`flex items-center gap-3 p-4 rounded-xl shadow-xl overflow-hidden ring-1 ring-slate-200 ${savedCtx.notification.type === 'success' ? 'bg-white border-l-4 border-emerald-400' : savedCtx.notification.type === 'error' ? 'bg-white border-l-4 border-red-400' : 'bg-white border-l-4 border-sky-400'}`}>
                            <div className="shrink-0">
                                {savedCtx.notification.type === 'success' && <CheckCircle className="w-6 h-6 text-emerald-500" />}
                                {savedCtx.notification.type === 'error' && <XCircle className="w-6 h-6 text-red-500" />}
                                {savedCtx.notification.type === 'info' && <Info className="w-6 h-6 text-sky-500" />}
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-semibold text-slate-900">{savedCtx.notification.type === 'success' ? 'Success' : savedCtx.notification.type === 'error' ? 'Error' : 'Info'}</div>
                                <div className="mt-1 text-sm text-slate-700">{savedCtx.notification.message}</div>
                            </div>
                            <div className="flex items-start">
                                <button onClick={savedCtx.clearNotification} className="text-slate-500 hover:text-slate-800 text-sm">Dismiss</button>
                            </div>
                        </div>
                    </div>
                )}
                {children}
            </main>

            {/* Modal for important saved-grants actions */}
            {savedCtx?.modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={savedCtx.closeModal} />
                    <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-6 z-10">
                        <h3 className="text-lg font-semibold text-slate-900">Saved grants limit reached</h3>
                        <p className="text-sm text-slate-600 mt-2">{savedCtx.modalMessage}</p>
                        <div className="mt-6 flex gap-3 justify-end">
                            <button
                                onClick={() => { savedCtx.closeModal(); navigate && navigate('/my-grants') }}
                                className="bg-[#0F766E] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#0d6963]"
                            >
                                Open My Grants
                            </button>
                            <button onClick={savedCtx.closeModal} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700">Dismiss</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Chat Button */}
            {!chatOpen && (
                <button
                    onClick={() => setChatOpen(true)}
                    className="fixed bottom-6 right-6 p-4 bg-[#0F766E] text-white rounded-full shadow-lg hover:bg-[#0d6963] hover:shadow-xl transition-all duration-300 z-40 group animate-bounce-short"
                    aria-label="Open Grant Assistant"
                >
                    <div className="absolute -top-2 -right-2 bg-[#F59E0B] w-4 h-4 rounded-full border-2 border-white"></div>
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
