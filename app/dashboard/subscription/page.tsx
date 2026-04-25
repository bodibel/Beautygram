"use client"

import { useEffect, useState } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Check, Crown, Zap, Gift, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { getUserSalons } from "@/lib/actions/salon"

const plans = [
  {
    id: "FREE",
    name: "Ingyenes",
    price: { huf: 0, eur: 0 },
    icon: Gift,
    color: "gray",
    badge: null,
    features: [
      "1 szalon regisztrálható",
      "Kapcsolati adatok megjelenítése",
      "Havi 5 bejegyzés (csak kép)",
      "Alap profil oldal",
      "2 hónapos próbaidőszak",
    ],
    limitations: [
      "Nem jelenik meg keresési kiemelten",
      "Nincs online időpontfoglalás",
      "Nincs videó feltöltés",
    ],
    cta: "Jelenlegi csomag",
    ctaDisabled: true,
  },
  {
    id: "STANDARD",
    name: "Standard",
    price: { huf: 3990, eur: 9.9 },
    icon: Zap,
    color: "blue",
    badge: "Népszerű",
    features: [
      "Korlátlan bejegyzés",
      "Videó feltöltés",
      "Online időpontfoglalás",
      "Teljes profil (bio, nyitvatartás, térkép)",
      "Vélemények fogadása",
      "Alap keresési megjelenés",
      "30 napos számlázási ciklus",
    ],
    limitations: [],
    cta: "Standard előfizetés",
    ctaDisabled: false,
  },
  {
    id: "PREMIUM",
    name: "Prémium",
    price: { huf: 7990, eur: 19.9 },
    icon: Crown,
    color: "peach",
    badge: "Legjobb",
    features: [
      "Minden Standard funkció",
      "Kiemelt megjelenés a keresőben",
      "Legelöl a bejegyzések feedjében",
      "Legelöl a szolgáltatók listáján",
      "\"Ajánlott szakember\" badge",
      "Profil statisztikák",
      "Prioritásos ügyfélszolgálat",
      "30 napos számlázási ciklus",
    ],
    limitations: [],
    cta: "Prémium előfizetés",
    ctaDisabled: false,
  },
]

const colorMap = {
  gray: {
    bg: "bg-gray-50",
    border: "border-gray-200",
    icon: "bg-gray-100 text-gray-500",
    badge: "bg-gray-100 text-gray-600",
    btn: "bg-gray-200 text-gray-500 cursor-not-allowed",
    check: "text-gray-400",
  },
  blue: {
    bg: "bg-white",
    border: "border-blue-200 ring-2 ring-blue-100",
    icon: "bg-blue-50 text-blue-600",
    badge: "bg-blue-500 text-white",
    btn: "bg-blue-600 hover:bg-blue-700 text-white",
    check: "text-blue-500",
  },
  peach: {
    bg: "bg-white",
    border: "border-[#C87860]/30 ring-2 ring-[#C87860]/10",
    icon: "bg-[#C87860]/10 text-[#C87860]",
    badge: "bg-[#C87860] text-white",
    btn: "bg-[#C87860] hover:bg-[#b56d55] text-white",
    check: "text-[#C87860]",
  },
}

