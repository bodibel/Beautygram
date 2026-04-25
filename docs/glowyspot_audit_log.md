# GlowySpot Development Audit Log

## Legend

- Status
  - `completed`: implemented in the repository
  - `approved`: completed and accepted in the task review flow
  - `follow-up`: completed, but with noted future work or residual caveats
- Verdict
  - `pass`: task scope completed as requested
  - `pass-static-only`: scope completed with static/code-level verification only
  - `watch`: scope completed, but notable residual risk or follow-up remains

## T-001 Admin escalation removal

- Task ID: `T-001`
- Title: `Admin escalation removal`
- Status: `approved`
- Verdict: `pass-static-only`
- Files changed:
  - `components/auth/auth-modal.tsx`
  - `lib/actions/auth.ts`
  - `scripts/test-registration.ts`
- Short summary:
  - Removed email-based client-side admin assignment and changed registration to create normal users only.
- Verification:
  - Static search and code-path review confirmed `admin@glowyspot.com` escalation logic was removed.
  - Registration still routes through the normal auth flow at code level.
  - No runtime execution was completed.
- Risks:
  - No bootstrap admin creation mechanism was added in this task.
  - Visitor/provider choice in the registration UI was not redesigned.
- Follow-up:
  - Add a trusted admin bootstrap process outside client-controlled registration.

## T-002 Session-bound access fix

- Task ID: `T-002`
- Title: `Session-bound private read access control`
- Status: `approved`
- Verdict: `pass-static-only`
- Files changed:
  - `lib/actions/salon.ts`
- Short summary:
  - Bound private read actions to the authenticated session user for `getSalonData`, `getUserSalons`, `getUserFavorites`, and `getUnreadMessageCount`.
- Verification:
  - Static review confirmed each in-scope action now checks session identity before returning user-scoped data.
  - Existing self-access callers were checked at code level.
  - No runtime execution was completed.
- Risks:
  - `getUnreadMessageCount` still returns `0` on failure, which is privacy-safe but may hide auth/config issues.
- Follow-up:
  - Consider tightening error visibility for internal debugging without exposing private data.

## T-003 updateSalon mass-assignment fix

- Task ID: `T-003`
- Title: `updateSalon mass-assignment hardening`
- Status: `approved`
- Verdict: `pass-static-only`
- Files changed:
  - `lib/actions/salon.ts`
- Short summary:
  - Replaced broad salon updates with an explicit allowlist of provider-editable fields.
- Verification:
  - Static review confirmed `updateSalon()` no longer forwards arbitrary client payload fields into persistence.
  - In-scope settings/contact/gallery/team edit paths were checked against the allowlist.
  - No runtime execution was completed.
- Risks:
  - Unknown fields are ignored rather than rejected.
  - Legitimate future editable fields must be added intentionally to the allowlist.
- Follow-up:
  - Add schema-aware validation if the edit surface expands further.

## T-004 Upload hardening

- Task ID: `T-004`
- Title: `Upload endpoint hardening`
- Status: `approved`
- Verdict: `pass-static-only`
- Files changed:
  - `app/api/upload/route.ts`
- Short summary:
  - Added image type allowlist, 5 MB file-size limit, fail-closed moderation handling, and basic in-memory rate limiting.
- Verification:
  - Static review confirmed invalid file types and oversized files are rejected before processing.
  - Static review confirmed moderation failures and missing OpenAI configuration now block uploads instead of allowing them.
  - Static review confirmed rate limiting is enforced in the request path.
  - No runtime execution was completed.
- Risks:
  - Rate limiting is process-local and not distributed.
  - MIME validation is still browser-provided, not full file-signature validation.
- Follow-up:
  - Consider stronger file signature validation and a shared rate-limit store if the endpoint is scaled out.

## T-005 Cron hardening

- Task ID: `T-005`
- Title: `Cron secret fail-closed hardening`
- Status: `approved`
- Verdict: `pass-static-only`
- Files changed:
  - `app/api/cron/expire-free-salons/route.ts`
  - `app/api/cron/subscription-reminders/route.ts`
- Short summary:
  - Changed both cron endpoints to fail closed when `CRON_SECRET` is missing or the authorization header is missing/invalid.
