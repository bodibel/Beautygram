# GlowySpot System State Snapshot

Last reviewed: 2026-04-21

## Status categories

- `Stable MVP`: kódszinten összerakott, a fő flow logikailag konzisztens, de még így sem automatikusan production-proven.
- `MVP but needs runtime verification`: a kód alapján vállalható MVP, de browser + DB + env alatt még kötelező validálni.
- `Partial / incomplete`: van működő rész, de a feature nem tekinthető lezártnak vagy több fontos eleme hiányzik.
- `Deferred intentionally`: tudatosan nem kész, és jelenleg nem is kell késznek tekinteni.
- `Mock / placeholder / dead weight`: demó, statikus, félbehagyott vagy alacsony értékű maradvány.

## Feature state by area

### Auth

- Status: `MVP but needs runtime verification`
- Explanation: NextAuth credentials + Google auth működési szintűnek látszik, session/JWT role frissítés és auth event audit logging is be van kötve.
- Key files/components:
  - `app/api/auth/[...nextauth]/route.ts`
  - `components/auth/auth-modal.tsx`
  - `lib/auth-context.tsx`
  - `lib/actions/auth.ts`
  - `middleware.ts`
- Known gaps / risks:
  - több hibaüzenet továbbra is mojibake-os a teljes auth környéken
  - teljes login/logout/register runtime teszt nélkül nem tekinthető deployment-proofnak
  - Google auth működése env függő, itt csak kódszinten volt ellenőrizhető

### Registration / role transition

- Status: `MVP but needs runtime verification`
- Explanation: új regisztráció mindig `visitor`, email-alapú admin escalation el lett távolítva. Az első szalon létrehozása provider role-ra emeli a usert, és az onboarding után session update is be van kötve.
- Key files/components:
  - `lib/actions/auth.ts`
  - `lib/actions/salon.ts`
  - `components/wizard/SalonWizard.tsx`
  - `app/dashboard/salons/page.tsx`
- Known gaps / risks:
  - nincs külön admin bootstrap flow
  - a role transition session-frissítése runtime tesztet igényel
  - visitor/provider UI framing több helyen még inkább MVP, mint kiforrott

### Public feed

- Status: `MVP but needs runtime verification`
- Explanation: a feed oldal server-side szűrt posztokat tölt, infinite scrollal, like akcióval és stabilizált story bar-ral. A törött featured/premium dependency már nincs nem létező schema mezőre kötve.
- Key files/components:
  - `app/page.tsx`
  - `lib/actions/salon.ts` (`getRecentPosts`, `getFeaturedSalons`)
  - `components/home/feed-card.tsx`
  - `components/home/story-bar.tsx`
- Known gaps / risks:
  - a feed vége még angol placeholder copy-t használ
  - ranking egyszerű, nem optimalizált quality vagy conversion logikára
  - full runtime görgetés/sentinel teszt nélkül csak kódszinten stabil

### Providers listing

- Status: `Partial / incomplete`
- Explanation: van külön `/providers` oldal és provider card rendering, de a lista teljesen kliensoldali keresésre épül a már betöltött összes szalonon.
- Key files/components:
  - `app/providers/page.tsx`
  - `lib/actions/salon.ts` (`getAllSalons`)
  - `components/home/provider-card.tsx`
- Known gaps / risks:
  - nem valódi server-side discovery search
  - a filter-context csak részben hat rá
  - nagyobb adatmennyiségnél skálázódási gond várható

### Public salon profile

- Status: `MVP but needs runtime verification`
- Explanation: a nyilvános profil oldal posztokkal, szolgáltatásokkal, galériával, review-kkal, about/team blokkal, üzenetküldéssel és időpontkéréssel össze van rakva.
- Key files/components:
  - `app/profile/[slug]/page.tsx`
  - `lib/actions/salon.ts` (`getPublicSalonData`)
  - `components/profile/profile-sidebar.tsx`
  - `components/profile/profile-tabs.tsx`
