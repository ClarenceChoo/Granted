import { useState, useEffect } from 'react'
// Firebase removed: rely on backend login response tokens
import { loginNPO } from '../services/authService'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, Lock, Building2, User, ChevronRight, Wand2, Sparkles } from 'lucide-react'
import type { Organization } from '../types'

export default function SignIn({ onAuthSuccess }: { onAuthSuccess?: (profile: any) => void }) {
    const location = useLocation()
    const navigate = useNavigate()

    // Check if we were sent here with pre-filled data
    const prefillData = location.state as Organization & { aiProfile?: any } | undefined
    // Allow checking either direct prefill or nested aiProfile
    const effectivePrefill = prefillData?.aiProfile || prefillData;

    const initialMode = location.hash === '#register' || !!prefillData ? 'register' : 'login'

    const [mode, setMode] = useState<'login' | 'register'>(initialMode)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

    // Initialize empty if we are going to stream, otherwise standard defaults
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: effectivePrefill ? '' : '',
        uen: effectivePrefill ? '' : '',
        sector: effectivePrefill?.sector || 'Social Service',
        mission: effectivePrefill ? '' : '',
    })

    const [showAiOverlay, setShowAiOverlay] = useState(false)

    const storeProfileLocally = (profile: { email?: string; name?: string }) => {
        if (!profile?.email) return
        localStorage.setItem('granted_user_email', profile.email)
        localStorage.setItem('granted_user_profile', JSON.stringify(profile))
    }

    const normalizeBeneficiaries = (input: unknown): string[] => {
        if (Array.isArray(input)) {
            return input.map(item => String(item).trim()).filter(Boolean)
        }
        if (typeof input === 'string') {
            return input
                .split(',')
                .map(item => item.trim())
                .filter(Boolean)
        }
        return []
    }

    const parseBudgetValue = (input: unknown): number => {
        if (typeof input === 'number') {
            return Number.isFinite(input) ? input : 0
        }
        if (typeof input !== 'string') return 0
        const normalized = input.trim().toLowerCase()
        if (!normalized) return 0
        const cleaned = normalized.replace(/,/g, '')
        const match = cleaned.match(/([0-9]*\.?[0-9]+)/)
        if (!match) return 0
        let value = Number(match[1])
        if (!Number.isFinite(value)) return 0
        if (cleaned.includes('k')) value *= 1_000
        else if (cleaned.includes('m')) value *= 1_000_000
        else if (cleaned.includes('b')) value *= 1_000_000_000
        return value
    }

    // AI Auto-fill Simulation sequence
    useEffect(() => {
        if (effectivePrefill) {
            setShowAiOverlay(true)

            // 1. Show Overlay for 2s
            const timer = setTimeout(async () => {
                setShowAiOverlay(false)

                // 2. Stream Name
                if (effectivePrefill.name) {
                    await streamText('name', effectivePrefill.name)
                }

                // 3. Stream UEN
                if (effectivePrefill.uen) {
                    await streamText('uen', effectivePrefill.uen)
                }

                // 4. Stream Mission
                if (effectivePrefill.mission) {
                    await streamText('mission', effectivePrefill.mission)
                }

                
            }, 2000)
            return () => clearTimeout(timer)
        }
    }, [prefillData])

    useEffect(() => {
        setNotice(null)
    }, [mode])

    const streamText = async (field: keyof typeof formData, text: string) => {
        for (let i = 0; i <= text.length; i++) {
            setFormData(prev => ({ ...prev, [field]: text.slice(0, i) }))
            await new Promise(r => setTimeout(r, 15 + Math.random() * 20)) // fast typing
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleDemoFill = () => {
        setFormData({
            email: 'director@harmonyarts.sg',
            password: 'password123',
            name: 'Harmony Arts Centre',
            uen: 'T12SS0034L',
            sector: 'Arts & Heritage',
            mission: 'To make the arts accessible to all, fostering community engagement and cultural appreciation through inclusive programmes and workshops.',
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (isSubmitting) return
        setNotice(null)
        setIsSubmitting(true)

        try {
            if (mode === 'register') {
                // Build payload for backend; AI prefill (location.state) may contain extra fields
                const aiData = (prefillData || (location.state as any)) as any
                const beneficiaries = normalizeBeneficiaries(aiData?.beneficiaries)
                const budget = parseBudgetValue(aiData?.budget ?? aiData?.annualBudget)
                const payload: any = {
                    email: formData.email,
                    password: formData.password,
                    name: formData.name,
                    uen: formData.uen,
                    sector: formData.sector,
                    description: aiData?.mission || aiData?.description || '',
                    beneficiaries,
                    budget,
                }

                const res = await fetch('https://create-npo-kun7hshp7q-as.a.run.app', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                })

                if (!res.ok) {
                    const txt = await res.text()
                    setNotice({ type: 'error', message: `Registration failed: ${res.status} ${txt}` })
                    return
                }

                const created = await res.json()
                const createdData = created?.data || created

                // Save user locally so sign-in can work without a dedicated sign-in API
                const usersRaw = localStorage.getItem('granted_users')
                const users = usersRaw ? JSON.parse(usersRaw) : {}
                users[formData.email] = { password: formData.password, profile: { email: formData.email, name: formData.name, uen: formData.uen, sector: formData.sector, ...createdData } }
                localStorage.setItem('granted_users', JSON.stringify(users))

                // After creating the NPO on your backend, call the login endpoint to obtain idToken/refreshToken
                try {
                    await loginNPO(formData.email, formData.password)
                    const profile = users[formData.email].profile
                    storeProfileLocally(profile)
                    onAuthSuccess?.(profile)
                    navigate('/')
                } catch (loginErr: any) {
                    // registration succeeded but login failed — still inform user
                    console.warn('Registered but login failed', loginErr)
                    const profile = users[formData.email].profile
                    storeProfileLocally(profile)
                    onAuthSuccess?.(profile)
                    setMode('login')
                    setNotice({ type: 'info', message: 'Registered successfully. Please sign in.' })
                }

                return
            }

            // Login mode: call backend login endpoint to get idToken etc.
            await loginNPO(formData.email, formData.password)
            // backend returned tokens stored by loginNPO; no Firebase exchange required
            const usersRaw = localStorage.getItem('granted_users')
            const users = usersRaw ? JSON.parse(usersRaw) : {}
            const storedProfile = users[formData.email]?.profile
            const profile = storedProfile || { email: formData.email, name: formData.name || formData.email }
            storeProfileLocally(profile)
            onAuthSuccess?.(profile)
            navigate('/')
            return
        } catch (err: any) {
            setNotice({ type: 'error', message: 'Login failed: ' + (err?.message || String(err)) })
            return
        } finally {
            setIsSubmitting(false)
        }
    }

    // Dynamic class for pre-filled fields to give them a "glow"
    const getFieldClass = (fieldName: string) => {
        const baseClass = "w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent transition"
        // If we have prefill data and this field matches, add a subtle glow/highlight
        if (effectivePrefill && effectivePrefill[fieldName as keyof Organization]) {
            return `${baseClass} border-indigo-300 bg-indigo-50/30 text-indigo-900 ring-2 ring-indigo-100`
        }
        return `${baseClass} border-slate-200`
    }

    return (
        <div className="min-h-screen grid md:grid-cols-2 relative h-full">

            {/* AI Overlay */}
            {showAiOverlay && (
                <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <div className="relative">
                        <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
                        <div className="w-16 h-16 bg-gradient-to-tr from-[#1E3A8A] to-[#0F766E] rounded-2xl flex items-center justify-center shadow-xl rotate-3 animate-spin-slow relative z-10">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <h3 className="mt-8 text-2xl font-bold text-slate-800">AI Agent Working...</h3>
                    <p className="text-slate-500 mt-2">Analysing your chat to pre-fill your application.</p>
                    <div className="mt-8 flex gap-2">
                        <span className="w-2 h-2 bg-[#1E3A8A] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-[#1E3A8A] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-[#1E3A8A] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                </div>
            )}

            {/* Left: Branding & Info */}
            <div className="hidden md:flex bg-[#1E3A8A] text-white p-12 flex-col justify-between relative overflow-hidden">
                <div className="relative z-10">
                    <Link to="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-12 transition">
                        <ArrowLeft className="w-4 h-4" /> Back to Home
                    </Link>
                    <h1 className="text-4xl font-bold mb-6">
                        {mode === 'login' ? 'Welcome Back.' : 'Join Granted.'}
                    </h1>
                    <p className="text-blue-100 text-lg max-w-md leading-relaxed">
                        {mode === 'login'
                            ? 'Log in to access your saved grants, track applications, and get personalized funding recommendations.'
                            : 'Create an account to unlock AI-powered grant matching and streamline your non-profit funding journey.'}
                    </p>
                </div>

                {/* Abstract Shapes */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#0F766E] rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
                <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#F59E0B] rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

                <div className="relative z-10 text-sm text-blue-200">
                    © 2026 Granted. Empowering NPOs.
                </div>
            </div>

            {/* Right: Form */}
            <div className="bg-white p-8 md:p-12 flex flex-col justify-center">
                <div className="max-w-md w-full mx-auto">
                    {/* Mobile Back Link */}
                    <div className="md:hidden mb-8">
                        <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-[#1E3A8A] transition">
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
                                disabled={isSubmitting}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition ${mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Sign In
                            </button>
                            <button
                                onClick={() => setMode('register')}
                                disabled={isSubmitting}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition ${mode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Sign Up
                            </button>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleDemoFill}
                        disabled={isSubmitting}
                        className="text-xs text-indigo-400 hover:text-indigo-600 mb-6 flex items-center gap-1 font-medium -mt-4 transition-colors disabled:opacity-60 disabled:pointer-events-none"
                    >
                        <Wand2 className="w-3 h-3" /> Demo: Fill Form
                    </button>

                    {prefillData && mode === 'register' && !showAiOverlay && (
                        <div className="mb-6 bg-indigo-50 border border-indigo-100 text-[#1E3A8A] px-4 py-3 rounded-xl text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-700">
                            <div className="mt-0.5 bg-indigo-100 p-1.5 rounded-lg"><Sparkles className="w-4 h-4 text-indigo-600" /></div>
                            <div>
                                <span className="font-bold text-indigo-900">AI Auto-Fill Complete</span>
                                <p className="text-indigo-800/80 mt-1 text-xs leading-relaxed">We've extracted your details and mission statement from the chat to jumpstart your profile.</p>
                            </div>
                        </div>
                    )}

                    {notice && (
                        <div className={`mb-6 rounded-xl px-4 py-3 text-sm border ${notice.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : notice.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-sky-50 border-sky-200 text-sky-900'}`}>
                            {notice.message}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <fieldset disabled={isSubmitting} className="space-y-4">
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
                                                className={getFieldClass('name')}
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
                                                className={getFieldClass('uen')}
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
                                                className={`${getFieldClass('sector')} bg-white pl-3`}
                                            >
                                                {['Social Service', 'Arts & Heritage', 'Sports', 'Community', 'Education', 'Health', 'Environment', 'Other'].map(s => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-1000 delay-100">
                                        <label className="block text-sm font-medium text-slate-700 mb-1 flex justify-between">
                                            <span>Mission Statement</span>
                                            {effectivePrefill?.mission && <span className="text-xs text-indigo-600 font-medium flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI Generated</span>}
                                        </label>
                                        <textarea
                                            name="mission"
                                            value={formData.mission}
                                            onChange={handleInputChange}
                                            rows={3}
                                            className={getFieldClass('mission')}
                                            placeholder="Briefly describe your organization's mission..."
                                        />
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
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent transition"
                                        placeholder="you@example.org"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Password
                                    {mode === 'login' && <a href="#" className="float-right text-xs text-[#1E3A8A] font-semibold hover:underline">Forgot?</a>}
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent transition"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>
                        </fieldset>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-[#0F766E] text-white font-bold py-3 rounded-xl hover:bg-[#0d6963] transition shadow-lg shadow-[#0F766E]/20 flex items-center justify-center gap-2 mt-6 disabled:opacity-70 disabled:pointer-events-none"
                        >
                            {isSubmitting
                                ? (mode === 'login' ? 'Signing In...' : 'Creating Account...')
                                : (mode === 'login' ? 'Sign In' : 'Create Account')}
                            {!isSubmitting && <ChevronRight className="w-4 h-4" />}
                        </button>
                    </form>

                    <p className="text-center text-slate-500 text-sm mt-8">
                        {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
                        <button
                            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                            disabled={isSubmitting}
                            className="ml-1 text-[#1E3A8A] font-semibold hover:underline"
                        >
                            {mode === 'login' ? 'Sign Up' : 'Log In'}
                        </button>
                    </p>

                    <div className="text-center mt-6">
                        <button onClick={() => navigate('/admin')} className="text-sm text-[#1E3A8A] font-semibold hover:underline">Go to Admin Dashboard (Demo)</button>
                    </div>
                </div>
            </div>
        </div>
    )
}
