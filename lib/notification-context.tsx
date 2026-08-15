"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './auth-context'
import { getUnreadMessageCount } from '@/lib/actions/salon'

interface NotificationContextType {
    unreadCount: number
    refreshUnreadCount: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { userData } = useAuth()
    const userId = userData?.id
    const [unreadCount, setUnreadCount] = useState(0)

    const refreshUnreadCount = useCallback(async () => {
        if (!userId) return
        try {
            const count = await getUnreadMessageCount(userId)
            setUnreadCount(count)
        } catch (error) {
            console.error("Error refreshing unread count:", error)
        }
    }, [userId])

    useEffect(() => {
        if (!userId) return

        const initialRefresh = setTimeout(refreshUnreadCount, 0)
        const interval = setInterval(refreshUnreadCount, 30000)

        return () => {
            clearTimeout(initialRefresh)
            clearInterval(interval)
        }
    }, [userId, refreshUnreadCount])

    return (
        <NotificationContext.Provider value={{ unreadCount: userId ? unreadCount : 0, refreshUnreadCount }}>
            {children}
        </NotificationContext.Provider>
    )
}

export function useNotifications() {
    const context = useContext(NotificationContext)
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider')
    }
    return context
}
