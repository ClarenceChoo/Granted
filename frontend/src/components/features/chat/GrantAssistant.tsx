import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MessageCircle, X, Building2, ArrowRight } from 'lucide-react'
import type { Organization, Sector } from '../../../types'

interface GrantAssistantProps {
    isOpen: boolean
    onClose: () => void
    setChatOpen?: (b: boolean) => void
    onProfileUpdate: (profile: Organization) => void
    currentProfile: Organization
}

type Step = 'uen' | 'sector' | 'mission' | 'ai_mission' | 'beneficiaries' | 'budget' | 'complete'

export default function GrantAssistant({ isOpen, onClose, onProfileUpdate, currentProfile }: GrantAssistantProps) {
    const navigate = useNavigate()
    const [onboardingStep, setOnboardingStep] = useState<Step>('uen')

    // Local state to manage the inputs before pushing up to parent
    const [localProfile, setLocalProfile] = useState<Organization>(currentProfile)
    const [beneficiariesLocal, setBeneficiariesLocal] = useState(currentProfile.beneficiaries || 'Children, youth, local communities')
    const [budgetLocal, setBudgetLocal] = useState(currentProfile.annualBudget || '<$100k')
    const [isTyping, setIsTyping] = useState(false)

    // Initialize local inputs when the chat is opened to avoid clobbering while user types
    useEffect(() => {
        if (isOpen) {
            // initialize local state from parent profile when opening the assistant
            console.debug('GrantAssistant: opening — initializing localProfile', currentProfile)
            setLocalProfile(currentProfile)
            setBeneficiariesLocal(currentProfile.beneficiaries || 'Children, youth, local communities')
            setBudgetLocal(currentProfile.annualBudget || '<$100k')
        }
    }, [isOpen])

    // If the chat is closed unexpectedly while onboarding, reopen it to avoid losing progress
    useEffect(() => {
        console.debug('GrantAssistant:isOpen changed', { isOpen, onboardingStep })
        if (!isOpen && onboardingStep !== 'complete') {
            console.debug('GrantAssistant: was closed during onboarding — reopening')
            // try to reopen the chat via parent setter if available
            if (typeof (arguments as any) !== 'undefined') {}
            if (typeof ({} as any) !== 'undefined') {}
            if (typeof (setChatOpen) === 'function') {
                // small delay to allow whatever triggered the close to settle
                setTimeout(() => setChatOpen(true), 50)
            }
        }
    }, [isOpen, onboardingStep])

    const createAISuggestion = (profile: Organization & { beneficiaries?: string; annualBudget?: string }) => {
        const mission = profile.mission || ''
        return {
            headline: `AI Suggestion: Personalized outreach for ${profile.name || 'your organisation'}`,
            blurb: `Based on your mission "${mission}", we recommend focusing on small-scale community workshops, school outreach programmes, and collaborative performances. Prioritise grants that support arts education, capacity-building, and community engagement. Suggested messaging: "${mission} — engaging children and youth through accessible arts education and community programmes."`,
            suggestedMission: profile.mission,
            suggestedBeneficiaries: profile.beneficiaries || 'Children, youth, local communities',
            suggestedBudget: profile.annualBudget || '<$100k',
        }
    }

    const refineMissionText = (mission: string, sector?: string) => {
        // lightweight deterministic refinement to simulate AI polish
        if (!mission) return 'Support accessible arts education and community outreach programmes that engage children and youth through participatory workshops, school partnerships, and public showcases.'
        if (sector?.toLowerCase().includes('arts')) {
            return `${mission} — delivering accessible arts education, capacity-building for local artists, and community outreach that prioritises children and youth through workshops, school programmes, and public engagement.`
        }
        return `${mission} — focused on community impact through targeted programmes and partnerships that build capacity and reach local beneficiaries.`
    }

    const handleOnboardingSubmit = (val: string) => {
        setIsTyping(true)
        console.debug('GrantAssistant.handleOnboardingSubmit', { step: onboardingStep, val, localProfile, beneficiariesLocal, budgetLocal })
        let updatedProfile = { ...localProfile }

        if (onboardingStep === 'uen') {
            updatedProfile = { ...updatedProfile, uen: val, name: 'My Organization' }
            setLocalProfile(updatedProfile)
            onProfileUpdate(updatedProfile)
            setOnboardingStep('sector')
        } else if (onboardingStep === 'sector') {
            updatedProfile = { ...updatedProfile, sector: val as Sector }
            setLocalProfile(updatedProfile)
            onProfileUpdate(updatedProfile)
            setOnboardingStep('mission')
        } else if (onboardingStep === 'mission') {
            updatedProfile = { ...updatedProfile, mission: val }
            setLocalProfile(updatedProfile)
            onProfileUpdate(updatedProfile)
            // Insert an AI refinement step before moving to beneficiaries
            setOnboardingStep('ai_mission')
        } else if (onboardingStep === 'beneficiaries') {
            setBeneficiariesLocal(val)
            setOnboardingStep('budget')
        } else if (onboardingStep === 'budget') {
            setBudgetLocal(val)
            // finalize
            updatedProfile = { ...updatedProfile, mission: updatedProfile.mission || '' }
            setLocalProfile(updatedProfile)
            onProfileUpdate(updatedProfile)
            setOnboardingStep('complete')

            // Prepare AI suggestion payload and navigate to admin
            const aiProfile = {
                name: updatedProfile.name || 'Harmony Arts Centre',
                uen: updatedProfile.uen || 'T0000000X',
                sector: updatedProfile.sector || 'Arts & Heritage',
                mission: updatedProfile.mission || val,
                beneficiaries: beneficiariesLocal,
                annualBudget: budgetLocal,
                suggestion: createAISuggestion({
                    ...updatedProfile,
                    beneficiaries: beneficiariesLocal,
                    annualBudget: budgetLocal,
                }),
            }

            setTimeout(() => {
                // small delay to simulate thinking
                console.debug('GrantAssistant: navigating to /admin with aiProfile', aiProfile)
                navigate('/admin', { state: { aiProfile } })
                setIsTyping(false)
            }, 1200)

            return
        }

        setTimeout(() => {
            setIsTyping(false)
        }, 900)
    }

    return (
        <>
            {/* Overlay */}
            <div
                className={`fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            />

            {/* Chat Panel */}
            <div className={`fixed inset-y-0 right-0 z-50 w-full md:w-[480px] bg-white shadow-2xl transform transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="h-full flex flex-col">
                    {/* Header */}
                    <div className="p-6 border-b border-[#1E3A8A]/80 bg-[#1E3A8A] text-white flex justify-between items-start">
                        <div className="flex items-start gap-4">
                            <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
                                <MessageCircle className="w-6 h-6 text-blue-50" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Grant Assistant</h2>
                                <p className="text-blue-200 text-sm mt-1">AI-powered onboarding & discovery</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-full transition text-indigo-100 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Chat Body - content from original App.tsx */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">

                        {/* Step 1: Greeting & UEN */}
                        <div className="flex gap-4 animate-slide-up">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1E3A8A] to-[#0F766E] flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
                                <Building2 className="w-4 h-4 text-white" />
                            </div>
                            <div className="space-y-2 max-w-[85%]">
                                <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 text-slate-700 leading-relaxed">
                                    <p>Hello! I can help you find relevant funding. First, what is your **Organization UEN**?</p>
                                </div>
                            </div>
                        </div>

                        {/* Answer 1 */}
                        {onboardingStep !== 'uen' && (
                            <div className="flex gap-4 flex-row-reverse animate-slide-up">
                                <div className="space-y-2 max-w-[85%]">
                                    <div className="bg-[#0F766E] p-4 rounded-2xl rounded-tr-none shadow-sm text-white leading-relaxed">
                                        <p>{localProfile.uen}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Sector */}
                        {onboardingStep !== 'uen' && (
                            <div className="flex gap-4 animate-slide-up">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1E3A8A] to-[#0F766E] flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
                                    <Building2 className="w-4 h-4 text-white" />
                                </div>
                                <div className="space-y-2 max-w-[85%]">
                                    <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 text-slate-700 leading-relaxed">
                                        <p>Got it. Which sector best describes your work?</p>
                                    </div>
                                    {onboardingStep === 'sector' && (
                                        <div className="flex gap-2 flex-wrap">
                                            {['Social Service', 'Arts & Heritage', 'Sports', 'Community'].map(s => (
                                                <button
                                                    key={s}
                                                    onClick={() => handleOnboardingSubmit(s)}
                                                    className="text-xs bg-[#1E3A8A]/10 text-[#1E3A8A] px-3 py-1.5 rounded-full border border-[#1E3A8A]/20 hover:bg-[#1E3A8A]/20 transition"
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Answer 2 */}
                        {['mission', 'complete'].includes(onboardingStep) && (
                            <div className="flex gap-4 flex-row-reverse animate-slide-up">
                                <div className="space-y-2 max-w-[85%]">
                                    <div className="bg-[#0F766E] p-4 rounded-2xl rounded-tr-none shadow-sm text-white leading-relaxed">
                                        <p>{localProfile.sector}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Mission */}
                        {onboardingStep === 'mission' && (
                            <div className="flex gap-4 animate-slide-up">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1E3A8A] to-[#0F766E] flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
                                    <Building2 className="w-4 h-4 text-white" />
                                </div>
                                <div className="space-y-2 max-w-[85%]">
                                    <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 text-slate-700 leading-relaxed">
                                        <p>Finally, briefly describe your mission or a valid upcoming project.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Show mission answer once provided */}
                        {['beneficiaries','budget','complete'].includes(onboardingStep) && (
                            <div className="flex gap-4 flex-row-reverse animate-slide-up">
                                <div className="space-y-2 max-w-[85%]">
                                    <div className="bg-[#0F766E] p-4 rounded-2xl rounded-tr-none shadow-sm text-white leading-relaxed">
                                        <p>{localProfile.mission}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* AI-refined mission suggestion */}
                        {onboardingStep === 'ai_mission' && (
                            <div className="flex gap-4 animate-slide-up">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1E3A8A] to-[#0F766E] flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
                                    <Building2 className="w-4 h-4 text-white" />
                                </div>
                                <div className="space-y-2 max-w-[85%]">
                                    <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 text-slate-700 leading-relaxed">
                                        <p>Here’s an AI-polished version of your mission. You can accept it or keep your original.</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-50 text-slate-800">
                                        <p className="font-medium">{refineMissionText(localProfile.mission, localProfile.sector)}</p>
                                        <div className="flex gap-2 mt-3">
                                            <button
                                                onClick={() => {
                                                    const suggested = refineMissionText(localProfile.mission, localProfile.sector)
                                                    const updated = { ...localProfile, mission: suggested }
                                                    setLocalProfile(updated)
                                                    onProfileUpdate(updated)
                                                    setOnboardingStep('beneficiaries')
                                                }}
                                                className="text-sm bg-[#0F766E] text-white px-3 py-2 rounded-lg"
                                            >
                                                Use AI suggestion
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setOnboardingStep('beneficiaries')
                                                }}
                                                className="text-sm bg-white border border-slate-200 px-3 py-2 rounded-lg"
                                            >
                                                Keep my version
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Beneficiaries prompt */}
                        {onboardingStep === 'beneficiaries' && (
                            <div className="flex gap-4 animate-slide-up">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1E3A8A] to-[#0F766E] flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
                                    <Building2 className="w-4 h-4 text-white" />
                                </div>
                                <div className="space-y-2 max-w-[85%]">
                                    <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 text-slate-700 leading-relaxed">
                                        <p>Who are your primary beneficiaries (comma separated)?</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Show beneficiaries answer once provided */}
                        {['budget','complete'].includes(onboardingStep) && (
                            <div className="flex gap-4 flex-row-reverse animate-slide-up">
                                <div className="space-y-2 max-w-[85%]">
                                    <div className="bg-[#0F766E] p-4 rounded-2xl rounded-tr-none shadow-sm text-white leading-relaxed">
                                        <p>{beneficiariesLocal}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Budget prompt */}
                        {onboardingStep === 'budget' && (
                            <div className="flex gap-4 animate-slide-up">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1E3A8A] to-[#0F766E] flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
                                    <Building2 className="w-4 h-4 text-white" />
                                </div>
                                <div className="space-y-2 max-w-[85%]">
                                    <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 text-slate-700 leading-relaxed">
                                        <p>Finally, what's your typical annual budget (approx)?</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Completion */}
                        {onboardingStep === 'complete' && (
                            <div className="flex gap-4 animate-slide-up">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1E3A8A] to-[#0F766E] flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
                                    <Building2 className="w-4 h-4 text-white" />
                                </div>
                                <div className="space-y-2 max-w-[85%]">
                                    <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 text-slate-700 leading-relaxed">
                                        <p>Thank you! Your matches have been updated.</p>
                                        <button
                                            onClick={onClose}
                                            className="mt-3 w-full bg-[#0F766E] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#0d6963] transition"
                                        >
                                            View Matches
                                        </button>
                                        <Link
                                            to="/signin"
                                            state={localProfile}
                                            className="mt-2 w-full block text-center bg-white border border-[#1E3A8A]/20 text-[#1E3A8A] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#1E3A8A]/5 transition"
                                        >
                                            Create Account with these details
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Typing Indicator */}
                        {isTyping && (
                            <div className="flex gap-4 animate-slide-up">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
                                    <Building2 className="w-4 h-4 text-white" />
                                </div>
                                <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 text-slate-500">
                                    <div className="flex gap-1 h-6 items-center">
                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t border-slate-100 bg-white">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder={
                                    onboardingStep === 'uen' ? "Enter UEN (e.g., T08GB0021K)" :
                                    onboardingStep === 'ai_mission' ? 'AI-suggested mission (editable)' :
                                    onboardingStep === 'beneficiaries' ? 'Primary beneficiaries (comma separated)' :
                                    onboardingStep === 'budget' ? 'Annual budget (e.g., <$100k)' : 'Type your message...'
                                }
                                disabled={onboardingStep === 'complete' || onboardingStep === 'sector'}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleOnboardingSubmit(e.currentTarget.value);
                                        e.currentTarget.value = '';
                                    }
                                }}
                                className="w-full pl-4 pr-14 py-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent transition shadow-sm placeholder:text-slate-400 disabled:opacity-50 disabled:bg-slate-50"
                            />
                            <button
                                onClick={(e) => {
                                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                    handleOnboardingSubmit(input.value);
                                    input.value = '';
                                }}
                                disabled={onboardingStep === 'complete' || onboardingStep === 'sector'}
                                className="absolute right-2 top-2 bottom-2 aspect-square bg-[#0F766E] text-white rounded-lg hover:bg-[#0d6963] transition flex items-center justify-center disabled:opacity-50"
                            >
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div >
        </>
    )
}
