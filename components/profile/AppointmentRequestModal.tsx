"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarDays, LogIn, UserPlus } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { AuthModal } from "@/components/auth/auth-modal"
import { createBooking } from "@/lib/actions/salon"
import { toast } from "sonner"

interface AppointmentRequestModalProps {
    isOpen: boolean
    onClose: () => void
    salonId: string
    salonName: string
    services: Array<{ id: string; name: string }>
}

export function AppointmentRequestModal({
    isOpen,
    onClose,
    salonId,
    salonName,
    services,
}: AppointmentRequestModalProps) {
    const { userData } = useAuth()
    const [serviceId, setServiceId] = useState("none")
    const [date, setDate] = useState("")
    const [message, setMessage] = useState("")
    const [loading, setLoading] = useState(false)
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

    const today = useMemo(() => new Date().toISOString().split("T")[0], [])
    const hasAvailableServices = services.length > 0

    useEffect(() => {
        if (isOpen && !userData) {
            setIsAuthModalOpen(true)
        }
    }, [isOpen, userData])

    const resetForm = () => {
        setServiceId("none")
        setDate("")
        setMessage("")
    }

    const handleClose = () => {
        if (!loading) {
            onClose()
        }
    }

    const handleSubmit = async () => {
        if (!userData?.id || !date || serviceId === "none") return

        setLoading(true)
        try {
            await createBooking({
                userId: userData.id,
                salonId,
                serviceId,
                date,
                time: "Idopont egyeztetes szukseges",
                message,
            })

            toast.success("Az idopontkeres sikeresen elkuldve.")
            resetForm()
            onClose()
        } catch (error: any) {
            console.error("Error creating appointment request:", error)
            toast.error(error?.message || "Nem sikerult elkuldeni az idopontkerest.")
        } finally {
            setLoading(false)
        }
    }

    if (!userData) {
        return (
            <>
                <Dialog open={isOpen} onOpenChange={handleClose}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <CalendarDays className="h-5 w-5 text-primary" />
                                Idopont kerese
                            </DialogTitle>
                            <DialogDescription>
                                Idopontkeres kuldesehez kerlek jelentkezz be vagy regisztralj.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-6 text-center space-y-4">
                            <p className="text-sm text-muted-foreground">
                                A(z) <span className="font-semibold text-foreground">{salonName}</span> szamara csak bejelentkezett felhasznalok kuldhetnek idopontkerest.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <Button onClick={() => setIsAuthModalOpen(true)}>
                                    <LogIn className="h-4 w-4 mr-2" />
                                    Bejelentkezes
                                </Button>
                                <Button variant="outline" onClick={() => setIsAuthModalOpen(true)}>
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Regisztracio
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
                <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
            </>
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Idopont kerese</DialogTitle>
                    <DialogDescription>
                        Kuldj egyszeru idopontkerest a(z) {salonName} szamara.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>Szolgaltatas</Label>
                        <Select value={serviceId} onValueChange={setServiceId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Valassz szolgaltatast" />
                            </SelectTrigger>
                            <SelectContent>
                                {services.map((service) => (
                                    <SelectItem key={service.id} value={service.id}>
                                        {service.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {!hasAvailableServices && (
                            <p className="text-sm text-muted-foreground">
                                Ehhez a szalonhoz jelenleg nincs olyan szolgaltatas, amihez idopontkerest lehet kuldeni.
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Datum</Label>
                        <Input
                            type="date"
                            min={today}
                            value={date}
                            onChange={(event) => setDate(event.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Uzenet</Label>
                        <Textarea
                            value={message}
                            onChange={(event) => setMessage(event.target.value)}
                            placeholder="Irj rovid megjegyzest vagy idopontkerest..."
                            className="min-h-[120px]"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={loading}>
                        Megse
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || !date || !hasAvailableServices || serviceId === "none"}
                    >
                        {loading ? "Kuldes..." : "Idopontkeres elkuldese"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
