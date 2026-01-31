import { LogOut } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
// Firebase removed: rely on backend tokens stored locally
import type { Dispatch, SetStateAction } from 'react'
import { clearLocalSession } from '../../services/authService'
import grantedLogo from '../../assets/granted logo.svg'

export default function Navbar({
    isAuthenticated = false,
    setIsAuthenticated,
    user,
    setUser,
}: {
    isAuthenticated?: boolean
    setIsAuthenticated?: Dispatch<SetStateAction<boolean>>
    user?: { name?: string; email?: string } | null
    setUser?: (u: any) => void
}) {
    const navigate = useNavigate()

    const initials = user?.name
        ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('')
        : user?.email
            ? user.email.split('@')[0].slice(0, 2).toUpperCase()
            : 'U'

    const [open, setOpen] = useState(false)
    const [showSignOut, setShowSignOut] = useState(false)
    const ref = useRef<HTMLDivElement | null>(null)

    const handleSignOut = () => {
        clearLocalSession(user?.email)

        setIsAuthenticated?.(false)
        setUser?.(null)
        setOpen(false)
        setShowSignOut(false)
        navigate('/')
    }

    useEffect(() => {
        const onDocClick = (e: MouseEvent) => {
            if (!ref.current) return
            if (!ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', onDocClick)
        return () => document.removeEventListener('mousedown', onDocClick)
    }, [])

    return (
        <nav className="sticky top-0 z-40 bg-white shadow-md border-b border-slate-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="p-0">
                            <img src={grantedLogo} alt="Granted logo" className="w-20 h-20 object-contain" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-[#0F172A]">Granted</span>
                    </Link>
                    <div className="hidden md:flex space-x-8 text-sm font-medium text-slate-600">
                        <Link to="/discover" className="hover:text-[#0F172A] transition-colors">Discover</Link>
                        <Link to="/my-grants" className="hover:text-[#0F172A] transition-colors">My Grants</Link>
                        {isAuthenticated && (
                            <Link to="/admin" className="hover:text-[#0F172A] transition-colors">Admin</Link>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {isAuthenticated ? (
                            <div className="relative" ref={ref}>
                                <button onClick={() => setOpen(o => !o)} title="Profile" className="bg-[#0F766E] text-white w-10 h-10 rounded-full flex items-center justify-center font-semibold">
                                    {initials}
                                </button>

                                {open && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg text-slate-700 py-2 z-50">
                                        <div className="px-4 py-2 text-sm border-b border-slate-100">
                                            <div className="font-semibold">{user?.name || user?.email}</div>
                                            <div className="text-xs text-slate-500">{user?.email}</div>
                                        </div>
                                        <button
                                            onClick={() => { setOpen(false); setShowSignOut(true) }}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
                                        >
                                            Sign Out
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Link to="/signin" className="bg-[#0F766E] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#0d6963] transition shadow-sm hover:shadow-md cursor-pointer block">
                                Sign In
                            </Link>
                        )}
                    </div>
                </div>
            </div>
            <div className="md:hidden border-t border-slate-100">
                <div className="px-4 py-2 flex gap-6 text-sm font-medium text-slate-600 overflow-x-auto whitespace-nowrap">
                    <Link to="/discover" className="hover:text-[#0F172A] transition-colors">Discover</Link>
                    <Link to="/my-grants" className="hover:text-[#0F172A] transition-colors">My Grants</Link>
                    {isAuthenticated && (
                        <Link to="/admin" className="hover:text-[#0F172A] transition-colors">Admin</Link>
                    )}
                </div>
            </div>
            {showSignOut && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowSignOut(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="px-6 pt-6 pb-4 bg-gradient-to-r from-emerald-50 to-white">
                            <div className="flex items-start gap-3">
                                <div className="bg-[#0F766E] text-white w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                                    <LogOut className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900">Sign out of Granted?</h3>
                                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                                        You will need to sign in again to access saved grants and admin tools.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 pb-6">
                            {user?.email && (
                                <div className="mt-4 text-xs text-slate-500 break-words">
                                    Signed in as <span className="font-semibold text-slate-700 break-all">{user.email}</span>
                                </div>
                            )}
                            <div className="mt-6 flex gap-3 justify-end">
                                <button onClick={() => setShowSignOut(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">
                                    Cancel
                                </button>
                                <button onClick={handleSignOut} className="bg-[#0F766E] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#0d6963]">
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    )
}
