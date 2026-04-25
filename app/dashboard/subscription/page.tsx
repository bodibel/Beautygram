"use client"

import { useEffect, useMemo, useState } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { AccountPageShell } from "@/components/account/account-page-shell"
import { SubscriptionBadge } from "@/components/dashboard/SubscriptionBadge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { getUserSalons } from "@/lib/actions/salon"
import {
    ArrowRight,
    BarChart3,
    CalendarClock,
    Check,
    Crown,
    Eye,
    Sparkles,
    Store,
} from "lucide-react"
import { cn } from "@/lib/utils"

type UserSalon = {
    id: string
    name: string
    city: string
    address: string
    profileImage?: string | null
    subscription?: {
        plan: "FREE" | "STANDARD" | "PREMIUM"
        status: "ACTIVE" | "INACTIVE" | "PAST_DUE" | "CANCELLED"
        freeExpiresAt?: string | Date | null
        currentPeriodEnd?: string | Date | null
        cancelAtPeriodEnd?: boolean
    } | null
}

const premiumBenefits = [
    {
        icon: Sparkles,
        title: "Kiemelt helyi megjelenés",
        description: "A prémium szalonok elsőbbséget kaphatnak a kiemelt blokkban a saját városukban.",
    },
    {
        icon: Eye,
        title: "Nagyobb láthatóság",
        description: "Erősebb profilmegjelenés, több felfedezési pont és jobb észrevehetőség a platformon.",
    },
    {
        icon: BarChart3,
        title: "Profilstatisztikák",
        description: "Látogatószámok és aktivitási adatok segítenek követni a szalonod teljesítményét.",
    },
    {
        icon: CalendarClock,
        title: "Foglalási fókusz",
        description: "A prémium jelenlét a megkeresések és időpontkérések számát is támogathatja.",
    },
]

const planCards = [
    {
        id: "FREE",
        name: "Ingyenes",
        subtitle: "Alap jelenlét a platformon",
        accent: "text-gray-600",
        border: "border-gray-200",
        background: "bg-white",
        features: [
            "Publikus profiloldal",
            "Alap szolgáltatáslista",
            "Kapcsolati adatok megjelenítése",
        ],
    },
    {
        id: "STANDARD",
        name: "Standard",
        subtitle: "Több tartalom és online jelenlét",
        accent: "text-blue-600",
        border: "border-blue-200",
        background: "bg-blue-50/40",
        features: [
            "Korlátlanabb tartalomkezelés",
            "Erősebb profilépítés",
            "Bővebb funkciók a szalonkezeléshez",
        ],
    },
    {
        id: "PREMIUM",
        name: "Prémium",
        subtitle: "Kiemelt láthatóság és előnyök",
        accent: "text-primary",
        border: "border-primary/30",
        background: "bg-primary/5",
        features: [
            "Esély a kiemelt szalonok blokkba kerülésre",
            "Nagyobb platformos láthatóság",
            "Profilstatisztikák és prémium megjelenés",
        ],
    },
]

function formatPlanName(plan?: "FREE" | "STANDARD" | "PREMIUM" | null) {
    if (plan === "STANDARD") return "Standard"
    if (plan === "PREMIUM") return "Prémium"
    return "Ingyenes"
}

