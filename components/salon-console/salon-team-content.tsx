"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { ImagePlus, Plus, Trash2, User, Users, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSalonData } from "@/hooks/useSalonData"
import { updateSalon } from "@/lib/actions/salon"
import { useAuth } from "@/lib/auth-context"

interface TeamMemberForm {
  id: string
  name: string
  role: string
  description: string
  image: string | null | undefined
}

export function SalonTeamContent({ salonId }: { salonId: string }) {
  const { userData } = useAuth()
  const [saving, setSaving] = useState(false)
  const { salon, loading, setSalon } = useSalonData(salonId, userData?.id)

  const [isTeam, setIsTeam] = useState(false)
  const [ownerName, setOwnerName] = useState("")
  const [ownerImage, setOwnerImage] = useState<string | null>(null)
  const [aboutMe, setAboutMe] = useState("")
  const [teamMembers, setTeamMembers] = useState<TeamMemberForm[]>([])

  useEffect(() => {
    if (salon) {
      setIsTeam(salon.isTeam || false)
      setOwnerName(salon.ownerName || "")
      setOwnerImage(salon.ownerImage || null)
      setAboutMe(salon.aboutMe || "")
      setTeamMembers(salon.teamMembers?.map((member) => ({
        id: member.id,
        name: member.name,
        role: member.role || "",
        description: member.description || "",
        image: member.image,
      })) || [])
    }
  }, [salon])

  const handleOwnerImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append("file", file)
    const response = await fetch("/api/upload", { method: "POST", body: formData })
    if (response.ok) {
      const data = await response.json()
      setOwnerImage(data.url)
    }
  }

  const handleMemberImageUpload = async (memberId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append("file", file)
    const response = await fetch("/api/upload", { method: "POST", body: formData })
    if (response.ok) {
      const data = await response.json()
      setTeamMembers((members) => members.map((member) =>
        member.id === memberId ? { ...member, image: data.url } : member
      ))
    }
  }

  const addTeamMember = () => {
    setTeamMembers([...teamMembers, {
      id: `new-${Date.now()}`,
      name: "",
      role: "",
      description: "",
      image: null,
    }])
  }

  const updateTeamMember = (id: string, field: keyof TeamMemberForm, value: string) => {
    setTeamMembers((members) => members.map((member) =>
      member.id === id ? { ...member, [field]: value } : member
    ))
  }

  const removeTeamMember = (id: string) => {
    setTeamMembers((members) => members.filter((member) => member.id !== id))
  }

  const handleSave = async () => {
    if (!salon) return
    setSaving(true)

    try {
      await updateSalon(salonId, {
        isTeam,
        ownerName,
        ownerImage,
        aboutMe,
        teamMembers: teamMembers.map((member) => ({
          name: member.name,
          role: member.role,
          description: member.description,
          image: member.image,
        })),
      })

      toast.success("Adatok sikeresen elmentve!")
      setSalon((previousSalon) => previousSalon ? {
        ...previousSalon,
        isTeam,
        ownerName,
        ownerImage: ownerImage || undefined,
        aboutMe,
        teamMembers: teamMembers.map((member, index) => ({
          id: member.id.startsWith("new-") ? `saved-${index}` : member.id,
          name: member.name,
          role: member.role || undefined,
          description: member.description || undefined,
          image: member.image || undefined,
          order: index,
        })),
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
      <div className="container mx-auto p-6">
        <div className="text-muted-foreground">Betöltés...</div>
      </div>
    )
  }

  if (!salon) {
    return (
      <div className="container mx-auto p-6 text-center">
        <p className="text-muted-foreground">Szalon nem található vagy nincs jogosultságod.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl p-6 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Csapat / Rólam</h1>
        <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary">
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
          <div className="flex items-center gap-4 rounded-xl bg-gray-50 p-4">
            <Label className="flex cursor-pointer items-center gap-2">
              <Checkbox checked={isTeam} onCheckedChange={(checked) => setIsTeam(!!checked)} />
              Csapattal dolgozom
            </Label>
          </div>

          {!isTeam ? (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-full border-2 border-gray-200">
                  {ownerImage ? (
                    <>
                      <Image src={ownerImage} fill sizes="96px" className="h-full w-full object-cover" alt="Profilkép" />
                      <button
                        type="button"
                        onClick={() => setOwnerImage(null)}
                        className="absolute right-0 top-0 m-1 rounded-full bg-red-500 p-1 text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center bg-gray-100 transition-colors hover:bg-gray-200">
                      <ImagePlus className="h-6 w-6 text-gray-400" />
                      <span className="mt-1 text-xs text-gray-400">Kép</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleOwnerImageUpload} />
                    </label>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <Label className="text-xs text-gray-500">Neved</Label>
                  <Input placeholder="Teljes neved" value={ownerName} onChange={(event) => setOwnerName(event.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-gray-500">Rólam</Label>
                <textarea
                  className="min-h-[150px] w-full rounded-lg border border-gray-200 p-3"
                  placeholder="Mutatkozz be néhány mondatban..."
                  value={aboutMe}
                  onChange={(event) => setAboutMe(event.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {teamMembers.map((member) => (
                <div key={member.id} className="space-y-3 rounded-xl bg-gray-50 p-4">
                  <div className="flex gap-4">
                    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-full border-2 border-gray-200">
                      {member.image ? (
                        <>
                          <Image src={member.image} fill sizes="80px" className="h-full w-full object-cover" alt={member.name} />
                          <button
                            type="button"
                            onClick={() => updateTeamMember(member.id, "image", "")}
                            className="absolute right-0 top-0 rounded-full bg-red-500 p-1 text-white"
                          >
                            <X className="h-2 w-2" />
                          </button>
                        </>
                      ) : (
                        <label className="flex h-full w-full cursor-pointer items-center justify-center bg-gray-100">
                          <ImagePlus className="h-6 w-6 text-gray-400" />
                          <input type="file" className="hidden" accept="image/*" onChange={(event) => handleMemberImageUpload(member.id, event)} />
                        </label>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <Input placeholder="Név" value={member.name} onChange={(event) => updateTeamMember(member.id, "name", event.target.value)} />
                      <Input placeholder="Beosztás / Specializáció" value={member.role} onChange={(event) => updateTeamMember(member.id, "role", event.target.value)} />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeTeamMember(member.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                  <textarea
                    className="min-h-[80px] w-full rounded-lg border border-gray-200 p-3 text-sm"
                    placeholder="Rövid bemutatkozás (opcionális)..."
                    value={member.description}
                    onChange={(event) => updateTeamMember(member.id, "description", event.target.value)}
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
  )
}
