import { useState } from 'react'
import { Mail, Loader } from 'lucide-react'
import { sendTopGrantMatches_viaApi as sendTopGrantMatches } from '../../../services/emailService'
import type { Grant, Organization } from '../../../types'
import { GRANTS_DATA } from '../../../data'

interface EmailTesterProps {
    orgProfile: Organization
}

export default function EmailTester({ orgProfile }: EmailTesterProps) {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    const getRandomGrants = (count: number = 3): Grant[] => {
        const shuffled = [...GRANTS_DATA].sort(() => Math.random() - 0.5)
        // Add random match scores for testing
        return shuffled.slice(0, count).map(grant => ({
            ...grant,
            matchScore: Math.floor(Math.random() * 40) + 60 // Random score between 60-100
        }))
    }

    const handleSendTest = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!email.trim()) {
            setMessage({ type: 'error', text: 'Please enter an email address' })
            return
        }

        setLoading(true)
        setMessage(null)

        try {
            const randomGrants = getRandomGrants(3)
            const response = await sendTopGrantMatches(email, orgProfile, randomGrants)
            
            if (response.success) {
                setMessage({ type: 'success', text: '✅ Email sent successfully!' })
                setEmail('')
            } else {
                setMessage({ type: 'error', text: `❌ Failed to send: ${response.error}` })
            }
        } catch (error) {
            setMessage({ 
                type: 'error', 
                text: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-gradient-to-br from-indigo-50 to-teal-50 rounded-lg border border-indigo-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <Mail className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-slate-900">Email Test</h3>
                <span className="ml-auto text-xs bg-indigo-600 text-white px-2 py-1 rounded-full font-medium">DEV</span>
            </div>
            
            <form onSubmit={handleSendTest} className="space-y-3">
                <div>
                    <label htmlFor="test-email" className="block text-sm font-medium text-slate-700 mb-2">
                        Test Email Address
                    </label>
                    <input
                        id="test-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="test@example.com"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-teal-600 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <Loader className="w-4 h-4 animate-spin" />
                            Sending...
                        </>
                    ) : (
                        <>
                            <Mail className="w-4 h-4" />
                            Send Test Email (3 Random Grants)
                        </>
                    )}
                </button>

                {message && (
                    <div className={`p-3 rounded-lg text-sm font-medium ${
                        message.type === 'success' 
                            ? 'bg-green-50 text-green-800 border border-green-200' 
                            : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                        {message.text}
                    </div>
                )}

                <p className="text-xs text-slate-600 mt-4">
                    <strong>Note:</strong> This sends real emails via Resend through the backend API at <code>http://localhost:8000</code>. Make sure the backend is running. Match scores are generated randomly for testing purposes.
                </p>
            </form>
        </div>
    )
}
