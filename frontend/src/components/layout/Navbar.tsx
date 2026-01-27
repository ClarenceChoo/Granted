import { Search, Bell } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
// Firebase removed: rely on backend tokens stored locally
import type { Dispatch, SetStateAction } from 'react'

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
    const ref = useRef<HTMLDivElement | null>(null)

    const handleSignOut = () => {
        // clear local auth artifacts
        localStorage.removeItem('idToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('uid')
        localStorage.removeItem('granted_token')
        // No Firebase SDK: tokens removed from storage

        setIsAuthenticated?.(false)
        setUser?.(null)
        setOpen(false)
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
        <nav className="sticky top-0 z-40 bg-[#1E3A8A] shadow-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="bg-white/20 p-1.5 rounded-lg">
                            <Search className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-white">Granted</span>
                    </Link>
                    <div className="hidden md:flex space-x-8 text-sm font-medium text-white/80">
                        <Link to="/discover" className="hover:text-white transition-colors">Discover</Link>
                        <Link to="/my-grants" className="hover:text-white transition-colors">My Grants</Link>
                        <Link to="/resources" className="hover:text-white transition-colors">Resources</Link>
                        {isAuthenticated && (
                            <Link to="/admin" className="hover:text-white transition-colors">Admin</Link>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all">
                            <Bell className="w-5 h-5" />
                        </button>

                        {isAuthenticated ? (
                            <div className="relative" ref={ref}>
                                <button onClick={() => setOpen(o => !o)} title="Profile" className="bg-white/20 text-white w-10 h-10 rounded-full flex items-center justify-center font-semibold">
                                    {initials}
                                </button>

                                {open && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg text-slate-700 py-2 z-50">
                                        <div className="px-4 py-2 text-sm border-b border-slate-100">
                                            <div className="font-semibold">{user?.name || user?.email}</div>
                                            <div className="text-xs text-slate-500">{user?.email}</div>
                                        </div>
                                        <button onClick={handleSignOut} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50">Sign Out</button>
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
        </nav>
    )
}
