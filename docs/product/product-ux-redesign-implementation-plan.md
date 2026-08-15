# GlowySpot Product and UX Redefinition Implementation Plan

> This plan intentionally does not start implementation. It defines a phased change path from the current UI toward a premium beauty discovery, trust, and booking platform.

## Goal

Transform GlowySpot from a social-feed-like beauty app into a mobile-first premium beauty discovery, trust, and booking platform while preserving current authentication, salon management, booking V1, messaging, and core data.

## Strategy

Use progressive migration. Keep current data models working, introduce new UI language and route concepts in layers, and avoid broad schema changes until product behavior proves the need.

Primary priorities:

1. Mobile UX.
2. Discovery.
3. Conversion.
4. Premium visual consistency.
5. Performance.

## Phase 0: Alignment and Guardrails

### Objectives

- Freeze product terminology direction.
- Define what is visitor-facing vs provider/admin-facing.
- Prevent accidental social-media-clone rebuild.

### Decisions

- "Posts" become "Looks" or "Portfolio" in visitor-facing UI.
- "Feed" becomes "Inspiration".
- "Profile" becomes "Salon Page" or "Studio Page".
- Visitor UI should not feel like a dashboard.
- Provider/admin tools may remain functional and dashboard-like.

### Deliverables

- `docs/product-ux-design-redefinition.md`
- `docs/product-ux-redesign-implementation-plan.md`
- Later: `docs/design-system.md`

### Current Structures to Audit Before Coding

- `app/page.tsx`
- `app/providers/page.tsx`
- `app/profile/[slug]/page.tsx`
- `components/layout/main-layout.tsx`
- `components/layout/sidebar.tsx`
- `components/layout/bottom-nav.tsx`
- `components/home/feed-card.tsx`
- `components/home/story-bar.tsx`
- `components/profile/*`
- `lib/actions/salon.ts`

## Phase 1: Design Tokens and UI Foundations

### Goal

Create a unified light, editorial, premium design foundation without rebuilding pages yet.

### Files Likely Modified

- `app/globals.css`
- `app/layout.tsx`
- `tailwind` token usage through CSS variables
- `components/ui/button.tsx`
- `components/ui/input.tsx`
- `components/ui/card.tsx` if present
- New: `docs/design-system.md`

### Changes

1. Define semantic color tokens:
   - background
   - surface
   - surface-muted
   - surface-elevated
   - border-subtle
   - text-primary
   - text-secondary
   - accent-primary
   - accent-soft
   - success/warning/danger

2. Define typography direction:
   - serif display font for editorial headings.
   - sans font for UI and body.

3. Define radius and shadow scale:
   - small controls: 8-12px.
   - editorial cards: 16-24px.
   - avoid excessive 32px rounding except large visual cards.

4. Define component usage rules:
   - cards only for repeated items, tools, modals, or framed content.
   - no nested cards.
   - no heavy glassmorphism as default.

### Acceptance Criteria

- Existing pages still render.
- No dark/cyberpunk or neon direction introduced.
- Core UI tokens are named semantically.
- Mobile text and controls remain readable.

### Verification

- `npm run lint`
- `npm run typecheck`
- `npm run test:run`
- `npm run build`
- Browser smoke: `/`, `/providers`, `/profile/[slug]`, `/dashboard/bookings`.

## Phase 2: Public Layout Architecture

### Goal

Separate visitor discovery layout from provider/admin dashboard layout.

### Current Problem

`MainLayout` currently tries to serve feed, provider discovery, salon pages, profile pages, and dashboard-style contexts. This creates sidebar-heavy behavior and weak mobile UX.

### Proposed Layouts

1. `PublicDiscoveryLayout`
   - For Inspiration, Search, Map, Salon Page.
   - Mobile-first.
   - Minimal topbar.
   - Bottom nav on mobile.
   - No desktop dashboard sidebar.

2. `StudioLayout`
   - For provider salon management.
   - Desktop sidebar.
   - Mobile horizontal or bottom studio nav.

3. `AdminLayout`
   - For admin only.
   - Utilitarian dashboard.

### Files Likely Created

- `components/layout/public-discovery-layout.tsx`
- `components/layout/studio-layout.tsx`
- `components/layout/admin-layout.tsx`
- `components/navigation/public-bottom-nav.tsx`
- `components/navigation/studio-mobile-nav.tsx`

### Files Likely Modified

