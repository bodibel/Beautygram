"use client"

import Link from "next/link"
import { Images, Wand2 } from "lucide-react"

export function BeforeAfterTeaser() {
  return (
    <section className="overflow-hidden rounded-[32px] border border-border-subtle bg-text-primary text-primary-foreground shadow-editorial">
      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_0.85fr] lg:p-10">
        <div>
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <Images className="h-6 w-6" />
          </div>
          <h2 className="font-serif text-3xl font-semibold sm:text-4xl">Az előtte-utána galériák következnek.</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">
            Az átalakulásokat bemutató galériák bizalmi réteget adnak azokhoz a szolgáltatásokhoz, ahol fontos a vizuális bizonyíték. Mintaátalakulásokat nem mutatunk, amíg nincs hozzá valós szalonadat.
          </p>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/8 p-5">
          <Wand2 className="h-6 w-6 text-accent-soft" />
          <p className="mt-4 font-bold">Jövőálló inspiráció</p>
          <p className="mt-2 text-sm leading-6 text-white/70">
            A főoldalon már megvan a helye az ellenőrzött átalakulásoknak, anélkül hogy nem létező adatokat találnánk ki.
          </p>
          <Link href="/providers" className="mt-5 inline-flex text-sm font-bold text-accent-soft">
            Aktuális szalonok felfedezése
          </Link>
        </div>
      </div>
    </section>
  )
}