- Known gaps / risks:
  - a page nagy és sok felelősséget hordoz
  - több UI szöveg encoding problémás
  - review és messaging flow csak runtime alatt tekinthető végleg validnak

### Search / filters

- Status: `MVP but needs runtime verification`
- Explanation: a feed backend query már kezeli a kategóriát, minimum ratinget, alap searchQuery-t és lokációs bounding-box szűrést. A filter panelből ezek ténylegesen rá vannak kötve a queryre.
- Key files/components:
  - `components/layout/filter-panel.tsx`
  - `lib/filter-context.tsx`
  - `app/page.tsx`
  - `lib/actions/salon.ts` (`getRecentPosts`)
- Known gaps / risks:
  - location csak approximált bounding box, nem valódi distance sort
  - `openNow` és `availableToday` nem aktív product filterként implementált
  - providers listing nincs ugyanilyen backend filter logikára kötve

### Favorites

- Status: `MVP but needs runtime verification`
- Explanation: a kedvencek mentése, listázása és saját dashboard nézete session-bound védelemmel együtt megvan.
- Key files/components:
  - `lib/actions/salon.ts` (`toggleFavorite`, `getUserFavorites`)
  - `app/dashboard/favorites/page.tsx`
  - `components/salon/FavoriteButton.tsx`
- Known gaps / risks:
  - runtime UX visszajelzés és edge case-ek nem teljesen validáltak
  - funkcionálisan egyszerű, nincs további sorting/organization

### Messaging / contact

- Status: `MVP but needs runtime verification`
- Explanation: egyszerű contact messaging flow van, auth kötelező, self-send tiltott, salon-scoped küldésnél `allowMessages` ellenőrzés és owner/receiver konzisztencia is van.
- Key files/components:
  - `lib/actions/salon.ts` (`sendMessage`, `getUnreadMessageCount`)
  - `components/salon/message-modal.tsx`
  - `app/dashboard/messages/page.tsx`
  - `lib/notification-context.tsx`
- Known gaps / risks:
  - nem realtime és nem is thread-modellre optimalizált
  - unread badge pollingos
  - error messaging és dashboard messaging UX még inkább basic, mint kiforrott

### Appointment request flow

- Status: `MVP but needs runtime verification`
- Explanation: az időpontkérés már tényleges user flow: public profile modalból indul, auth szükséges, explicit szolgáltatásválasztás kell, backend enforce-olja a sessiont, a salon `allowBookings` flagjét és a service/salon konzisztenciát.
- Key files/components:
  - `components/profile/AppointmentRequestModal.tsx`
  - `app/profile/[slug]/page.tsx`
  - `lib/actions/salon.ts` (`createBooking`)
- Known gaps / risks:
  - ez továbbra is csak appointment request, nem booking engine
  - companion message recordre támaszkodik a request message megjelenítéséhez
  - teljes sikeres flow-t seedelt adattal kötelező runtime tesztelni

### Provider request handling

- Status: `MVP but needs runtime verification`
- Explanation: a provider dashboard request listája működési szintű, a tulajdonos látja a beérkező kéréseket, és backend tulajdonjog-ellenőrzéssel elfogadhatja vagy elutasíthatja őket.
- Key files/components:
  - `app/salon/[id]/page.tsx`
  - `lib/actions/salon.ts` (`getSalonBookingRequests`, `acceptBookingRequest`, `rejectBookingRequest`)
- Known gaps / risks:
  - státusz label még nyers stringeket is mutat helyenként
  - nincs további workflow, értesítés vagy follow-up mechanika
  - provider dashboard többi része vegyesen valós és placeholder

### User booking history

- Status: `MVP but needs runtime verification`
- Explanation: az authenticated user saját booking/request listát kap a `/account/bookings` oldalon, státusz badge-ekkel és üres állapottal.
- Key files/components:
  - `app/account/bookings/page.tsx`
  - `components/account/user-bookings-view.tsx`
  - `lib/actions/salon.ts` (`getCurrentUserBookings`)
  - `middleware.ts`
