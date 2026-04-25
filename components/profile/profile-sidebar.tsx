"use client"

import { Clock, Eye, Mail, MapPin, Phone, Star } from "lucide-react"

interface ProfileSidebarProps {
    salon: any
}

const DAY_LABELS: Record<string, string> = {
    "Hétfő": "Hétfő",
    "Kedd": "Kedd",
    "Szerda": "Szerda",
    "Csütörtök": "Csütörtök",
    "Péntek": "Péntek",
    "Szombat": "Szombat",
    "Vasárnap": "Vasárnap",
}

export function ProfileSidebar({ salon }: ProfileSidebarProps) {
    const openingHours = Array.isArray(salon.openingHours) ? salon.openingHours : []
    const profileViewCount = Number(salon.profileViewCount) || 0
    const reviewCount = Number(salon.reviewCount) || 0

    const showPhone = salon.showPhoneOnProfile !== false && salon.phone
    const showEmail = salon.showEmailOnProfile === true && salon.email

    return (
        <div className="space-y-6">
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                    <Eye className="h-5 w-5 text-primary" />
                    <h3 className="font-bold text-gray-900">Láthatóság</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Megtekintések</p>
                        <p className="mt-2 text-2xl font-bold text-gray-900">{profileViewCount}</p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Értékelések</p>
                        <div className="mt-2 flex items-center gap-2">
                            <p className="text-2xl font-bold text-gray-900">{reviewCount}</p>
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        </div>
                    </div>
                </div>
            </div>

            {(showPhone || showEmail) && (
                <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-4">
                        <Phone className="h-5 w-5 text-primary" />
                        <h3 className="font-bold text-gray-900">Kapcsolat</h3>
                    </div>
                    <div className="space-y-3">
                        {showPhone && (
                            <a
                                href={`tel:${salon.phone}`}
                                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
                            >
                                <div className="bg-white p-2 rounded-lg shadow-sm">
                                    <Phone className="h-4 w-4 text-primary" />
                                </div>
                                <span className="text-sm font-medium text-gray-700 group-hover:text-primary">{salon.phone}</span>
                            </a>
                        )}
                        {showEmail && (
                            <a
                                href={`mailto:${salon.email}`}
                                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
                            >
                                <div className="bg-white p-2 rounded-lg shadow-sm">
                                    <Mail className="h-4 w-4 text-primary" />
                                </div>
                                <span className="text-sm font-medium text-gray-700 group-hover:text-primary">{salon.email}</span>
                            </a>
                        )}
                    </div>
                </div>
            )}

            <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                    <Clock className="h-5 w-5 text-gray-400" />
                    <h3 className="font-bold text-gray-900">Nyitvatartás</h3>
                </div>
                <div className="space-y-2">
                    {openingHours.length > 0 ? (
                        openingHours.map((hour: any) => (
                            <div key={hour.day} className="flex justify-between text-sm">
                                <span className="text-gray-500">{DAY_LABELS[hour.day] || hour.day}</span>
                                {hour.isOpen ? (
                                    <span className="font-medium text-gray-900">{hour.open} - {hour.close}</span>
                                ) : (
                                    <span className="text-red-500 font-medium">Zárva</span>
                                )}
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-gray-500 text-center py-2">Nincs nyitvatartás megadva.</p>
                    )}
                </div>
            </div>

            <div className="rounded-3xl overflow-hidden bg-gray-100 aspect-video relative">
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 font-medium text-sm">
                    <MapPin className="h-4 w-4 mr-2" />
                    Térkép nem elérhető
                </div>
            </div>
            <p className="text-xs text-gray-500">{salon.city}, {salon.address}</p>
        </div>
    )
}
