"use client"

import { Button } from "@/components/ui/button"
import { Edit } from "lucide-react"
import { OpeningHour } from "@/lib/salon-types"
import { cn } from "@/lib/utils"

interface HoursCardProps {
    hours: OpeningHour[]
    onEdit: () => void
}

export function HoursCard({ hours, onEdit }: HoursCardProps) {
    return (
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-900/5 transition-all hover:shadow-md h-full">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Edit className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Nyitvatartás</h3>
                </div>
                <Button
                    onClick={onEdit}
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 rounded-full hover:bg-primary-subtle hover:text-primary transition-colors"
                >
                    <Edit className="h-4 w-4" />
                </Button>
            </div>

            <div className="space-y-3">
                {hours.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm py-2 border-b border-gray-50 last:border-0">
                        <span className="font-medium text-gray-500">{item.day}</span>
                        <div className={cn(
                            "flex items-center gap-2 font-bold",
                            item.isOpen ? "text-gray-900" : "text-gray-300"
                        )}>
                            {!item.isOpen && <div className="h-1.5 w-1.5 rounded-full bg-gray-300" />}
                            {item.isOpen ? `${item.open} - ${item.close}` : "Zárva"}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
