"use client"

import { Clock } from "lucide-react"
import Image from "next/image"

const SCHEDULE = [
    { time: "10:00 AM", status: "ONGOING", client: "Elena Rodriguez", service: "Full Balayage & Toning", avatar: "https://images.unsplash.com/photo-1573496359-e36b3c09e741?w=100", active: true },
    { time: "11:30 AM", status: "Upcoming", client: "Marcus Chen", service: "Signature Sculpt & Fade", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100", active: false },
    { time: "01:00 PM", status: "Upcoming", client: "Sarah Jenkins", service: "Bridal Makeup Trial", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100", active: false },
]

export function TimelineSchedule() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="font-bold text-xl text-gray-900">Upcoming Schedule</h3>
                <button className="text-sm font-bold text-primary hover:underline">View Full Calendar</button>
            </div>

            <div className="relative space-y-4 before:absolute before:inset-y-0 before:left-[19px] before:w-[2px] before:bg-gray-100">
                {SCHEDULE.map((item, idx) => (
                    <div key={idx} className="relative pl-12">
                        {/* Timeline Dot */}
                        <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full border-4 border-white flex items-center justify-center ${item.active ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-gray-100 text-gray-400"}`}>
                            <Clock className="h-4 w-4" />
                        </div>

                        {/* Card */}
                        <div className={`flex min-w-0 flex-col gap-4 rounded-3xl p-4 transition-shadow sm:flex-row sm:items-center sm:justify-between sm:p-5 ${item.active ? "bg-white shadow-md ring-1 ring-primary/10" : "bg-white border border-gray-100"}`}>
                            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-gray-100">
                                    <Image src={item.avatar} alt={item.client} fill className="object-cover" />
                                </div>
                                <div className="min-w-0">
                                    <div className="mb-1 flex flex-wrap items-center gap-2">
                                        <span className="text-sm font-bold text-gray-500">{item.time}</span>
                                        {item.active && <span className="text-[10px] font-bold text-white bg-accent px-2 py-0.5 rounded-full">ONGOING</span>}
                                    </div>
                                    <h4 className="truncate font-bold text-gray-900">{item.client}</h4>
                                    <p className="break-words text-sm text-gray-500">{item.service}</p>
                                </div>
                            </div>

                            <button className={`self-start rounded-full px-4 py-2 text-sm font-semibold transition-colors sm:self-auto ${item.active ? "bg-primary text-white hover:bg-primary shadow-md shadow-primary/20" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}>
                                {item.active ? "Check-In" : "Reschedule"}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
