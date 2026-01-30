import { useState, useMemo, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import MainLayout from './components/layout/MainLayout'
import { SavedGrantsProvider } from './contexts/SavedGrantsContext'
import Home from './pages/Home'
import Discover from './pages/Discover'
import GrantDetails from './pages/GrantDetails'
import SignIn from './pages/SignIn'
import MyGrants from './pages/MyGrants'
import Resources from './pages/Resources'
import AdminDashboard from './pages/AdminDashboard'
import { GRANTS_DATA } from './data'
import type { Organization, Grant } from './types'
import { getMatchedGrants } from './utils/matching'
import { fetchGrants } from './services/grantsService'
import { fetchMatchedGrants, type MatchResult } from './services/matchesService'

export default function App() {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [grants, setGrants] = useState<Grant[]>([])
  const [isLoadingGrants, setIsLoadingGrants] = useState(true)
  const [matchedGrants, setMatchedGrants] = useState<Grant[]>([])
  const [isLoadingMatches, setIsLoadingMatches] = useState(false)
  const [matchesError, setMatchesError] = useState<string | null>(null)

  // Simulated auth state for demo
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null)

  // User State
  const [orgProfile, setOrgProfile] = useState<Organization>({
    uen: '',
    name: 'My Organization',
    sector: 'Social Service',
    mission: ''
  })

  const isOnboardingComplete = !!(orgProfile.uen && orgProfile.mission)

  // Fetch grants on component mount
  useEffect(() => {
    const loadGrants = async () => {
      setIsLoadingGrants(true)
      const fetchedGrants = await fetchGrants()
      if (fetchedGrants.length > 0) {
        setGrants(fetchedGrants)
      } else {
        // Fallback to static data if API fails
        setGrants(GRANTS_DATA)
      }
      setIsLoadingGrants(false)
    }
    loadGrants()
  }, [])

  // Keep auth state in sync with Firebase SDK (if available)
  useEffect(() => {
    // No Firebase SDK: determine auth from stored idToken
    const idToken = localStorage.getItem('idToken')
    if (idToken) {
      setIsAuthenticated(true)
      const storedProfileRaw = localStorage.getItem('granted_user_profile')
      if (storedProfileRaw) {
        try {
          const parsed = JSON.parse(storedProfileRaw)
          if (parsed?.email) {
            setUser(parsed)
            return
          }
        } catch {
          // fall through to other strategies
        }
      }

      const storedEmail = localStorage.getItem('granted_user_email')
      if (storedEmail) {
        const usersRaw = localStorage.getItem('granted_users')
        if (usersRaw) {
          try {
            const users = JSON.parse(usersRaw)
            const entry = users[storedEmail]
            if (entry?.profile) {
              setUser(entry.profile)
              return
            }
          } catch {
            // ignore parse errors
          }
        }
        setUser({ email: storedEmail })
        return
      }

      const usersRaw = localStorage.getItem('granted_users')
      if (usersRaw) {
        try {
          const users = JSON.parse(usersRaw)
          const emails = Object.keys(users || {})
          if (emails.length === 1 && users[emails[0]]?.profile) {
            setUser(users[emails[0]].profile)
            return
          }
        } catch {
          // ignore parse errors
        }
      }

      const uid = localStorage.getItem('uid')
      if (uid && uid.includes('@')) {
        setUser({ email: uid })
      } else {
        setUser(null)
      }
    } else {
      setIsAuthenticated(false)
      setUser(null)
    }
    // No cleanup required
  }, [])

  // Restore last saved org profile on refresh
  useEffect(() => {
    const stored = localStorage.getItem('granted_org_profile')
    if (!stored) return
    try {
      const parsed = JSON.parse(stored)
      if (parsed?.name || parsed?.mission || parsed?.sector || parsed?.uen) {
        setOrgProfile(prev => ({
          ...prev,
          uen: parsed.uen || prev.uen,
          name: parsed.name || prev.name,
          sector: parsed.sector || prev.sector,
          mission: parsed.mission || prev.mission,
        }))
      }
    } catch {
      // ignore parse errors
    }
  }, [])

  // Derived State: Calculate matches based on current profile
  const fallbackMatchedGrants = useMemo(() => {
    if (!isOnboardingComplete) return grants.slice(0, 3).map(g => ({ ...g, matchScore: 90 }));
    return getMatchedGrants(grants, orgProfile);
  }, [grants, orgProfile, isOnboardingComplete])

  useEffect(() => {
    let isCancelled = false

    const loadMatches = async () => {
      if (!isAuthenticated) {
        setMatchedGrants([])
        setMatchesError(null)
        return
      }
      if (isLoadingGrants) return
      setIsLoadingMatches(true)
      setMatchesError(null)
      try {
        const fetched = await fetchMatchedGrants()
        const hydrated = hydrateMatchesWithGrants(fetched, grants)
        if (!isCancelled) setMatchedGrants(hydrated)
      } catch (err: any) {
        if (!isCancelled) {
          setMatchesError(err?.message || 'Failed to load matches')
          setMatchedGrants([])
        }
      } finally {
        if (!isCancelled) setIsLoadingMatches(false)
      }
    }

    loadMatches()
    return () => { isCancelled = true }
  }, [isAuthenticated, grants, isLoadingGrants])

  const displayedMatchedGrants = (!isAuthenticated || matchesError) ? fallbackMatchedGrants : matchedGrants
  const isHomeLoading = isLoadingGrants || (isAuthenticated && isLoadingMatches)

  function hydrateMatchesWithGrants(matches: MatchResult[], allGrants: Grant[]): Grant[] {
    const grantMap = new Map(allGrants.map(g => [g.id, g]))
    return matches
      .map(match => {
        const base = grantMap.get(match.grantId)
        if (!base) return null
        return { ...base, matchScore: match.similarityScore ?? base.matchScore, matchReasoning: match.reasoning }
      })
      .filter(Boolean) as Grant[]
  }

  return (
    <BrowserRouter>
      <SavedGrantsProvider>
        <MainLayout
        chatOpen={isChatOpen}
        setChatOpen={setIsChatOpen}
        orgProfile={orgProfile}
        setOrgProfile={setOrgProfile}
        isAuthenticated={isAuthenticated}
        setIsAuthenticated={setIsAuthenticated}
        user={user}
        setUser={setUser}
      >
        <Routes>
          <Route
            path="/"
            element={
              <Home
                matchedGrants={displayedMatchedGrants}
                orgProfile={orgProfile}
                onOpenChat={() => setIsChatOpen(true)}
                isComplete={isOnboardingComplete}
                isLoading={isHomeLoading}
                isAuthenticated={isAuthenticated}
              />
            }
          />
          <Route path="/discover" element={<Discover />} />
          <Route path="/grant/:id" element={<GrantDetails />} />
          <Route path="/my-grants" element={<MyGrants />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/admin" element={<AdminDashboard setOrgProfile={setOrgProfile} orgProfile={orgProfile} user={user} />} />
          <Route
            path="/signin"
            element={<SignIn onAuthSuccess={(profile: any) => { setIsAuthenticated(true); setUser(profile); }} />}
          />
        </Routes>
        </MainLayout>
      </SavedGrantsProvider>
    </BrowserRouter>
  )
}
