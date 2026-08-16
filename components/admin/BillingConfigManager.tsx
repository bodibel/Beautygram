"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { getSubscriptionConfigAdmin, updateSubscriptionConfig } from "@/lib/actions/subscription-config"

type Form = {
  billingEnabled: boolean
  freeSalonSlots: number
  freeSlotTrialDays: number
  gracePeriodDays: number
}

const URES: Form = {
  billingEnabled: false,
  freeSalonSlots: 1,
  freeSlotTrialDays: 0,
  gracePeriodDays: 30,
}

function formatDate(value: Date | null) {
  if (!value) return null
  return new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value))
}

export function BillingConfigManager() {
  const [form, setForm] = useState<Form>(URES)
  const [billingEnabledAt, setBillingEnabledAt] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const result = await getSubscriptionConfigAdmin()
      if (result.success && result.config) {
        setForm({
          billingEnabled: result.config.billingEnabled,
          freeSalonSlots: result.config.freeSalonSlots,
          freeSlotTrialDays: result.config.freeSlotTrialDays,
          gracePeriodDays: result.config.gracePeriodDays,
        })
        setBillingEnabledAt(result.config.billingEnabledAt)
      }
    } catch (error) {
      console.error("Számlázási beállítások betöltési hiba:", error)
      toast.error("Nem sikerült a beállítások betöltése.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleSave = async () => {
    if (form.billingEnabled && !billingEnabledAt && !window.confirm(
      `Bekapcsolod a számlázást. Ezzel elindul a ${form.gracePeriodDays} napos türelmi idő, `
      + `utána szolgáltatónként ${form.freeSalonSlots} szalon marad ingyenesen publikálva, a többi lekerül. Folytatod?`
    )) {
      return
    }

    try {
      setSaving(true)
      const result = await updateSubscriptionConfig(form)
      if (!result.success) {
        toast.error(result.error || "Nem sikerült a mentés.")
        return
      }
      toast.success("A beállítások elmentve.")
      await load()
    } catch (error) {
      console.error("Számlázási beállítások mentési hiba:", error)
      toast.error("Nem sikerült a mentés.")
    } finally {
      setSaving(false)
    }
  }

  const graceEndsAt = billingEnabledAt
    ? new Date(new Date(billingEnabledAt).getTime() + form.gracePeriodDays * 24 * 60 * 60 * 1000)
    : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Publikálási korlátok</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Ezekkel a beállításokkal kapcsolható a termék három fázisa. Amíg a számlázás ki van kapcsolva,
          minden szalon ingyenesen publikálható.
        </p>

        {loading ? (
          <div className="h-40 animate-pulse rounded-xl bg-surface-muted" />
        ) : (
          <>
            <div className="flex items-center justify-between rounded-xl border border-border p-4">
              <div>
                <Label htmlFor="billingEnabled" className="text-sm font-bold">Számlázás bekapcsolva</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  {form.billingEnabled
                    ? "A publikálási keret érvényes."
                    : "1. fázis: minden szalon ingyenesen publikálható."}
                </p>
              </div>
              <Switch
                id="billingEnabled"
                checked={form.billingEnabled}
                onCheckedChange={(checked) => setForm({ ...form, billingEnabled: checked })}
              />
            </div>

            {form.billingEnabled && billingEnabledAt && (
              <div className="rounded-xl border border-border bg-secondary/40 p-4 text-sm">
                <p>Bekapcsolva: <strong>{formatDate(billingEnabledAt)}</strong></p>
                {graceEndsAt && (
                  <p className="mt-1">Türelmi idő vége: <strong>{formatDate(graceEndsAt)}</strong></p>
                )}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="freeSalonSlots">Ingyenes szalonhelyek</Label>
                <Input
                  id="freeSalonSlots"
                  type="number"
                  min={0}
                  value={form.freeSalonSlots}
                  onChange={(e) => setForm({ ...form, freeSalonSlots: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">Szolgáltatónként ennyi szalon ingyenes.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="freeSlotTrialDays">Ingyenes időszak (nap)</Label>
                <Input
                  id="freeSlotTrialDays"
                  type="number"
                  min={0}
                  value={form.freeSlotTrialDays}
                  onChange={(e) => setForm({ ...form, freeSlotTrialDays: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">0 = az ingyenes hely nem jár le.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gracePeriodDays">Türelmi idő (nap)</Label>
                <Input
                  id="gracePeriodDays"
                  type="number"
                  min={0}
                  value={form.gracePeriodDays}
                  onChange={(e) => setForm({ ...form, gracePeriodDays: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">A bekapcsolástól számítva.</p>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="rounded-full font-bold">
              {saving ? "Mentés..." : "Mentés"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
