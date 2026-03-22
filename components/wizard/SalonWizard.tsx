"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { createSalon, saveOpeningHours, createService } from "@/lib/actions/salon"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { generateSlug } from "@/lib/slug"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CURRENCIES } from "@/lib/salon-types"
import { getCategories } from "@/lib/actions/category"
import { Checkbox } from "@/components/ui/checkbox"
import { ImagePlus, X, Plus, Trash2, ChevronLeft, ChevronRight, Sparkles, Scissors, Sparkles as SparklesIcon, Hand, User, Palette, Waves, Smile, Phone, Mail, MessageSquare, Calendar, Bell } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { EnhancedAddressPicker } from "@/components/ui/enhanced-address-picker"
import { useLoadScript } from "@react-google-maps/api"
import { toast } from "sonner"
import { WizardProgress } from "./WizardProgress"
import { WizardStep } from "./WizardStep"
import { SafetyWarningModal } from "@/components/ui/SafetyWarningModal"
import { uploadFile } from "@/lib/upload"

const MAP_LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"]

const WIZARD_STEPS = [
    { title: "Kezdés", key: "welcome" },
    { title: "Alapadatok", key: "basics" },
    { title: "Kategóriák", key: "categories" },
    { title: "Cím", key: "address" },
    { title: "Nyitvatartás", key: "hours" },
    { title: "Szolgáltatások", key: "services" },
    { title: "Kapcsolat", key: "contact" },
    { title: "Galéria", key: "gallery" },
    { title: "Csapat", key: "team" },
    { title: "Összegzés", key: "summary" },
]

const DEFAULT_HOURS = [
    { day: "Hétfő", isOpen: true, open: "09:00", close: "18:00" },
    { day: "Kedd", isOpen: true, open: "09:00", close: "18:00" },
    { day: "Szerda", isOpen: true, open: "09:00", close: "18:00" },
    { day: "Csütörtök", isOpen: true, open: "09:00", close: "18:00" },
    { day: "Péntek", isOpen: true, open: "09:00", close: "18:00" },
    { day: "Szombat", isOpen: false, open: "10:00", close: "14:00" },
    { day: "Vasárnap", isOpen: false, open: "", close: "" },
]

interface SalonWizardProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

interface TeamMember {
    id: string
    name: string
    role: string
    description: string
    image: File | null
    imagePreview: string | null
}

interface Service {
    id: string
    name: string
    price: number
    duration: number
    description: string
}

interface GalleryImage {
    id: string
    file: File
    preview: string
    description: string
}