- `components/layout/main-layout.tsx`
- `components/layout/sidebar.tsx`
- `components/layout/bottom-nav.tsx`
- `app/page.tsx`
- `app/providers/page.tsx`
- `app/profile/[slug]/page.tsx`
- `app/salon/[id]/*`
- `app/dashboard/*`

### Acceptance Criteria

- Visitor pages no longer feel like dashboards.
- Provider salon pages still have management navigation on mobile.
- No horizontal page overflow at 390px, 430px, 768px, desktop.
- Desktop provider/admin layouts do not regress.

## Phase 3: Homepage to Inspiration Experience

### Goal

Replace the chronological feed homepage with an inspiration-led discovery homepage.

### New Page Structure

Route: `/`

Sections:

1. Cinematic hero with floating search.
2. Popular Now.
3. Trending Looks.
4. Near You.
5. Last Minute Appointments.
6. Top Rated Salons.
7. Before / After.
8. Featured Studios.

### Component Hierarchy

- `InspirationPage`
  - `InspirationHero`
  - `FloatingSearchBar`
  - `EditorialRail`
  - `LookRail`
  - `StudioRail`
  - `AvailabilityRail`
  - `BeforeAfterRail`

### Migration From Current UI

Current:

- `app/page.tsx` loads recent posts.
- `FeedCard` is the dominant unit.
- `StoryBar` imitates social story rings.

New:

- Keep the same underlying post/salon data initially.
- Render posts as Looks.
- Render featured salons as Featured Studios.
- Move social actions below discovery/conversion actions.

### Files Likely Created

- `components/inspiration/inspiration-hero.tsx`
- `components/inspiration/floating-search-bar.tsx`
- `components/inspiration/editorial-rail.tsx`
- `components/inspiration/look-card.tsx`
- `components/inspiration/studio-card.tsx`
- `components/inspiration/before-after-card.tsx`

### Files Likely Modified

- `app/page.tsx`
- `lib/actions/salon.ts` or new discovery actions module later
- `components/home/feed-card.tsx` only if reused temporarily

### Acceptance Criteria

- Homepage first viewport is premium and image-led.
- Search is visible immediately.
- Mobile homepage feels intentional, not compressed.
- Feed/social mechanics are not the primary visual hierarchy.

## Phase 4: Search Experience

### Goal

Create a simple, fast, premium search experience.

### Route Direction

- Keep `/providers` temporarily.
- Introduce or migrate to `/search` when stable.

### Desktop UX

- Search bar/modal.
- Results list.
- Filter chips.
- Optional map preview when Phase 5 is ready.

### Mobile UX

Fullscreen step-based search:

1. Service.
2. Location.
3. Date.
4. Preferences.
5. Results.

### Component Hierarchy

- `SearchPage`
  - `SearchEntry`
  - `SearchSheet`
  - `FilterChips`
  - `StudioResultsList`
  - `StudioCard`
  - `EmptySearchState`

### Filters

- location
- service
- date
- price range
- rating
- style/tags
- instant booking
- open now
- language

### Files Likely Created

- `app/search/page.tsx`
- `components/search/search-sheet.tsx`
- `components/search/search-entry.tsx`
- `components/search/filter-chips.tsx`
- `components/search/studio-results-list.tsx`

### Files Likely Modified

- `app/providers/page.tsx`
- `lib/filter-context.tsx`
- `lib/actions/salon.ts` or new `lib/actions/discovery.ts`

### Acceptance Criteria

- Search can be started within one tap from mobile home.
- Results are readable at 390px.
- Filters do not overwhelm the first screen.
- Current salon discovery remains functional.

## Phase 5: Map Discovery

### Goal

Add local exploration through a lightweight map-first experience.

### Desktop UX

- Split view:
  - results list.
  - interactive map.

### Mobile UX

- Expandable map.
- Bottom sheet with swipeable studio cards.
- Search/filter chips remain available.

### Component Hierarchy

- `MapDiscoveryPage`
  - `MapSearchBar`
  - `MapCanvas`
  - `MapPin`
  - `MapStudioPreview`
  - `MobileMapSheet`

### Data Requirements

Existing `lat`, `lng`, `city`, `address` fields can power V1.

### Performance Rules

- Lazy-load map component.
- Cluster markers.
- Do not render all markers if dataset grows.
- Debounce bounds changes.

### Files Likely Created

- `app/map/page.tsx`
- `components/map/map-discovery.tsx`
- `components/map/map-studio-card.tsx`
- `components/map/mobile-map-sheet.tsx`

### Acceptance Criteria