export default function SubscriptionPage() {
    const { userData } = useAuth()
    const router = useRouter()
    const [salons, setSalons] = useState<UserSalon[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedSalonId, setSelectedSalonId] = useState<string | null>(null)

    useEffect(() => {
        const loadSalons = async () => {
            if (!userData?.id) return

            try {
                const result = await getUserSalons(userData.id)
                const normalized = (result as UserSalon[]) || []

                if (normalized.length === 0) {
                    router.replace("/dashboard/salons")
                    return
                }

                setSalons(normalized)
                setSelectedSalonId((current) => current ?? normalized[0]?.id ?? null)
            } catch (error) {
                console.error("Error loading subscriptions:", error)
                router.replace("/dashboard/salons")
            } finally {
                setLoading(false)
            }
        }

        loadSalons()
    }, [router, userData?.id])

    const selectedSalon = useMemo(
        () => salons.find((salon) => salon.id === selectedSalonId) ?? salons[0] ?? null,
        [salons, selectedSalonId]
    )

    if (loading) {
        return (
            <MainLayout showRightSidebar={false} fullWidth>
                <div className="mx-auto flex min-h-[50vh] max-w-6xl items-center justify-center px-4 py-12">
                    <div className="text-sm text-gray-500">Előfizetés betöltése...</div>
                </div>
            </MainLayout>
        )
    }

    if (!selectedSalon) {
        return null
    }

    const subscription = selectedSalon.subscription
    const currentPlan = subscription?.plan ?? "FREE"
    const currentStatus = subscription?.status ?? "ACTIVE"

    return (
        <MainLayout showRightSidebar={false} fullWidth>
            <AccountPageShell
                icon={Crown}
                title="Prémium előfizetés"
                description="Itt tudod követni és később kezelni a szalonod csomagját, láthatósági előnyeit és prémium státuszát."
                actions={
                    <Button
                        disabled
                        className="h-12 rounded-2xl bg-primary px-6 text-white shadow-lg shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Fizetési útvonal hamarosan
                    </Button>
                }
                containerClassName="max-w-7xl"
            >
                <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-6">
                        <div className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="space-y-2">
                                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Aktív szalon</p>
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-gray-50 ring-1 ring-gray-100">
                                            {selectedSalon.profileImage ? (
                                                <img
                                                    src={selectedSalon.profileImage}
                                                    alt={selectedSalon.name}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <Store className="h-6 w-6 text-gray-400" />
                                            )}
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-gray-900">{selectedSalon.name}</h2>
                                            <p className="text-sm text-gray-500">
                                                {selectedSalon.city}, {selectedSalon.address}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-2xl bg-gray-50 px-4 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Jelenlegi csomag</p>
                                    <p className="mt-1 text-xl font-bold text-gray-900">{formatPlanName(currentPlan)}</p>
                                </div>
                            </div>

                            {salons.length > 1 ? (
                                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                                    {salons.map((salon) => {
                                        const isActive = salon.id === selectedSalon.id
                                        return (
                                            <button
                                                key={salon.id}
                                                type="button"
                                                onClick={() => setSelectedSalonId(salon.id)}
                                                className={cn(
                                                    "rounded-2xl border p-4 text-left transition-all",
                                                    isActive
                                                        ? "border-primary bg-primary/5 shadow-sm"
                                                        : "border-gray-200 bg-white hover:border-primary/30"
                                                )}
                                            >
                                                <p className="font-bold text-gray-900">{salon.name}</p>
                                                <p className="mt-1 text-sm text-gray-500">{formatPlanName(salon.subscription?.plan ?? "FREE")}</p>
                                            </button>
                                        )
                                    })}
                                </div>
                            ) : null}
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            {planCards.map((plan) => {
                                const isCurrent = currentPlan === plan.id
                                return (
                                    <div
                                        key={plan.id}
                                        className={cn(
                                            "rounded-[28px] border p-5 shadow-sm transition-all",
                                            plan.border,
                                            plan.background
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <h3 className={cn("text-lg font-black", plan.accent)}>{plan.name}</h3>
                                                <p className="mt-1 text-sm text-gray-500">{plan.subtitle}</p>
                                            </div>
                                            {isCurrent ? (
                                                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-primary shadow-sm">
                                                    Aktív
                                                </span>
                                            ) : null}
                                        </div>

                                        <ul className="mt-5 space-y-3">
                                            {plan.features.map((feature) => (
                                                <li key={feature} className="flex items-start gap-2 text-sm text-gray-700">
                                                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        <Button
                                            variant={isCurrent ? "outline" : "default"}
                                            disabled
                                            className={cn(
                                                "mt-6 w-full rounded-xl",
                                                !isCurrent && plan.id === "PREMIUM" ? "bg-primary text-white hover:bg-primary" : ""
                                            )}
                                        >
                                            {isCurrent ? "Jelenlegi csomag" : `${plan.name} hamarosan`}
                                        </Button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="rounded-[32px] border border-primary/15 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                                    <Crown className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-gray-900">Prémium előnyök</h3>
                                    <p className="text-sm text-gray-500">Mit ad a kiemelt tagság a szalonodnak.</p>
                                </div>
                            </div>

                            <div className="mt-6 space-y-4">
                                {premiumBenefits.map((benefit) => {
                                    const Icon = benefit.icon
                                    return (
                                        <div key={benefit.title} className="rounded-2xl bg-gray-50 p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="rounded-xl bg-white p-2 text-primary shadow-sm">
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900">{benefit.title}</h4>
                                                    <p className="mt-1 text-sm leading-6 text-gray-500">{benefit.description}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm">
                            <h3 className="text-lg font-black text-gray-900">Kiemelt megjelenés logikája</h3>
                            <div className="mt-4 space-y-3 text-sm text-gray-600">
                                <p>
                                    A cél, hogy az adott városban először az aktív prémium előfizetésű szalonok jelenjenek meg a kiemelt blokkban.
                                </p>
                                <p>
                                    Ha egy területen nincs prémium szalon, a blokk organikus minőségi jelek alapján töltődik fel: értékelések, aktivitás és láthatóság szerint.
                                </p>
                                <p className="font-medium text-gray-900">
                                    A fizetési aktiválás és a tényleges csomagváltás külön lépés lesz, ez az oldal most a kezelőfelület alapja.
                                </p>
                            </div>

                            <div className="mt-6 rounded-2xl bg-primary/5 p-4">
                                <p className="text-sm font-semibold text-primary">Következő lépés</p>
                                <p className="mt-1 text-sm text-gray-600">
                                    A fizetési integráció után innen indul majd a csomagváltás, megújítás és státuszkezelés.
                                </p>
                                <div className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary">
                                    Hamarosan aktiválható
                                    <ArrowRight className="h-4 w-4" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </AccountPageShell>
        </MainLayout>
    )
}