export function SalonWizard({ isOpen, onClose, onSuccess }: SalonWizardProps) {
    const { userData } = useAuth()
    const [currentStep, setCurrentStep] = useState(0)
    const [loading, setLoading] = useState(false)

    // Step 1: Basic Info
    const [name, setName] = useState("")
    const [profileImage, setProfileImage] = useState<File | null>(null)
    const [coverImage, setCoverImage] = useState<File | null>(null)
    const [profilePreview, setProfilePreview] = useState<string | null>(null)
    const [coverPreview, setCoverPreview] = useState<string | null>(null)

    // Step 2: Categories
    const [selectedCategories, setSelectedCategories] = useState<string[]>([])
    const [currency, setCurrency] = useState("HUF")

    // Step 3: Address
    const [addressData, setAddressData] = useState({
        country: "Magyarország",
        city: "",
        district: "",
        street: "",
        houseNumber: "",
        floor: "",
        door: "",
        zipCode: "",
        lat: 47.497913,
        lng: 19.040236,
        fullAddress: ""
    })

    // Step 4: Opening Hours
    const [openingHours, setOpeningHours] = useState(DEFAULT_HOURS)

    // Step 5: Services
    const [services, setServices] = useState<Service[]>([])

    // Step 6: Gallery
    const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([])

    // Step 7: Team/About
    const [isTeam, setIsTeam] = useState(false)
    const [aboutMe, setAboutMe] = useState("")
    const [ownerName, setOwnerName] = useState("")
    const [ownerImage, setOwnerImage] = useState<File | null>(null)
    const [ownerImagePreview, setOwnerImagePreview] = useState<string | null>(null)
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
    const [allCategories, setAllCategories] = useState<any[]>([])

    // Contact preferences
    const [phone, setPhone] = useState("")
    const [email, setEmail] = useState("")
    const [allowMessages, setAllowMessages] = useState(true)
    const [allowBookings, setAllowBookings] = useState(true)
    const [emailNotifications, setEmailNotifications] = useState(true)

    const [safetyError, setSafetyError] = useState<{ message: string; preview: string | null } | null>(null)

    useEffect(() => {
        const loadCategories = async () => {
            const fetched = await getCategories()
            setAllCategories(fetched)
        }
        loadCategories()
    }, [])

    const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    const { isLoaded } = useLoadScript({
        googleMapsApiKey: googleMapsKey || "",
        libraries: MAP_LIBRARIES,
    })

    // Handler for address data from EnhancedAddressPicker
    const handleAddressChange = (data: {
        country: string
        city: string
        district?: string
        street: string
        houseNumber: string
        floor?: string
        door?: string
        zipCode?: string
        lat: number
        lng: number
        fullAddress: string
    }) => {
        setAddressData({
            country: data.country,
            city: data.city,
            district: data.district || "",
            street: data.street,
            houseNumber: data.houseNumber,
            floor: data.floor || "",
            door: data.door || "",
            zipCode: data.zipCode || "",
            lat: data.lat,
            lng: data.lng,
            fullAddress: data.fullAddress
        })
    }

    // Validation for each step
    const canProceed = () => {
        switch (currentStep) {
            case 0: return true // Welcome
            case 1: return name.trim().length > 0 // Basic Info
            case 2: return selectedCategories.length > 0 // Categories
            case 3: return addressData.city && addressData.street && addressData.houseNumber // Address
            case 4: return true // Hours (optional)
            case 5: return true // Services (optional for now)
            case 6: return true // Contact (optional but recommended)
            case 7: return true // Gallery (optional)
            case 8: return true // Team (optional)
            case 9: return true // Summary
            default: return false
        }
    }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cover') => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                if (type === 'profile') {
                    setProfileImage(file)
                    setProfilePreview(reader.result as string)
                } else {
                    setCoverImage(file)
                    setCoverPreview(reader.result as string)
                }
            }
            reader.readAsDataURL(file)
        }
    }

    const toggleCategory = (category: string) => {
        setSelectedCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        )
    }

    const updateHour = (index: number, field: string, value: any) => {
        setOpeningHours(prev => prev.map((h, i) =>
            i === index ? { ...h, [field]: value } : h
        ))
    }

    const addService = () => {
        setServices([...services, {
            id: Date.now().toString(),
            name: "",
            price: 0,
            duration: 30,
            description: ""
        }])
    }

    const updateService = (id: string, field: string, value: any) => {
        setServices(prev => prev.map(s =>
            s.id === id ? { ...s, [field]: value } : s
        ))
    }

    const removeService = (id: string) => {
        setServices(prev => prev.filter(s => s.id !== id))
    }

    const addGalleryImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (files) {
            Array.from(files).forEach(file => {
                const reader = new FileReader()
                reader.onloadend = () => {
                    setGalleryImages(prev => [...prev, {
                        id: Date.now().toString() + Math.random(),
                        file,
                        preview: reader.result as string,
                        description: ""
                    }])
                }
                reader.readAsDataURL(file)
            })
        }
    }

    const updateGalleryDescription = (id: string, description: string) => {
        setGalleryImages(prev => prev.map(img =>
            img.id === id ? { ...img, description } : img
        ))
    }

    const removeGalleryImage = (id: string) => {
        setGalleryImages(prev => prev.filter(img => img.id !== id))
    }

    const addTeamMember = () => {
        setTeamMembers([...teamMembers, {
            id: Date.now().toString(),
            name: "",
            role: "",
            description: "",
            image: null,
            imagePreview: null
        }])
    }

    const updateTeamMember = (id: string, field: string, value: any) => {
        setTeamMembers(prev => prev.map(m =>
            m.id === id ? { ...m, [field]: value } : m
        ))
    }

    const handleTeamMemberImage = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setTeamMembers(prev => prev.map(m =>
                    m.id === id ? { ...m, image: file, imagePreview: reader.result as string } : m
                ))
            }
            reader.readAsDataURL(file)
        }
    }

    const removeTeamMember = (id: string) => {
        setTeamMembers(prev => prev.filter(m => m.id !== id))
    }

    const handleOwnerImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setOwnerImage(file)
                setOwnerImagePreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSubmit = async () => {
        if (!userData?.id) return
        setLoading(true)
        
        const loadingToast = toast.loading("Képek biztonsági ellenőrzése és feltöltése folyamatban... Kérjük, ne frissítse az oldalt!", { duration: 100000 });

        try {
            // Upload images
            let profileImageUrl = null
            let coverImageUrl = null

            const handleUploadError = (error: any, preview: string | null) => {
                setSafetyError({ message: error.message, preview })
                toast.error(error.message, {
                    duration: 5000,
                    position: "top-center"
                })
                return true
            }

            if (profileImage) {
                try {
                    profileImageUrl = await uploadFile(profileImage)
                } catch (e: any) {
                    toast.dismiss(loadingToast);
                    if (handleUploadError(e, profilePreview)) return
                    throw e
                }
            }
            if (coverImage) {
                try {
                    coverImageUrl = await uploadFile(coverImage)
                } catch (e: any) {
                    toast.dismiss(loadingToast);
                    if (handleUploadError(e, coverPreview)) return
                    throw e
                }
            }

            // Upload gallery images
            const galleryImageUrls: string[] = []
            for (const img of galleryImages) {
                if (img.file) {
                    try {
                        const url = await uploadFile(img.file)
                        galleryImageUrls.push(url)
                    } catch (e: any) {
                        toast.dismiss(loadingToast);
                        if (handleUploadError(e, img.preview)) return
                        throw e
                    }
                }
            }

            // Upload owner image
            let ownerImageUrl = null
            if (ownerImage) {
                try {
                    ownerImageUrl = await uploadFile(ownerImage)
                } catch (e: any) {
                    toast.dismiss(loadingToast);
                    if (handleUploadError(e, ownerImagePreview)) return
                    throw e
                }
            }

            // Upload team images
            const teamMembersToSave = []
            for (const member of teamMembers) {
                let memberImageUrl = null
                if (member.image) {
                    try {
                        memberImageUrl = await uploadFile(member.image)
                    } catch (e: any) {
                        toast.dismiss(loadingToast);
                        if (handleUploadError(e, member.imagePreview)) return
                        throw e
                    }
                }
                teamMembersToSave.push({
                    name: member.name,
                    role: member.role,
                    description: member.description,
                    image: memberImageUrl
                })
            }

            // Create salon
            const salon = await createSalon({
                name,
                city: addressData.city,
                district: addressData.district,
                street: addressData.street,
                houseNumber: addressData.houseNumber,
                floor: addressData.floor,
                door: addressData.door,
                zipCode: addressData.zipCode,
                country: addressData.country,
                address: addressData.fullAddress,
                lat: addressData.lat,
                lng: addressData.lng,
                currency,
                categories: selectedCategories,
                ownerId: userData.id,
                images: galleryImageUrls,
                profileImage: profileImageUrl,
                coverImage: coverImageUrl,
                phone,
                email,
                allowMessages,
                allowBookings,
                showPhoneOnProfile: true,
                showEmailOnProfile: false,
                notifyNewMessage: emailNotifications,
                notifyNewBooking: emailNotifications,
                notifyNewReview: emailNotifications,
                notifyNewFavorite: false,
                notifyPostLike: false,
                notifyPostComment: emailNotifications,
                notifyWeeklyStats: true,
                notifyMonthlyStats: true,
                ownerName: ownerName || userData.name,
                ownerImage: ownerImageUrl,
                aboutMe,
                isTeam,
                teamMembers: teamMembersToSave,
            })

            // Save opening hours
            if (salon?.id) {
                await saveOpeningHours(salon.id, openingHours)

                // Create services
                for (const service of services) {
                    if (service.name) {
                        await createService({
                            salonId: salon.id,
                            name: service.name,
                            price: service.price,
                            duration: service.duration,
                            description: service.description
                        })
                    }
                }
            }
            
            toast.dismiss(loadingToast);
            toast.success("Szalon sikeresen létrehozva!")
            onSuccess()
            onClose()
        } catch (error) {
            toast.dismiss(loadingToast);
            console.error("Error creating salon:", error)
            toast.error("Hiba történt a szalon létrehozása közben.")
        } finally {
            setLoading(false)
        }
    }

    const nextStep = () => {
        if (currentStep < WIZARD_STEPS.length - 1 && canProceed()) {
            setCurrentStep(currentStep + 1)
        }
    }

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1)
        }
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white p-0 rounded-3xl">
                    <VisuallyHidden>
                        <DialogTitle>Szalon létrehozása</DialogTitle>
                    </VisuallyHidden>
                    {/* Progress Bar */}
                    <div className="sticky top-0 bg-white z-10 px-6 pt-6 pb-2 border-b">
                        <WizardProgress
                            currentStep={currentStep}
                            steps={WIZARD_STEPS}
                            onStepClick={(step) => setCurrentStep(step)}
                        />
                    </div>

                    {/* Step Content */}
                    <div className="px-6 py-4 min-h-[400px]">
                        {/* Step 0: Welcome */}
                        {currentStep === 0 && (
                            <WizardStep
                                title="Üdvözlünk a GlowySpot-on!"
                                description="Segítünk beállítani a szalonod profilját. Mindent bármikor módosíthatsz később is!"
                                isWelcome
                            >
                                <Button onClick={nextStep} size="lg" className="bg-primary hover:bg-primary">
                                    <Sparkles className="mr-2 h-5 w-5" />
                                    Kezdjük el!
                                </Button>
                            </WizardStep>
                        )}

                        {/* Step 1: Basic Info */}
                        {currentStep === 1 && (
                            <WizardStep
                                title="Alapadatok"
                                description="Add meg a szalonod nevét és válassz képeket, hogy könnyen felismerhető legyen!"
                                tips={["A profilkép köralakban jelenik meg", "A borítókép széles, panoráma formátumban mutat a legjobban"]}
                            >
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label>Szalon neve *</Label>
                                        <Input
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Pl. Rózsa Szépségszalon"
                                            className="text-lg"
                                        />
                                        {name.trim() && (
                                          <p className="text-xs text-muted-foreground mt-1">
                                            URL: <span className="font-mono text-primary">glowyspot.com/profile/{generateSlug(name)}</span>
                                          </p>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label>Profilkép</Label>
                                            <div className="relative h-32 w-32 mx-auto border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center overflow-hidden hover:border-primary transition-colors bg-gray-50">
                                                {profilePreview ? (
                                                    <>
                                                        <img src={profilePreview} alt="Profile" className="w-full h-full object-cover" />
                                                        <button type="button" onClick={() => { setProfileImage(null); setProfilePreview(null) }} className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full m-1">
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                                                        <ImagePlus className="h-6 w-6 text-gray-400 mb-1" />
                                                        <span className="text-xs text-gray-500">Feltöltés</span>
                                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageChange(e, 'profile')} />
                                                    </label>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Borítókép</Label>
                                            <div className="relative h-32 w-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden hover:border-primary transition-colors bg-gray-50">
                                                {coverPreview ? (
                                                    <>
                                                        <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                                                        <button type="button" onClick={() => { setCoverImage(null); setCoverPreview(null) }} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full">
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                                                        <ImagePlus className="h-8 w-8 text-gray-400 mb-2" />
                                                        <span className="text-xs text-gray-500">Borítókép feltöltése</span>
                                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageChange(e, 'cover')} />
                                                    </label>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </WizardStep>
                        )}

                        {/* Step 2: Categories */}
                        {currentStep === 2 && (
                            <WizardStep
                                title="Kategóriák"
                                description="Válaszd ki, milyen szolgáltatásokat nyújtasz! Ez segít az ügyfeleknek megtalálni téged."
                                tips={["Több kategóriát is választhatsz"]}
                            >
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label>Kategóriák * (több is kiválasztható)</Label>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            {allCategories.map((category) => (
                                                <button
                                                    key={category.id}
                                                    type="button"
                                                    onClick={() => toggleCategory(category.slug)}
                                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedCategories.includes(category.slug)
                                                        ? "bg-primary/10 text-primary border-2 border-primary"
                                                        : "bg-gray-50 text-gray-700 border-2 border-gray-200 hover:bg-gray-100"
                                                        }`}
                                                >
                                                    {category.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </WizardStep>
                        )}

                        {/* Step 3: Address */}
                        {currentStep === 3 && (
                            <WizardStep
                                title="Helyszín"
                                description="Add meg a szalonod pontos címét. A térkép segít a helymeghatározásban."
                                tips={["A markert húzva pontosíthatod a helyet", "Az emelet és ajtó mező opcionális"]}
                            >
                                {isLoaded && googleMapsKey ? (
                                    <EnhancedAddressPicker
                                        onAddressChange={handleAddressChange}
                                        initialData={{
                                            country: addressData.country,
                                            city: addressData.city,
                                            street: addressData.street,
                                            houseNumber: addressData.houseNumber,
                                            floor: addressData.floor,
                                            door: addressData.door,
                                            lat: addressData.lat,
                                            lng: addressData.lng
                                        }}
                                    />
                                ) : (
                                    <div className="text-center text-gray-500 py-8">Térkép betöltése...</div>
                                )}
                            </WizardStep>
                        )}

                        {/* Step 4: Opening Hours */}
                        {currentStep === 4 && (
                            <WizardStep
                                title="Nyitvatartás"
                                description="Mikor vagy elérhető? Állítsd be a nyitvatartási idődet minden napra."
                                tips={["Kapcsold ki azokat a napokat amikor zárva vagy", "Az időpontokat később is módosíthatod"]}
                            >
                                <div className="space-y-3">
                                    {openingHours.map((hour, index) => (
                                        <div key={hour.day} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-2 w-32">
                                                <Checkbox
                                                    checked={hour.isOpen}
                                                    onCheckedChange={(checked) => updateHour(index, 'isOpen', checked)}
                                                />
                                                <span className="font-medium">{hour.day}</span>
                                            </div>
                                            {hour.isOpen ? (
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="time"
                                                        value={hour.open}
                                                        onChange={(e) => updateHour(index, 'open', e.target.value)}
                                                        className="w-28"
                                                    />
                                                    <span>-</span>
                                                    <Input
                                                        type="time"
                                                        value={hour.close}
                                                        onChange={(e) => updateHour(index, 'close', e.target.value)}
                                                        className="w-28"
                                                    />
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">Zárva</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </WizardStep>
                        )}

                        {/* Step 5: Services */}
                        {currentStep === 5 && (
                            <WizardStep
                                title="Szolgáltatások"
                                description="Add hozzá a szolgáltatásaidat az árakkal és időtartamokkal együtt."
                                tips={["Később bármikor hozzáadhatsz újakat", "A leírás segít az ügyfeleknek megérteni a szolgáltatást"]}
                            >
                                <div className="space-y-4">
                                    {/* Currency selector */}
                                    <div className="p-4 bg-primary/10 rounded-xl flex items-center gap-4">
                                        <Label className="whitespace-nowrap">Pénznem:</Label>
                                        <Select value={currency} onValueChange={setCurrency}>
                                            <SelectTrigger className="w-48">
                                                <SelectValue placeholder="Válassz pénznemet" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {CURRENCIES.map((curr) => (
                                                    <SelectItem key={curr.code} value={curr.code}>
                                                        {curr.name} ({curr.symbol})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {services.map((service) => (
                                        <div key={service.id} className="p-4 bg-gray-50 rounded-xl space-y-3">
                                            <div className="flex gap-3 items-end">
                                                <div className="flex-1">
                                                    <Label className="text-xs text-gray-500 mb-1 block">Szolgáltatás neve</Label>
                                                    <Input
                                                        placeholder="pl. Hajvágás"
                                                        value={service.name}
                                                        onChange={(e) => updateService(service.id, 'name', e.target.value)}
                                                    />
                                                </div>
                                                <div className="w-24">
                                                    <Label className="text-xs text-gray-500 mb-1 block">Ár ({currency})</Label>
                                                    <Input
                                                        type="number"
                                                        placeholder="0"
                                                        value={service.price || ""}
                                                        onChange={(e) => updateService(service.id, 'price', parseInt(e.target.value) || 0)}
                                                    />
                                                </div>
                                                <div className="w-24">
                                                    <Label className="text-xs text-gray-500 mb-1 block">Idő (perc)</Label>
                                                    <Input
                                                        type="number"
                                                        placeholder="30"
                                                        value={service.duration || ""}
                                                        onChange={(e) => updateService(service.id, 'duration', parseInt(e.target.value) || 0)}
                                                    />
                                                </div>
                                                <Button variant="ghost" size="icon" onClick={() => removeService(service.id)}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                            <Input
                                                placeholder="Rövid leírás (opcionális)"
                                                value={service.description}
                                                onChange={(e) => updateService(service.id, 'description', e.target.value)}
                                            />
                                        </div>
                                    ))}
                                    <Button type="button" variant="outline" onClick={addService} className="w-full border-dashed">
                                        <Plus className="mr-2 h-4 w-4" /> Szolgáltatás hozzáadása
                                    </Button>
                                </div>
                            </WizardStep>
                        )}

                        {/* Step 6: Contact */}
                        {currentStep === 6 && (
                            <WizardStep
                                title="Kapcsolat"
                                description="Add meg az elérhetőségeidet és állítsd be, hogyan szeretnéd fogadni a megkereséseket."
                                tips={["A telefonszám és email segít az ügyfeleknek elérni téged", "Az értesítési beállítások később is módosíthatók"]}
                            >
                                <div className="space-y-6">
                                    {/* Contact info */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="flex items-center gap-2">
                                                <Phone className="h-4 w-4 text-primary" />
                                                Telefonszám
                                            </Label>
                                            <Input
                                                type="tel"
                                                placeholder="+36 20 123 4567"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="flex items-center gap-2">
                                                <Mail className="h-4 w-4 text-primary" />
                                                E-mail cím
                                            </Label>
                                            <Input
                                                type="email"
                                                placeholder="szalon@example.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Preferences */}
                                    <div className="space-y-4">
                                        <h4 className="font-medium text-gray-700">Beállítások</h4>

                                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <MessageSquare className="h-5 w-5 text-blue-600" />
                                                <div>
                                                    <p className="font-medium">Üzenetek fogadása</p>
                                                    <p className="text-sm text-gray-500">Látogatók küldhetnek privát üzenetet</p>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={allowMessages}
                                                onCheckedChange={setAllowMessages}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <Calendar className="h-5 w-5 text-green-600" />
                                                <div>
                                                    <p className="font-medium">Online időpontfoglalás</p>
                                                    <p className="text-sm text-gray-500">Ügyfelek foglalhatnak időpontot az oldalon</p>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={allowBookings}
                                                onCheckedChange={setAllowBookings}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <Bell className="h-5 w-5 text-orange-600" />
                                                <div>
                                                    <p className="font-medium">E-mail értesítések</p>
                                                    <p className="text-sm text-gray-500">Kapj értesítést új üzenetekről és foglalásokról</p>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={emailNotifications}
                                                onCheckedChange={setEmailNotifications}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </WizardStep>
                        )}

                        {/* Step 7: Gallery */}
                        {currentStep === 7 && (
                            <WizardStep
                                title="Galéria"
                                description="Mutasd be a szalonodat és magadat! A képek segítenek az ügyfeleket meggyőzni, hogy téged válasszanak."
                                tips={["Tölts fel minőségi képeket a munkáidról", "Adj leírást a képekhez"]}
                            >
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        {galleryImages.map((img) => (
                                            <div key={img.id} className="relative group">
                                                <img src={img.preview} alt="" className="w-full h-32 object-cover rounded-lg" />
                                                <button
                                                    type="button"
                                                    onClick={() => removeGalleryImage(img.id)}
                                                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                                <Input
                                                    placeholder="Leírás..."
                                                    value={img.description}
                                                    onChange={(e) => updateGalleryDescription(img.id, e.target.value)}
                                                    className="mt-2 text-sm"
                                                />
                                            </div>
                                        ))}
                                        <label className="h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                                            <ImagePlus className="h-8 w-8 text-gray-400 mb-2" />
                                            <span className="text-xs text-gray-500">Képek feltöltése</span>
                                            <input type="file" className="hidden" accept="image/*" multiple onChange={addGalleryImage} />
                                        </label>
                                    </div>
                                </div>
                            </WizardStep>
                        )}

                        {/* Step 8: Team/About */}
                        {currentStep === 8 && (
                            <WizardStep
                                title="Csapat / Rólam"
                                description="Mutatkozz be! Ha van csapatod, add hozzá őket is képpel, névvel és leírással."
                                tips={["Ez segít személyesebbé tenni a szalont", "Az ügyfelek szívesebben választanak, ha látják ki fogadja őket"]}
                            >
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                                        <Label className="flex items-center gap-2">
                                            <Checkbox checked={isTeam} onCheckedChange={(c) => setIsTeam(!!c)} />
                                            Csapattal dolgozom
                                        </Label>
                                    </div>

                                    {!isTeam ? (
                                        <div className="space-y-4">
                                            {/* Owner profile section */}
                                            <div className="flex gap-4 items-start">
                                                <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0">
                                                    {ownerImagePreview ? (
                                                        <>
                                                            <img src={ownerImagePreview} className="w-full h-full object-cover" alt="Profilkép" />
                                                            <button
                                                                type="button"
                                                                onClick={() => { setOwnerImage(null); setOwnerImagePreview(null) }}
                                                                className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full m-1"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer bg-gray-100 hover:bg-gray-200 transition-colors">
                                                            <ImagePlus className="h-6 w-6 text-gray-400" />
                                                            <span className="text-xs text-gray-400 mt-1">Kép</span>
                                                            <input type="file" className="hidden" accept="image/*" onChange={handleOwnerImage} />
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
                                                    className="w-full rounded-lg border border-gray-200 p-3 min-h-[120px]"
                                                    placeholder="Mutatkozz be néhány mondatban..."
                                                    value={aboutMe}
                                                    onChange={(e) => setAboutMe(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {teamMembers.map((member) => (
                                                <div key={member.id} className="p-4 bg-gray-50 rounded-xl space-y-3">
                                                    <div className="flex gap-4">
                                                        <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0">
                                                            {member.imagePreview ? (
                                                                <img src={member.imagePreview} className="w-full h-full object-cover" alt={member.name} />
                                                            ) : (
                                                                <label className="w-full h-full flex items-center justify-center cursor-pointer bg-gray-100">
                                                                    <ImagePlus className="h-6 w-6 text-gray-400" />
                                                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleTeamMemberImage(member.id, e)} />
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
                                </div>
                            </WizardStep>
                        )}

                        {/* Step 9: Summary */}
                        {currentStep === 9 && (
                            <WizardStep
                                title="Összefoglaló"
                                description="Nézd át az összes adatot. Ha minden rendben van, hozd létre a szalont!"
                            >
                                <div className="space-y-4">
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <h4 className="font-semibold mb-2">Alapadatok</h4>
                                        <p><strong>Név:</strong> {name}</p>
                                        <p><strong>Kategóriák:</strong> {selectedCategories.map(slug => allCategories.find(c => c.slug === slug)?.name || slug).join(", ")}</p>
                                        <p><strong>Pénznem:</strong> {currency}</p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <h4 className="font-semibold mb-2">Helyszín</h4>
                                        <p>{addressData.fullAddress || `${addressData.city}, ${addressData.street} ${addressData.houseNumber}`}</p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <h4 className="font-semibold mb-2">Kapcsolat</h4>
                                        {phone && <p><strong>Telefon:</strong> {phone}</p>}
                                        {email && <p><strong>E-mail:</strong> {email}</p>}
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {allowMessages && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">Üzenetek</span>}
                                            {allowBookings && <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Időpontfoglalás</span>}
                                            {emailNotifications && <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">E-mail értesítések</span>}
                                        </div>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <h4 className="font-semibold mb-2">Szolgáltatások</h4>
                                        <p>{services.length} szolgáltatás</p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <h4 className="font-semibold mb-2">Galéria</h4>
                                        <p>{galleryImages.length} kép</p>
                                    </div>
                                </div>
                            </WizardStep>
                        )}
                    </div>

                    {/* Navigation Footer */}
                    <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-between">
                        <Button
                            variant="outline"
                            onClick={prevStep}
                            disabled={currentStep === 0}
                        >
                            <ChevronLeft className="mr-2 h-4 w-4" /> Előző
                        </Button>
                        {currentStep === WIZARD_STEPS.length - 1 ? (
                            <Button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="bg-primary hover:bg-primary"
                            >
                                {loading ? "Létrehozás..." : "Szalon létrehozása"}
                            </Button>
                        ) : (
                            <Button
                                onClick={nextStep}
                                disabled={!canProceed()}
                                className="bg-primary hover:bg-primary"
                            >
                                Következő <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
            <SafetyWarningModal
                isOpen={!!safetyError}
                onClose={() => setSafetyError(null)}
                message={safetyError?.message || ""}
                imagePreview={safetyError?.preview}
            />
        </>
    )
}
