# GlowySpot Product, UX, and Design System Redefinition

## 1. Executive Direction

GlowySpot should evolve from a social-feed-like beauty app into a premium beauty discovery, trust, and booking platform.

The product should help visitors answer five questions quickly:

1. What inspires me?
2. Who near me can do this well?
3. Can I trust this salon or stylist?
4. What will it cost and when can I go?
5. Can I book with minimal friction?

The platform should combine visual inspiration, local exploration, trust-building, and booking. It should borrow the best UX traits of Pinterest, Airbnb, Treatwell, Apple editorial pages, and premium beauty brands, while avoiding Instagram/TikTok/social-network patterns.

## 2. Product Vision

GlowySpot is the premium destination for discovering beauty work, comparing trusted local studios, and booking with confidence.

The core promise:

> Find the look you want, discover who can create it near you, and book confidently.

GlowySpot should not compete on endless content volume or social engagement. It should compete on taste, clarity, trust, and conversion.

Primary product pillars:

- Inspiration: visual discovery through curated looks, transformations, and trends.
- Local discovery: location-aware salon, stylist, service, and availability exploration.
- Trust: reviews, portfolio quality, verified salon details, team bios, pricing, availability, and atmosphere.
- Booking: low-friction request/booking flow with clear status and communication.
- Premium feel: editorial, calm, mobile-first, image-led, and high-performing.

## 3. UX Philosophy

GlowySpot should feel effortless, editorial, and conversion-oriented.

Principles:

- Visual first, but not social-first.
- Trust before transaction.
- Mobile first, not desktop compressed.
- Clear choices over complex dashboards.
- Curated discovery over chronological posting.
- Fewer, stronger surfaces instead of many weak pages.
- Every content unit should help discovery, trust, or booking.

Anti-principles:

- No vanity metrics as the core loop.
- No follower obsession.
- No generic text posting as a primary concept.
- No dashboard feeling for visitors.
- No hidden booking CTA.
- No complex navigation tree for core visitor flows.

## 4. Product Language and Terminology

Recommended terminology shift:

| Current | New Direction | Reason |
| --- | --- | --- |
| Posts | Looks / Work / Portfolio | Content exists to show quality and inspire bookings. |
| Feed | Inspiration | Less social, more editorial discovery. |
| Profile | Salon Page / Studio Page | More premium and conversion-focused. |
| Stories | Latest Work | Less social clone, more professional portfolio. |
| Providers | Studios / Salons | More user-friendly and beauty-market native. |
| Dashboard | Studio Console / Studio Manager | Keep internal/provider tone separate from visitor UX. |

Preferred public-facing vocabulary:

- Inspiration
- Looks
- Latest Work
- Featured Studios
- Near You
- Services
- Availability
- Book
- Request Appointment
- Reviews
- Before / After

## 5. UI Direction

The UI should feel premium, warm, light, and beauty-focused.

Visual qualities:

- Warm white backgrounds.
- Soft beige and champagne surfaces.
- Subtle rose or terracotta accents.
- Editorial image crops.
- Calm shadows.
- High whitespace.
- Rounded but not cartoonish cards.
- Refined typography.
- Minimal chrome.
- Strong image hierarchy.

Avoid:

- Dark cyberpunk themes.
- Neon colors.
- Gaming gradients.
- Heavy glassmorphism everywhere.
- Dense admin-like panels in visitor surfaces.
- Social-media reaction clutter.

## 6. Design System Direction

### 6.1 Token Direction

Recommended semantic token families:

- `background`: warm white.
- `surface`: white.
- `surface-muted`: soft beige.
- `surface-elevated`: white with soft shadow.
- `border-subtle`: warm low-opacity border.
- `text-primary`: deep warm black.
- `text-secondary`: muted taupe.
- `accent-primary`: rose/terracotta.
- `accent-soft`: champagne.
- `success`: calm sage.
- `warning`: soft amber.
- `danger`: muted red.

Current theme observation:

The current palette already has warm background and peach primary tokens in `app/globals.css`. This direction should remain, but the design should reduce generic dashboard cards and social gradients. Dark mode should be secondary, not the main brand expression.

### 6.2 Typography

Recommended type pairing:

- Headlines/editorial: Playfair Display, Cormorant, or DM Serif.
- Body/UI: Inter, Manrope, or Satoshi.

Usage:

- Editorial hero titles: serif.
- Section titles: serif or high-weight sans depending on context.
- UI labels, filters, service lists, forms: sans.
- Price, date, availability, status: sans with strong hierarchy.

### 6.3 Component Philosophy

Components should be composed around user intent, not generic layout:

