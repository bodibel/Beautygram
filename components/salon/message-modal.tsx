"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { sendMessage } from "@/lib/actions/salon"
import { useAuth } from "@/lib/auth-context"
import { AuthModal } from "@/components/auth/auth-modal"
import { MessageCircle, LogIn, UserPlus } from "lucide-react"

const MESSAGE_TOPICS = [
    "Általános érdeklődés",
    "Időpont foglalás",
    "Szolgáltatás részletei",
    "Árakkal kapcsolatos kérdés",
    "Panasz / Visszajelzés"
]

interface MessageModalProps {
    isOpen: boolean
    onClose: () => void
    receiverId: string
    receiverName: string
    salonId?: string
}

export function MessageModal({ isOpen, onClose, receiverId, receiverName, salonId }: MessageModalProps) {
    const { userData } = useAuth()
    const [subject, setSubject] = useState(MESSAGE_TOPICS[0])
    const [content, setContent] = useState("")
    const [loading, setLoading] = useState(false)
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

    const handleSend = async () => {
        if (!userData?.id || !content) return

        setLoading(true)
        try {
            await sendMessage({
                senderId: userData.id,
                receiverId,
                subject,
                content,
                salonId
            })
            alert("Üzenet sikeresen elküldve!")
            onClose()
            setContent("")
        } catch (error) {
            console.error("Error sending message:", error)
            alert("Hiba történt az üzenet küldésekor.")
        } finally {
            setLoading(false)
        }
    }

    // Show auth prompt for non-logged users
    if (!userData) {
        return (
            <>
                <Dialog open={isOpen} onOpenChange={onClose}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <MessageCircle className="h-5 w-5 text-primary" />
                                Üzenet küldése
                            </DialogTitle>
                        </DialogHeader>
                        <div className="py-8 text-center space-y-4">
                            <div className="bg-primary/10 rounded-full h-16 w-16 flex items-center justify-center mx-auto">
                                <MessageCircle className="h-8 w-8 text-primary" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="font-bold text-lg text-gray-900">Bejelentkezés szükséges</h3>
                                <p className="text-gray-500 text-sm">
                                    Üzenet küldéséhez <span className="font-semibold">{receiverName}</span> részére kérlek jelentkezz be vagy regisztrálj.
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                                <Button
                                    onClick={() => setIsAuthModalOpen(true)}
                                    className="bg-primary hover:bg-primary text-white"
                                >
                                    <LogIn className="h-4 w-4 mr-2" />
                                    Bejelentkezés
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setIsAuthModalOpen(true)}
                                >
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Regisztráció
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
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Üzenet küldése: {receiverName}</DialogTitle>
                    <DialogDescription className="text-muted-foreground text-sm">
                        Kérlek, töltsd ki az alábbi űrlapot az üzenet elküldéséhez.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Téma</Label>
                        <Select value={subject} onValueChange={setSubject}>
                            <SelectTrigger>
                                <SelectValue placeholder="Válassz témát" />
                            </SelectTrigger>
                            <SelectContent>
                                {MESSAGE_TOPICS.map(topic => (
                                    <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Üzenet</Label>
                        <Textarea
                            placeholder="Írd ide az üzeneted..."
                            data-testid="public-message-content"
                            className="min-h-[150px]"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Mégse</Button>
                    <Button onClick={handleSend} data-testid="public-message-submit" disabled={loading || !content}>
                        {loading ? "Küldés..." : "Küldés"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
