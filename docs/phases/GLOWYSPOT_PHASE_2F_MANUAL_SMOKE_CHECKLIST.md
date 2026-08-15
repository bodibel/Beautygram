# GlowySpot Phase 2F Manual Smoke Checklist

## Cel

Kezi smoke ellenorzes a Phase 2A-2F dashboard es salon console atstrukturalt route-jaira. Stabil seedelt vagy ismert dev adat kell hozza.

## Fixture javaslat

- Aktiv visitor user.
- Aktiv provider user legalabb egy sajat szalonnal.
- Aktiv provider user szalon nelkul.
- Aktiv admin user.
- Masik aktiv provider, aki nem tulajdonosa a teszt szalonnak.
- Inactive user regi session ellenorzeshez.
- Legalabb egy salonhoz kotott message thread.
- Legalabb egy salonhoz nem kotott altalanos message thread.

## Visitor smoke

| Lepes | Route | Elvart eredmeny |
| --- | --- | --- |
| Visitor login utan overview | `/dashboard` | Visitor/account overview betolt, nem provider console |
| Visitor foglalasok | `/dashboard/bookings` | Sajat foglalasok vagy empty state |
| Visitor uzenetek | `/dashboard/messages` | Altalanos messages modul mukodik |
| Visitor kedvencek | `/dashboard/favorites` | Kedvencek vagy empty state |
| Visitor account | `/dashboard/account` | Profil/account oldal |
| Visitor salon console tiltasa | `/dashboard/salons/[salonId]` | Redirect/tiltas, nem lat console adatot |

## Provider smoke szalonnal

| Lepes | Route | Elvart eredmeny |
| --- | --- | --- |
| Provider overview | `/dashboard/provider` | Sajat szalon kartyak uj dashboard linkkel |
| Szalonjaim | `/dashboard/salons` | Sajat szalon lista, kezeles gomb uj route-ra mutat |
| Console overview | `/dashboard/salons/[salonId]` | Salon shell, aktiv nav, overview tartalom |
| Foglalasi kerelmek | `/dashboard/salons/[salonId]/bookings` | Shellben booking request lista |
| Profil | `/dashboard/salons/[salonId]/profile` | Shellben profile/settings content |
| Szolgaltatasok | `/dashboard/salons/[salonId]/services` | Service CRUD modalok nyilnak |
| Portfolio | `/dashboard/salons/[salonId]/portfolio` | Post create/edit/delete flow elerheto |
| Nyitvatartas | `/dashboard/salons/[salonId]/hours` | Hours es closed-date kezeles |
| Csapat | `/dashboard/salons/[salonId]/team` | Team/rolam form mentheto |
| Uzenetek | `/dashboard/salons/[salonId]/messages` | Redirect `/dashboard/messages?salon=[salonId]` celra |

## Provider smoke szalon nelkul

| Lepes | Route | Elvart eredmeny |
| --- | --- | --- |
| Provider overview | `/dashboard/provider` | Onboarding empty state |
| Szalonjaim | `/dashboard/salons` | Create salon CTA/wizard |
| Direkt console route | `/dashboard/salons/[salonId]` | Nem tulajdonos/hiba eseten redirect `/dashboard/salons` |

## Admin smoke

| Lepes | Route | Elvart eredmeny |
| --- | --- | --- |
| Admin overview | `/dashboard/admin/overview` | Admin overview betolt |
| Admin visitor/provider listak | `/dashboard/admin/providers`, `/dashboard/admin/visitors` | Admin oldalak betoltenek |
| Admin salon console | `/dashboard/salons/[salonId]` | Phase 2 policy szerint nincs implicit access, ha nem tulajdonos |

## Nem tulajdonos es inactive tiltasa

| Lepes | Route | Elvart eredmeny |
| --- | --- | --- |
| Masik provider sajatnak nem minosulo szalonja | `/dashboard/salons/[salonId]` | Redirect `/dashboard/salons` |
| Masik provider regi console route | `/salon/[id]` | Redirect `/dashboard/salons` |
| Inactive user dashboard | `/dashboard` | Login/home/tiltas |
| Inactive user upload | `/api/upload` | 401/403 vagy fail |
| Inactive user salon console | `/dashboard/salons/[salonId]` | Nem fer hozza |

## Messages `?salon=` smoke

| Lepes | Route | Elvart eredmeny |
| --- | --- | --- |
| Salon messages alias | `/dashboard/salons/[salonId]/messages` | Redirect `/dashboard/messages?salon=[salonId]` |
| Salon filter | `/dashboard/messages?salon=[salonId]` | Csak salonhoz kapcsolt threadek latszanak |
| Relevant thread | `/dashboard/messages?salon=[salonId]` | Elso relevans thread auto-kivalasztva |
| Reply | Aktiv salon thread | Uj valasz `salonId` kontextussal mentodik |
| Empty salon messages | `/dashboard/messages?salon=[no-thread-salon]` | Ertheto empty state |
| Altalanos messages | `/dashboard/messages` | Minden user thread latszik, nem torik |

## Regi salon console kompatibilitas

Ezek tovabbra is mukodjenek:

- `/salon/[id]`
- `/salon/[id]/bookings`
- `/salon/[id]/settings`
- `/salon/[id]/services`
- `/salon/[id]/posts`
- `/salon/[id]/gallery`
- `/salon/[id]/hours`
- `/salon/[id]/team`
- `/salon/[id]/reviews`
- `/salon/[id]/contact`

## Mobil viewport minimum

Ellenorizendo viewportok:

- 390x844 mobil
- 768x1024 tablet
- 1440x900 desktop

Minimum elvaras:

- bottom nav dashboard route-on visitor navot mutat
- dashboard salon route-on salon navot mutat
- regi `/salon/[id]/*` route-on regi salon nav nem torik
- header/nav elemek nem fedik egymast
- modalok nyithatok es zarhatok