- Map loads only when needed.
- Mobile map does not trap scrolling.
- Studio preview can navigate to salon page.
- Desktop split view is usable.

## Phase 6: Salon Page Redefinition

### Goal

Turn current profile page into a luxury editorial, trust-building, booking-focused salon page.

### Current Problem

`app/profile/[slug]/page.tsx` mixes profile, posts, gallery, reviews, owner editing, and social concepts. The booking CTA is not structurally dominant enough.

### New Structure

Route target:

- Keep current `/profile/[slug]` during migration.
- Later consider `/salons/[slug]`.

Sections:

1. Cinematic hero/gallery.
2. Trust strip.
3. Sticky booking CTA.
4. Services.
5. Portfolio / Looks.
6. Before / After.
7. Team.
8. Reviews.
9. Location/map.
10. Atmosphere/details.

### Component Hierarchy

- `SalonPage`
  - `SalonHero`
  - `SalonTrustStrip`
  - `StickyBookingCTA`
  - `SalonServices`
  - `SalonLookGallery`
  - `BeforeAfterSection`
  - `TeamSection`
  - `ReviewSection`
  - `LocationSection`

### Booking CTA Behavior

- Mobile: sticky bottom bar.
- Desktop: sticky right panel.
- Service rows should have direct booking buttons.

### Files Likely Created

- `components/salon-page/salon-hero.tsx`
- `components/salon-page/sticky-booking-cta.tsx`
- `components/salon-page/salon-services.tsx`
- `components/salon-page/salon-look-gallery.tsx`
- `components/salon-page/salon-trust-strip.tsx`
- `components/salon-page/location-section.tsx`

### Files Likely Modified

- `app/profile/[slug]/page.tsx`
- `components/profile/*`
- `components/salon/booking-modal.tsx` if present
- booking action imports from `lib/actions/salon.ts`

### Acceptance Criteria

- Booking CTA visible without hunting.
- Services and portfolio are above or near the first two scrolls.
- Reviews and location build trust.
- Mobile page has no dashboard/sidebar feeling.

## Phase 7: Booking UX V1 Polish

### Goal

Make the existing booking request flow feel clear, premium, and trustworthy.

### Existing Backend Foundation

- `createBooking`
- `getMyBookings`
- `cancelMyBooking`
- `getSalonBookingRequests`
- `acceptBookingRequest`
- `rejectBookingRequest`
- internal `Message` notifications

### UX Changes

- Rename statuses in UI:
  - pending: Request sent
  - confirmed: Accepted
  - cancelled by provider: Declined
  - cancelled by visitor: Cancelled
- If schema still uses `cancelled`, use careful wording based on context until schema improves.
- Add clear timeline/status display.
- Add booking summary card after submit.
- Keep cancellation rules visible.

### Files Likely Modified

- `app/dashboard/bookings/page.tsx`
- `components/dashboard/booking-requests.tsx`
- booking modal/component on salon page
- `lib/booking/booking-policy.ts`

### Acceptance Criteria

- Visitor always knows what happened.
- Provider sees pending vs handled requests clearly.
- No action buttons for handled bookings.
- Message creation behavior remains intact.

## Phase 8: Provider Studio Console Refinement

### Goal

Make provider tools usable and cleaner without letting dashboard UI dominate visitor product surfaces.

### Sections

- Today / Overview
- Booking Requests
- Services
- Portfolio / Looks
- Gallery
- Hours
- Team
- Contact
- Settings

### Changes

- Rename "Posts" management to "Portfolio" or "Looks".
- Keep functional cards but reduce oversized dashboard styling.
- Keep mobile salon nav.
- Make booking requests first-class.

### Files Likely Modified

- `app/salon/[id]/page.tsx`
- `app/salon/[id]/posts/page.tsx`
- `app/salon/[id]/services/page.tsx`
- `app/salon/[id]/gallery/page.tsx`
- `components/dashboard/*`
- `components/salon/*`
- `lib/navigation-config.ts`

### Acceptance Criteria

- Provider can manage booking requests on mobile.
- Portfolio management terminology is not social-post-first.
- No horizontal overflow on salon admin pages.

## Phase 9: Content Model Migration Planning

### Goal

Prepare schema evolution without blocking UI repositioning.

### Short-Term

Use existing `Post` as a Look source.

Map:

- `Post.images` -> Look visuals.
- `Post.content` -> Look description.
- `Post.layout` -> visual layout.
- `Post.salonId` -> studio attribution.

### Future Schema Direction

Potential models:

