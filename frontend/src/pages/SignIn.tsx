import { useState } from 'react'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, Lock, Building2, User, ChevronRight } from 'lucide-react'
import type { Organization } from '../types'

export default function SignIn() {
    const location = useLocation()
    const navigate = useNavigate()

    // Check if we were sent here with pre-filled data
    const prefillData = location.state as Organization | undefined
    const initialMode = location.hash === '#register' || !!prefillData ? 'register' : 'login'

    const [mode, setMode] = useState<'login' | 'register'>(initialMode)
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: prefillData?.name || '',
        uen: prefillData?.uen || '',
        sector: prefillData?.sector || 'Social Service',
    })

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        // Mock authentication
        alert(`Successfully ${mode === 'login' ? 'Logged In' : 'Registered'}!`)
        navigate('/')
    }

    return (
        <div className="min-h-screen grid md:grid-cols-2">
            {/* Left: Branding & Info */}
            <div className="hidden md:flex bg-indigo-600 text-white p-12 flex-col justify-between relative overflow-hidden">
                <div className="relative z-10">
                    <Link to="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-12 transition">
                        <ArrowLeft className="w-4 h-4" /> Back to Home
                    </Link>
                    <h1 className="text-4xl font-bold mb-6">
                        {mode === 'login' ? 'Welcome Back.' : 'Join Granted.'}
                    </h1>
                    <p className="text-indigo-100 text-lg max-w-md leading-relaxed">
                        {mode === 'login'
                            ? 'Log in to access your saved grants, track applications, and get personalized funding recommendations.'
                            : 'Create an account to unlock AI-powered grant matching and streamline your non-profit funding journey.'}
                    </p>
                </div>

                {/* Abstract Shapes */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
                <div className="absolute bottom-0 right-0 w-80 h-80 bg-violet-600 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>

                <div className="relative z-10 text-sm text-indigo-200">
                    © 2026 Granted. Empowering NPOs.
                </div>
            </div>

            {/* Right: Form */}
            <div className="bg-white p-8 md:p-12 flex flex-col justify-center">
                <div className="max-w-md w-full mx-auto">
                    {/* Mobile Back Link */}
                    <div className="md:hidden mb-8">
                        <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition">
                            <ArrowLeft className="w-4 h-4" /> Back to Home
                        </Link>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-slate-900 md:hidden mb-2">
                            {mode === 'login' ? 'Sign In' : 'Create Account'}
                        </h2>
                        <div className="flex gap-4 p-1 bg-slate-100 rounded-lg inline-flex">
                            <button
                                onClick={() => setMode('login')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition ${mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Sign In
                            </button>
                            <button
                                onClick={() => setMode('register')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition ${mode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Sign Up
                            </button>
                        </div>
                    </div>

                    {prefillData && mode === 'register' && (
                        <div className="mb-6 bg-indigo-50 border border-indigo-100 text-indigo-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
                            <div className="mt-0.5"><Building2 className="w-4 h-4" /></div>
                            <div>
                                <span className="font-semibold">Details Pre-filled by AI.</span>
                                <p className="text-indigo-600/80 mt-1 text-xs">We've populated the form with details from your chat.</p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === 'register' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Organization Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition"
                                            placeholder="Organization Name"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">UEN</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type="text"
                                            name="uen"
                                            value={formData.uen}
                                            onChange={handleInputChange}
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition"
                                            placeholder="T08GB0021K"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Sector</label>
                                    <div className="relative">
                                        <select
                                            name="sector"
                                            value={formData.sector}
                                            onChange={handleInputChange}
                                            className="w-full pl-3 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition bg-white"
                                        >
                                            {['Social Service', 'Arts & Heritage', 'Sports', 'Community', 'Education', 'Health', 'Environment', 'Other'].map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition"
                                    placeholder="you@example.org"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Password
                                {mode === 'login' && <a href="#" className="float-right text-xs text-indigo-600 font-semibold hover:underline">Forgot?</a>}
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 mt-6"
                        >
                            {mode === 'login' ? 'Sign In' : 'Create Account'}
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </form>

                    <p className="text-center text-slate-500 text-sm mt-8">
                        {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
                        <button
                            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                            className="ml-1 text-indigo-600 font-semibold hover:underline"
                        >
                            {mode === 'login' ? 'Sign Up' : 'Log In'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    )
}
