"use client"

import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { updateProfile, inactivateAccount } from "@/lib/actions/user"
import { AlertTriangle, Trash2, Info, CheckCircle2 } from "lucide-react"
import { signOut, useSession } from "next-auth/react"

type EditableUser = {
    id: string
    name?: string | null
    email?: string | null
}

interface ProfileEditModalProps {
    isOpen: boolean
    onClose: () => void
    userData: EditableUser
}

export function ProfileEditModal({ isOpen, onClose, userData }: ProfileEditModalProps) {
    const { update } = useSession()
    const [name, setName] = useState(userData?.name || "")
    const [email, setEmail] = useState(userData?.email || "")
    const [isSaving, setIsSaving] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [inactivating, setInactivating] = useState(false)
    const [success, setSuccess] = useState(false)

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        const res = await updateProfile(userData.id, { name })
        setIsSaving(false)
        if (res.success) {
            await update({ name })
            setSuccess(true)
            setTimeout(() => {
                setSuccess(false)
                onClose()
            }, 2000)
        }
    }

    const handleInactivate = async () => {
        setInactivating(true)
        const res = await inactivateAccount(userData.id)
        if (res.success) {
            // Sign out after inactivation
            signOut({ callbackUrl: "/" })
        } else {
            setInactivating(false)
            alert("Hiba történt az inaktiválás során.")
        }
    }

    if (showDeleteConfirm) {
        return (
            <Modal isOpen={isOpen} onClose={() => setShowDeleteConfirm(false)} title="Fiók inaktiválása">
                <div className="space-y-6 py-2">
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                        <div className="space-y-1">
                            <p className="text-sm font-bold text-amber-900">Biztosan inaktiválni szeretnéd a fiókodat?</p>
                            <p className="text-xs text-amber-700 leading-relaxed">
                                Az inaktiválás után a profilod, a szalonjaid és a bejegyzéseid nem lesznek láthatóak mások számára.
                            </p>
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex gap-3">
                        <Info className="h-5 w-5 text-blue-600 shrink-0" />
                        <p className="text-xs text-blue-700 leading-relaxed">
                            <span className="font-bold">30 napod van a visszaállításra!</span> Ezt követően az adataid véglegesen inaktívak maradhatnak. A visszaállításhoz csak jelentkezz be újra az email címeddel bármikor ezen az időszakon belül.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 pt-2">
                        <Button
                            variant="destructive"
                            className="rounded-xl h-12 font-bold bg-red-600 hover:bg-red-700"
                            onClick={handleInactivate}
                            disabled={inactivating}
                        >
                            {inactivating ? "Inaktiválás..." : "Igen, inaktiválom a fiókomat"}
                        </Button>
                        <Button
                            variant="ghost"
                            className="rounded-xl h-12 text-gray-500"
                            onClick={() => setShowDeleteConfirm(false)}
                            disabled={inactivating}
                        >
                            Mégse
                        </Button>
                    </div>
                </div>
            </Modal>
        )
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Profil szerkesztése">
            <form onSubmit={handleSave} className="space-y-6 py-2">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Név</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Teljes neved"
                            className="rounded-xl h-12 bg-gray-50 border-gray-100 focus:bg-white transition-colors"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Email cím</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            disabled
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email címed"
                            className="rounded-xl h-12 bg-gray-50 border-gray-100 focus:bg-white transition-colors cursor-not-allowed opacity-70"
                        />
                    </div>
                </div>

                <div className="pt-4 space-y-4">
                    <Button
                        type="submit"
                        className="w-full rounded-xl h-12 bg-primary hover:bg-primary font-bold shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                        disabled={isSaving || success}
                    >
                        {success ? (
                            <>
                                <CheckCircle2 className="h-5 w-5" />
                                Mentve!
                            </>
                        ) : isSaving ? "Mentés..." : "Módosítások mentése"}
                    </Button>

                    <div className="pt-6 border-t border-gray-50">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Veszélyes zóna</h4>
                        <Button
                            type="button"
                            variant="ghost"
                            className="w-full rounded-xl h-12 text-red-500 hover:text-red-600 hover:bg-red-50 justify-start px-4 transition-colors group"
                            onClick={() => setShowDeleteConfirm(true)}
                        >
                            <Trash2 className="h-4 w-4 mr-3 transition-transform group-hover:scale-110" />
                            <span className="font-bold">Fiók inaktiválása</span>
                        </Button>
                    </div>
                </div>
            </form>
        </Modal>
    )
}
