"use client"

import { useState, useTransition } from "react"
import { Eye, EyeOff, Lock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { publishSalon, unpublishSalon } from "@/lib/actions/salon"

type SalonPublishToggleProps = {
  salonId: string
  isPublished: boolean
  publishBlockedReason: string | null
  onChanged?: () => void
}

function blockedText(reason: string) {
  if (reason === "BILLING") {
    return "A publikálás előfizetési okból le van tiltva."
  }
  if (reason === "QUOTA") {
    return "Betelt az ingyenesen publikálható szalonok kerete. Vegyél le egy másik szalont, vagy bővítsd a keretet."
  }
  return "A publikálás adminisztrátori döntés miatt le van tiltva."
}

export function SalonPublishToggle({
  salonId,
  isPublished,
  publishBlockedReason,
  onChanged,
}: SalonPublishToggleProps) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const isBlocked = publishBlockedReason !== null

  const handleClick = () => {
    setError(null)

    if (isPublished && !window.confirm(
      "Biztosan leveszed a szalont? Ezután nem jelenik meg a keresésben, és nem lehet hozzá időpontot kérni. Az adatok és a korábbi foglalások megmaradnak."
    )) {
      return
    }

    startTransition(async () => {
      // A szerver action nem csak `{ success: false }` értéket adhat vissza, hanem
      // dobhat is (pl. lejárt munkamenet esetén a requireSession). Kezeletlenül ez
      // a következő renderben újra feldobódna, és mivel az alkalmazásban nincs
      // error boundary, az egész oldal a Next.js hibaoldalára esne — a felhasználó
      // pedig nem látná, mi történt.
      try {
        const result = isPublished
          ? await unpublishSalon(salonId)
          : await publishSalon(salonId)

        if (!result.success) {
          const message = "error" in result ? result.error : undefined
          setError(typeof message === "string" && message ? message : "A művelet nem sikerült.")
          return
        }
        onChanged?.()
      } catch (err) {
        console.error("Publikálási művelet hiba:", err)
        setError(err instanceof Error && err.message ? err.message : "A művelet nem sikerült.")
      }
    })
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border-subtle bg-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            isPublished ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
          }`}>
            {isBlocked ? <Lock className="h-5 w-5" /> : isPublished ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
          </span>
          <div>
            <p className="text-sm font-bold text-text-primary">Publikálás</p>
            <p className="text-xs leading-5 text-text-secondary">
              {isBlocked
                ? blockedText(publishBlockedReason)
                : isPublished
                  ? "A szalon látható a látogatóknak."
                  : "A szalon jelenleg nem látható a látogatóknak."}
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleClick}
          disabled={pending || isBlocked}
          variant={isPublished ? "outline" : "default"}
          className="w-fit rounded-full font-bold"
        >
          {pending ? "Mentés..." : isPublished ? "Levétel" : "Publikálás"}
        </Button>
      </div>

      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
    </div>
  )
}
