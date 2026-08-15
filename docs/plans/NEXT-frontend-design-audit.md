# Következő feladat: teljes frontend vizuális audit és egységesítés

Státusz: **elmentve, végrehajtásra vár**
Rögzítve: 2026-08-15
Előfeltétel: a C (kvóta és admin konfiguráció) és D (Stripe fizetés) csomag elkészülte.

Ez a dokumentum a projektgazda által megfogalmazott követelményeket rögzíti. A végrehajtás előtt saját felderítés és terv készül.

---

## A feladat lényege

A teljes frontend vizuális átvizsgálása és egységesítése. Nem funkcionális hibákat keresünk, hanem vizuális következetlenséget, kitöltetlen felületeket és duplikációkat.

---

## 1. Üres területek és fehér foltok

Minden oldalon meg kell szüntetni a kitöltetlen, üresen tátongó területeket. A cél, hogy minden felület értelmesen ki legyen töltve — **de duplikáció nélkül**.

## 2. Duplikációk felszámolása

Ugyanaz a művelet ne legyen többféle gombbal elérhető ugyanazon a felületen.

Konkrét, a projektgazda által nevesített példa:
- A profil oldalon volt egy **„Új szalon"** és egy **„Szalon hozzáadása"** gomb is — ugyanarra a műveletre. Az ilyeneket egyesíteni kell.

Az egész felületet át kell nézni hasonló esetekért.

## 3. Egységes megjelenés

Következetesnek kell lennie az egész alkalmazásban:

| Terület | Követelmény |
| --- | --- |
| Menük | Azonos kinézet minden menüben |
| Betűméretek | Egységes tipográfiai skála |
| Gombok | Azonos méret, forma, stílus azonos szerepkörben |
| Konténerek | Azonos sarokkerekítés, keret, árnyék, háttér |

## 4. Hover effektek

**Ez kiemelt pont.** Jelenleg vegyes a helyzet:

- Az egyik konténernek ilyen hover effektje van, a másiknak másmilyen — ezt egységesíteni kell.
- Ugyanez érvényes a gombokra.
- Volt olyan eset, hogy a **Kijelentkezés gombhoz egyáltalán nem volt hover beállítva**.

Végig kell nézni minden kattintható elemet, és egységes hover-viselkedést kell adni nekik.

## 5. A gombok valóban gombok legyenek

Ellenőrizni kell, hogy ami gombnak látszik, az szemantikailag is gomb (`<button>`) vagy link (`<a>`), és nem egy kattintható `<div>`. Ez akadálymentességi és billentyűzetes navigációs kérdés is.

## 6. Design-szabályok betartása

A teljes felületet a design-szabályok szerint kell ellenőrizni:

- betűk (méret, vastagság, sormagasság)
- sorok és sortávolságok
- konténerek közötti és belüli távolságok (padding, margin, gap)
- modern design-megoldások alkalmazása

## 7. Reszponzivitás

Ellenőrizendő **mobil és tablet nézetben is**, nem csak asztali gépen.

## 8. Szövegek

A teljes felület szövegeinek átnézése.

## 9. Teljes struktúra

Az oldalak felépítésének, hierarchiájának átvizsgálása.

---

## Javasolt megközelítés a végrehajtáskor

1. **Felderítés:** végigjárni minden route-ot a böngészőben, három nézetben (mobil 375px, tablet 768px, asztali 1280px), és képernyőképekkel dokumentálni a jelenlegi állapotot.
2. **Leltár:** összeszedni a ténylegesen használt gomb-, konténer- és tipográfia-változatokat, hogy kiderüljön, hányféle van belőlük.
3. **Design-rendszer rögzítése:** eldönteni, melyik változat a mérce, és azt dokumentálni.
4. **Egységesítés:** a komponenseket a rögzített rendszerhez igazítani.
5. **Ellenőrzés:** újra végigjárni minden route-ot mindhárom nézetben.

A projektben van `components/ui/` könyvtár (`button.tsx`, `card.tsx`, `input.tsx`, `dialog.tsx`, `modal.tsx` stb.) és Tailwind CSS 4 — az egységesítésnek ezekre kell épülnie, nem oldalankénti egyedi osztályokra.

## Érintett felületek (a jelenlegi route-lista alapján)

**Publikus:** `/` (inspiráció/feed), `/providers` (keresés), `/profile/[slug]` (szalon publikus profil), `/auth/reset-password`

**Bejelentkezett:** `/dashboard`, `/dashboard/account`, `/dashboard/bookings`, `/dashboard/messages`, `/dashboard/favorites`, `/dashboard/comments`, `/dashboard/salons`, `/dashboard/create-salon`, `/dashboard/provider`, `/dashboard/subscription`, `/profile/me`

**Szalonkezelő:** `/dashboard/salons/[salonId]` és aloldalai (bookings, profile, services, portfolio, hours, team, messages), valamint a régi `/salon/[id]/*` útvonalak

**Admin:** `/dashboard/admin/overview`, `/dashboard/admin/providers`, `/dashboard/admin/visitors`, `/dashboard/admin/audit-log`, `/dashboard/admin/settings`

---

## Már ismert, ide tartozó tételek

A korábbi auditokból és review-kból ezek a frontendet érintő nyitott pontok gyűltek össze — a végrehajtáskor ezeket is kezelni kell:

- A szalonkezelő **áttekintő** oldalán nincs teendő-jelzés vagy CTA, ha a szalon nem publikált (a publikálási kapcsoló a `/profile` alfülön van).
- A tulajdonos nem tudja **előnézni** a még nem publikált szalonját — a publikus profil neki is „A szalon nem található." feliratot mutat.
- A publikálási kapcsoló sikeres művelet után **teljes oldalújratöltést** vált ki (`window.location.reload()`) `router.refresh()` vagy lokális állapotfrissítés helyett.
- A `components/home/story-bar.tsx` a nem létező `salon.subscriptionPlan` mezőt olvassa, ezért a prémium jelölés soha nem jelenik meg.