- Known gaps / risks:
  - runtime data nélkül csak kódszinten ellenőrzött
  - read-only nézet, nincs cancel/reschedule

### Salon onboarding

- Status: `MVP but needs runtime verification`
- Explanation: a wizard-alapú létrehozás a fő onboarding path, egy-user-egy-salon szabállyal és provider role transitionnel.
- Key files/components:
  - `components/wizard/SalonWizard.tsx`
  - `app/dashboard/salons/page.tsx`
  - `lib/actions/salon.ts` (`createSalon`)
- Known gaps / risks:
  - a wizard nagy és komplex, ezért runtime regresszió kockázatos
  - legacy create flow maradványok még léteznek a repo-ban
  - teljes onboarding upload + create + session refresh flow kötelezően tesztelendő

### Salon editing / settings

- Status: `MVP but needs runtime verification`
- Explanation: a settings edit működési szintű, és a backend allowlist miatt már nem mass assignment jellegű. Provider self-access a salon owner checken keresztül megy.
- Key files/components:
  - `app/salon/[id]/settings/page.tsx`
  - `components/salon/cards/BasicInfoCard.tsx`
  - `components/salon/modals/SettingsModal.tsx`
  - `lib/actions/salon.ts` (`updateSalon`, `getSalonData`)
- Known gaps / risks:
  - UI visszajelzések több helyen még `alert` alapúak
  - allowlist miatt új edit mező csak tudatos backend bővítéssel fog működni

### Services

- Status: `MVP but needs runtime verification`
- Explanation: service CRUD van provider oldalon, owner checkkel. A public profile és booking flow is felhasználja a szolgáltatásokat.
- Key files/components:
  - `app/salon/[id]/services/page.tsx`
  - `components/salon/cards/ServicesCard.tsx`
  - `components/salon/modals/ServiceModal.tsx`
  - `lib/actions/salon.ts` (`createService`, `updateService`, `deleteService`)
- Known gaps / risks:
  - kevés validáció
  - price/duration string alapon kezelt
  - delete/update runtime edge case-ek nincsenek teljesen végigtesztelve

### Gallery

- Status: `MVP but needs runtime verification`
- Explanation: a galéria upload/törlés provider oldalon működési szintű, és a hardened upload endpointot használja.
- Key files/components:
  - `app/salon/[id]/gallery/page.tsx`
  - `app/api/upload/route.ts`
  - `lib/actions/salon.ts` (`updateSalon`)
- Known gaps / risks:
  - több fájl upload részben serial jellegű
  - tényleges OpenAI moderation és file handling csak valós envvel tesztelhető

### Opening hours

- Status: `MVP but needs runtime verification`
- Explanation: nyitvatartás és zárt napok kezelése megvan provider oldalon, owner checkekkel.
- Key files/components:
  - `app/salon/[id]/hours/page.tsx`
  - `components/salon/cards/HoursCard.tsx`
  - `components/salon/cards/ClosedDatesCard.tsx`
  - `lib/actions/salon.ts` (`saveOpeningHours`, `createClosedDate`, `deleteClosedDate`)
- Known gaps / risks:
  - string-alapú időkezelés
  - nincs külön conflict/business validation

### Admin basics

- Status: `Partial / incomplete`
- Explanation: admin user management és category management kódszinten valósnak tűnik, route-védelem is van, de ez inkább operational admin alap, mint kiforrott admin rendszer.
- Key files/components:
  - `app/dashboard/admin/providers/page.tsx`
  - `app/dashboard/admin/visitors/page.tsx`
  - `app/dashboard/admin/settings/page.tsx`
  - `components/admin/UserManager.tsx`
  - `components/admin/CategoryManager.tsx`
  - `middleware.ts`
