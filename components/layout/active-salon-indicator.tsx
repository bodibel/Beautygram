"use client"

import { useEffect, useState } from "react"
import { useParams, usePathname } from "next/navigation"
import Link from "next/link"
import { Store, ChevronRight } from "lucide-react"
import { getSalonName } from "@/lib/actions/salon"
import Image from "next/image"

export function ActiveSalonIndicator() {
    const params = useParams()
    const pathname = usePathname()
    const [salonData, setSalonData] = useState<{ name: string; profileImage: string | null } | null>(null)
    const salonId = params.id as string

    useEffect(() => {
        if (salonId) {
            const fetchSalonName = async () => {
                const data = await getSalonName(salonId)
                if (data) {
                    setSalonData({
                        name: data.name,
                        profileImage: data.profileImage
                    })
                }
            }
            fetchSalonName()
        }
    }, [salonId])

    // Only show if we are in a salon context and not just viewing the list or a public profile
    if (!salonId || !salonData || pathname?.startsWith("/profile/")) return null

    return (
        <div className="px-4 sm:px-6 lg:px-8 pt-4">
            <div className="rounded-2xl bg-white/50 backdrop-blur-md border border-primary/10/50 p-3 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner overflow-hidden">
                        {salonData.profileImage ? (
                            <Image
                                src={salonData.profileImage}
                                alt={salonData.name}
                                fill
                                sizes="40px"
                                className="h-full w-full object-cover rounded-xl"
                            />
                        ) : (
                            <Store className="h-5 w-5" />
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Szerkesztett szalon</span>
                            <div className="h-1 w-1 rounded-full bg-pink-300" />
                        </div>
                        <h2 className="text-sm font-bold text-gray-900 leading-none mt-1">{salonData.name}</h2>
                    </div>
                </div>

                <Link
                    href={`/salon/${salonId}`}
                    className="flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary transition-colors bg-white px-3 py-1.5 rounded-lg border border-primary/5 shadow-sm"
                >
                    Vezérlőpult
                    <ChevronRight className="h-3 w-3" />
                </Link>
            </div>
        </div>
    )
}
