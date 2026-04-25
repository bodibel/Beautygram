"use client"

import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useEffect, useState } from "react"
import { changePassword, inactivateAccount, updateProfile } from "@/lib/actions/user"
import { AlertTriangle, Trash2, Info, CheckCircle2, KeyRound } from "lucide-react"
import { signOut, useSession } from "next-auth/react"

interface ProfileEditModalProps {
    isOpen: boolean
    onClose: () => void
    userData: any
}

export function ProfileEditModal({ isOpen, onClose, userData }: ProfileEditModalProps) {
    const { update } = useSession()
    const [name, setName] = useState(userData?.name || "")
    const [email, setEmail] = useState(userData?.email || "")
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [isSaving, setIsSaving] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [inactivating, setInactivating] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        if (!isOpen) return
        setName(userData?.name || "")
        setEmail(userData?.email || "")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
        setError("")
        setSuccess(false)
        setShowDeleteConfirm(false)
    }, [isOpen, userData?.email, userData?.name])

    const isPasswordChangeRequested = Boolean(currentPassword || newPassword || confirmPassword)

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setIsSaving(true)

        try {
            const profileResult = await updateProfile(userData.id, { name: name.trim() })
            if (!profileResult.success) {
                setError(profileResult.error || "Nem sikerült a profil frissítése.")
                return
            }

            if (isPasswordChangeRequested) {
                if (!currentPassword || !newPassword || !confirmPassword) {
                    setError("A jelszó módosításához tölts ki minden jelszómezőt.")
                    return
                }

                if (newPassword !== confirmPassword) {
                    setError("Az új jelszó és a megerősítés nem egyezik.")
                    return
                }

                const passwordResult = await changePassword(userData.id, {
                    currentPassword,
                    newPassword,
                })

                if (!passwordResult.success) {
                    setError(passwordResult.error || "Nem sikerült a jelszó frissítése.")
                    return
                }
            }

            await update({ name: name.trim() })
            setSuccess(true)
            setTimeout(() => {
                setSuccess(false)
                onClose()
            }, 1500)
        } finally {
            setIsSaving(false)
        }
    }

    const handleInactivate = async () => {
        setInactivating(true)
        const res = await inactivateAccount(userData.id)
        if (res.success) {
            signOut({ callbackUrl: "/" })
        } else {
            setInactivating(false)
            setError("Hiba történt az inaktiválás során.")
        }
    }

    if (showDeleteConfirm) {
        return (
            <Modal isOpen={isOpen} onClose={() => setShowDeleteConfirm(false)} title="Fiók inaktiválása">
                <div className="space-y-6 py-2">
                    <div className="flex gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                        <div className="space-y-1">
                            <p className="text-sm font-bold text-amber-900">Biztosan inaktiválni szeretnéd a fiókodat?</p>
                            <p className="text-xs leading-relaxed text-amber-700">
                                Az inaktiválás után a profilod, a szalonjaid és a bejegyzéseid nem lesznek láthatóak mások számára.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                        <Info className="h-5 w-5 shrink-0 text-blue-600" />
                        <p className="text-xs leading-relaxed text-blue-700">
                            <span className="font-bold">30 napod van a visszaállításra.</span> Ezután az adataid tartósan inaktívak maradhatnak.
                            A visszaállításhoz csak jelentkezz be újra az email címeddel ezen az időszakon belül.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 pt-2">
                        <Button
                            variant="destructive"
                            className="h-12 rounded-xl bg-red-600 font-bold hover:bg-red-700"
                            onClick={handleInactivate}
                            disabled={inactivating}
                        >
                            {inactivating ? "Inaktiválás..." : "Igen, inaktiválom a fiókomat"}
                        </Button>
                        <Button
                            variant="ghost"
                            className="h-12 rounded-xl text-gray-500"
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
                        <Label htmlFor="name" className="ml-1 text-xs font-bold uppercase tracking-widest text-gray-400">
                            Név
                        </Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Teljes neved"
                            className="h-12 rounded-xl border-gray-100 bg-gray-50 transition-colors focus:bg-white"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email" className="ml-1 text-xs font-bold uppercase tracking-widest text-gray-400">
                            Email cím
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            disabled
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email címed"
                            className="h-12 cursor-not-allowed rounded-xl border-gray-100 bg-gray-50 opacity-70 transition-colors focus:bg-white"
                        />
                    </div>
                </div>

                <div className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <KeyRound className="h-4 w-4" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-gray-900">Jelszó módosítása</h4>
                            <p className="text-xs text-gray-500">Ha szeretnéd, itt tudod biztonságosan megváltoztatni a jelszavadat.</p>
                        </div>
                    </div>

                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="currentPassword" className="ml-1 text-xs font-bold uppercase tracking-widest text-gray-400">
                                Jelenlegi jelszó
                            </Label>
                            <Input
                                id="currentPassword"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Írd be a jelenlegi jelszavad"
                                className="h-12 rounded-xl border-gray-100 bg-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="newPassword" className="ml-1 text-xs font-bold uppercase tracking-widest text-gray-400">
                                Új jelszó
                            </Label>
                            <Input
                                id="newPassword"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Legalább 8 karakter"
                                className="h-12 rounded-xl border-gray-100 bg-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="ml-1 text-xs font-bold uppercase tracking-widest text-gray-400">
                                Új jelszó megerősítése
                            </Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Írd be újra az új jelszót"
                                className="h-12 rounded-xl border-gray-100 bg-white"
                            />
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        {error}
                    </div>
                )}

                <div className="space-y-4 pt-2">
                    <Button
                        type="submit"
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold shadow-lg shadow-primary/20 transition-all hover:bg-primary"
                        disabled={isSaving || success}
                    >
                        {success ? (
                            <>
                                <CheckCircle2 className="h-5 w-5" />
                                Mentve!
                            </>
                        ) : isSaving ? "Mentés..." : "Módosítások mentése"}
                    </Button>

                    <div className="border-t border-gray-100 pt-6">
                        <h4 className="mb-3 ml-1 text-xs font-bold uppercase tracking-widest text-gray-400">Veszélyes zóna</h4>
                        <Button
                            type="button"
                            variant="ghost"
                            className="h-12 w-full justify-start rounded-xl px-4 text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
                            onClick={() => setShowDeleteConfirm(true)}
                        >
                            <Trash2 className="mr-3 h-4 w-4" />
                            <span className="font-bold">Fiók inaktiválása</span>
                        </Button>
                    </div>
                </div>
            </form>
        </Modal>
    )
}
