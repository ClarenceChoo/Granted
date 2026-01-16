import { Search, Bell } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Navbar() {
    return (
        <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="bg-indigo-600 p-1.5 rounded-lg shadow-sm">
                            <Search className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-slate-900">Granted</span>
                    </Link>
                    <div className="hidden md:flex space-x-8 text-sm font-medium text-slate-600">
                        <Link to="/discover" className="hover:text-indigo-600 transition-colors">Discover</Link>
                        <button onClick={() => alert("Feature coming soon: My Saved Grants")} className="hover:text-indigo-600 transition-colors bg-transparent border-none cursor-pointer">My Grants</button>
                        <button onClick={() => alert("Feature coming soon: Knowledge Resources")} className="hover:text-indigo-600 transition-colors bg-transparent border-none cursor-pointer">Resources</button>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all">
                            <Bell className="w-5 h-5" />
                        </button>
                        <Link to="/signin" className="bg-slate-900 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition shadow-sm hover:shadow-md cursor-pointer block">
                            Sign In
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    )
}