- `Look`
- `LookImage`
- `LookTag`
- `BeforeAfter`
- `LookService`
- `EditorialCollection`

### When to Add Schema

Only after UI proves that post-as-look compatibility is limiting:

- Need before/after pairs.
- Need style tags.
- Need service-linked looks.
- Need editorial collections.
- Need moderation workflow.

## Phase 10: Performance and Analytics

### Goal

Make premium UX measurable and fast.

### Performance Work

- Server-render public discovery where practical.
- Lazy-load maps, modals, and heavy galleries.
- Stabilize image dimensions.
- Paginate looks and search results.
- Cache public salon data where safe.

### Analytics Events

- `search_started`
- `search_results_viewed`
- `salon_opened`
- `look_opened`
- `service_selected`
- `booking_started`
- `booking_submitted`
- `booking_cancelled`
- `booking_confirmed`

### Files Likely Created

- `lib/analytics/events.ts`
- `lib/analytics/track.ts`

### Acceptance Criteria

- Core Web Vitals do not regress.
- Booking funnel is measurable.
- Search/discovery funnel is measurable.

## Phase 11: Testing and QA Strategy

### Required Test Layers

- Unit tests:
  - booking policy.
  - search helpers.
  - status labels.

- Integration tests:
  - booking actions.
  - authorization checks.

- E2E/mobile tests:
  - home inspiration loads.
  - search opens and filters.
  - salon page booking CTA visible.
  - booking request submitted.
  - provider handles booking.

### Browser QA Viewports

- 390px mobile.
- 430px mobile.
- 768px tablet.
- 1280px desktop.
- 1440px desktop.

### Always Verify

- `npm run lint`
- `npm run typecheck`
- `npm run test:run`
- `npm run build`

## Migration Matrix

| Current Surface | Future Surface | Keep | Redesign | Remove/De-emphasize |
| --- | --- | --- | --- | --- |
| `/` feed | Inspiration homepage | post data | full UI and IA | chronological feed dominance |
| `FeedCard` | `LookCard` | images, salon attribution | visual hierarchy, CTA | social-like reaction emphasis |
| `StoryBar` | Featured Studios / Latest Work | featured salon query | visual treatment | social story metaphor |
| `/providers` | Search / Studios | salon data | filters, map/list UX | static grid-only browsing |
| `/profile/[slug]` | Salon Page | salon data, reviews, services | page structure, sticky CTA | profile/social framing |
| `/salon/[id]` | Studio Console | management functions | mobile layout, terminology | public-facing dashboard styling |
| Posts management | Portfolio / Looks | create/update images | copy and flow | random social posting |
| Booking V1 | Booking V1 polished | server actions | clearer UX/status | hidden status/actions |
| Sidebar visitor nav | Public top/bottom nav | auth links | mobile-first IA | heavy sidebars on visitor pages |

## Suggested Release Sequence

### Release 1: Foundation

- Design tokens.
- Public vs studio layout split.
- Mobile nav cleanup.
- No major product behavior change.

### Release 2: Inspiration Homepage

- New homepage sections.
- LookCard and StudioCard.
- Reposition feed/post language.

### Release 3: Search and Map

- Search route/sheet.
- Results list.
- Map discovery MVP.

### Release 4: Salon Page Conversion

- Editorial salon hero.
- Service-led booking CTA.
- Trust strip.
- Portfolio section.

### Release 5: Booking UX Polish

- Cleaner status cards.
- Booking confirmation UI.
- Provider booking request refinements.

### Release 6: Provider Portfolio Tools

- Rename posts to looks/portfolio.
- Improve upload and moderation UX.
- Keep provider productivity intact.

## Implementation Rules

- Do not redesign every page in one PR.
- Do not change schema until UI migration proves a need.
- Do not remove current booking behavior.
- Do not break provider/admin workflows while visitor UX changes.
- Keep mobile QA mandatory for every public page change.
- Prefer new focused components over expanding already-large files.
- Use existing data first, then evolve models later.

## First Recommended Coding Task

Create the public discovery layout and design token foundation.

Why first:

- It lowers risk for all future page redesigns.
- It separates visitor UX from dashboard UX.
- It enables homepage/search/salon page work without fighting the current `MainLayout`.

Expected first-task scope:

- Add `PublicDiscoveryLayout`.
- Add public mobile bottom nav labels aligned with new IA.
- Refine design tokens in `globals.css`.
- Migrate only `/` to use the new layout shell without changing all content yet.
- Verify mobile at 390px and desktop.

