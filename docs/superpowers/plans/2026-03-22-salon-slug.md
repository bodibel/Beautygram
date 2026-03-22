# Salon SEO-Friendly Slug URLs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace CUID-based salon profile URLs (`/profile/cmkr0wz67009ts1lh3zikdo9m`) with human-readable slugs (`/profile/single-salon-studio`).

**Architecture:** Add a `slug` field to the `Salon` Prisma model; generate slugs from the salon name at creation time; rename the `[id]` route to `[slug]` and update all lookups and internal links accordingly.

**Tech Stack:** Next.js 14 App Router, Prisma (PostgreSQL), TypeScript, Tailwind v4

> **Note:** This project has no test infrastructure. Each task includes a manual verification step instead of automated tests.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `lib/slug.ts` | Create | Slug generation utilities |
| `scripts/backfill-slugs.ts` | Create | One-time migration for existing 12 salons |
| `prisma/schema.prisma` | Modify | Add `slug String @unique` to `Salon` |
| `lib/actions/salon.ts` | Modify | 6 function updates (see Task 3) |
| `app/profile/[id]/` → `app/profile/[slug]/` | Rename dir | Route uses slug param |
| `components/home/feed-card.tsx` | Modify | Use `author.slug` in profile link |
| `components/home/post-card.tsx` | Modify | Use `author.slug` in profile link |
| `components/home/post-detail-modal.tsx` | Modify | Use `author.slug` in profile link |
| `components/home/provider-card.tsx` | Modify | Add `slug` prop; link uses slug, FavoriteButton keeps `id` |
| `components/home/story-bar.tsx` | Modify | Add `slug` to `FeaturedSalon` interface; use in link |
| `components/layout/right-sidebar.tsx` | Modify | Use `salon.slug` in profile link |
| `app/profile/[slug]/page.tsx` | Modify | Add `slug` to inline author object passed to FeedCard |
| `app/providers/page.tsx` | Modify | Add `slug` to provider mapping object; update `getAllSalons` select |
| `app/dashboard/favorites/page.tsx` | Modify | Add `slug` to favorites mapping object; update `getUserFavorites` select |
| `components/wizard/SalonWizard.tsx` | Modify | Add live slug preview below name field |
| `components/salons/create-salon-modal.tsx` | Modify | Add live slug preview below name field |
| `components/dashboard/provider-dashboard.tsx` | Modify | Add live slug preview below name field |

---

## Task 1: Create Slug Utility (`lib/slug.ts`)

**Files:**
- Create: `lib/slug.ts`

- [ ] **Step 1: Create the file**

```ts
// lib/slug.ts

/**
 * Transliterate Hungarian characters and generate a URL-safe slug.
 * Pure function — safe to call on the client.
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/á/g, "a")
    .replace(/é/g, "e")
    .replace(/í/g, "i")
    .replace(/ó/g, "o")
    .replace(/ö/g, "o")
    .replace(/ő/g, "o")
    .replace(/ú/g, "u")
    .replace(/ü/g, "u")
    .replace(/ű/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * Generate a slug that is guaranteed unique in the DB.
 * Appends -2, -3, ... if the base slug is already taken.
 * Pass excludeId to skip checking the salon's own current record (for future slug updates).
 */
export async function generateUniqueSlug(
  name: string,
  prisma: import("@prisma/client").PrismaClient,
  excludeId?: string
): Promise<string> {
  const base = generateSlug(name)
  let slug = base
  let counter = 2

  while (true) {
    const existing = await prisma.salon.findUnique({
      where: { slug },
      select: { id: true },
    })
    if (!existing || existing.id === excludeId) return slug
    slug = `${base}-${counter++}`
  }
}
```

- [ ] **Step 2: Verify manually**

Open Node REPL or check in a quick console test that:
- `generateSlug("Single Salon Stúdió")` → `"single-salon-studio"`
- `generateSlug("Rózsa Szépségszalon")` → `"rozsa-szepsegszalon"`
- `generateSlug("  Hair & Nails!! ")` → `"hair-nails"`

- [ ] **Step 3: Commit**

```bash
git add lib/slug.ts
git commit -m "feat: add slug generation utilities"
```

