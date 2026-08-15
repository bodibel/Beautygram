# GlowySpot Codebase Cleanup Plan

Phase 1A nem teljes refaktor, ezért ez a dokumentum a következő kis, külön commitolható cleanup köröket rögzíti.

## P0 - stabilitási cleanup

### Dashboard nav és active state egységesítés
- Érintett fájlok: `components/layout/sidebar.tsx`, `components/layout/bottom-nav.tsx`, `lib/navigation-config.ts`
- Jelenlegi probléma: a sidebar, bottom nav és `navigation-config` részben külön logikával dönt aktív állapotról és role alapú menüről.
- Kockázat: a visitor/provider/admin nézetek összecsúszhatnak, az overview aktív maradhat rossz route-on.
- Javasolt megoldás: központi nav item config `match: "exact" | "prefix"` mezővel, külön visitor/provider/admin listával.
- Prioritás: P0
- MVP blocker-e: igen

### Ownership guard egységesítés
- Érintett fájlok: `lib/actions/salon.ts`, `app/salon/[id]/layout.tsx`, `app/dashboard/layout.tsx`, `proxy.ts`
- Jelenlegi probléma: proxy role gate, layout auth guard és Server Action ownership guard külön helyeken, eltérő döntésekkel él.
- Kockázat: admin nem lát provider route-ot ownership nélkül, vagy későbbi route-oknál hiányozhat a page/action szintű guard.
- Javasolt megoldás: `requireSession`, `requireAdmin`, `requireSalonOwner`, `requireBookingOwner` helper minták dokumentált használata minden actionben és route-ban.
- Prioritás: P0
- MVP blocker-e: igen

### Upload moderation állapotmodell döntés
- Érintett fájlok: `app/api/upload/route.ts`, `lib/upload-policy.ts`, `prisma/schema.prisma`
- Jelenlegi probléma: Phase 1A fail-closed policy stabil, de nincs quarantine/pending media modell.
- Kockázat: AI moderation kieséskor publikus upload nem működik.
- Javasolt megoldás: MVP-ben maradhat fail-closed; Phase 2-ben `MediaAsset` vagy upload status mező `pending/approved/rejected` státuszokkal.
- Prioritás: P0
- MVP blocker-e: nem, ha fail-closed elfogadott

## P1 - route és profil duplikációk

### Duplikált profil/account felületek
- Érintett fájlok: `app/profile/me/page.tsx`, `app/dashboard/profile/page.tsx`, `components/dashboard/modals/ProfileEditModal.tsx`
- Jelenlegi probléma: több profil belépési pont létezik, a dashboard/profil logika széttagolt.
- Kockázat: felhasználó nem tudja, hol módosítsa az adatait; eltérő validáció és UI állapotok jelenhetnek meg.
- Javasolt megoldás: visitor profil egyetlen route alatt, régi route-ok redirecttel.
- Prioritás: P1
- MVP blocker-e: nem

### Régi `/salon/[id]` console route-ok
- Érintett fájlok: `app/salon/[id]/*`, `components/salon/cards/*`, `components/wizard/*`
- Jelenlegi probléma: a provider console és publikus szalonoldal route névben és mentális modellben könnyen keveredik.
- Kockázat: provider dashboard refaktor előtt nehéz tisztán eldönteni, mi publikus és mi adminisztratív.
- Javasolt megoldás: Phase 2-ben provider console route group például `/dashboard/salons/[id]/*`; régi route-ok átmeneti redirecttel.
- Prioritás: P1
- MVP blocker-e: nem

### Halott vagy félkész UI skeletonök
- Érintett fájlok: `app/dashboard/subscription/page.tsx`, analytics/stat placeholder komponensek, plan/premium UI elemek
- Jelenlegi probléma: több képernyő valós backend nélkül sejtet kész funkciót.
- Kockázat: MVP teszt közben félrevezető, hibás elvárást épít.
- Javasolt megoldás: MVP-ben elrejteni vagy "parkolt" státuszba tenni, nem végleges payment/Stripe implementációt kezdeni.
- Prioritás: P1
- MVP blocker-e: nem

## P2 - kódminőség

### Server Action/API validációs inkonzisztencia
- Érintett fájlok: `lib/actions/*.ts`, `app/api/*/route.ts`
- Jelenlegi probléma: egyes actionök validálnak policy/helper szinten, mások implicit Prisma hibára hagyatkoznak.
- Kockázat: rossz hibaüzenetek, eltérő auth/ownership viselkedés, nehezebb tesztelés.
- Javasolt megoldás: Zod input schema vagy kis policy helper minden user-facing mutation előtt.
- Prioritás: P2
- MVP blocker-e: nem

### Dead imports és komponens maradékok
- Érintett fájlok: teljes `components`, `app`
- Jelenlegi probléma: gyors MVP fejlesztésből maradt importok és komponensek lehetnek használaton kívül.
- Kockázat: zajos refaktor, build warningok, nehezebb ownership.
- Javasolt megoldás: `ts-prune` vagy TypeScript/ESLint alapú kézi passz Phase 1B-ben, külön committal.
- Prioritás: P2
- MVP blocker-e: nem

### Mojibake maradékok
- Érintett fájlok: teljes `app`, `components`, `lib`, `tests`
- Jelenlegi probléma: Phase 1A célzott keresése tiszta, de dokumentációban vagy kevésbé használt útvonalakon maradhat sérült szöveg.
- Kockázat: rossz UX magyar felhasználóknak.
- Javasolt megoldás: repository-wide encoding audit, `.editorconfig`/UTF-8 szabály, copy review csak a publikus és dashboard MVP flow-kon.
- Prioritás: P2
- MVP blocker-e: nem

## P3 - parkolt cleanup

### Nagy dashboard struktúra
- Érintett fájlok: `app/dashboard/*`, `components/layout/*`, `lib/navigation-config.ts`
- Jelenlegi probléma: visitor/provider/admin dashboard még nem végleges route group struktúrában él.
- Kockázat: túl korai refaktor megtörheti az MVP flow-kat.
- Javasolt megoldás: csak Phase 2-ben, a visitor dashboard logika tisztázása után.
- Prioritás: P3
- MVP blocker-e: nem

## Javasolt Phase 1B sorrend

1. Központi dashboard nav active state és role config.
2. Ownership guard helper audit minden mutationre.
3. Profil/account route konszolidáció redirect tervvel.
4. Félkész subscription/analytics skeletonök elrejtése vagy parkolása.
5. Server Action validációs passz a booking, salon és message mutationökre.
6. Dead import/unused component passz.
7. Végső UTF-8/mojibake keresés a teljes repóra.
