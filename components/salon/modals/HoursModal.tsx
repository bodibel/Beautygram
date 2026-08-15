"use client"

import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { OpeningHour } from "@/lib/salon-types"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Copy } from "lucide-react"

interface HoursModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (hours: OpeningHour[]) => void
    hours: OpeningHour[]
}

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2).toString().padStart(2, "0")
    const minute = i % 2 === 0 ? "00" : "30"
    return `${hour}:${minute}`
})

export function HoursModal({ isOpen, onClose, onSave, hours }: HoursModalProps) {
    const [editingHours, setEditingHours] = useState<OpeningHour[]>([])

    useEffect(() => {
        if (isOpen) {
            const timer = window.setTimeout(() => setEditingHours([...hours]), 0)
            return () => window.clearTimeout(timer)
        }
    }, [hours, isOpen])

    const updateHourField = (day: string, field: keyof OpeningHour, value: string | boolean) => {
        setEditingHours(editingHours.map(h =>
            h.day === day ? { ...h, [field]: value } : h
        ))
    }

    const applyFirstDayToAll = () => {
        if (editingHours.length === 0) return
        const firstDay = editingHours[0]
        setEditingHours(editingHours.map((h, idx) =>
            idx === 0 ? h : { ...h, isOpen: firstDay.isOpen, open: firstDay.open, close: firstDay.close }
        ))
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSave(editingHours)
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Nyitvatartás szerkesztése"
        >
            <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto px-1 pr-3 scrollbar-hide">
                <div className="flex justify-end">
                    <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={applyFirstDayToAll}
                        className="text-primary hover:text-primary h-auto p-0 flex items-center gap-1.5"
                    >
                        <Copy className="h-3.5 w-3.5" />
                        A hétfői beállítás másolása az összes napra
                    </Button>
                </div>

                <div className="space-y-4">
                    {editingHours.map((hour, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gray-50/50 border border-gray-100 transition-colors hover:border-primary/10">
                            <div className="flex items-center gap-4 min-w-[120px]">
                                <Switch
                                    id={`open-${idx}`}
                                    checked={hour.isOpen}
                                    onCheckedChange={(checked) => updateHourField(hour.day, "isOpen", checked)}
                                />
                                <Label htmlFor={`open-${idx}`} className="font-bold text-gray-700 w-20">
                                    {hour.day}
                                </Label>
                            </div>

                            {hour.isOpen ? (
                                <div className="flex items-center gap-3 flex-1 justify-end">
                                    <Select
                                        value={hour.open || "09:00"}
                                        onValueChange={(val) => updateHourField(hour.day, "open", val)}
                                    >
                                        <SelectTrigger className="w-[100px] h-9 bg-white border-gray-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[300px]">
                                            {TIME_OPTIONS.map(time => (
                                                <SelectItem key={time} value={time}>{time}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <span className="text-gray-400 font-light">-</span>

                                    <Select
                                        value={hour.close || "18:00"}
                                        onValueChange={(val) => updateHourField(hour.day, "close", val)}
                                    >
                                        <SelectTrigger className="w-[100px] h-9 bg-white border-gray-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[300px]">
                                            {TIME_OPTIONS.map(time => (
                                                <SelectItem key={time} value={time}>{time}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : (
                                <div className="flex-1 text-right">
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest bg-gray-100 px-3 py-1.5 rounded-lg">
                                        Zárva
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="flex gap-3 justify-end pt-4 sticky bottom-0 bg-white pb-2">
                    <Button variant="outline" type="button" onClick={onClose} className="rounded-xl">
                        Mégse
                    </Button>
                    <Button type="submit" className="rounded-xl bg-primary hover:bg-primary px-8">
                        Változtatások mentése
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