- LookCard: image-led portfolio/inspiration unit.
- StudioCard: comparison and trust unit.
- ServiceRow: service, duration, price, booking affordance.
- AvailabilityChip: date/time availability.
- TrustBadge: rating, verified, response speed, bookable status.
- BookingCTA: sticky, always visible near decision points.
- SearchSheet: mobile-first guided search.
- MapPreviewCard: map-linked studio summary.
- EditorialRail: horizontal curated discovery rail.
- BeforeAfterBlock: transformation showcase.

Prefer purposeful components over generic cards nested inside cards.

## 7. Mobile-First Strategy

Mobile is the primary product surface.

Mobile should feel native, cinematic, and thumb-friendly. It should not feel like a squeezed desktop dashboard.

Mobile principles:

- Bottom navigation for primary visitor actions.
- Sticky search entry and sticky booking CTA.
- Fullscreen search flow.
- Swipeable discovery rails.
- Large image-first cards.
- One primary action per screen section.
- Touch targets at least 44px.
- No required horizontal page scrolling except intentional carousels/rails.
- Use progressive disclosure for filters and booking details.

Core mobile navigation:

1. Inspiration
2. Search
3. Map / Near You
4. Bookings
5. Profile

Provider mobile surfaces should be simplified:

- Today
- Bookings
- Services
- Portfolio
- Settings

## 8. Information Architecture

### 8.1 Public Visitor IA

Recommended public routes:

- `/` - Inspiration homepage.
- `/search` - Search and discovery.
- `/map` - Map-first local exploration.
- `/salons/[slug]` - Salon page.
- `/looks/[id]` - Optional dedicated look detail.
- `/dashboard/bookings` or `/bookings` - Visitor bookings.
- `/dashboard/messages` or `/messages` - Visitor messages.
- `/profile/me` - Visitor account.

Current migration note:

- Current `/profile/[slug]` should become conceptually `Salon Page`.
- Current `/providers` should become search/discovery.
- Current `/` should become Inspiration, not a chronological feed.

### 8.2 Provider IA

Recommended provider surfaces:

- `/studio` or `/dashboard/salons` - Studio overview.
- `/studio/[id]` or current `/salon/[id]` - Studio console.
- Sections:
  - Overview
  - Booking Requests
  - Services
  - Portfolio / Looks
  - Gallery
  - Hours
  - Team
  - Contact
  - Settings

Provider tools can still feel functional, but should not bleed into visitor UX.

### 8.3 Admin IA

Admin can remain dashboard-like:

- Overview
- Providers
- Visitors
- Categories
- Settings
- Moderation

Admin UX should be utilitarian and not part of the premium visitor redesign.

## 9. Navigation Structure

### 9.1 Visitor Desktop

Top navigation:

- GlowySpot
- Inspiration
- Search
- Map
- Bookings
- Messages
- Profile / Sign in

Search should be globally accessible. A compact search bar can sit in the header on desktop.

### 9.2 Visitor Mobile

Bottom navigation:

- Inspiration
- Search
- Map
- Bookings
- Profile

The center action should not be a generic "create post" for visitors. If a center action exists, it should open Search or Booking.

### 9.3 Salon Page Navigation

Salon page should not require complex tabs for core conversion. Use anchored sections:

- Work
- Services
- Availability
- Reviews
- Team
- Location

Booking CTA remains sticky at bottom on mobile and sticky side panel on desktop.

### 9.4 Provider Navigation

Desktop can keep a left sidebar. Mobile needs a horizontal or bottom studio nav, as recently added for salon context.

Provider navigation labels should be professional:

- Overview
- Bookings
- Portfolio
- Services
- Hours
- Team
- Settings

## 10. Homepage Experience

Direction: Beauty Netflix discovery experience.

Primary goals:

- Inspire users quickly.
- Surface trends and local relevance.
- Drive search and booking.
- Build premium brand perception.

Recommended structure:

1. Cinematic hero with search overlay.
   - Headline: "Find your next beauty appointment."
   - Supporting copy: location-aware, trust-based.
   - Search fields: service, location, date.
2. Popular Now.
   - Horizontal rail of looks and services.
3. Near You.
   - Local studio rail with ratings and starting prices.
4. Trending Looks.
   - Visual masonry or editorial rail.
5. Last Minute Appointments.
   - Availability-led, conversion-focused.
6. Top Rated Salons.
   - Trust-led comparison cards.
7. Before / After.
   - Transformation-focused proof.
8. Featured Studios.
   - Premium editorial cards.

What to remove from homepage:

- Chronological feed as primary layout.
- Social engagement hierarchy.
- Story rings that imitate social platforms.
- Generic "latest posts" as the main product concept.

