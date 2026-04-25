# GlowySpot Project Memory

This document is an internal decision registry for ongoing GlowySpot development. Read it before making major schema, deployment, or MVP-scope decisions.

## Project Purpose

- GlowySpot is a beauty discovery platform focused on helping users find providers through posts, profile content, and filtering.
- The core product value is helping providers generate real leads, contact messages, and appointment requests.
- Discovery-oriented social content supports conversion, but it is not the product goal by itself.

## MVP Boundaries

- Booking in MVP = appointment request only.
- Messaging in MVP = simple contact messaging only.
- No full booking engine.
- No realtime chat system.
- No advanced analytics platform.
- No advanced search engine.
- No notification system beyond basic data structures already present.
- UX should stay simple, minimal, guided where needed, and low-friction.
- Avoid large, complex dashboards.

## Role Model

- Default authenticated user is not automatically a provider.
- A user becomes a provider by creating their first salon.
- MVP flow = 1 provider = 1 salon.
- Admin is a separate privileged role and must never be assigned from client-controlled input.

## Core Product Rules

- Provider success is measured by leads, contact messages, and appointment requests.
- Public discovery should work through posts, provider profile pages, and filtering.
- Public profile pages are important product surfaces and should remain stable.
- Contact and appointment actions must be enforced at backend/business-logic level, not only in UI.
- Public-facing “premium” or subscription-driven surfacing must not be invented speculatively.

## Schema Decisions

### Keep In Target Schema

- `User.createdAt`
- `User.updatedAt`
- `Salon.slug`
- `Salon.salonFingerprint`
- Active salon contact/display fields:
  - `allowMessages`
  - `allowBookings`
  - `showPhoneOnProfile`
  - `showEmailOnProfile`
  - `ownerName`
  - `ownerImage`
  - `aboutMe`
  - `isTeam`
- `Post.layout`
- `Message.salonId`
- `Subscription`
- `SubscriptionConfig`
- `PasswordResetToken`
- `AuditLog`

### Deferred Schema/Product Decisions

- `Post.videos`
- Full `notify*` field strategy
- Exact depth of subscription schema

### Interpretation Notes

- `Salon.slug` is actively required by current public profile and provider discovery flows.
- `Salon.salonFingerprint` is currently part of duplicate-prevention logic and should not be removed casually.
- `Message.salonId` is important for salon-scoped contact and appointment-request context.
- `Subscription` and `SubscriptionConfig` exist in the current app logic even though subscription product depth is still limited.
- `AuditLog` is part of the backend/system audit trail and admin inspection flow.

## Technical/Development Rules

- Work task-by-task.
- Review after each task.
- Keep changes minimal and localized.
- Do not broadly refactor without explicit instruction.
- Prefer conservative, production-safe changes.
- Do not fake completion without verification.
- Clearly separate static verification from runtime verification when runtime proof is not available.
- Do not silently change behavior outside the requested task scope.
- Do not modify database schema unless explicitly requested.
- Maintain audit-style documentation of progress and important decisions.

## Deployment Rules

- The live deployment at `/opt/projects/glowyspot` is sensitive and must not be overwritten blindly.
- Use side-by-side deployment strategy.
- New staged area is `/opt/projects/glowyspot-next`.
- Do not reuse the live DB blindly.
- Do not reuse the live uploads path blindly.
- Do not switch proxy traffic until staged verification is complete.
- Proxy cutover must happen only after staged verification.
- Do not run destructive Prisma commands against live or staging without explicit approval.

## Deferred Decisions

- Whether `Post.videos` remains a real feature in the near-term product.
- Whether the `notify*` settings become a real execution layer or remain only stored preferences.
- How deep subscriptions should go beyond the currently wired MVP/business rules.
- Whether subscription UI remains minimal/informational or becomes a full billing workflow later.
- How schema/migration drift should be reconciled in repo history before future import or deployment alignment work.

## Known Non-Goals

- Full booking engine
- Realtime messaging platform
- Calendar/availability engine
- Payment flow expansion unless explicitly planned
- Analytics dashboard suite
- Full social network behavior
- Large admin redesign
- Broad cleanup refactors for their own sake

