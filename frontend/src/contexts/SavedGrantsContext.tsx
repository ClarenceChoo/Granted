import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { Grant } from '../types'
import { fetchSavedGrants, saveGrant as apiSaveGrant, unsaveGrant as apiUnsaveGrant } from '../services/grantsService'

type SavedGrantsContextValue = {
    savedGrants: Grant[]
    savedIds: string[]
    isLoading: boolean
    save: (grantId: string) => Promise<void>
    unsave: (grantId: string) => Promise<void>
    isSaved: (grantId: string) => boolean
    notification?: { type: 'success' | 'error' | 'info'; message: string } | null
    clearNotification: () => void
    // Modal shown for important actions (e.g., reached max favourites)
    modalOpen: boolean
    modalMessage?: string | null
    openModal: (message: string) => void
    closeModal: () => void
}

const SavedGrantsContext = createContext<SavedGrantsContextValue | undefined>(undefined)

export const SavedGrantsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [savedGrants, setSavedGrants] = useState<Grant[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
    const dismissTimer = useRef<number | null>(null)
    const [modalOpen, setModalOpen] = useState(false)
    const [modalMessage, setModalMessage] = useState<string | null>(null)

    const clearNotification = () => {
        setNotification(null)
        if (dismissTimer.current) {
            window.clearTimeout(dismissTimer.current)
            dismissTimer.current = null
        }
    }

    const showNotification = (n: { type: 'success' | 'error' | 'info'; message: string }, autoDismiss = true) => {
        setNotification(n)
        if (dismissTimer.current) {
            window.clearTimeout(dismissTimer.current)
            dismissTimer.current = null
        }
        if (autoDismiss) {
            dismissTimer.current = window.setTimeout(() => setNotification(null), 5000)
        }
    }

    const openModal = (message: string) => {
        setModalMessage(message)
        setModalOpen(true)
    }

    const closeModal = () => {
        setModalOpen(false)
        setModalMessage(null)
    }

    useEffect(() => {
        const load = async () => {
            setIsLoading(true)
            const saved = await fetchSavedGrants()
            setSavedGrants(saved)
            setIsLoading(false)
        }
        load()
    }, [])

    const save = async (grantId: string) => {
        // optimistic: if already present, no-op
        if (savedGrants.find(g => g.id === grantId)) return
        // temporarily add a placeholder id entry (will be replaced when refetched)
        setSavedGrants(prev => [{ id: grantId, name: 'Saved grant', agency: '', description: '', quantum: 'Varies', deadline: 'Rolling', sectors: [], eligibility: [], status: undefined, agencyIconUrl: undefined, applicableTo: [], deactivationUrl: undefined, available: true }, ...prev])
        try {
            const res = await apiSaveGrant(grantId)
            // show success/information if backend returns message
            if (res && res.message) {
                showNotification({ type: 'success', message: String(res.message) })
            }
            // re-fetch to replace placeholders with real data
            const refreshed = await fetchSavedGrants()
            setSavedGrants(refreshed)
        } catch (err: any) {
            // rollback optimistic update
            setSavedGrants(prev => prev.filter(g => g.id !== grantId))

            // Prefer backend structured body if present
            const body = err?.body || (err && err.response && err.response.data) || null
            const rawMessage = body?.error || body?.message || err?.message || String(err)

            // Friendly mapping for known cases (max saved grants)
            const lower = String(rawMessage).toLowerCase()
            if (lower.includes('maximum') && (lower.includes('saved') || lower.includes('favourit') || lower.includes('favorite') || lower.includes('favourite'))) {
                const max = body?.max_allowed || body?.max || 'the limit'
                openModal(`You've reached the maximum number of favourites (${max}). Remove some to save more.`)
            } else {
                showNotification({ type: 'error', message: rawMessage || 'Failed to save grant.' })
            }

            throw err
        }
    }

    const unsave = async (grantId: string) => {
        // optimistic remove
        const previous = savedGrants
        setSavedGrants(prev => prev.filter(g => g.id !== grantId))
        try {
            const res = await apiUnsaveGrant(grantId)
            if (res && res.message) showNotification({ type: 'success', message: String(res.message) })
        } catch (err: any) {
            // rollback
            setSavedGrants(previous)
            const body = err?.body || null
            const rawMessage = body?.error || body?.message || err?.message || String(err)
            showNotification({ type: 'error', message: rawMessage || 'Failed to remove saved grant.' })
            throw err
        }
    }

    const value: SavedGrantsContextValue = {
        savedGrants,
        savedIds: savedGrants.map(g => g.id),
        isLoading,
        save,
        unsave,
        isSaved: (grantId: string) => savedGrants.some(g => g.id === grantId),
        notification,
        clearNotification,
        modalOpen,
        modalMessage,
        openModal,
        closeModal,
    }

    return <SavedGrantsContext.Provider value={value}>{children}</SavedGrantsContext.Provider>
}

export function useSavedGrants() {
    const ctx = useContext(SavedGrantsContext)
    if (!ctx) throw new Error('useSavedGrants must be used within SavedGrantsProvider')
    return ctx
}

export default SavedGrantsContext
