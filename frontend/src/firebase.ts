import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Initialize Firebase app if not already initialized
if (!getApps().length) {
  try {
    initializeApp(firebaseConfig)
  } catch (err) {
    // ignore initialization errors; app may be configured elsewhere in the host app
    // eslint-disable-next-line no-console
    console.warn('Firebase init warning:', err)
  }
}

// Export a `getAuth` wrapper to avoid hard dependency if config missing
export const auth = (() => {
  try {
    return getAuth()
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Firebase auth unavailable:', err)
    return null as any
  }
})()