## 11. Content Strategy

Content exists to inspire, build trust, improve discovery, and increase booking confidence.

Content types:

- Look: finished work, style, category, tags.
- Before / After: transformation proof.
- Portfolio Collection: salon/stylist curated work.
- Editorial Collection: platform-curated trend or theme.
- Service Example: look attached to a bookable service.
- Latest Work: recent visual proof from a studio.

Each Look should support:

- Images.
- Salon/stylist attribution.
- Service association.
- Tags/style attributes.
- Location.
- Price indication when possible.
- Booking CTA.

Social mechanics to minimize:

- Likes should be secondary or renamed to Save.
- Comments should not dominate public discovery.
- Follower mechanics should not become a core product loop.

Current migration:

- Existing `Post` model can initially power Looks.
- Existing `layout`, `images`, `content`, `likes`, and `comments` can remain for compatibility.
- UI should progressively rename Posts to Looks/Portfolio.
- Later schema can introduce `Look`, `LookTag`, `BeforeAfter`, and `ServiceLook` if needed.

## 12. Discovery Flow

Primary discovery paths:

1. Inspiration-first:
   - User browses looks.
   - Opens a look detail.
   - Sees salon, service, price, availability.
   - Books or saves.

2. Search-first:
   - User enters service/location/date.
   - Sees list/map results.
   - Filters quickly.
   - Opens salon page or books.

3. Map-first:
   - User explores nearby studios.
   - Compares ratings, availability, and price.
   - Opens salon page or quick booking.

4. Trust-first:
   - User comes from a salon link.
   - Reviews hero, work, services, team, reviews.
   - Books.

Discovery should avoid dead ends. Every content card should lead to either:

- open salon,
- view related looks,
- save,
- book,
- refine search.

## 13. Search Experience

Direction: luxury minimal search inspired by Airbnb and Apple.

Search inputs:

- Service.
- Location.
- Date.
- Price range.
- Rating.
- Style/tags.
- Instant booking.
- Open now.
- Language.
- Premium filters.

Desktop behavior:

- Header search entry.
- Search modal for focused query creation.
- Results page with list + map hybrid.
- Filters in a compact side panel or top chips.

Mobile behavior:

- Fullscreen search sheet.
- Step-based flow:
  1. What do you need?
  2. Where?
  3. When?
  4. Preferences.
  5. Results.
- Keep steps skippable.
- Show active filters as chips.

Search success metrics:

- Search started.
- Results viewed.
- Salon opened.
- Booking started.
- Booking submitted.

## 14. Map Experience

Direction: map-first local exploration.

Desktop:

- Split layout:
  - left: salon result list.
  - right: interactive map.
- Hover/list selection highlights map pin.
- Pin click opens compact studio preview.

Mobile:

- Map can expand full screen.
- Bottom sheet with swipeable studio cards.
- Search/filter chips remain accessible.
- List/map toggle should be obvious.

Map card content:

- Image.
- Salon name.
- Category.
- Rating/reviews.
- Starting price.
- Distance.
- Available soon indicator.
- Book CTA.

Performance:

- Lazy-load map.
- Cluster pins.
- Avoid rendering all markers at once.
- Debounce map bounds search.

## 15. Salon Page Experience

Direction: luxury editorial + portfolio-focused booking page.

Primary goals:

- Trust.
- Conversion.
- Visual storytelling.
- Clear booking.

Recommended structure:

1. Cinematic hero/gallery.
   - Large salon image or best work.
   - Name, category, rating, location.
   - Sticky/mobile booking CTA.

2. Quick trust strip.
   - Rating.
   - Review count.
   - Verified details.
   - Response time.
   - Bookable status.

3. Services overview.
   - Service name.
   - Duration.
   - Price.
   - Book button.

4. Portfolio / Looks.
   - Visual grid.
   - Filter by service/style.
   - Before/after support.

5. Availability.
   - Next available dates.
   - Request time if full scheduling is not implemented.

6. Team / stylists.
   - Bio.
   - Specialty.
   - Portfolio subset.

7. Reviews.
   - Rating summary.
   - Review cards.
   - Photo reviews later.

8. Location.
   - Address.
   - Map.
   - Directions.
   - Parking/access notes later.

9. Atmosphere.
   - Gallery, amenities, languages, policies.

Booking CTA behavior:

- Mobile: sticky bottom bar.
- Desktop: sticky right booking panel.
- CTA copy should be clear: "Book appointment" or "Request appointment".

## 16. Booking Flow

Booking V1 currently supports:

- Visitor creates pending request.
- Provider accepts/rejects.
- Visitor sees status.
- Visitor can cancel pending.
- Internal messages notify decisions.

