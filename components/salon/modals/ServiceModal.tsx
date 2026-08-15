"use client"

import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useState, useEffect } from "react"
import { Service, CURRENCIES } from "@/lib/salon-types"

interface ServiceModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (service: Omit<Service, 'id'>) => void
    service?: Service
    currency: string
}

export function ServiceModal({ isOpen, onClose, onSave, service, currency }: ServiceModalProps) {
    const [name, setName] = useState("")
    const [price, setPrice] = useState("")
    const [duration, setDuration] = useState("")
    const [description, setDescription] = useState("")

    useEffect(() => {
        const timer = window.setTimeout(() => {
            if (service) {
                setName(service.name)
                setPrice(service.price)
                setDuration(service.duration)
                setDescription(service.description || "")
            } else {
                setName("")
                setPrice("")
                setDuration("")
                setDescription("")
            }
        }, 0)
        return () => window.clearTimeout(timer)
    }, [service, isOpen])

    const getCurrencySymbol = () => {
        return CURRENCIES.find(c => c.code === currency)?.symbol || "Ft"
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSave({ name, price, duration, description })
        setName("")
        setPrice("")
        setDuration("")
        setDescription("")
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={service ? "Szolgáltatás szerkesztése" : "Új szolgáltatás"}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Szolgáltatás neve *</label>
                    <Input
                        placeholder="pl. Női hajvágás"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Ár ({getCurrencySymbol()}) *</label>
                    <Input
                        placeholder="pl. 8500"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Időtartam (perc) *</label>
                    <Input
                        placeholder="pl. 60"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Leírás (opcionális)</label>
                    <Textarea
                        placeholder="Rövid leírás a szolgáltatásról..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="min-h-[80px]"
                    />
                </div>

                <div className="flex gap-3 justify-end pt-4">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Mégse
                    </Button>
                    <Button type="submit">
                        {service ? "Mentés" : "Hozzáadás"}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