- Verification:
  - Static review confirmed both endpoints now return `401` if `CRON_SECRET` is unset.
  - Static review confirmed both endpoints now return `401` for missing/invalid secret headers.
  - Valid-secret execution path remained unchanged at code level.
  - No runtime execution was completed.
- Risks:
  - Existing cron jobs now depend on correct `CRON_SECRET` configuration everywhere they run.
- Follow-up:
  - Verify deployment environments all provide the same cron secret.

## T-006 Featured logic stabilization

- Task ID: `T-006`
- Title: `Homepage featured logic stabilization`
- Status: `approved`
- Verdict: `pass-static-only`
- Files changed:
  - `lib/actions/salon.ts`
  - `components/home/story-bar.tsx`
- Short summary:
  - Removed homepage dependency on the non-existent `subscriptionPlan` salon field and replaced it with a schema-safe fallback ranking.
- Verification:
  - Static review confirmed `getFeaturedSalons()` no longer selects or filters on `subscriptionPlan`.
  - Static review confirmed `story-bar.tsx` no longer reads premium/subscription state.
  - Main feed loading path remained unchanged at code level.
  - No runtime execution was completed.
- Risks:
  - The current story-bar is a temporary generic ranking fallback, not a premium surfacing implementation.
- Follow-up:
  - Revisit premium/featured surfacing only after the subscription model is fully implemented.

## T-007 Provider route alignment

- Task ID: `T-007`
- Title: `Provider route access alignment`
- Status: `approved`
- Verdict: `pass-static-only`
- Files changed:
  - `lib/actions/salon.ts`
  - `components/wizard/SalonWizard.tsx`
  - `app/dashboard/subscription/page.tsx`
  - `app/dashboard/salons/page.tsx`
  - `app/profile/me/page.tsx`
  - `lib/navigation-config.ts`
- Short summary:
  - Kept `/dashboard/salons` as the controlled onboarding entry, gated `/dashboard/subscription` by owned salon access, and promoted users to `provider` after first salon creation.
- Verification:
  - Static review confirmed first-salon creation now updates the user role to `provider`.
  - Static review confirmed the wizard refreshes session state after successful creation.
  - Static review confirmed `/dashboard/subscription` redirects users without salons back to `/dashboard/salons`.
  - No runtime execution was completed.
- Risks:
  - Access tightening is page-level, not centralized middleware, for the mixed onboarding/management route.
- Follow-up:
  - Revisit route-level authorization strategy if dashboard responsibilities are split further.

## T-008 One provider one salon enforcement

- Task ID: `T-008`
- Title: `One provider one salon MVP enforcement`
- Status: `approved`
- Verdict: `pass-static-only`
- Files changed:
  - `lib/actions/salon.ts`
  - `app/dashboard/salons/page.tsx`
- Short summary:
  - Enforced the one-user-one-salon MVP rule in `createSalon()` and removed the second-salon CTA from the current dashboard management flow.
- Verification:
  - Static review confirmed `createSalon()` now blocks creation if the authenticated user already owns a salon.
  - Static review confirmed `/dashboard/salons` still supports first-salon onboarding when no salon exists.
  - Static review confirmed users with an existing salon are directed toward managing that salon instead of creating another one.
  - No runtime execution was completed.
- Risks:
  - Some older legacy create-salon components still exist, but the backend rule now blocks duplicate creation across those paths.
  - Error text in the action file still has encoding/mojibake issues.
- Follow-up:
  - Clean up or retire older unused create-salon entrypoints when that work is explicitly approved.

## T-009 Messaging hardening

- Task ID: `T-009`
- Title: `Simple contact messaging hardening`
- Status: `approved`
- Verdict: `pass-static-only`
- Files changed:
  - `lib/actions/salon.ts`
- Short summary:
  - Hardened `sendMessage()` so salon-context contact messages are only allowed for authenticated users, valid salon ownership targets, and salons with `allowMessages` enabled.
- Verification:
  - Static review confirmed `sendMessage()` still requires authentication through `requireSession()`.
  - Static review confirmed salon-context messages are blocked when the salon is missing, the receiver does not match the salon owner, or `allowMessages` is disabled.
  - Static review confirmed non-salon-context reply flow remains logically intact.
  - No runtime execution was completed.
- Risks:
  - Current UI error handling is still generic in some places, so exact backend block reasons may not always be surfaced cleanly.
- Follow-up:
  - Improve client-side error presentation when messaging restrictions are triggered.
