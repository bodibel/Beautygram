"use client"

import { useEffect, useState } from "react"
import { Clock, Infinity as InfinityIcon, Store } from "lucide-react"

import { getMyQuotaStatus } from "@/lib/actions/salon"

type QuotaStatus = {
  billingEnabled: boolean
  freeSlots: number
  usedSlots: number
  inGracePeriod: boolean
  graceEndsAt: Date | string | null
}

function napokMulva(date: Date | string) {
  const diff = new Date(date).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)))
}

export function QuotaIndicator() {
  const [status, setStatus] = useState<QuotaStatus | null>(null)

  useEffect(() => {
    let aktiv = true
    getMyQuotaStatus()
      .then((result) => { if (aktiv) setStatus(result as QuotaStatus | null) })
      .catch(() => { if (aktiv) setStatus(null) })
    return () => { aktiv = false }
  }, [])

  if (!status) return null

  // 1. fázis: nincs mit közölni, minden szalon ingyenesen publikálható.
  if (!status.billingEnabled) {
    return (
      <div className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-xs font-bold text-muted-foreground">
        <InfinityIcon className="h-4 w-4" />
        Korlátlan publikálás
      </div>
    )
  }

  const betelt = status.usedSlots >= status.freeSlots

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold ${
        betelt ? "bg-amber-50 text-amber-800" : "bg-green-50 text-green-700"
      }`}>
        <Store className="h-4 w-4" />
        {status.usedSlots} / {status.freeSlots} ingyenes hely
      </div>

      {status.inGracePeriod && status.graceEndsAt && (
        <div className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-xs font-bold text-muted-foreground">
          <Clock className="h-4 w-4" />
          Türelmi idő: még {napokMulva(status.graceEndsAt)} nap
        </div>
      )}
    </div>
  )
}
