// AdminDashboard.tsx
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import type { Sector } from '../types'
import { fetchGrants } from '../services/grantsService'
import { authFetch, getStoredIdToken, logoutLocal } from '../services/authService'
import { getMatchedGrants } from '../utils/matching'
import type { Grant, Organization } from '../types'

const profileRequestCache = new Map<string, Promise<any>>()

async function fetchProfileOnce(emailKey: string) {
  if (profileRequestCache.has(emailKey)) return profileRequestCache.get(emailKey)!
  const p = (async () => {
    const res = await authFetch('https://get-npo-kun7hshp7q-as.a.run.app', { method: 'GET' })
    const payload = await res.json()
    if (!res.ok) throw new Error(payload?.error || 'Failed to load profile')
    return payload
  })()
  profileRequestCache.set(emailKey, p)
  return p.catch(err => {
    profileRequestCache.delete(emailKey)
    throw err
  })
}

export default function AdminDashboard({
  setOrgProfile,
  orgProfile,
  user,
}: {
  setOrgProfile?: (p: Organization) => void
  orgProfile?: Organization
  user?: { name?: string; email?: string } | null
}) {
  const [grants, setGrants] = useState<Grant[]>([])
  const [recipient, setRecipient] = useState('')

  // NPO question fields — initialize empty, then populate from props or local storage
  const [orgName, setOrgName] = useState('')
  const [orgSector, setOrgSector] = useState<Organization['sector']>('Social Service')
  const [mission, setMission] = useState('')
  const [beneficiaries, setBeneficiaries] = useState('')
  const [annualBudget, setAnnualBudget] = useState('')

  const [sending, setSending] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [deactivateReason, setDeactivateReason] = useState('User requested account deletion')
  const [deactivating, setDeactivating] = useState(false)
  const [updatingProfile, setUpdatingProfile] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deactivated, setDeactivated] = useState(false)

  const location = useLocation()
  const navigate = useNavigate()
  const aiProfile = (location.state as any)?.aiProfile
  const [aiSuggestion, setAiSuggestion] = useState<any | null>(null)

  const loadedEmailRef = useRef<string | null>(null)
  const hasLoadedRemoteProfileRef = useRef(false)
  const hasAppliedAiProfileRef = useRef(false)

  // ✅ NEW: prevents “fighting” the user while they click/type
  const isDirtyRef = useRef(false)

  // ✅ NEW: ensure local hydration runs at most once (before remote wins)
  const hasHydratedLocalRef = useRef(false)

  const markDirty = () => {
    isDirtyRef.current = true
  }

  const normalizeBeneficiaries = (value: any) => {
    if (Array.isArray(value)) return value.join(', ')
    if (typeof value === 'string') return value
    return value ? String(value) : ''
  }

  // ✅ updated: won’t overwrite fields once user has started editing (unless forced)
  const applyProfileToState = (
    profile: Partial<Organization> & { beneficiaries?: any; annualBudget?: any; budget?: any; description?: any; mission?: any; email?: any },
    opts?: { force?: boolean }
  ) => {
    if (!opts?.force && isDirtyRef.current) return

    const nextName = profile.name || ''
    const nextSector = (profile.sector as Organization['sector']) || 'Social Service'
    const nextMission = profile.description || profile.mission || ''
    const nextBeneficiaries = normalizeBeneficiaries(profile.beneficiaries || '')
    const nextBudget = (profile.annualBudget || profile.budget) ? String(profile.annualBudget || profile.budget) : ''
    const nextEmail = (profile as any).email || ''

    if (nextName !== orgName) setOrgName(nextName)
    if (nextSector !== orgSector) setOrgSector(nextSector)
    if (nextMission !== mission) setMission(nextMission)
    if (nextBeneficiaries !== beneficiaries) setBeneficiaries(nextBeneficiaries)
    if (nextBudget !== annualBudget) setAnnualBudget(nextBudget)
    if (nextEmail && nextEmail !== recipient) setRecipient(nextEmail)
  }

  useEffect(() => {
    const load = async () => {
      const data = await fetchGrants()
      setGrants(data)
    }
    load()
  }, [])

  // Load current user's NPO profile from the backend (if authenticated)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let isCancelled = false
    const loadProfile = async (emailKey: string) => {
      try {
        const payload = await fetchProfileOnce(emailKey)
        if (isCancelled) return

        const profile = (payload && payload.data) ? payload.data : payload
        if (!profile) return

        // ✅ Will not clobber user typing
        applyProfileToState(profile)

        hasLoadedRemoteProfileRef.current = true

        const updatedProfile = {
          uen: profile.uen || 'T0000000X',
          name: profile.name || '',
          sector: profile.sector || 'Social Service',
          mission: profile.description || profile.mission || '',
          beneficiaries: profile.beneficiaries || [],
          budget: profile.budget || profile.annualBudget || 0,
          annualBudget: profile.annualBudget || profile.budget || '',
        }

        if (setOrgProfile) setOrgProfile(updatedProfile)

        const email = user?.email || localStorage.getItem('granted_user_email')
        localStorage.setItem('granted_org_profile', JSON.stringify({ ...updatedProfile, email }))
      } catch (err: any) {
        if (!isCancelled) {
          setNotification({ type: 'error', message: 'Failed to load profile: ' + (err?.message || String(err)) })
        }
      }
    }

    const emailKey = user?.email || localStorage.getItem('granted_user_email') || 'anonymous'
    if (loadedEmailRef.current === emailKey) return
    loadedEmailRef.current = emailKey

    loadProfile(emailKey)
    return () => { isCancelled = true }
  }, [user?.email])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (user?.email && !recipient) setRecipient(user.email)
  }, [user?.email])

  // Apply AI profile (from navigation) — use functional updates to avoid stale closures
  useEffect(() => {
    if (aiProfile && !hasAppliedAiProfileRef.current) {
      hasAppliedAiProfileRef.current = true
      console.log('Admin received aiProfile:', aiProfile)

      // ✅ Don’t fight user if they already started editing
      if (!isDirtyRef.current) {
        setOrgName(prev => aiProfile.name ?? prev)
        setOrgSector(prev => (aiProfile.sector as Organization['sector']) ?? prev)
        setMission(prev => aiProfile.mission ?? prev)
        setBeneficiaries(prev => normalizeBeneficiaries(aiProfile.beneficiaries ?? prev))
        setAnnualBudget(prev => aiProfile.annualBudget ?? prev)
      }

      setAiSuggestion(aiProfile.suggestion || null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiProfile])

  // Populate fields from provided orgProfile prop or from locally stored user profile
  // ✅ updated: hydrate at most once (and never after remote has loaded)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (hasLoadedRemoteProfileRef.current) return
    if (hasHydratedLocalRef.current) return
    hasHydratedLocalRef.current = true

    const storedOrgRaw = localStorage.getItem('granted_org_profile')
    if (storedOrgRaw) {
      try {
        const stored = JSON.parse(storedOrgRaw)
        if (!user?.email || !stored?.email || stored.email === user.email) {
          applyProfileToState(stored)
          return
        }
      } catch {
        // ignore parse errors
      }
    }

    // prefer explicit orgProfile prop
    if (orgProfile) {
      applyProfileToState(orgProfile)

      const usersRaw = localStorage.getItem('granted_users')
      if (usersRaw && user?.email) {
        try {
          const users = JSON.parse(usersRaw)
          const entry = users[user.email]
          if (entry?.profile) {
            applyProfileToState(entry.profile)
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
            applyProfileToState(entry.profile)
          }
        } catch {
          // ignore
        }
      }
    }
  }, [user?.email])

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
        console.debug('AdminDashboard: Using hardcoded child-related grants for demo', topGrants.map(g => g.id))
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

    const token = getStoredIdToken()
    if (!token) {
      setNotification({ type: 'error', message: 'Please sign in to send matched grants email.' })
      return
    }

    setSending(true)
    try {
      const res = await authFetch('https://send-grant-emails-manual-kun7hshp7q-as.a.run.app', {
        method: 'POST',
      })

      if (!res.ok) {
        const txt = await res.text()
        throw new Error(`${res.status} ${txt}`)
      }

      setNotification({ type: 'success', message: `Email sent to ${recipient}.` })
    } catch (err: any) {
      setNotification({ type: 'error', message: 'Failed to send — preview opened in a new tab.' })
      const previewHtml = `<html><body><h2>Preview: Top ${topGrants.length} Grants for ${org.name}</h2>${topGrants.map(g => `<h3>${g.name}</h3><p>${g.description}</p>`).join('')}</body></html>`
      const blob = new Blob([previewHtml], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } finally {
      setSending(false)
    }
  }

  const handleUpdateProfile = async () => {
    if (updatingProfile) return
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
      setUpdatingProfile(true)
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
      const updatedProfile = {
        uen: (data.uen as string) || 'T0000000X',
        name: data.name || orgName,
        sector: data.sector || orgSector,
        mission: data.description || mission,
        beneficiaries: body.beneficiaries,
        budget: body.budget,
        annualBudget,
      }

      // Apply server response to app state if possible
      if (setOrgProfile) {
        setOrgProfile(updatedProfile)
      }

      // Persist locally so refresh keeps the updated profile
      const email = user?.email || localStorage.getItem('granted_user_email')
      localStorage.setItem('granted_org_profile', JSON.stringify({ ...updatedProfile, email }))
      if (email) {
        const usersRaw = localStorage.getItem('granted_users')
        if (usersRaw) {
          try {
            const users = JSON.parse(usersRaw)
            if (users[email]?.profile) {
              users[email].profile = {
                ...users[email].profile,
                ...updatedProfile,
                email,
              }
              localStorage.setItem('granted_users', JSON.stringify(users))
            }
          } catch {
            // ignore parse errors
          }
        }
        localStorage.setItem('granted_user_profile', JSON.stringify({ ...updatedProfile, email }))
      }
      setNotification({ type: 'success', message: 'Organization profile updated on server.' })
    } catch (err: any) {
      setNotification({ type: 'error', message: 'Update request failed: ' + (err?.message || String(err)) })
    } finally {
      setUpdatingProfile(false)
    }
  }

  const handleDeactivateAccount = async () => {
    const token = getStoredIdToken()
    if (!token) {
      setNotification({ type: 'error', message: 'Please sign in to deactivate your account.' })
      return
    }

    if (confirmText.trim() !== 'DELETE') {
      setNotification({ type: 'error', message: 'Please type DELETE to confirm deactivation.' })
      return
    }

    setDeactivating(true)
    try {
      const res = await authFetch('https://deactivate-npo-kun7hshp7q-as.a.run.app', {
        method: 'DELETE',
        body: JSON.stringify({ reason: deactivateReason || 'User requested account deletion' }),
      })

      if (!res.ok) {
        const txt = await res.text()
        throw new Error(`${res.status} ${txt}`)
      }

      logoutLocal()
      setDeactivated(true)
      setTimeout(() => navigate('/signin'), 2500)
    } catch (err: any) {
      setNotification({ type: 'error', message: 'Deactivation failed: ' + (err?.message || String(err)) })
    } finally {
      setDeactivating(false)
    }
  }

  if (deactivated) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white p-6 rounded-lg shadow-sm text-center">
          <div className="text-xl font-semibold text-red-700 mb-2">Account Deactivated</div>
          <div className="text-sm text-slate-600">You will be redirected to sign in shortly.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        </div>
        <Link to="/" className="text-sm text-slate-500 hover:underline">
          Back to app
        </Link>
      </div>

      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
        <div className="mb-3 font-medium">Send Top 3 Grants</div>

        {aiSuggestion && (
          <div className="mb-4 p-3 bg-gradient-to-r from-indigo-50 to-white border-l-4 border-indigo-400 rounded">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm font-semibold">{aiSuggestion.headline}</div>
                <div className="text-sm text-slate-600 mt-2">{aiSuggestion.blurb}</div>
                <div className="mt-3 text-xs text-slate-500">
                  Suggested beneficiaries: <strong>{aiSuggestion.suggestedBeneficiaries}</strong> • Suggested budget:{' '}
                  <strong>{aiSuggestion.suggestedBudget}</strong>
                </div>
              </div>
              <div>
                <button
                  onClick={() => {
                    // reapply suggestion to fields
                    // ✅ FIX: org name no-op -> actually apply
                    // ✅ force apply (this is an explicit user action)
                    applyProfileToState(
                      {
                        name: aiProfile?.name,
                        sector: aiProfile?.sector,
                        mission: aiProfile?.mission,
                        beneficiaries: aiProfile?.beneficiaries,
                        annualBudget: aiProfile?.annualBudget,
                      },
                      { force: true }
                    )
                    alert('AI suggestion applied to the Admin fields.')
                  }}
                  className="px-3 py-1 bg-indigo-600 text-white rounded text-sm"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-3 mb-4">
          <div>
            <label htmlFor="admin-recipient" className="text-xs font-semibold">
              Recipient
            </label>
            <input id="admin-recipient" name="adminRecipient" value={recipient} readOnly className="p-2 border rounded w-full bg-slate-50" />
          </div>

          <div>
            <label htmlFor="admin-org-name" className="text-xs font-semibold">
              Organization Name
            </label>
            <input
              id="admin-org-name"
              name="orgName"
              value={orgName}
              onChange={e => {
                markDirty()
                setOrgName(e.target.value)
              }}
              className="p-2 border rounded w-full"
            />
          </div>

          <div>
            <label htmlFor="admin-sector" className="text-xs font-semibold">
              Sector
            </label>
            <input
              id="admin-sector"
              name="sector"
              value={orgSector}
              onChange={e => {
                markDirty()
                setOrgSector(e.target.value as Sector)
              }}
              className="p-2 border rounded w-full"
            />
          </div>

          <div>
            <label htmlFor="admin-annual-budget" className="text-xs font-semibold">
              Annual Budget
            </label>
            <input
              id="admin-annual-budget"
              name="annualBudget"
              value={annualBudget}
              onChange={e => {
                markDirty()
                setAnnualBudget(e.target.value)
              }}
              className="p-2 border rounded w-full"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="admin-mission" className="text-xs font-semibold">
              Mission / What you do
            </label>
            <textarea
              id="admin-mission"
              name="mission"
              value={mission}
              onChange={e => {
                markDirty()
                setMission(e.target.value)
              }}
              className="p-2 border rounded w-full h-24"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="admin-beneficiaries" className="text-xs font-semibold">
              Primary Beneficiaries
            </label>
            <input
              id="admin-beneficiaries"
              name="beneficiaries"
              value={beneficiaries}
              onChange={e => {
                markDirty()
                setBeneficiaries(e.target.value)
              }}
              className="p-2 border rounded w-full"
            />
          </div>
        </div>

        <div className="mb-4">
          <div className="text-sm text-slate-600 mb-2">Send the best matching grants for the profile above.</div>
        </div>

        <div className="flex gap-3">
          <button onClick={handleSend} disabled={sending} className="bg-[#0F766E] text-white px-4 py-2 rounded hover:bg-[#0d6963]">
            {sending ? 'Sending...' : 'Send Best Matching Grants'}
          </button>
          <button onClick={handleUpdateProfile} disabled={updatingProfile} className="px-3 py-2 border rounded disabled:opacity-60">
            {updatingProfile ? 'Updating...' : 'Update Profile'}
          </button>
        </div>

        {notification && (
          <div
            className={`mt-4 p-3 rounded text-sm ${
              notification.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : notification.type === 'error'
                ? 'bg-red-50 border border-red-200 text-red-800'
                : 'bg-blue-50 border border-blue-200 text-blue-800'
            }`}
          >
            {notification.message}
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="mb-2 font-medium text-red-700">Danger Zone</div>
        <div className="text-sm text-slate-600 mb-3">Deactivate or delete your account. This action may be irreversible.</div>
        <div className="grid md:grid-cols-2 gap-3 mb-4">
          <div className="md:col-span-2">
            <label htmlFor="admin-deactivate-reason" className="text-xs font-semibold">
              Reason (optional)
            </label>
            <input
              id="admin-deactivate-reason"
              name="deactivateReason"
              value={deactivateReason}
              onChange={e => setDeactivateReason(e.target.value)}
              className="p-2 border rounded w-full"
              placeholder="Reason for deactivation"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="admin-confirm-delete" className="text-xs font-semibold">
              Type DELETE to confirm
            </label>
            <input
              id="admin-confirm-delete"
              name="confirmDelete"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              className="p-2 border rounded w-full"
              placeholder="DELETE"
            />
          </div>
        </div>

        <button
          onClick={handleDeactivateAccount}
          disabled={deactivating || confirmText.trim() !== 'DELETE'}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-60"
        >
          {deactivating ? 'Deactivating...' : 'Deactivate / Delete Account'}
        </button>
      </div>
    </div>
  )
}
