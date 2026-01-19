import { Search, Bell } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Navbar() {
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
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all">
                            <Bell className="w-5 h-5" />
                        </button>
                        <Link to="/signin" className="bg-[#0F766E] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#0d6963] transition shadow-sm hover:shadow-md cursor-pointer block">
                            Sign In
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    )
}
