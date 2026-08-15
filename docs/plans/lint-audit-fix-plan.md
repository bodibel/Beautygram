# GlowySpot Lint Audit And Fix Plan

Fresh command: `npx eslint --format json`

Summary: 62 files, 131 errors, 139 warnings.

## Full Lint Inventory

| File | Errors | Warnings | Main rules |
|---|---:|---:|---|
| `lib/actions/salon.ts` | 21 | 5 | `no-explicit-any` 21, `no-unused-vars` 5 |
| `app/profile/[slug]/page.tsx` | 12 | 10 | `no-explicit-any` 10, `no-img-element` 5, `exhaustive-deps` 3, `no-unescaped-entities` 2, `no-unused-vars` 2 |
| `components/wizard/SalonWizard.tsx` | 10 | 12 | `no-explicit-any` 10, `no-unused-vars` 7, `no-img-element` 5 |
| `app/page.tsx` | 8 | 11 | `no-unused-vars` 9, `no-explicit-any` 7, `exhaustive-deps` 2, `no-unescaped-entities` 1 |
| `lib/hooks/usePlacesAutocompleteNew.ts` | 6 | 1 | `no-explicit-any` 5, `set-state-in-effect` 1, `no-unused-vars` 1 |
| `app/dashboard/messages/page.tsx` | 5 | 6 | `no-explicit-any` 5, `no-unused-vars` 5, `exhaustive-deps` 1 |
| `components/admin/CategoryManager.tsx` | 5 | 5 | `no-explicit-any` 5, `no-unused-vars` 5 |
| `components/admin/UserManager.tsx` | 5 | 5 | `no-explicit-any` 4, `no-unused-vars` 4, `no-img-element` 1, `set-state-in-effect` 1 |
| `components/ui/enhanced-address-picker.tsx` | 4 | 6 | `no-unused-vars` 5, `no-explicit-any` 3, `exhaustive-deps` 1, `set-state-in-effect` 1 |
| `app/api/auth/[...nextauth]/route.ts` | 4 | 1 | `no-explicit-any` 4, `no-unused-vars` 1 |
| `components/auth/auth-modal.tsx` | 4 | 0 | `no-explicit-any` 4 |
| `lib/salon-types.ts` | 4 | 0 | `no-explicit-any` 4 |
| `components/salon/modals/SettingsModal.tsx` | 3 | 2 | `no-explicit-any` 2, `no-unused-vars` 2, `set-state-in-effect` 1 |
| `lib/actions/category.ts` | 3 | 0 | `no-explicit-any` 3 |
| `components/profile/profile-sidebar.tsx` | 2 | 5 | `no-unused-vars` 5, `no-explicit-any` 2 |
| `components/salons/create-salon-modal.tsx` | 2 | 5 | `no-unused-vars` 3, `no-img-element` 2, `no-explicit-any` 2 |
| `app/api/upload/route.ts` | 2 | 2 | `no-explicit-any` 2, `no-unused-vars` 1, unused eslint-disable 1 |
| `components/salon/modals/PostModal.tsx` | 2 | 2 | `no-explicit-any` 2, `no-img-element` 1, `exhaustive-deps` 1 |
| `app/dashboard/favorites/page.tsx` | 2 | 1 | `no-explicit-any` 2, `exhaustive-deps` 1 |
| `components/dashboard/command-header.tsx` | 2 | 1 | `no-unescaped-entities` 2, `no-unused-vars` 1 |
| `app/providers/page.tsx` | 2 | 0 | `no-explicit-any` 2 |
| `components/salon/modals/HoursModal.tsx` | 2 | 0 | `no-explicit-any` 1, `set-state-in-effect` 1 |
| `app/dashboard/salons/page.tsx` | 1 | 6 | `no-unused-vars` 5, `no-img-element` 1, `no-explicit-any` 1 |
| `components/home/post-card.tsx` | 1 | 3 | `no-unused-vars` 3, `no-explicit-any` 1 |
| `app/salon/[id]/contact/page.tsx` | 1 | 2 | `no-unused-vars` 2, `no-explicit-any` 1 |
| `app/salon/[id]/team/page.tsx` | 1 | 2 | `no-img-element` 2, `no-explicit-any` 1 |
| `components/home/post-detail-modal.tsx` | 1 | 2 | `exhaustive-deps` 1, `no-explicit-any` 1, `no-unused-vars` 1 |
| `components/layout/active-salon-indicator.tsx` | 1 | 2 | `no-img-element` 1, `set-state-in-effect` 1, `no-unused-vars` 1 |
| `components/layout/filter-panel.tsx` | 1 | 2 | `no-unused-vars` 2, `no-explicit-any` 1 |
| `app/auth/reset-password/ResetPasswordForm.tsx` | 1 | 1 | `no-explicit-any` 1, `no-unused-vars` 1 |
| `app/salon/[id]/posts/page.tsx` | 1 | 1 | `no-explicit-any` 1, `no-unused-vars` 1 |
| `components/admin/CategoryModal.tsx` | 1 | 1 | `no-explicit-any` 1, `no-unused-vars` 1 |
| `components/dashboard/modals/ProfileEditModal.tsx` | 1 | 1 | `no-explicit-any` 1, `no-unused-vars` 1 |
| `components/dashboard/provider-dashboard.tsx` | 1 | 1 | `exhaustive-deps` 1, `no-explicit-any` 1 |
| `components/salon/cards/PostsCard.tsx` | 1 | 1 | `no-img-element` 1, `no-explicit-any` 1 |
| `app/salon/[id]/hours/page.tsx` | 1 | 0 | `ban-ts-comment` 1 |
| `components/home/feed-card.tsx` | 1 | 0 | `no-explicit-any` 1 |
| `components/home/story-bar.tsx` | 1 | 0 | `set-state-in-effect` 1 |
| `components/layout/right-sidebar.tsx` | 1 | 0 | `no-explicit-any` 1 |
| `components/salon/modals/ServiceModal.tsx` | 1 | 0 | `set-state-in-effect` 1 |
| `components/ui/input.tsx` | 1 | 0 | `no-empty-object-type` 1 |
| `components/ui/textarea.tsx` | 1 | 0 | `no-empty-object-type` 1 |
| `lib/actions/auth.ts` | 1 | 0 | `no-explicit-any` 1 |
| `components/salon/cards/ClosedDatesCard.tsx` | 0 | 5 | `no-unused-vars` 5 |
| `components/salon/cards/HoursCard.tsx` | 0 | 4 | `no-unused-vars` 4 |
| `components/ui/address-autocomplete.tsx` | 0 | 4 | `no-unused-vars` 4 |
| `prisma/seed.ts` | 0 | 3 | `no-unused-vars` 3 |
| `components/GoogleMapsProvider.tsx` | 0 | 2 | `no-unused-vars` 2 |
| `components/ui/advanced-marker.tsx` | 0 | 2 | `exhaustive-deps` 2 |
| `components/ui/avatar.tsx` | 0 | 2 | `alt-text` 1, `no-img-element` 1 |
| `app/dashboard/subscription/page.tsx` | 0 | 1 | `no-unused-vars` 1 |
| `app/profile/me/page.tsx` | 0 | 1 | `no-unused-vars` 1 |
| `app/salon/[id]/gallery/page.tsx` | 0 | 1 | `no-img-element` 1 |
| `app/salon/[id]/metadata.ts` | 0 | 1 | `no-unused-vars` 1 |
| `app/salon/[id]/page.tsx` | 0 | 1 | `no-unused-vars` 1 |
| `app/salon/[id]/settings/page.tsx` | 0 | 1 | `no-unused-vars` 1 |
| `components/layout/sidebar.tsx` | 0 | 1 | `no-unused-vars` 1 |
| `components/profile/profile-hero.tsx` | 0 | 1 | `no-unused-vars` 1 |
| `components/ui/SafetyWarningModal.tsx` | 0 | 1 | `no-img-element` 1 |
| `components/wizard/WizardStep.tsx` | 0 | 1 | `no-unused-vars` 1 |
| `hooks/useSalonData.ts` | 0 | 1 | `exhaustive-deps` 1 |
| `scripts/migrate-image-paths.ts` | 0 | 1 | `no-unused-vars` 1 |