- Known gaps / risks:
  - admin overview nem valódi reporting
  - destructive admin műveletek runtime validációt igényelnek
  - UX vegyes minőségű és több helyen confirm/alert alapú

### Admin audit log

- Status: `MVP but needs runtime verification`
- Explanation: van AuditLog Prisma modell, reusable helper, több backend log point, és read-only admin viewer szűréssel.
- Key files/components:
  - `prisma/schema.prisma`
  - `lib/audit-log.ts`
  - `app/dashboard/admin/audit-log/page.tsx`
  - `app/api/auth/[...nextauth]/route.ts`
  - `lib/actions/auth.ts`
  - `lib/actions/salon.ts`
  - `app/api/upload/route.ts`
- Known gaps / risks:
  - migrationt ténylegesen futtatni kell
  - best-effort logging miatt eseményvesztés elvileg előfordulhat
  - DB és auth event runtime ellenőrzés nélkül nem tekinthető végleg bizonyítottnak

### Subscriptions

- Status: `Partial / incomplete`
- Explanation: a domain logika és részben a plan metadata létezik, a subscription page viszont főleg pricing/pre-sales UI, checkout nélkül.
- Key files/components:
  - `app/dashboard/subscription/page.tsx`
  - `lib/subscription.ts`
  - `app/api/cron/expire-free-salons/route.ts`
  - `app/api/cron/subscription-reminders/route.ts`
- Known gaps / risks:
  - Stripe checkout nincs kész
  - premium surfacing nincs kész productként
  - a UI több képességet ígér, mint ami ténylegesen működik

### Notifications

- Status: `Deferred intentionally`
- Explanation: valós notification rendszer helyett jelenleg gyakorlatilag csak unread message count badge van.
- Key files/components:
  - `lib/notification-context.tsx`
  - `lib/actions/salon.ts` (`getUnreadMessageCount`)
  - `lib/navigation-config.ts`
- Known gaps / risks:
  - nincs event-driven notification rendszer
  - a salon notification preference mezők nagy része még nem jelent valódi delivery flow-t

### Analytics / dashboard widgets

- Status: `Mock / placeholder / dead weight`
- Explanation: a provider overview dashboard több látványos widgetet tartalmaz, de ezek jelenleg demo/mock jellegűek, nem valós adatokon futnak.
- Key files/components:
  - `components/dashboard/kpi-cards.tsx`
  - `components/dashboard/timeline-schedule.tsx`
  - `components/dashboard/portfolio-vibe-widget.tsx`
  - `app/salon/[id]/page.tsx`
- Known gaps / risks:
  - félrevezető lehet, ha kész analyticsként kommunikálják
  - deployment előtt legalább product copy szinten tisztázni kell, hogy ezek nem core feature-ök

## What is safe to deploy now

- Core auth + role/session protection alapjai, ha runtime smoke test átmegy
- Public discovery feed és public salon profile alap útvonalak
- Egyszerű contact messaging
- Appointment request létrehozás és provider oldali accept/reject MVP flow
- Egy-provider-egy-salon onboarding és alap salon management
- Favorites
- Admin audit log foundation

## What should not be marketed as finished

- Subscriptions / premium benefits / featured placement mint kész fizetős rendszer
- Analytics vagy dashboard intelligence
- Notifications mint valódi rendszer
- Providers listing mint kiforrott discovery search
- Booking mint full online booking rendszer
- Messaging mint chat platform

## What must be runtime-tested before VPS deployment

- Register -> login -> logout auth lifecycle, beleértve audit log bejegyzéseket
- Visitor -> first salon creation -> provider role transition -> session refresh
- Public feed filters: category, rating, searchQuery, location
- Public salon profile: message send + appointment request send
- Provider request handling: incoming list, accept, reject
- User booking history page
- Gallery upload valós envvel, moderationnel és méret/type checkkel
- Admin audit log page szűrései
- Cron endpoint auth viselkedése beállított és hiányzó `CRON_SECRET` mellett