---

## Task 2: Add `slug` to Prisma Schema + Migrate

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `scripts/backfill-slugs.ts`

- [ ] **Step 1: Add `slug` field to `Salon` model**

In `prisma/schema.prisma`, find the `Salon` model. Add after the `salonFingerprint` field (around line 129):

```prisma
slug          String?  @unique
```

> **Why nullable first:** We need nullable so `db push` can add the column without violating `@unique` on existing rows (they'll all be `null`). The backfill script fills them in, then we make it required in Task 2 Step 6.

- [ ] **Step 2: Push schema to local DB**

```bash
cd C:\Dev\Glowyspot
npx prisma db push
```

Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Create the backfill script**

Create `scripts/backfill-slugs.ts`:

```ts
import { PrismaClient } from "@prisma/client"
import { generateUniqueSlug } from "../lib/slug"

const prisma = new PrismaClient()

async function main() {
  const salons = await prisma.salon.findMany({
    where: { slug: null },
    select: { id: true, name: true },
  })

  console.log(`Backfilling slugs for ${salons.length} salons...`)

  for (const salon of salons) {
    const slug = await generateUniqueSlug(salon.name, prisma, salon.id)
    await prisma.salon.update({
      where: { id: salon.id },
      data: { slug },
    })
    console.log(`  ${salon.name} → ${slug}`)
  }

  console.log("Done!")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 4: Run the backfill script**

```bash
cd C:\Dev\Glowyspot
npx tsx scripts/backfill-slugs.ts
```

Expected output: each of the 12 salons listed with their new slug.

- [ ] **Step 5: Verify all salons have a distinct slug before making it required**

```bash
npx prisma db execute --stdin <<'SQL'
SELECT COUNT(*) as total, COUNT(slug) as with_slug, COUNT(DISTINCT slug) as unique_slugs FROM "Salon";
SQL
```

Expected: `total == with_slug == unique_slugs` (no nulls, no duplicates). Only proceed if this is true.

- [ ] **Step 6: Make `slug` required (non-nullable)**

In `prisma/schema.prisma`, change the `slug` line to:

```prisma
slug          String   @unique
```

Then push again:

```bash
npx prisma db push
```

Expected: sync success (all rows already have slugs, so non-null constraint is safe).

- [ ] **Step 6: Verify in DB**

```bash
npx prisma studio
```

Open the `Salon` table and confirm all 12 salons have a `slug` value.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma scripts/backfill-slugs.ts
git commit -m "feat: add slug field to Salon model and backfill existing salons"
```

---

## Task 3: Update Server Actions (`lib/actions/salon.ts`)

**Files:**
- Modify: `lib/actions/salon.ts`

Six changes in one file. Make them one by one.

### 3a. `getPublicSalonData` — lookup by slug

- [ ] **Step 1: Change the function signature and where clause**

Find `getPublicSalonData` (around line 436). Change:

```ts
// BEFORE
export async function getPublicSalonData(salonId: string) {
  const salon = await prisma.salon.findFirst({
    where: {
      id: salonId,
      isActive: true
    },
```

```ts
// AFTER
export async function getPublicSalonData(slug: string) {
  const salon = await prisma.salon.findFirst({
    where: {
      slug,
      isActive: true
    },
```

### 3b. `createSalon` — generate slug on create

- [ ] **Step 2: Add import at the top of `lib/actions/salon.ts` first**

```ts
import { generateUniqueSlug } from "@/lib/slug"
```

> Add this before any other changes to the file so the import is available for Step 3.

- [ ] **Step 3: Generate and include slug in the create call**

Find `createSalon` (around line 229). Before the `prisma.salon.create(...)` call, add:

```ts
const slug = await generateUniqueSlug(data.name, prisma)
```

Then inside the `data:` object passed to `prisma.salon.create(...)`, add:

```ts
slug,
```

### 3c. `getFeaturedSalons` — add `slug` to select

- [ ] **Step 4: Add `slug` to the select block**

Find `getFeaturedSalons` (around line 355). Add `slug: true` alongside the existing fields. Do NOT reproduce `subscriptionPlan: true` if it already exists in the file — it references a non-existent direct field on `Salon` (it's a relation) and is a pre-existing issue. Only add `slug: true`:

```ts
const select = {
  id: true,
  name: true,
  slug: true,      // ← add this line only
  // leave all other existing fields untouched
}
```

### 3d. `getRecentSalons` — add `slug` to select

- [ ] **Step 5: Add `slug` to the select block**

Find `getRecentSalons` (around line 415). Add `slug: true`:

```ts
select: {
  id: true,
  name: true,
  slug: true,      // ← add this
  profileImage: true,
  categories: true,
  city: true,
  rating: true,
}
```

### 3e. `getRecentPosts` — add `slug` to nested salon select

- [ ] **Step 6: Add `slug` to the nested salon select**

Find `getRecentPosts` (around line 501). Inside the `post.findMany` call, find the nested `salon: { select: { ... } }` block (around line 545). Add `slug: true`:

```ts
salon: {
  select: {
    id: true,
    name: true,
    slug: true,      // ← add this
    ownerId: true,
    categories: true,
    images: true,
    currency: true,
    rating: true,
    reviewCount: true,
    services: {
      select: { price: true }
    },
    profileImage: true
  }
}
```

### 3f. `createReview` — fix `revalidatePath`

- [ ] **Step 7: Fix the revalidatePath call**

Find `createReview` (around line 833). Find the `revalidatePath` call (around line 869):

```ts
// BEFORE
revalidatePath(`/profile/${data.salonId}`)
```

Replace with a slug-aware revalidation:

```ts
// AFTER
const salonForRevalidate = await prisma.salon.findUnique({
  where: { id: data.salonId },
  select: { slug: true },
})
if (salonForRevalidate?.slug) {
  revalidatePath(`/profile/${salonForRevalidate.slug}`)
}
```

- [ ] **Step 8: Verify the app still compiles**

```bash
cd C:\Dev\Glowyspot
npx tsc --noEmit
```

Expected: no errors (or only pre-existing errors unrelated to our changes).

- [ ] **Step 9: Commit**

```bash
git add lib/actions/salon.ts lib/slug.ts
git commit -m "feat: update server actions to use slug for salon lookups and links"
```

---

## Task 4: Rename Route to `[slug]`

**Files:**
- Rename: `app/profile/[id]/` → `app/profile/[slug]/`
- Modify: `app/profile/[slug]/page.tsx`

- [ ] **Step 1: Rename the directory**

```bash
mv "C:\Dev\Glowyspot\.claude\worktrees\wizardly-visvesvaraya\app\profile\[id]" \
   "C:\Dev\Glowyspot\.claude\worktrees\wizardly-visvesvaraya\app\profile\[slug]"
```

Or in Git:
```bash
cd C:\Dev\Glowyspot\.claude\worktrees\wizardly-visvesvaraya
git mv "app/profile/[id]" "app/profile/[slug]"
```

- [ ] **Step 2: Update the page component**

In `app/profile/[slug]/page.tsx`, change the param destructuring (around line 22-24):

```ts
// BEFORE
export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  ...
  const { id } = use(params)
```

```ts
// AFTER
export default function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  ...
  const { slug } = use(params)
```

- [ ] **Step 3: Update all uses of `id` that came from params (NOT the salon's `id`)**

In the same file, the param value (`id`) was used in two places:
1. `loadSalonData()` → calls `getPublicSalonData(id)` — change to `getPublicSalonData(slug)`
2. `useEffect` dependency → `[id]` — change to `[slug]`

The local `salon.id` (from the loaded salon object) stays unchanged — it's used for FavoriteButton, MessageModal, etc.

Find and update (around line 96-108):
```ts
// BEFORE
useEffect(() => {
  loadSalonData()
}, [id])

const loadSalonData = async () => {
  try {
    const data = await getPublicSalonData(id)
```

```ts
// AFTER
useEffect(() => {
  loadSalonData()
}, [slug])

const loadSalonData = async () => {
  try {
    const data = await getPublicSalonData(slug)
```

- [ ] **Step 4: Also update the loading guard**

Find (around line 135):
```ts
// BEFORE
if (loading || (!salon && id !== "me")) {
```

```ts
// AFTER
if (loading || (!salon && slug !== "me")) {
```

- [ ] **Step 5: Verify in browser**

Start the dev server and navigate to a salon profile via its slug (e.g., `/profile/rozsa-szepsegszalon`). The page should load correctly.

- [ ] **Step 6: Commit**

```bash
git add "app/profile/[slug]"
git commit -m "feat: rename profile route from [id] to [slug]"
```

---

## Task 5: Update UI Components

Six components need their profile link updated from `id` to `slug`.

### 5a. `feed-card.tsx`

**File:** `components/home/feed-card.tsx`

- [ ] **Step 1: Add `slug` to the author interface**

Find the author type (around line 15). Add `slug` field:

```ts
author: {
  id: string
  name: string
  avatar: string
  role: string
  slug: string        // ← add this
  currency?: string
  minPrice?: number
  rating?: number
  reviewCount?: number
}
```

- [ ] **Step 2: Update the profile link**

Find the `Link href` (around line 206). Change:

```ts
// BEFORE
href={`/profile/${post.author.id}`}
// AFTER
href={`/profile/${post.author.slug}`}
```

### 5b. `post-card.tsx`

**File:** `components/home/post-card.tsx`

- [ ] **Step 3: Add `slug` to the author interface**

Find the author interface (around line 11):

```ts
author: {
  id: string
  name: string
  avatar: string
  role: string
  slug: string        // ← add this
}
```

- [ ] **Step 4: Update both profile navigation calls**

Find lines ~31 and ~35:

```ts
// BEFORE (line ~31)
onClick={() => window.location.href = `/profile/${author.id}`}
// AFTER
onClick={() => window.location.href = `/profile/${author.slug}`}

// BEFORE (line ~35)
onClick={() => window.location.href = `/profile/${author.id}`}
// AFTER
onClick={() => window.location.href = `/profile/${author.slug}`}
```

### 5c. `post-detail-modal.tsx`

**File:** `components/home/post-detail-modal.tsx`

- [ ] **Step 5: Add `slug` to the author interface**

Find the author type in the `PostDetailModalProps` interface (around line 19):

```ts
author: {
  id: string
  name: string
  avatar: string
  role: string
  slug: string        // ← add this
  currency?: string
  minPrice?: number
  rating?: number
  reviewCount?: number
}
```

- [ ] **Step 6: Update the profile link**

Find the `Link href` (around line 169):

```ts
// BEFORE
<Link href={`/profile/${post.author.id}`} className="flex items-center gap-3">
// AFTER
<Link href={`/profile/${post.author.slug}`} className="flex items-center gap-3">
```

### 5d. `provider-card.tsx`

**File:** `components/home/provider-card.tsx`

- [ ] **Step 7: Add `slug` to the props interface (keep `id`)**

Find the `ProviderCardProps` interface (around line 10):

```ts
interface ProviderCardProps {
  id: string
  slug: string          // ← add this
  name: string
  category: string
  rating: number
  reviewCount: number
  location: string
  image: string
  avatar: string
  languages?: string[]
}
```

- [ ] **Step 8: Update the profile link, keep FavoriteButton using `id`**

Find the main Link (around line 26):

```ts
// BEFORE
<Link href={`/profile/${id}`} className="block h-full">
// AFTER
<Link href={`/profile/${slug}`} className="block h-full">
```

The `FavoriteButton` call (`salonId={id}`) stays unchanged — it needs the CUID.

### 5e. `story-bar.tsx`

**File:** `components/home/story-bar.tsx`

- [ ] **Step 9: Add `slug` to the `FeaturedSalon` interface**

Find the interface (around line 10):

```ts
interface FeaturedSalon {
  id: string
  name: string
  slug: string          // ← add this
  profileImage: string | null
  categories: string[]
  city: string
  rating: number
  subscriptionPlan: string
}
```

- [ ] **Step 10: Update the profile link**

Find the Link (around line 63):

```ts
// BEFORE
href={`/profile/${salon.id}`}
// AFTER
href={`/profile/${salon.slug}`}
```

### 5f. `right-sidebar.tsx`

**File:** `components/layout/right-sidebar.tsx`

- [ ] **Step 11: Update the profile link**

Find the Link (around line 78):

```ts
// BEFORE
href={`/profile/${salon.id}`}
// AFTER
href={`/profile/${salon.slug}`}
```

- [ ] **Step 12: Verify in browser**

Start the dev server. Check:
- Home page feed cards link to `/profile/<slug>` (hover to see URL in status bar)
- Story bar links correctly
- Right sidebar links correctly
- Clicking any salon profile loads correctly

- [ ] **Step 13: Commit**

```bash
git add components/home/feed-card.tsx \
        components/home/post-card.tsx \
        components/home/post-detail-modal.tsx \
        components/home/provider-card.tsx \
        components/home/story-bar.tsx \
        components/layout/right-sidebar.tsx
git commit -m "feat: update all profile links to use slug instead of id"
```

---

## Task 6: Update Call Sites of `ProviderCard` + Profile Page Author Object

### 6a. Fix inline `author` object in the profile page

**File:** `app/profile/[slug]/page.tsx`

- [ ] **Step 1: Add `slug` to the inline author object (around line 210)**

The profile page builds an `author` object inline and passes it to `FeedCard`. This object must include `slug`:

```ts
// BEFORE
author: {
    id: salon.id,
    name: salon.name,
    avatar,
    role: salon.categories?.[0] || "Beauty Salon"
}

// AFTER
author: {
    id: salon.id,
    name: salon.name,
    avatar,
    role: salon.categories?.[0] || "Beauty Salon",
    slug: salon.slug,
}
```

### 6b. Find and fix all `ProviderCard` call sites

- [ ] **Step 2: Find all usages (search from repo root, not just components/)**

```bash
grep -r "ProviderCard" C:\Dev\Glowyspot\.claude\worktrees\wizardly-visvesvaraya \
  --include="*.tsx" -l
```

Expected files with call sites:
- `app/providers/page.tsx`
- `app/dashboard/favorites/page.tsx`
- Possibly others

### 6c. `app/providers/page.tsx`

- [ ] **Step 3: No server action change needed for `getAllSalons`**

`getAllSalons` uses a bare `prisma.salon.findMany({ where: { isActive: true } })` with no `select` — it returns all columns. Once `slug` is in the schema (Task 2), it will be returned automatically. Do NOT add a `select` here; doing so would risk dropping other fields the providers page uses.

- [ ] **Step 4: Add `slug` to the provider mapping object in `app/providers/page.tsx`**

Find the `.map()` that builds the object passed to `<ProviderCard>` (around line 21–31). Add `slug: salon.slug` to the mapped object.

### 6d. `app/dashboard/favorites/page.tsx`

- [ ] **Step 5: No server action change needed for `getUserFavorites`**

`getUserFavorites` uses `include: { salon: { include: { services: ... } } }` — not a `select`. Because it uses `include`, `slug` will be returned automatically once the schema column exists. Do NOT convert it to a `select`; that would silently drop `services` and other fields the favorites card needs.

- [ ] **Step 6: Add `slug` to the favorites mapping object in `app/dashboard/favorites/page.tsx`**

Find the `.map()` that builds the object passed to `<ProviderCard>` (around line 26–36). Add `slug: fav.salon.slug` to the mapped object.

- [ ] **Step 7: Commit**

```bash
git add app/profile/[slug]/page.tsx \
        app/providers/page.tsx \
        app/dashboard/favorites/page.tsx \
        lib/actions/salon.ts
git commit -m "feat: pass slug prop to all ProviderCard call sites"
```

---

## Task 7: Add Slug Preview to Salon Creation Forms

Three forms get a live slug preview. The pattern is the same for each.

**Import needed in each file:**

```ts
import { generateSlug } from "@/lib/slug"
```

**Preview UI snippet (reuse in all three):**

```tsx
{name.trim() && (
  <p className="text-xs text-muted-foreground mt-1">
    URL: <span className="font-mono text-primary">glowyspot.com/profile/{generateSlug(name)}</span>
  </p>
)}
```

### 7a. `SalonWizard.tsx`

**File:** `components/wizard/SalonWizard.tsx`

- [ ] **Step 1: Add import at top of file**

```ts
import { generateSlug } from "@/lib/slug"
```

- [ ] **Step 2: Add preview below the name input (around line 541)**

```tsx
<Label>Szalon neve *</Label>
<Input
    value={name}
    onChange={(e) => setName(e.target.value)}
    placeholder="Pl. Rózsa Szépségszalon"
    className="text-lg"
/>
{name.trim() && (
  <p className="text-xs text-muted-foreground mt-1">
    URL: <span className="font-mono text-primary">glowyspot.com/profile/{generateSlug(name)}</span>
  </p>
)}
```

### 7b. `create-salon-modal.tsx`

**File:** `components/salons/create-salon-modal.tsx`

- [ ] **Step 3: Add import**

```ts
import { generateSlug } from "@/lib/slug"
```

- [ ] **Step 4: Add preview below the name input (around line 136)**

```tsx
<Input
    id="name"
    placeholder="Pl. Golden Beauty"
    value={name}
    onChange={(e) => setName(e.target.value)}
    className="rounded-xl border-gray-200"
    required
/>
{name.trim() && (
  <p className="text-xs text-muted-foreground mt-1">
    URL: <span className="font-mono text-primary">glowyspot.com/profile/{generateSlug(name)}</span>
  </p>
)}
```

### 7c. `provider-dashboard.tsx`

**File:** `components/dashboard/provider-dashboard.tsx`

- [ ] **Step 5: Add import**

```ts
import { generateSlug } from "@/lib/slug"
```

- [ ] **Step 6: Add preview below the name input (around line 212)**

Note: state variable here is `salonName`, not `name`.

```tsx
<Input
    placeholder="pl. Glamour Szalon"
    value={salonName}
    onChange={(e) => setSalonName(e.target.value)}
    required
/>
{salonName.trim() && (
  <p className="text-xs text-muted-foreground mt-1">
    URL: <span className="font-mono text-primary">glowyspot.com/profile/{generateSlug(salonName)}</span>
  </p>
)}
```

- [ ] **Step 7: Verify in browser**

Open the salon creation form in the dashboard, type a salon name, and confirm the slug preview appears and updates live.

- [ ] **Step 8: Commit**

```bash
git add components/wizard/SalonWizard.tsx \
        components/salons/create-salon-modal.tsx \
        components/dashboard/provider-dashboard.tsx
git commit -m "feat: add live slug preview to all salon creation forms"
```

---

## Task 8: End-to-End Verification

- [ ] **Step 1: Start the dev server**

```bash
cd C:\Dev\Glowyspot
npm run dev
```

- [ ] **Step 2: Verify profile pages load by slug**

Navigate to `/profile/<any-salon-slug>` — page should load correctly.

- [ ] **Step 3: Verify feed card links**

On the home feed, hover over a salon name link — status bar should show `/profile/<slug>` not `/profile/<cuid>`.

- [ ] **Step 4: Verify story bar links**

Click a story bar item — should navigate to `/profile/<slug>`.

- [ ] **Step 5: Verify right sidebar links**

Click a recent salon in the right sidebar — should navigate to `/profile/<slug>`.

- [ ] **Step 6: Verify slug preview in creation form**

Open a salon creation form, type a name with Hungarian characters (e.g., "Rózsa Kft.") — preview should show `glowyspot.com/profile/rozsa-kft`.

- [ ] **Step 7: Verify new salon gets a slug**

Create a test salon and confirm it's accessible via its slug URL.

- [ ] **Step 8: Final commit**

```bash
git add .
git commit -m "feat: salon SEO-friendly slug URLs — complete implementation"
```

---

## Summary of All Commits

1. `feat: add slug generation utilities`
2. `feat: add slug field to Salon model and backfill existing salons`
3. `feat: update server actions to use slug for salon lookups and links`
4. `feat: rename profile route from [id] to [slug]`
5. `feat: update all profile links to use slug instead of id`
6. `feat: pass slug prop to all ProviderCard call sites`
7. `feat: add live slug preview to all salon creation forms`
8. `feat: salon SEO-friendly slug URLs — complete implementation`
