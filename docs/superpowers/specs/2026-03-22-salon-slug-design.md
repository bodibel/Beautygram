# Salon SEO-Friendly Slug URLs — Design Spec

**Date:** 2026-03-22
**Status:** Approved

---

## Problem

Salon profile URLs currently use Prisma CUIDs:
`/profile/cmkr0wz67009ts1lh3zikdo9m`

These are meaningless to users and search engines. Readable slugs improve SEO, shareability, and user trust.

---

## Goal

Replace CUID-based profile URLs with human-readable slugs derived from the salon name:
`/profile/single-salon-studio`

---

## Approach: Slug stored in DB, slug-only routing

The `Salon` model gets a `slug` field (`String @unique`). Slugs are generated once at salon creation from the salon name and never change automatically (even if the name changes later). Uniqueness conflicts are resolved by appending a numeric suffix.

This approach is chosen over:
- **On-the-fly computation** — slug would change if the name changes, breaking links and SEO
- **ID + slug fallback routing** — unnecessary complexity; the app is pre-launch so old ID links are not a concern

---

## Design

### 1. Prisma Schema

Add to the `Salon` model:

```prisma
slug String @unique
```

Migration: `prisma db push` adds the nullable column, then a one-time seed script backfills slugs for existing salons before applying `@unique` enforcement.

### 2. Slug Generation Utility

File: `lib/slug.ts`

```ts
generateSlug(name: string): string
generateUniqueSlug(name: string, prisma: PrismaClient, excludeId?: string): Promise<string>
```

**`generateSlug` rules:**
- Lowercase the name
- Transliterate Hungarian characters: `á→a`, `é→e`, `í→i`, `ó→o`, `ö→o`, `ő→o`, `ú→u`, `ü→u`, `ű→u`
- Replace spaces and non-alphanumeric chars with `-`
- Collapse multiple `-` into one
- Trim leading/trailing `-`

**`generateUniqueSlug` rules:**
- Generate base slug
- Query DB: if `slug` not taken → return it
- If taken → try `slug-2`, `slug-3`, … until unique
- `excludeId` allows updating a salon's own slug without self-collision

### 3. Routing

| Before | After |
|--------|-------|
| `app/profile/[id]/page.tsx` | `app/profile/[slug]/page.tsx` |
| `getPublicSalonData(id)` lookup by `id` | lookup by `slug` |

The page component receives `slug` from params. All internal IDs (salonId for messages, likes, reviews, posts) remain unchanged — they still use the Prisma CUID from the loaded salon object.

### 4. Internal Links Updated

Every place that builds a salon profile URL must change from `/profile/${salon.id}` to `/profile/${salon.slug}`:

- `components/home/feed-card.tsx` — author object must include `slug`
- `components/home/post-detail-modal.tsx` — author object must include `slug`
- `components/home/post-card.tsx` — `author.id` used in profile link (lines 31, 35); `slug` must be added to the author shape
- `components/home/provider-card.tsx` — receives both `id` (CUID, passed to `FavoriteButton`) and `slug` (used in the `href`); the profile link changes to use `slug`, but `salonId={id}` passed to `FavoriteButton` stays as the CUID
- `components/home/story-bar.tsx` — uses `salon.id` from `getFeaturedSalons`; that action's select must include `slug`
- `components/layout/right-sidebar.tsx` — uses `salon.id` from `getRecentSalons`; that action's select must include `slug`

### 5. Server Actions

`getPublicSalonData(slug: string)` — fetches by `slug` instead of `id`.

`createSalon(...)` — calls `generateUniqueSlug` and stores the result.

`getFeaturedSalons(...)` — add `slug` to the `select` clause so `StoryBar` can build correct profile links.

`getRecentSalons(...)` — add `slug` to the `select` clause so `RightSidebar` can build correct profile links.

`getRecentPosts(...)` — the posts feed action that populates `FeedCard` and `PostDetailModal`. Its nested `salon` select (inside the `post.findMany` call) must include `slug`, otherwise `post.author.slug` is `undefined` and all feed card profile links break.

`createReview(...)` — currently calls `revalidatePath('/profile/${data.salonId}')` with a CUID. After the rename to `[slug]`, this becomes a no-op. Fix: look up the salon slug and call `revalidatePath('/profile/${slug}')`, or use `revalidatePath('/profile/[slug]', 'layout')`.

No slug-update action is needed in this iteration (slug is immutable after creation).

### 6. Migration Script for Existing Salons

A one-time script (`scripts/backfill-slugs.ts`) run after `prisma db push`:
- Fetches all salons without a slug
- Calls `generateUniqueSlug` for each
- Updates the DB

### 7. Dashboard — Slug Preview

The app has three distinct salon creation surfaces. The slug preview (live URL below the name field) should be added to all three:

- `components/wizard/SalonWizard.tsx` — the primary onboarding wizard
- `components/dashboard/provider-dashboard.tsx` — quick-create in the provider dashboard
- `components/salons/create-salon-modal.tsx` — modal-based creation

Preview format:
```
glowyspot.com/profile/single-salon-studio
```

Uses the client-side `generateSlug` function (no uniqueness check on client — that runs server-side on submit).

---

## Data Flow

```
User types salon name
  → generateSlug(name)           [client, preview only]
  → form submit
  → createSalon action
  → generateUniqueSlug(name, prisma)  [server, authoritative]
  → Salon.slug stored in DB
  → profile URL: /profile/{slug}
```

---

## What Is NOT in Scope

- Slug editing by salon owner (future)
- Redirecting old CUID URLs (app is pre-launch; no need)
- Slug in the salon `[id]` dashboard routes (those are admin/owner routes, not public-facing)

---

## Files to Create / Modify

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `slug String @unique` to `Salon` |
| `lib/slug.ts` | New: slug generation utilities |
| `scripts/backfill-slugs.ts` | New: one-time migration for existing salons |
| `lib/actions/salon.ts` | `getPublicSalonData` by slug; `createSalon` generates slug; `getFeaturedSalons` + `getRecentSalons` + `getRecentPosts` select slug; `createReview` revalidatePath fix |
| `app/profile/[id]/page.tsx` | Rename dir to `[slug]`, update param usage |
| `components/home/feed-card.tsx` | Use `slug` in profile link |
| `components/home/post-detail-modal.tsx` | Use `slug` in profile link |
| `components/home/post-card.tsx` | Use `slug` in author profile link |
| `components/home/provider-card.tsx` | Add `slug` prop alongside `id`; profile link uses `slug`, FavoriteButton still uses `id` |
| `components/home/story-bar.tsx` | Use `slug` in profile link |
| `components/layout/right-sidebar.tsx` | Use `slug` in profile link |
| `components/wizard/SalonWizard.tsx` | Add slug preview below name field |
| `components/dashboard/provider-dashboard.tsx` | Add slug preview below name field. Note: the existing `/salon/${salon.id}` dashboard link is a pre-existing bug, out of scope for this feature. |
| `components/salons/create-salon-modal.tsx` | Add slug preview below name field |
