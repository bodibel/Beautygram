# GlowySpot Salon Console Route Compatibility Plan

## Cel

A provider salon console fokozatos atvezetese az uj dashboard alatti URL-strukturara ugy, hogy a regi `/salon/[id]/*` konzol route-ok tovabbra is mukodjenek.

## Jelenlegi regi console route-ok

| Regi route | Jelenlegi szerep | Phase 2B dontes |
| --- | --- | --- |
| `/salon/[id]` | szalon konzol attekintes | megmarad, uj alias redirectel ra |
| `/salon/[id]/bookings` | foglalasi kerelmek | megmarad, uj alias redirectel ra |
| `/salon/[id]/settings` | szalonprofil/adatok | megmarad, uj `/profile` alias redirectel ra |
| `/salon/[id]/services` | szolgaltatasok | megmarad, uj alias redirectel ra |
| `/salon/[id]/posts` | portfolio/poszt kezeles | megmarad, uj `/portfolio` alias redirectel ra |
| `/salon/[id]/gallery` | galeria | megmarad, Phase 2C-ben dontendo, osszevonjuk-e portfolio ala |
| `/salon/[id]/hours` | nyitvatartas | megmarad, uj alias redirectel ra |
| `/salon/[id]/team` | csapat | megmarad, uj alias redirectel ra |
| `/salon/[id]/reviews` | velemenyek | megmarad, Phase 2C-ben dontendo |
| `/salon/[id]/contact` | kapcsolati/beallitas oldal | megmarad, Phase 2C-ben dontendo |

## Uj dashboard alias route-ok

| Uj alias | Cel route | Tipus |
| --- | --- | --- |
| `/dashboard/salons/[salonId]` | `/salon/[id]` | guardolt redirect |
| `/dashboard/salons/[salonId]/bookings` | `/salon/[id]/bookings` | guardolt redirect |
| `/dashboard/salons/[salonId]/profile` | `/salon/[id]/settings` | guardolt redirect |
| `/dashboard/salons/[salonId]/services` | `/salon/[id]/services` | guardolt redirect |
| `/dashboard/salons/[salonId]/portfolio` | `/salon/[id]/posts` | guardolt redirect |
| `/dashboard/salons/[salonId]/hours` | `/salon/[id]/hours` | guardolt redirect |
| `/dashboard/salons/[salonId]/team` | `/salon/[id]/team` | guardolt redirect |
| `/dashboard/salons/[salonId]/messages` | `/dashboard/messages?salon=[salonId]` | guardolt redirect |

## Guard es ownership policy

Erintett fajlok:

- `lib/salon-console-auth.ts`
- `app/salon/[id]/layout.tsx`
- `app/dashboard/salons/[salonId]/layout.tsx`

A regi es uj console belepesi pont ugyanazt a `requireSalonConsoleOwner()` helpert hasznalja. Ez:

- aktiv session usert var (`getActiveSessionUser`)
- logged-out vagy inactive usert blokkol
- ellenorzi, hogy a salon `ownerId` egyezik-e a session userrel
- nem tulajdonosnal `/dashboard/salons` redirectet ad

Admin policy Phase 2B-ben: az admin nem kap implicit salon console hozzaferest, ha nem tulajdonos. Admin moderation kesobb kulon `/dashboard/admin/salons` feluleten legyen.

## Nav es link kompatibilitas

Erintett fajlok:

- `lib/navigation-config.ts`
- `app/dashboard/provider/page.tsx`
- `app/dashboard/salons/page.tsx`

Uj helper:

- `getDashboardSalonHref(salonId, section?)`
- `getDashboardSalonLinks(salonId)`
- `getLegacySalonConsoleHref(salonId, section?)`

Phase 2B utan a provider dashboard es a `Szalonjaim` lista mar az uj `/dashboard/salons/[salonId]` aliasokra linkel. A regi `/salon/[id]/*` URL-ek tovabbra is direktben mukodnek.

## Mikor lehet a regi route-okat redirectte alakitani?

Csak Phase 2C/2D utan, amikor:

- az uj `/dashboard/salons/[salonId]/*` shell mar nem csak alias, hanem sajat layout/nav kontextust ad
- Playwright smoke lefedi az uj es regi route-okat
- booking, service, post, hours es settings flow-ok bizonyitottan mukodnek az uj URL-ekrol inditva
- belso linkek legalabb egy release cikluson at mar az uj dashboard aliasokra mutatnak

## SEO/UX kockazat

Ezek provider console route-ok, ezert SEO szempontbol ne legyenek indexelve. UX kockazat jelenleg alacsony, mert a redirect utan a felhasznalo a regi URL-en landol; Phase 2C-ben erdemes sajat dashboard salon shellt adni, hogy az URL is az uj strukturaban maradjon.

