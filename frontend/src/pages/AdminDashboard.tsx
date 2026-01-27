import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { Sector } from '../types'
import { fetchGrants } from '../services/grantsService'
import { sendTopGrantMatches_viaApi } from '../services/emailService'
import { authFetch, getStoredIdToken } from '../services/authService'
import { getMatchedGrants } from '../utils/matching'
import type { Grant, Organization } from '../types'

export default function AdminDashboard({ setOrgProfile, orgProfile, user }: { setOrgProfile?: (p: Organization) => void, orgProfile?: Organization, user?: { name?: string; email?: string } | null }) {
  const [grants, setGrants] = useState<Grant[]>([])
  // fixed demo recipient per request
  const [recipient] = useState('clarence7890gt@gmail.com')

  // NPO question fields — initialize empty, then populate from props or local storage
  const [orgName, setOrgName] = useState('')
  const [orgSector, setOrgSector] = useState<Organization['sector']>('Social Service')
  const [mission, setMission] = useState('')
  const [beneficiaries, setBeneficiaries] = useState('')
  const [annualBudget, setAnnualBudget] = useState('')

  const [sending, setSending] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const location = useLocation()
  const aiProfile = (location.state as any)?.aiProfile
  const [aiSuggestion, setAiSuggestion] = useState<any | null>(null)

  useEffect(() => {
    const load = async () => {
      const data = await fetchGrants()
      setGrants(data)
    }
    load()
  }, [])

  useEffect(() => {
    if (aiProfile) {
      console.log('Admin received aiProfile:', aiProfile)
      // Apply AI profile to fields so Admin looks populated
      setOrgName(aiProfile.name || orgName)
      setOrgSector(aiProfile.sector || orgSector)
      setMission(aiProfile.mission || mission)
      setBeneficiaries(aiProfile.beneficiaries || beneficiaries)
      setAnnualBudget(aiProfile.annualBudget || annualBudget)
      setAiSuggestion(aiProfile.suggestion || null)
    }
  }, [aiProfile])

  // Populate fields from provided orgProfile prop or from locally stored user profile
  useEffect(() => {
    // prefer explicit orgProfile prop
    if (orgProfile) {
      setOrgName(orgProfile.name || '')
      setOrgSector(orgProfile.sector || 'Social Service')
      setMission(orgProfile.mission || '')
      // beneficiaries & budget may not be part of Organization type; try to read from localStorage/user
      const usersRaw = localStorage.getItem('granted_users')
      if (usersRaw && user?.email) {
        try {
          const users = JSON.parse(usersRaw)
          const entry = users[user.email]
          if (entry?.profile) {
            setBeneficiaries((entry.profile.beneficiaries || []).join(', '))
            if (entry.profile.budget) setAnnualBudget(String(entry.profile.budget))
          }
        } catch {
          // ignore parse errors
        }
      }
      return
    }

    // fallback: if a logged-in user exists, try load their saved profile from localStorage
    if (user?.email) {
      const usersRaw = localStorage.getItem('granted_users')
      if (usersRaw) {
        try {
          const users = JSON.parse(usersRaw)
          const entry = users[user.email]
          if (entry?.profile) {
            setOrgName(entry.profile.name || '')
            setOrgSector(entry.profile.sector || 'Social Service')
            setMission(entry.profile.mission || entry.profile.description || '')
            setBeneficiaries((entry.profile.beneficiaries || []).join(', '))
            if (entry.profile.budget) setAnnualBudget(String(entry.profile.budget))
          }
        } catch {
          // ignore
        }
      }
    }
  }, [orgProfile, user])

  // Auto-dismiss notifications after a short duration
  useEffect(() => {
    if (!notification) return
    const t = setTimeout(() => setNotification(null), 6000)
    return () => clearTimeout(t)
  }, [notification])

  const handleSend = async () => {
    const org: Organization = {
      name: orgName,
      uen: 'T0000000X',
      sector: orgSector,
      mission,
    }

    // Compute top matches using matching util and take top 3
    const orgForMatch: Organization = {
      name: orgName,
      uen: 'T0000000X',
      sector: orgSector,
      mission,
    }

    // Demo override: if the profile mentions children/kids/youth, prefer kid-related grants
    const childRegex = /\b(child|children|kid|kids|youth|young)\b/i
    const looksForKids = childRegex.test(beneficiaries) || childRegex.test(mission)

    let topGrants: Grant[] = []
    if (looksForKids) {
      const filteredChildGrants = grants.filter(g => {
        const hay = `${g.name} ${g.description} ${(g.sectors || []).join(' ')} ${g.agency}`
        return childRegex.test(hay)
      })
      if (filteredChildGrants.length > 0) {
        topGrants = filteredChildGrants.slice(0, 3)
        console.debug('AdminDashboard: Using hardcoded child-related grants for demo', topGrants.map(g=>g.id))
      }
    }

    if (topGrants.length === 0) {
      const matched = getMatchedGrants(grants, orgForMatch)
      topGrants = matched.slice(0, 3)
      if (topGrants.length === 0) {
        // fallback to first 3 if matching returns none
        topGrants = grants.slice(0, 3)
      }
    }

    setSending(true)
    const res = await sendTopGrantMatches_viaApi(recipient, org, topGrants)
    setSending(false)

    if (res.success) {
      setNotification({ type: 'success', message: `Email sent to ${recipient}.` })
    } else {
      setNotification({ type: 'error', message: 'Failed to send — preview opened in a new tab.' })
      const previewHtml = `<html><body><h2>Preview: Top ${topGrants.length} Grants for ${org.name}</h2>${topGrants.map(g=>`<h3>${g.name}</h3><p>${g.description}</p>`).join('')}</body></html>`
      const blob = new Blob([previewHtml], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    }
  }

  const handleUpdateProfile = async () => {
    const body = {
      name: orgName,
      sector: orgSector,
      description: mission,
      beneficiaries: beneficiaries.split(',').map(s => s.trim()).filter(Boolean),
      budget: (() => {
        // Try to extract a number from the annualBudget input (which may be a range or string)
        const digits = annualBudget.replace(/[^0-9.]/g, '')
        const n = Number(digits)
        return Number.isFinite(n) && n > 0 ? n : 0
      })(),
    }

    const token = getStoredIdToken() || localStorage.getItem('granted_token')
    if (!token) {
      // No token: fall back to local/demo update
      if (setOrgProfile) {
        setOrgProfile({ uen: 'T0000000X', name: orgName, sector: orgSector, mission })
        setNotification({ type: 'success', message: 'Profile updated locally (no auth token).' })
      } else {
        setNotification({ type: 'error', message: 'No profile updater provided.' })
      }
      return
    }

    try {
      const res = await authFetch('https://update-npo-kun7hshp7q-as.a.run.app', {
        method: 'PUT',
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const txt = await res.text()
        setNotification({ type: 'error', message: `Update failed: ${res.status} ${txt}` })
        return
      }

      const data = await res.json()
      // Apply server response to app state if possible
      if (setOrgProfile) {
        setOrgProfile({ uen: (data.uen as string) || 'T0000000X', name: data.name || orgName, sector: data.sector || orgSector, mission: data.description || mission })
      }
      setNotification({ type: 'success', message: 'Organization profile updated on server.' })
    } catch (err: any) {
      setNotification({ type: 'error', message: 'Update request failed: ' + (err?.message || String(err)) })
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <Link to="/" className="text-sm text-slate-500 hover:underline">Back to app</Link>
      </div>

      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
        <div className="mb-3 font-medium">Send Top 3 Grants</div>

        {aiSuggestion && (
          <div className="mb-4 p-3 bg-gradient-to-r from-indigo-50 to-white border-l-4 border-indigo-400 rounded">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm font-semibold">{aiSuggestion.headline}</div>
                <div className="text-sm text-slate-600 mt-2">{aiSuggestion.blurb}</div>
                <div className="mt-3 text-xs text-slate-500">Suggested beneficiaries: <strong>{aiSuggestion.suggestedBeneficiaries}</strong> • Suggested budget: <strong>{aiSuggestion.suggestedBudget}</strong></div>
              </div>
              <div>
                <button onClick={() => {
                  // reapply suggestion to fields
                  setOrgName(prev => prev)
                  setOrgSector(aiProfile?.sector || orgSector)
                  setMission(aiProfile?.mission || mission)
                  setBeneficiaries(aiProfile?.beneficiaries || beneficiaries)
                  setAnnualBudget(aiProfile?.annualBudget || annualBudget)
                  alert('AI suggestion applied to the Admin fields.')
                }} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm">Apply</button>
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs font-semibold">Recipient (fixed)</label>
            <input value={recipient} readOnly className="p-2 border rounded w-full bg-slate-50" />
          </div>
          <div>
            <label className="text-xs font-semibold">Organization Name</label>
            <input value={orgName} onChange={e=>setOrgName(e.target.value)} className="p-2 border rounded w-full" />
          </div>
          <div>
            <label className="text-xs font-semibold">Sector</label>
            <input value={orgSector} onChange={e=>setOrgSector(e.target.value as Sector)} className="p-2 border rounded w-full" />
          </div>
          <div>
            <label className="text-xs font-semibold">Annual Budget</label>
            <input value={annualBudget} onChange={e=>setAnnualBudget(e.target.value)} className="p-2 border rounded w-full" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold">Mission / What you do</label>
            <textarea value={mission} onChange={e=>setMission(e.target.value)} className="p-2 border rounded w-full h-24" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold">Primary Beneficiaries</label>
            <input value={beneficiaries} onChange={e=>setBeneficiaries(e.target.value)} className="p-2 border rounded w-full" />
          </div>
        </div>

        <div className="mb-4">
          <div className="text-sm text-slate-600 mb-2">Send the best matching grants for the profile above.</div>
        </div>

        <div className="flex gap-3">
          <button onClick={handleSend} disabled={sending} className="bg-[#0F766E] text-white px-4 py-2 rounded hover:bg-[#0d6963]">{sending ? 'Sending...' : 'Send Best Matching Grants'}</button>
          <button onClick={handleUpdateProfile} className="px-3 py-2 border rounded">Update Profile</button>
        </div>
        {notification && (
          <div className={`mt-4 p-3 rounded text-sm ${notification.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : notification.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-blue-50 border border-blue-200 text-blue-800'}`}>
            {notification.message}
          </div>
        )}
      </div>
    </div>
  )
}