export default function SubscriptionPage() {
  const { userData } = useAuth()
  const router = useRouter()
  const [currency, setCurrency] = useState<"huf" | "eur">("huf")
  const [loading, setLoading] = useState<string | null>(null)
  const [checkingAccess, setCheckingAccess] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      if (!userData?.id) return

      try {
        const salons = await getUserSalons(userData.id)
        if (!salons || salons.length === 0) {
          router.replace("/dashboard/salons")
          return
        }
      } catch (error) {
        console.error("Error checking subscription access:", error)
        router.replace("/dashboard/salons")
        return
      }

      setCheckingAccess(false)
    }

    checkAccess()
  }, [userData?.id, router])

  const handleSubscribe = async (planId: string) => {
    if (planId === "FREE") return
    setLoading(planId)
    // TODO: Stripe checkout session létrehozása
    // const res = await fetch("/api/stripe/create-checkout", {
    //   method: "POST",
    //   body: JSON.stringify({ plan: planId, currency }),
    // })
    // const { url } = await res.json()
    // window.location.href = url
    alert("Stripe integráció hamarosan elérhető!")
    setLoading(null)
  }

  if (checkingAccess) {
    return (
      <MainLayout showRightSidebar={false}>
        <div className="max-w-5xl mx-auto px-4 py-12">
          <div className="text-center text-gray-500">Betöltés...</div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout showRightSidebar={false}>
      <div className="max-w-5xl mx-auto px-4 py-12 space-y-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-black text-gray-900">Válassz csomagot</h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Növeld szalonod láthatóságát és foglald el a legjobb helyet a GlowySpot platformon.
          </p>

          {/* Pénznem váltó */}
          <div className="inline-flex items-center bg-gray-100 rounded-xl p-1 mt-4">
            <button
              onClick={() => setCurrency("huf")}
              className={cn(
                "px-5 py-2 rounded-lg text-sm font-bold transition-all",
                currency === "huf"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              🇭🇺 Forint (Ft)
            </button>
            <button
              onClick={() => setCurrency("eur")}
              className={cn(
                "px-5 py-2 rounded-lg text-sm font-bold transition-all",
                currency === "eur"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              🇪🇺 Euro (€)
            </button>
          </div>
        </div>

        {/* Plan kártyák */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const colors = colorMap[plan.color as keyof typeof colorMap]
            const Icon = plan.icon
            const price = plan.price[currency]
            const isLoading = loading === plan.id

            return (
              <div
                key={plan.id}
                className={cn(
                  "relative rounded-3xl border p-7 flex flex-col gap-6 transition-all",
                  colors.bg,
                  colors.border
                )}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className={cn(
                    "absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold",
                    colors.badge
                  )}>
                    {plan.badge}
                  </div>
                )}

                {/* Icon + Név */}
                <div className="flex items-center gap-3">
                  <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", colors.icon)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-black text-gray-900 text-lg">{plan.name}</div>
                    {plan.id !== "FREE" && (
                      <div className="text-xs text-gray-400">havonta megújul</div>
                    )}
                  </div>
                </div>

                {/* Ár */}
                <div>
                  {price === 0 ? (
                    <div className="text-3xl font-black text-gray-900">Ingyenes</div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-gray-900">
                        {currency === "huf"
                          ? `${price.toLocaleString("hu-HU")} Ft`
                          : `${price.toFixed(2)} €`}
                      </span>
                      <span className="text-gray-400 text-sm">/hó</span>
                    </div>
                  )}
                  {plan.id === "FREE" && (
                    <div className="text-sm text-gray-400 mt-1">2 hónapos próbaidőszak</div>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                      <Check className={cn("h-4 w-4 mt-0.5 flex-shrink-0", colors.check)} />
                      {f}
                    </li>
                  ))}
                  {plan.limitations.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-400 line-through">
                      <span className="h-4 w-4 mt-0.5 flex-shrink-0 text-gray-300">✕</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={plan.ctaDisabled || isLoading}
                  className={cn(
                    "w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
                    colors.btn,
                    isLoading && "opacity-70"
                  )}
                >
                  {isLoading ? (
                    <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {plan.cta}
                      {!plan.ctaDisabled && <ArrowRight className="h-4 w-4" />}
                    </>
                  )}
                </button>
              </div>
            )
          })}
        </div>

        {/* Éves kedvezmény info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center shadow-sm">
          <p className="text-gray-600 text-sm">
            💡 <strong>Éves előfizetéssel 2 hónap ingyen!</strong> Hamarosan elérhető —
            éves számlázás esetén Standard: ~{currency === "huf" ? "39 900 Ft" : "99 €"},
            Prémium: ~{currency === "huf" ? "79 900 Ft" : "199 €"}/év.
          </p>
        </div>
      </div>
    </MainLayout>
  )
}
