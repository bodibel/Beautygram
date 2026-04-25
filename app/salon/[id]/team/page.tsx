"use client"

import { useState, use, useEffect } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useSalonData } from "@/hooks/useSalonData"
import { updateSalon } from "@/lib/actions/salon"
import { ImagePlus, X, Plus, Trash2, Users, User } from "lucide-react"
import { toast } from "sonner"

interface TeamMember {
    id: string
    name: string
    role: string
    description: string
    image: string | null | undefined
}

export default function SalonTeamPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { userData } = useAuth()
    const router = useRouter()
    const [saving, setSaving] = useState(false)

    const { salon, loading, setSalon } = useSalonData(id, userData?.id)

    // Owner state
    const [isTeam, setIsTeam] = useState(false)
    const [ownerName, setOwnerName] = useState("")
    const [ownerImage, setOwnerImage] = useState<string | null>(null)
    const [aboutMe, setAboutMe] = useState("")
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])

    // Initialize from salon data
    useEffect(() => {
        if (salon) {
            setIsTeam(salon.isTeam || false)
            setOwnerName(salon.ownerName || "")
            setOwnerImage(salon.ownerImage || null)
            setAboutMe(salon.aboutMe || "")
            setTeamMembers(salon.teamMembers?.map((m: any) => ({
                id: m.id,
                name: m.name,
                role: m.role || "",
                description: m.description || "",
                image: m.image
            })) || [])
        }
    }, [salon])

    const handleOwnerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const formData = new FormData()
        formData.append("file", file)
        const res = await fetch("/api/upload", { method: "POST", body: formData })
        if (res.ok) {
            const data = await res.json()
            setOwnerImage(data.url)
        }
    }

    const handleMemberImageUpload = async (memberId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const formData = new FormData()
        formData.append("file", file)
        const res = await fetch("/api/upload", { method: "POST", body: formData })
        if (res.ok) {
            const data = await res.json()
            setTeamMembers(prev => prev.map(m =>
                m.id === memberId ? { ...m, image: data.url } : m
            ))
        }
    }

    const addTeamMember = () => {
        setTeamMembers([...teamMembers, {
            id: `new-${Date.now()}`,
            name: "",
            role: "",
            description: "",
            image: null
        }])
    }

    const updateTeamMember = (id: string, field: string, value: string) => {
        setTeamMembers(prev => prev.map(m =>
            m.id === id ? { ...m, [field]: value } : m
        ))
    }

    const removeTeamMember = (id: string) => {
        setTeamMembers(prev => prev.filter(m => m.id !== id))
    }

    const handleSave = async () => {
        if (!salon) return
        setSaving(true)

        try {
            await updateSalon(id, {
                isTeam,
                ownerName,
                ownerImage,
                aboutMe,
                teamMembers: teamMembers.map(m => ({
                    name: m.name,
                    role: m.role,
                    description: m.description,
                    image: m.image
                }))
            })

            toast.success("Adatok sikeresen elmentve!")
            setSalon(prev => prev ? {
                ...prev,
                isTeam,
                ownerName,
                ownerImage: ownerImage || undefined,
                aboutMe,
                teamMembers: teamMembers.map((m, i) => ({
                    id: m.id.startsWith('new-') ? `saved-${i}` : m.id,
                    name: m.name,
                    role: m.role || undefined,
                    description: m.description || undefined,
                    image: m.image || undefined,
                    order: i
                }))
            } : null)
        } catch (error) {
            console.error("Save failed:", error)
            toast.error("Hiba történt a mentés során.")
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <MainLayout showRightSidebar={false} fullWidth>
                <div className="w-full max-w-4xl p-6 lg:mr-auto">
                    <div className="text-muted-foreground">Betöltés...</div>
                </div>
            </MainLayout>
        )
    }

    if (!salon) {
        router.push("/dashboard")
        return null
    }

    return (
        <MainLayout showRightSidebar={false} fullWidth>
            <div className="w-full max-w-4xl p-6 md:p-8 lg:mr-auto">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold">Csapat / Rólam</h1>
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-primary hover:bg-primary"
                    >
                        {saving ? "Mentés..." : "Mentés"}
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {isTeam ? <Users className="h-5 w-5" /> : <User className="h-5 w-5" />}
                            {isTeam ? "Csapattagok" : "Bemutatkozás"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Toggle */}
                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                            <Label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                    checked={isTeam}
                                    onCheckedChange={(c) => setIsTeam(!!c)}
                                />
                                Csapattal dolgozom
                            </Label>
                        </div>

                        {!isTeam ? (
                            /* Solo Owner Section */
                            <div className="space-y-6">
                                <div className="flex gap-4 items-start">
                                    <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0">
                                        {ownerImage ? (
                                            <>
                                                <img src={ownerImage} className="w-full h-full object-cover" alt="Profilkép" />
                                                <button
                                                    type="button"
                                                    onClick={() => setOwnerImage(null)}
                                                    className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full m-1"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </>
                                        ) : (
                                            <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer bg-gray-100 hover:bg-gray-200 transition-colors">
                                                <ImagePlus className="h-6 w-6 text-gray-400" />
                                                <span className="text-xs text-gray-400 mt-1">Kép</span>
                                                <input type="file" className="hidden" accept="image/*" onChange={handleOwnerImageUpload} />
                                            </label>
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <Label className="text-xs text-gray-500">Neved</Label>
                                        <Input
                                            placeholder="Teljes neved"
                                            value={ownerName}
                                            onChange={(e) => setOwnerName(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-gray-500">Rólam</Label>
                                    <textarea
                                        className="w-full rounded-lg border border-gray-200 p-3 min-h-[150px]"
                                        placeholder="Mutatkozz be néhány mondatban..."
                                        value={aboutMe}
                                        onChange={(e) => setAboutMe(e.target.value)}
                                    />
                                </div>
                            </div>
                        ) : (
                            /* Team Section */
                            <div className="space-y-4">
                                {teamMembers.map((member) => (
                                    <div key={member.id} className="p-4 bg-gray-50 rounded-xl space-y-3">
                                        <div className="flex gap-4">
                                            <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0">
                                                {member.image ? (
                                                    <>
                                                        <img src={member.image} className="w-full h-full object-cover" alt={member.name} />
                                                        <button
                                                            type="button"
                                                            onClick={() => updateTeamMember(member.id, 'image', '')}
                                                            className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full"
                                                        >
                                                            <X className="h-2 w-2" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <label className="w-full h-full flex items-center justify-center cursor-pointer bg-gray-100">
                                                        <ImagePlus className="h-6 w-6 text-gray-400" />
                                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleMemberImageUpload(member.id, e)} />
                                                    </label>
                                                )}
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <Input
                                                    placeholder="Név"
                                                    value={member.name}
                                                    onChange={(e) => updateTeamMember(member.id, 'name', e.target.value)}
                                                />
                                                <Input
                                                    placeholder="Beosztás / Specializáció"
                                                    value={member.role}
                                                    onChange={(e) => updateTeamMember(member.id, 'role', e.target.value)}
                                                />
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => removeTeamMember(member.id)}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                        <textarea
                                            className="w-full rounded-lg border border-gray-200 p-3 min-h-[80px] text-sm"
                                            placeholder="Rövid bemutatkozás (opcionális)..."
                                            value={member.description}
                                            onChange={(e) => updateTeamMember(member.id, 'description', e.target.value)}
                                        />
                                    </div>
                                ))}
                                <Button type="button" variant="outline" onClick={addTeamMember} className="w-full border-dashed">
                                    <Plus className="mr-2 h-4 w-4" /> Csapattag hozzáadása
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    )
}
