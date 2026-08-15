import { MainLayout } from "@/components/layout/main-layout"

export default function SubscriptionPage() {
  return (
    <MainLayout showRightSidebar={false}>
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">MVP-safe állapot</p>
          <h1 className="mt-2 text-3xl font-black text-foreground">Előfizetések hamarosan</h1>
          <p className="mt-4 text-muted-foreground">
            A csomagok és fizetések még nincsenek bekapcsolva az MVP tesztverzióban. A szalonkezelés és az alap
            foglalási folyamat tesztelhető, de Stripe/payment művelet innen nem indul.
          </p>
        </div>
      </div>
    </MainLayout>
  )
}