Product direction:

Booking should feel frictionless even before a full scheduling engine exists.

Booking V1 UX:

1. User selects service.
2. User selects preferred date/time.
3. User confirms details.
4. Request submitted as pending.
5. Visitor sees status in My Bookings.
6. Provider handles request.
7. Visitor receives message/status update.

Future Booking V2:

- Availability slots.
- Opening-hours validation.
- Conflict prevention at database level.
- Staff-level booking.
- Deposits/payments.
- Cancellation policy.
- Reminders.
- Calendar sync.

Booking UX rules:

- Never hide status.
- Always explain pending vs confirmed.
- Avoid jargon.
- Make cancellation rules visible.
- Keep provider decisions one tap/click.

## 17. Responsive Behavior

Breakpoints:

- Mobile: 360-480px.
- Large mobile/small tablet: 481-767px.
- Tablet: 768-1023px.
- Desktop: 1024px+.
- Wide: 1280px+.

General rules:

- No page-level horizontal overflow.
- Carousels may scroll horizontally only inside their own container.
- Cards stack on mobile.
- Filters become fullscreen sheets on mobile.
- Booking CTA becomes sticky bottom on mobile.
- Desktop sidebars become mobile sheets or rails.
- Images use stable aspect ratios.
- Text wraps before causing layout expansion.

## 18. Conversion Strategy

Primary conversion events:

- Search started.
- Salon page opened.
- Service viewed.
- Booking CTA clicked.
- Booking request submitted.
- Booking confirmed.

Conversion levers:

- Always-visible booking CTA.
- Service-to-look linking.
- Trust strip above the fold.
- Clear pricing and duration.
- Fast search.
- "Near you" and "available soon" modules.
- Save/favorite for users not ready to book.
- Internal messages that keep users informed.

Avoid:

- Making users interpret social posts to understand services.
- Hiding prices deep in tabs.
- Overloading salon page with admin-like blocks.
- Asking for account creation too early if not required.

## 19. Performance Considerations

Performance is part of premium feel.

Priorities:

- Optimize image delivery with Next/Image and stable sizes.
- Prefer server-rendered public discovery where possible.
- Avoid fetching all salons/posts on client for search.
- Lazy-load map and heavy modals.
- Use skeletons that match final layout size.
- Keep homepage sections independently loadable.
- Paginate/infinite-load looks responsibly.
- Minimize client components for static editorial sections.

Known current risk:

- Many public pages are client-heavy.
- Feed/search logic is client-side.
- Image handling has required stabilization.
- Map integration should be lazy and isolated.

## 20. Future Scalability Considerations

Product scalability:

- Support multiple cities/countries.
- Support salon chains.
- Support staff-level portfolios.
- Support advanced availability and booking.
- Support payments and deposits.
- Support moderation and quality ranking.
- Support editorial collections.

Technical scalability:

- Split large server action files by domain.
- Introduce search indexing when data grows.
- Add caching for public discovery.
- Add normalized Look/Portfolio models later.
- Add analytics event tracking.
- Add stronger tests for booking and auth flows.
- Add e2e tests for mobile discovery and booking.

## 21. Current Structure Assessment

### Should Remain

- Next.js App Router.
- Prisma data model foundation.
- NextAuth authentication.
- Existing booking V1 logic as baseline.
- Existing salon settings/services/hours/gallery/team/contact structure.
- Existing warm brand tokens as a starting point.
- Safe image handling.
- Internal Message model for booking communication.

### Should Be Redesigned

- Homepage from feed-first to Inspiration-first.
- Providers page into Search/Map discovery.
- Profile page into Salon Page.
- StoryBar into Featured Studios / Latest Work rail.
- FeedCard into LookCard.
- Sidebar-heavy visitor layout into mobile-first discovery navigation.
- Provider dashboard visuals into a lighter Studio Manager.

### Should Be Removed or De-emphasized

- Social feed framing.
- Story ring metaphor.
- Likes/comments as dominant content actions.
- Generic post creation as a visitor-facing concept.
- Dashboard-style public browsing.
- Dark/cyberpunk visual direction as a primary identity.

## 22. Migration Philosophy

This redesign should be phased. Do not rewrite everything at once.

Recommended migration order:

1. Define design tokens and terminology.
2. Build new public layout primitives.
3. Rebuild homepage as Inspiration.
4. Rebuild provider search/list as Search.
5. Add map discovery.
6. Rebuild salon page around conversion.
7. Refine booking UI.
8. Reposition provider content tools from Posts to Portfolio/Looks.
9. Improve provider studio console.
10. Add analytics and performance checks.

Each phase should keep existing data and core behavior working.

