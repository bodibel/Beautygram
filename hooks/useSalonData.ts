import { useState, useEffect } from "react"
import { Service, OpeningHour, ClosedDate, Post, Salon } from "@/lib/salon-types"
import { getSalonData } from "@/lib/actions/salon"

export function useSalonData(salonId: string, userId: string | undefined) {
    const [salon, setSalon] = useState<Salon | null>(null)
    const [services, setServices] = useState<Service[]>([])
    const [openingHours, setOpeningHours] = useState<OpeningHour[]>([])
    const [closedDates, setClosedDates] = useState<ClosedDate[]>([])
    const [posts, setPosts] = useState<Post[]>([])
    const [visitorStats, setVisitorStats] = useState<{
        totalViews: number
        todayViews: number
        series: Array<{ date: string; label: string; fullLabel: string; count: number }>
    }>({
        totalViews: 0,
        todayViews: 0,
        series: [],
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (userId && salonId) {
            loadSalonData()
        } else if (!userId) {
            setLoading(false)
        }
    }, [userId, salonId])

    const loadSalonData = async () => {
        if (!salonId) return
        if (!userId) {
            setLoading(false)
            return
        }

        try {
            setLoading(true)
            const result = await getSalonData(salonId, userId)

            if (result) {
                setSalon(result.salon as unknown as Salon)
                setServices(result.services as unknown as Service[])
                setOpeningHours(result.openingHours as unknown as OpeningHour[])
                setClosedDates(result.closedDates as unknown as ClosedDate[])
                setPosts(result.posts as unknown as Post[])
                setVisitorStats(result.visitorStats ?? { totalViews: 0, todayViews: 0, series: [] })
            }
        } catch (error) {
            console.error("Error loading salon data:", error)
        } finally {
            setLoading(false)
        }
    }

    return {
        salon,
        setSalon,
        services,
        setServices,
        openingHours,
        setOpeningHours,
        closedDates,
        setClosedDates,
        posts,
        setPosts,
        visitorStats,
        loading,
        reload: loadSalonData
    }
}

