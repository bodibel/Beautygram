# GlowySpot Target Schema Decision

## Purpose

This document formalizes the intended target schema direction for GlowySpot before any migration repair planning begins.

The goal is to define which schema elements should remain part of the system based on:

- current code usage
- approved product rules
- MVP boundaries
- deployment and staging realities

Migration repair planning should happen only after this target schema decision is accepted. Data import planning must wait until schema reconciliation is aligned with this target.

## Source Inputs Considered

- `docs/glowyspot_project_memory.md`
- `docs/glowyspot_audit_log.md`
- `docs/glowyspot_system_state_snapshot.md`
- prior schema drift diagnosis between:
  - committed repo schema/migrations
  - source/live database
  - staged database
- prior drift feature usage analysis across the current codebase

## Keep In Target Schema

### User

- `User.createdAt`
- `User.updatedAt`

### Salon

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

### Post

- `Post.layout`

### Message

- `Message.salonId`

### Subscription / Billing-Adjacent Models

- `Subscription`
- `SubscriptionConfig`

### Auth / Recovery / Audit

- `PasswordResetToken`
- `AuditLog`

## Remove / Not Required In Target Schema

### Clearly not required by current app logic

- No removals are being formally approved in this document beyond “not required for target preservation” judgments already discussed in earlier analysis.

### Not required to preserve as target-schema drivers

- `User.createdAt` and `User.updatedAt` were previously assessed as weakly used at runtime, but the approved project direction is to keep them.

Interpretation:

- this section intentionally remains minimal because the approved direction is conservative
- no drift area is being explicitly dropped here if the project memory already says to keep or defer it
- removal decisions should only be made with explicit product/schema approval, not inferred from weak usage alone

## Deferred / Requires Product Decision

- `Post.videos`
- Full `notify*` field strategy
- Exact depth of subscription schema

This means these items are not approved for removal and not yet fully locked as final target-schema commitments either.

## Rationale By Area

### User timestamps

- `User.createdAt` and `User.updatedAt` are approved to stay.
- Even though current app logic does not strongly depend on them in user-facing flows, they are standard lifecycle metadata and are low-risk to preserve.
- Keeping them avoids unnecessary schema churn during reconciliation and preserves future admin/account timeline flexibility.

### Salon public identity and duplicate control

- `Salon.slug` must stay because public provider profile routing and multiple discovery flows rely on it.
- `Salon.salonFingerprint` should stay because current onboarding and duplicate-prevention logic already uses it.
- Removing either would require product-visible behavior changes or rework of existing create/profile flows.

### Salon contact and display controls

- `allowMessages` and `allowBookings` are backend-enforced business rules, not cosmetic fields.
- `showPhoneOnProfile` and `showEmailOnProfile` directly affect public profile rendering.
- `ownerName`, `ownerImage`, `aboutMe`, and `isTeam` support the active public provider/about presentation and provider editing flows.
- These fields are consistent with the MVP goal of conversion-oriented provider profiles.

### Post presentation

- `Post.layout` should stay because it is used by current post creation, editing, and rendering logic.
- It has direct UX impact in the discovery feed and profile posts display.
- It is not an inactive leftover schema field.

### Message salon context

- `Message.salonId` should stay because salon-scoped contact and appointment-request context relies on it.
- It helps preserve simple MVP messaging without redesigning the message system.
- It is especially important for linking appointment-request companion messages back to the relevant salon context.

### Subscription models

- `Subscription` and `SubscriptionConfig` should remain in the target schema because current code already uses them for:
  - subscription initialization on salon creation
  - plan-based post/video gating
  - expiry/reminder cron logic
  - provider dashboard subscription display
- At the same time, the exact subscription depth remains only partially product-finalized.
- The correct decision is to keep these models while deferring deeper product/billing shape decisions.

### Password reset recovery

- `PasswordResetToken` should stay because password recovery is an active auth feature in the current app.
- Removing it would directly break reset request and reset completion flows.

### Audit logging

- `AuditLog` should stay because it is already part of the backend system logging foundation and admin read-only inspection flow.
- This is also operationally relevant for deployment, debugging, and admin visibility.

### Deferred items

- `Post.videos` is not yet solid enough to fully commit or fully remove.
  - backend and gating logic exist
  - product/UI depth is still limited
- `notify*` fields are partly represented in settings UI, but the execution strategy behind them is not finalized.
- subscription schema depth must remain open until billing/product scope is intentionally narrowed or expanded.

## Risks If Ignored

- If migration repair starts before this target schema is accepted, repo migrations may be “fixed” toward the wrong shape.
- If data import planning starts before schema reconciliation, imported data may fail, truncate, or map into the wrong structures.
- If `Salon.slug` or `Message.salonId` are omitted from the target schema, public profile and messaging/request flows will degrade or break.
- If `Subscription` and `SubscriptionConfig` are ignored, current onboarding, cron, and provider-facing subscription behavior will diverge from schema reality.
- If `AuditLog` is excluded, current backend logging and admin audit visibility will no longer match the system direction already implemented.
- If deferred areas are treated as settled too early, migration work may lock in product decisions that are not actually approved.

## Next Recommended Step

- Accept this target schema decision as the working source-of-truth direction.
- After acceptance, plan migration repair against this target.
- Reconcile committed migration history to the target schema deliberately instead of inferring from the staged database alone.
- Only after schema reconciliation is aligned should any data import planning begin.
- Keep data import work blocked until:
  - target schema is accepted
  - migration repair strategy is defined
  - staged schema can be reproduced consistently from repo state

