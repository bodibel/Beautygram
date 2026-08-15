# GlowySpot Playwright Route Smoke Plan

## Cel

Automatizalt e2e smoke terv a visitor, provider, admin es salon console route-ok ellenorzesere. Ez a terv nem helyettesiti a DB migration reconciliationt; stabil fixture DB vagy seedelt snapshot kell hozza.

## Szekvencia es fixture-ek

Szukseges fixture userek:

- `visitor@example.test`: aktiv visitor, nincs szalon tulajdon
- `provider@example.test`: aktiv provider, tulajdonosa `salon-owned`
- `provider-empty@example.test`: aktiv provider, nincs szalonja
- `provider-other@example.test`: aktiv provider, nem tulajdonosa `salon-owned`
- `admin@example.test`: aktiv admin
- `inactive-provider@example.test`: inactive user regi session teszthez

Szukseges fixture entitasok:

- `salon-owned`: provider tulajdonu szalon szolgaltatassal es legalabb egy pending bookinggal
- `salon-other`: masik provider tulajdonu szalon
- `booking-pending`: pending booking `salon-owned` alatt

## Visitor route smoke

| Flow | Route | Elvart eredmeny |
| --- | --- | --- |
| logged-out dashboard | `/dashboard` | redirect login/home fele |
| visitor dashboard | `/dashboard` | 200, visitor overview |
| visitor bookings | `/dashboard/bookings` | 200, sajat booking lista |
| visitor admin | `/dashboard/admin/overview` | forbidden vagy redirect |
| visitor salon console old | `/salon/salon-owned` | forbidden vagy `/dashboard/salons` redirect |
| visitor salon console new | `/dashboard/salons/salon-owned` | forbidden vagy `/dashboard/salons` redirect |

## Provider route smoke

| Flow | Route | Elvart eredmeny |
| --- | --- | --- |
| provider overview | `/dashboard/provider` | 200, sajat szalon kartyak |
| provider salons list | `/dashboard/salons` | 200, `salon-owned` kartya |
| provider no salon | `/dashboard/provider` | 200, onboarding empty state |
| owned old root | `/salon/salon-owned` | 200 |
| owned new root | `/dashboard/salons/salon-owned` | redirect `/salon/salon-owned` |
| owned new bookings | `/dashboard/salons/salon-owned/bookings` | redirect `/salon/salon-owned/bookings` |
| owned new profile | `/dashboard/salons/salon-owned/profile` | redirect `/salon/salon-owned/settings` |
| owned new services | `/dashboard/salons/salon-owned/services` | redirect `/salon/salon-owned/services` |
| owned new portfolio | `/dashboard/salons/salon-owned/portfolio` | redirect `/salon/salon-owned/posts` |
| owned new hours | `/dashboard/salons/salon-owned/hours` | redirect `/salon/salon-owned/hours` |
| owned new team | `/dashboard/salons/salon-owned/team` | redirect `/salon/salon-owned/team` |
| owned new messages | `/dashboard/salons/salon-owned/messages` | redirect `/dashboard/messages?salon=salon-owned` |
| other salon old | `/salon/salon-other` | forbidden vagy `/dashboard/salons` redirect |
| other salon new | `/dashboard/salons/salon-other` | forbidden vagy `/dashboard/salons` redirect |

## Admin route smoke

| Flow | Route | Elvart eredmeny |
| --- | --- | --- |
| admin overview | `/dashboard/admin/overview` | 200 |
| admin provider dashboard | `/dashboard/provider` | 200 vagy dokumentalt provider/admin kombinacio |
| admin salon console | `/dashboard/salons/salon-owned` | Phase 2B policy szerint nincs implicit access, redirect ha nem tulajdonos |
| admin salon moderation | `/dashboard/admin/salons` | Phase 2C/3 kesobbi route |

## Inactive user route smoke

| Flow | Route | Elvart eredmeny |
| --- | --- | --- |
| inactive dashboard | `/dashboard` | redirect/login/home |
| inactive upload mutation | `/api/upload` | 401/403 |
| inactive salon console | `/dashboard/salons/salon-owned` | redirect/login/home vagy `/dashboard/salons` |

## Implementacios javaslat

1. Seedelt test DB vagy snapshot fixture keszitese migration reconciliation utan.
2. Playwright auth helper: login formon keresztul, nem session cookie kezi injektalassal.
3. Route redirect ellenorzes `page.waitForURL()`-lel.
4. Console error es network 5xx figyeles minden smoke alatt.
5. Mobil viewport minimalis pass: visitor dashboard, provider dashboard, salon bookings.

