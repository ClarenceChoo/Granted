import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, X, Building2, ArrowRight, Sparkles, Send } from 'lucide-react'
import type { Organization, Sector } from '../../../types'

interface GrantAssistantProps {
    isOpen: boolean
    onClose: () => void
    onProfileUpdate: (profile: Organization) => void
    currentProfile: Organization
}

type Step = 'name' | 'uen' | 'sector' | 'mission' | 'ai_mission' | 'beneficiaries' | 'budget' | 'complete' | 'chat'

interface ChatMessage {
    role: 'user' | 'assistant'
    content: string
}

// Helper function to strip markdown formatting from AI responses
const stripMarkdown = (text: string): string => {
    return text
        // Remove headers (# ## ### etc)
        .replace(/^#{1,6}\s+/gm, '')
        // Remove bold (**text** or __text__)
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        // Remove italic (*text* or _text_)
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/(?<!_)_([^_]+)_(?!_)/g, '$1')
        // Remove horizontal rules (*** or --- or ___)
        .replace(/^[\*\-_]{3,}$/gm, '')
        // Remove bullet points but keep the text
        .replace(/^[\*\-•]\s+/gm, '• ')
        // Remove numbered list formatting but keep numbers
        .replace(/^\d+\.\s+/gm, '')
        // Remove code blocks
        .replace(/```[\s\S]*?```/g, '')
        // Remove inline code
        .replace(/`([^`]+)`/g, '$1')
        // Remove links but keep text
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // Clean up extra whitespace
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

export default function GrantAssistant({ isOpen, onClose, onProfileUpdate, currentProfile }: GrantAssistantProps) {
    const navigate = useNavigate()

    // Check if user is logged in (has valid profile data)
    const isLoggedIn = () => {
        // Check if profile has essential fields filled in
        const hasProfileData = currentProfile.name && currentProfile.name !== 'My Organization' && currentProfile.uen
        // Also check localStorage for logged-in user
        const storedProfile = localStorage.getItem('granted_user_profile')
        if (storedProfile) {
            try {
                const parsed = JSON.parse(storedProfile)
                return !!(parsed.email || parsed.name)
            } catch {
                return false
            }
        }
        return !!hasProfileData
    }

    // Start at 'chat' step if logged in, otherwise 'name' for onboarding
    const [onboardingStep, setOnboardingStep] = useState<Step>(isLoggedIn() ? 'chat' : 'name')

    const steps = ['name', 'uen', 'sector', 'mission', 'ai_mission', 'beneficiaries', 'budget', 'complete']
    const isStepActiveOrPast = (targetStep: Step) => {
        const currentIndex = steps.indexOf(onboardingStep)
        const targetIndex = steps.indexOf(targetStep)
        return currentIndex >= targetIndex
    }
    const isStepPast = (targetStep: Step) => {
        const currentIndex = steps.indexOf(onboardingStep)
        const targetIndex = steps.indexOf(targetStep)
        return currentIndex > targetIndex
    }

    // Local state to manage the inputs before pushing up to parent
    const [localProfile, setLocalProfile] = useState<Organization & Partial<{ beneficiaries: string[]; annualBudget: string | number }>>(currentProfile)
    const [beneficiariesLocal, setBeneficiariesLocal] = useState<string>((Array.isArray((currentProfile as any).beneficiaries) ? (currentProfile as any).beneficiaries.join(', ') : (currentProfile as any).beneficiaries) || 'Children, youth, local communities')
    const [budgetLocal, setBudgetLocal] = useState<string>(String((currentProfile as any).annualBudget || '<$100k'))
    const [isTyping, setIsTyping] = useState(false)
    const [isRefining, setIsRefining] = useState(false)
    const [aiSuggestion, setAiSuggestion] = useState<any>(null)

    // Free-form chat state - add welcome message for logged-in users
    const getInitialChatMessages = (): ChatMessage[] => {
        if (isLoggedIn()) {
            return [{
                role: 'assistant',
                content: `Hi ${currentProfile.name || 'there'}! 👋 I'm your Grant Assistant. How can I help you today? You can ask me about:\n\n• Finding suitable grants for your organization\n• Grant application tips and best practices\n• Eligibility requirements for specific grants\n• Funding strategies for NPOs in Singapore`
            }]
        }
        return []
    }
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>(getInitialChatMessages())
    const [chatInput, setChatInput] = useState('')
    const [isChatLoading, setIsChatLoading] = useState(false)

    // Initialize local inputs when the chat is opened to avoid clobbering while user types
    useEffect(() => {
        if (isOpen) {
            // initialize local state from parent profile when opening the assistant
            console.debug('GrantAssistant: opening — initializing localProfile', currentProfile)
            setLocalProfile(currentProfile)
            setBeneficiariesLocal((Array.isArray((currentProfile as any).beneficiaries) ? (currentProfile as any).beneficiaries.join(', ') : (currentProfile as any).beneficiaries) || 'Children, youth, local communities')
            setBudgetLocal(String((currentProfile as any).annualBudget || '<$100k'))
        }
    }, [isOpen])

    // Note: previously the assistant attempted to auto-reopen if closed during onboarding.
    // That behavior prevented users from closing the chat. We no longer auto-reopen;
    // closing always respects the parent's `onClose` callback.

    const createAISuggestion = (profile: Organization & Partial<{ beneficiaries?: string | string[]; annualBudget?: string | number }>) => {
        const mission = profile.mission || ''
        return {
            headline: `AI Suggestion: Personalized outreach for ${profile.name || 'your organisation'}`,
            blurb: `Based on your mission "${mission}", we recommend focusing on small-scale community workshops, school outreach programmes, and collaborative performances. Prioritise grants that support arts education, capacity-building, and community engagement. Suggested messaging: "${mission} — engaging children and youth through accessible arts education and community programmes."`,
            suggestedMission: profile.mission,
            suggestedBeneficiaries: Array.isArray((profile as any).beneficiaries) ? (profile as any).beneficiaries.join(', ') : (profile as any).beneficiaries || 'Children, youth, local communities',
            suggestedBudget: (profile as any).annualBudget || '<$100k',
        }
    }

    const normalizeBeneficiaries = (input: string) =>
        input
            .split(',')
            .map(item => item.trim())
            .filter(Boolean)

    // refineMissionText removed — AI refinement is handled by `fetchAiRefinement` and `createAISuggestion`.

    const fetchAiRefinement = async (mission: string, sector: string = 'Social Service') => {
        setIsRefining(true)
        try {
            const response = await fetch('https://chat-refine-kun7hshp7q-as.a.run.app', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mission, sector }),
            })
            const data = await response.json()
            setAiSuggestion(data)
            return data
        } catch (error) {
            console.error('Failed to fetch AI refinement:', error)
            // Fallback
            setAiSuggestion({
                refinedMission: mission,
                suggestions: {
                    headline: "AI Suggestion Unavailable",
                    blurb: "We couldn't reach the AI service, but we've saved your mission.",
                    suggestedMission: mission
                }
            })
        } finally {
            setIsRefining(false)
        }
    }

    // Free-form AI chat function
    const sendChatMessage = async (message: string) => {
        if (!message.trim() || isChatLoading) return

        // Add user message to chat
        const userMessage: ChatMessage = { role: 'user', content: message }
        setChatMessages(prev => [...prev, userMessage])
        setChatInput('')
        setIsChatLoading(true)

        try {
            const response = await fetch('https://ai-chat-kun7hshp7q-as.a.run.app', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    history: chatMessages,
                    context: {
                        name: localProfile.name,
                        sector: localProfile.sector,
                        mission: localProfile.mission,
                        uen: localProfile.uen,
                    }
                }),
            })
            const data = await response.json()

            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: stripMarkdown(data.response || "I couldn't process that. Please try again.")
            }
            setChatMessages(prev => [...prev, assistantMessage])
        } catch (error) {
            console.error('Chat error:', error)
            const errorMessage: ChatMessage = {
                role: 'assistant',
                content: "Sorry, I'm having trouble connecting. Please try again."
            }
            setChatMessages(prev => [...prev, errorMessage])
        } finally {
            setIsChatLoading(false)
        }
    }

    const handleOnboardingSubmit = (val: string) => {
        setIsTyping(true)
        console.debug('GrantAssistant.handleOnboardingSubmit', { step: onboardingStep, val, localProfile, beneficiariesLocal, budgetLocal })
        let updatedProfile = { ...localProfile }

        if (onboardingStep === 'name') {
            updatedProfile = { ...updatedProfile, name: val }
            setLocalProfile(updatedProfile)
            onProfileUpdate(updatedProfile)
            setOnboardingStep('uen')
        } else if (onboardingStep === 'uen') {
            updatedProfile = { ...updatedProfile, uen: val }
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

            // Trigger AI Refinement
            fetchAiRefinement(val, updatedProfile.sector || 'Social Service')
            setOnboardingStep('ai_mission')
            setIsTyping(false)
        } else if (onboardingStep === 'beneficiaries') {
            const normalizedBeneficiaries = normalizeBeneficiaries(val)
            setBeneficiariesLocal(val)
            updatedProfile = { ...updatedProfile, beneficiaries: normalizedBeneficiaries }
            setLocalProfile(updatedProfile)
            onProfileUpdate(updatedProfile)
            setOnboardingStep('budget')
        } else if (onboardingStep === 'budget') {
            setBudgetLocal(val)
            // finalize
            updatedProfile = { ...updatedProfile, mission: updatedProfile.mission || '', annualBudget: val }
            setLocalProfile(updatedProfile)
            onProfileUpdate(updatedProfile)
            setOnboardingStep('complete')

            // Prepare AI suggestion payload and navigate to admin
            const aiProfile = {
                name: updatedProfile.name || 'Harmony Arts Centre',
                uen: updatedProfile.uen || 'T0000000X',
                sector: updatedProfile.sector || 'Arts & Heritage',
                mission: updatedProfile.mission || val,
                beneficiaries: (updatedProfile as any).beneficiaries || normalizeBeneficiaries(beneficiariesLocal),
                annualBudget: val,
                suggestion: aiSuggestion?.suggestions || createAISuggestion({
                    ...updatedProfile,
                    beneficiaries: (updatedProfile as any).beneficiaries || normalizeBeneficiaries(beneficiariesLocal),
                    annualBudget: val,
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

    // Auto-scroll to bottom
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [onboardingStep, isTyping, beneficiariesLocal, budgetLocal, chatMessages, isChatLoading])

    return (
        <>
            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 transition-opacity duration-300 opacity-100 pointer-events-auto"
                />
            )}

            {/* Chat Panel */}
            <div className={`fixed inset-y-0 right-0 z-50 w-full md:w-[480px] bg-white shadow-2xl transform transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${isOpen ? 'translate-x-0 pointer-events-auto' : 'translate-x-full pointer-events-none'}`}>
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

                        {/* Step 1: Greeting & Organization Name */}
                        <div className="flex gap-4 animate-slide-up">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1E3A8A] to-[#0F766E] flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
                                <Building2 className="w-4 h-4 text-white" />
                            </div>
                            <div className="space-y-2 max-w-[85%]">
                                <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 text-slate-700 leading-relaxed">
                                    <p>Hello! I can help you find relevant funding. First, what is your <strong>Organization Name</strong>?</p>
                                </div>
                            </div>
                        </div>

                        {/* Answer 1 - Organization Name */}
                        {isStepPast('name') && (
                            <div className="flex gap-4 flex-row-reverse animate-slide-up">
                                <div className="space-y-2 max-w-[85%]">
                                    <div className="bg-[#0F766E] p-4 rounded-2xl rounded-tr-none shadow-sm text-white leading-relaxed">
                                        <p>{localProfile.name}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: UEN */}
                        {isStepActiveOrPast('uen') && (
                            <div className="flex gap-4 animate-slide-up">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1E3A8A] to-[#0F766E] flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
                                    <Building2 className="w-4 h-4 text-white" />
                                </div>
                                <div className="space-y-2 max-w-[85%]">
                                    <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 text-slate-700 leading-relaxed">
                                        <p>Great! What is your Organization UEN (Unique Entity Number)?</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Answer 2 - UEN */}
                        {isStepPast('uen') && (
                            <div className="flex gap-4 flex-row-reverse animate-slide-up">
                                <div className="space-y-2 max-w-[85%]">
                                    <div className="bg-[#0F766E] p-4 rounded-2xl rounded-tr-none shadow-sm text-white leading-relaxed">
                                        <p>{localProfile.uen}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Sector */}
                        {isStepActiveOrPast('sector') && (
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
                        {isStepPast('sector') && (
                            <div className="flex gap-4 flex-row-reverse animate-slide-up">
                                <div className="space-y-2 max-w-[85%]">
                                    <div className="bg-[#0F766E] p-4 rounded-2xl rounded-tr-none shadow-sm text-white leading-relaxed">
                                        <p>{localProfile.sector}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Mission */}
                        {isStepActiveOrPast('mission') && (
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
                        {isStepPast('mission') && (
                            <div className="flex gap-4 flex-row-reverse animate-slide-up">
                                <div className="space-y-2 max-w-[85%]">
                                    <div className="bg-[#0F766E] p-4 rounded-2xl rounded-tr-none shadow-sm text-white leading-relaxed">
                                        <p>{localProfile.mission}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* AI-refined mission suggestion */}
                        {isStepActiveOrPast('ai_mission') && (
                            <div className="flex gap-4 animate-slide-up">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1E3A8A] to-[#0F766E] flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
                                    <Building2 className="w-4 h-4 text-white" />
                                </div>
                                <div className="space-y-2 max-w-[85%]">
                                    <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 text-slate-700 leading-relaxed">
                                        <p>Here’s an AI-polished version of your mission. You can accept it or keep your original.</p>
                                    </div>

                                    {isRefining ? (
                                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-50 text-slate-500 italic animate-pulse">
                                            Generating intelligent suggestions...
                                        </div>
                                    ) : (
                                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-50 text-slate-800">
                                            <p className="font-medium">{aiSuggestion?.refinedMission || localProfile.mission}</p>
                                            <div className="flex gap-2 mt-3">
                                                <button
                                                    onClick={() => {
                                                        const suggested = aiSuggestion?.refinedMission || localProfile.mission
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
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Beneficiaries prompt */}
                        {isStepActiveOrPast('beneficiaries') && (
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
                        {isStepPast('beneficiaries') && (
                            <div className="flex gap-4 flex-row-reverse animate-slide-up">
                                <div className="space-y-2 max-w-[85%]">
                                    <div className="bg-[#0F766E] p-4 rounded-2xl rounded-tr-none shadow-sm text-white leading-relaxed">
                                        <p>{beneficiariesLocal}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Budget prompt */}
                        {isStepActiveOrPast('budget') && (
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

                        {/* Show budget answer once provided */}
                        {isStepPast('budget') && (
                            <div className="flex gap-4 flex-row-reverse animate-slide-up">
                                <div className="space-y-2 max-w-[85%]">
                                    <div className="bg-[#0F766E] p-4 rounded-2xl rounded-tr-none shadow-sm text-white leading-relaxed">
                                        <p>{budgetLocal}</p>
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
                                        <p>Thank you! Your matches have been updated. What would you like to do next?</p>
                                        <button
                                            onClick={() => setOnboardingStep('chat')}
                                            className="mt-3 w-full bg-gradient-to-r from-[#1E3A8A] to-[#0F766E] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition flex items-center justify-center gap-2"
                                        >
                                            <Sparkles className="w-4 h-4" />
                                            Ask me anything about grants
                                        </button>
                                        <button
                                            onClick={onClose}
                                            className="mt-2 w-full bg-[#0F766E] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#0d6963] transition"
                                        >
                                            View Matches
                                        </button>
                                        <button
                                            onClick={() => {
                                                onClose()
                                                navigate('/signin', { state: localProfile })
                                            }}
                                            className="mt-2 w-full block text-center bg-white border border-[#1E3A8A]/20 text-[#1E3A8A] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#1E3A8A]/5 transition"
                                        >
                                            Create Account with these details
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Chat Mode */}
                        {onboardingStep === 'chat' && (
                            <>
                                {/* Welcome to chat message */}
                                {chatMessages.length === 0 && (
                                    <div className="flex gap-4 animate-slide-up">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1E3A8A] to-[#0F766E] flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
                                            <Sparkles className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="space-y-2 max-w-[85%]">
                                            <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 text-slate-700 leading-relaxed">
                                                <p className="font-medium">I'm your AI Grant Assistant! 🎉</p>
                                                <p className="mt-2 text-sm text-slate-600">Ask me anything about:</p>
                                                <ul className="mt-2 text-sm text-slate-600 list-disc list-inside space-y-1">
                                                    <li>Singapore grant opportunities</li>
                                                    <li>Eligibility requirements</li>
                                                    <li>Application tips</li>
                                                    <li>Writing grant proposals</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Chat Messages */}
                                {chatMessages.map((msg, idx) => (
                                    <div key={idx} className={`flex gap-4 animate-slide-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                        {msg.role === 'assistant' && (
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1E3A8A] to-[#0F766E] flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
                                                <Sparkles className="w-4 h-4 text-white" />
                                            </div>
                                        )}
                                        <div className="space-y-2 max-w-[85%]">
                                            <div className={`p-4 rounded-2xl shadow-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user'
                                                ? 'bg-[#0F766E] text-white rounded-tr-none'
                                                : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
                                                }`}>
                                                <p>{msg.content}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Chat Loading Indicator */}
                                {isChatLoading && (
                                    <div className="flex gap-4 animate-slide-up">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1E3A8A] to-[#0F766E] flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
                                            <Sparkles className="w-4 h-4 text-white" />
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
                            </>
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
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t border-slate-100 bg-white">
                        <div className="relative">
                            <input
                                type="text"
                                value={onboardingStep === 'chat' ? chatInput : undefined}
                                onChange={onboardingStep === 'chat' ? (e) => setChatInput(e.target.value) : undefined}
                                placeholder={
                                    onboardingStep === 'chat' ? "Ask me about grants..." :
                                        onboardingStep === 'name' ? "Enter your organization name" :
                                            onboardingStep === 'uen' ? "Enter UEN (e.g., T08GB0021K)" :
                                                onboardingStep === 'ai_mission' ? 'AI-suggested mission (editable)' :
                                                    onboardingStep === 'beneficiaries' ? 'Primary beneficiaries (comma separated)' :
                                                        onboardingStep === 'budget' ? 'Annual budget (e.g., <$100k)' : 'Type your message...'
                                }
                                disabled={onboardingStep === 'complete' || onboardingStep === 'sector' || isChatLoading}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        if (onboardingStep === 'chat') {
                                            sendChatMessage(chatInput);
                                        } else {
                                            handleOnboardingSubmit(e.currentTarget.value);
                                            e.currentTarget.value = '';
                                        }
                                    }
                                }}
                                className="w-full pl-4 pr-14 py-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent transition shadow-sm placeholder:text-slate-400 disabled:opacity-50 disabled:bg-slate-50"
                            />
                            <button
                                onClick={(e) => {
                                    if (onboardingStep === 'chat') {
                                        sendChatMessage(chatInput);
                                    } else {
                                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                        handleOnboardingSubmit(input.value);
                                        input.value = '';
                                    }
                                }}
                                disabled={onboardingStep === 'complete' || onboardingStep === 'sector' || isChatLoading}
                                className="absolute right-2 top-2 bottom-2 aspect-square bg-[#0F766E] text-white rounded-lg hover:bg-[#0d6963] transition flex items-center justify-center disabled:opacity-50"
                            >
                                {onboardingStep === 'chat' ? <Send className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div >
        </>
    )
}
