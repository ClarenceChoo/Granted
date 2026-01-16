import { useState, useMemo } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import MainLayout from './components/layout/MainLayout'
import Home from './pages/Home'
import Discover from './pages/Discover'
import GrantDetails from './pages/GrantDetails'
import SignIn from './pages/SignIn'
import { GRANTS_DATA } from './data'
import type { Organization } from './types'
import { getMatchedGrants } from './utils/matching'

export default function App() {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)

  // User State
  const [orgProfile, setOrgProfile] = useState<Organization>({
    uen: '',
    name: 'My Organization',
    sector: 'Social Service',
    mission: ''
  })

  const isOnboardingComplete = !!(orgProfile.uen && orgProfile.mission)

  // Derived State: Calculate matches based on current profile
  const matchedGrants = useMemo(() => {
    if (!isOnboardingComplete) return GRANTS_DATA.slice(0, 3).map(g => ({ ...g, matchScore: 90 }));
    return getMatchedGrants(GRANTS_DATA, orgProfile);
  }, [orgProfile, isOnboardingComplete])

  return (
    <BrowserRouter>
      <MainLayout
        chatOpen={isChatOpen}
        setChatOpen={setIsChatOpen}
        orgProfile={orgProfile}
        setOrgProfile={setOrgProfile}
      >
        <Routes>
          <Route path="/" element={
            <Home
              matchedGrants={matchedGrants}
              orgProfile={orgProfile}
              onOpenChat={() => setIsChatOpen(true)}
              isSubscribed={isSubscribed}
              setIsSubscribed={setIsSubscribed}
              isComplete={isOnboardingComplete}
            />
          } />
          <Route path="/discover" element={<Discover />} />
          <Route path="/grant/:id" element={<GrantDetails />} />
          <Route path="/signin" element={<SignIn />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  )
}
