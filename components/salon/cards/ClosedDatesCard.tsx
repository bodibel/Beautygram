"use client"

import { Button } from "@/components/ui/button"
import { Plus, Trash2, Calendar } from "lucide-react"
import { ClosedDate } from "@/lib/salon-types"

interface ClosedDatesCardProps {
    closedDates: ClosedDate[]
    onAdd: () => void
    onDelete: (id: string) => void
}

export function ClosedDatesCard({ closedDates, onAdd, onDelete }: ClosedDatesCardProps) {
    return (
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-900/5 transition-all hover:shadow-md h-full">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Zárt napok</h3>
                </div>
                <Button
                    onClick={onAdd}
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 rounded-full hover:bg-primary-subtle hover:text-primary transition-colors"
                >
                    <Plus className="h-4 w-4" />
                </Button>
            </div>

            <div className="space-y-4">
                {closedDates.length === 0 ? (
                    <div className="text-center py-10">
                        <div className="h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
                            <Calendar className="h-6 w-6 text-gray-300" />
                        </div>
                        <p className="text-sm text-gray-400">Nincsenek beállított zárt napok</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {closedDates.slice(0, 5).map((closed) => (
                            <div key={closed.id} className="group flex items-center justify-between gap-4 p-3 rounded-2xl bg-gray-50/50 border border-transparent hover:border-gray-100 transition-all">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="h-10 w-10 rounded-xl bg-white flex flex-col items-center justify-center shadow-sm border border-gray-100 flex-shrink-0">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-0.5">
                                            {new Date(closed.date).toLocaleString('default', { month: 'short' })}
                                        </span>
                                        <span className="text-sm font-black text-gray-900 leading-none">
                                            {new Date(closed.date).getDate()}
                                        </span>
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-bold text-gray-900 truncate">{closed.reason}</div>
                                        <div className="text-xs text-gray-500">{closed.date}</div>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onDelete(closed.id)}
                                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all rounded-full"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                        {closedDates.length > 5 && (
                            <p className="text-xs text-gray-400 text-center pt-2 font-medium">
                                +{closedDates.length - 5} további szünet
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