## Fix Plan

1. Shared type foundation: fix `lib/salon-types.ts`, then reuse those types in actions, pages, cards, and modals.
2. Backend/server actions: clean `lib/actions/salon.ts`, `category.ts`, `auth.ts`, auth route, and upload route before UI consumers.
3. Hook correctness: fix `exhaustive-deps` and `set-state-in-effect` in shared hooks/components, with smoke checks after each group.
4. Image and accessibility pass: replace unsafe `<img>` usage with `next/image` or explicitly justified alternatives, add missing `alt`.
5. UI cleanup: remove unused imports/state/params, escape literal quotes/apostrophes, and replace empty object prop types.
6. Feature smoke batches: after each group run targeted lint, `npx tsc --noEmit`, `npm run build`, then Browser smoke for the affected route.
7. Final gate: run full `npm run lint`, bundled `.agent/scripts/checklist.py`, build, and production Browser smoke.

## Affected Features

- Salon data model and server actions: profile pages, provider cards, salon management, posts, services, hours, team, favorites, messages.
- Public discovery: home feed, provider listing, filters, story bar, post detail modal, profile route.
- Auth and account flows: NextAuth callbacks/session typing, auth modal, password reset, protected dashboard redirect.
- Dashboard workflows: messages, favorites, salons list, subscription, provider dashboard, profile edit, admin category/user management.
- Salon onboarding and editing: wizard, create salon modal, settings/hours/service/post modals, salon cards.
- Maps and address flows: Google Maps provider, address autocomplete, enhanced address picker, advanced marker, Places hook.
- Media rendering and accessibility: avatars, profile/gallery/team/post images, safety warning modal.
- Maintenance scripts and seed data: Prisma seed and image migration script cleanup.
