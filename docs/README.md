# GlowySpot dokumentáció

Ez az index a `docs/` mappa tartalmát rendszerezi. A projekt telepítése, parancsai és architektúrájának áttekintése a gyökér [`README.md`](../README.md)-ben található.

> **Megjegyzés a régebbi dokumentumokhoz:** az itt archivált riportok és tervek a készítésük idejének állapotát tükrözik. Ahol a mostani kód eltér tőlük, a kód és a gyökér README az irányadó. A legfrissebb átfogó állapot: [`audits/2026-08-15-full-audit-report.md`](audits/2026-08-15-full-audit-report.md).

---

## Aktuális állapot

| Dokumentum | Tartalom |
| --- | --- |
| [`audits/2026-08-15-full-audit-report.md`](audits/2026-08-15-full-audit-report.md) | **Legfrissebb teljes audit** — biztonság, szerepkörök, logolás, frontend, dokumentáció |
| [`superpowers/specs/2026-08-15-salon-publishing-state-design.md`](superpowers/specs/2026-08-15-salon-publishing-state-design.md) | **Jóváhagyott terv:** többszalonos publikálási állapot és a fizetős publikálás előkészítése |
| [`plans/NEXT-frontend-design-audit.md`](plans/NEXT-frontend-design-audit.md) | **Következő feladat:** teljes frontend vizuális audit és egységesítés |
| [`project-ai-context-map.md`](project-ai-context-map.md) | A kódbázis felépítésének térképe |

---

## Biztonsági auditok és tesztlefedettség

| Dokumentum | Tartalom |
| --- | --- |
| [`audits/GLOWYSPOT_SECURITY_AUDIT.md`](audits/GLOWYSPOT_SECURITY_AUDIT.md) | Biztonsági audit: auth, session, route-védelem, upload, függőségek |
| [`audits/GLOWYSPOT_FULL_AUDIT_REPORT.md`](audits/GLOWYSPOT_FULL_AUDIT_REPORT.md) | Korábbi teljes kódbázis-audit |
| [`audits/GLOWYSPOT_REMAINING_SECURITY_RISK_NOTE.md`](audits/GLOWYSPOT_REMAINING_SECURITY_RISK_NOTE.md) | Megmaradt függőségi kockázatok és upgrade-döntések |
| [`audits/GLOWYSPOT_GUARD_CONSOLIDATION_REPORT.md`](audits/GLOWYSPOT_GUARD_CONSOLIDATION_REPORT.md) | Guard-konszolidáció, aktív felhasználó ellenőrzés, ownership audit |
| [`audits/GLOWYSPOT_ROUTE_GUARD_SMOKE_REPORT.md`](audits/GLOWYSPOT_ROUTE_GUARD_SMOKE_REPORT.md) | Route guard smoke teszt eredmények |
| [`audits/GLOWYSPOT_TEST_MATRIX.md`](audits/GLOWYSPOT_TEST_MATRIX.md) | Tesztlefedettségi mátrix |

## Adatbázis-migrációk

| Dokumentum | Tartalom |
| --- | --- |
| [`migrations/GLOWYSPOT_MIGRATION_BASELINE_PLAN.md`](migrations/GLOWYSPOT_MIGRATION_BASELINE_PLAN.md) | A migrációs baseline kialakításának terve |
| [`migrations/GLOWYSPOT_MIGRATION_RECONCILIATION_PLAN.md`](migrations/GLOWYSPOT_MIGRATION_RECONCILIATION_PLAN.md) | Migrációs előzmény-eltérés rendezésének terve |
| [`migrations/GLOWYSPOT_MIGRATION_DRY_RUN_CHECKLIST.md`](migrations/GLOWYSPOT_MIGRATION_DRY_RUN_CHECKLIST.md) | Dry-run ellenőrzőlista |
| [`migrations/GLOWYSPOT_MIGRATION_DRY_RUN_REPORT.md`](migrations/GLOWYSPOT_MIGRATION_DRY_RUN_REPORT.md) | Dry-run eredmények |

## Termék és információarchitektúra

| Dokumentum | Tartalom |
| --- | --- |
| [`product/GLOWYSPOT_MVP_SCOPE.md`](product/GLOWYSPOT_MVP_SCOPE.md) | MVP hatókör |
| [`product/GLOWYSPOT_MVP_ROADMAP.md`](product/GLOWYSPOT_MVP_ROADMAP.md) | MVP ütemterv |
| [`product/GLOWYSPOT_SALON_CONSOLE_IA_DECISIONS.md`](product/GLOWYSPOT_SALON_CONSOLE_IA_DECISIONS.md) | Szalonkonzol információarchitektúra-döntések |
| [`product/product-ux-design-redefinition.md`](product/product-ux-design-redefinition.md) | UX újradefiniálás |
| [`product/product-ux-redesign-implementation-plan.md`](product/product-ux-redesign-implementation-plan.md) | UX redesign megvalósítási terv |

## Tervek

| Dokumentum | Tartalom |
| --- | --- |
| [`plans/GLOWYSPOT_CODEBASE_CLEANUP_PLAN.md`](plans/GLOWYSPOT_CODEBASE_CLEANUP_PLAN.md) | Kódbázis-takarítási terv |
| [`plans/GLOWYSPOT_DASHBOARD_RESTRUCTURE_PLAN.md`](plans/GLOWYSPOT_DASHBOARD_RESTRUCTURE_PLAN.md) | Dashboard átstrukturálás |
| [`plans/GLOWYSPOT_SALON_CONSOLE_ROUTE_COMPATIBILITY_PLAN.md`](plans/GLOWYSPOT_SALON_CONSOLE_ROUTE_COMPATIBILITY_PLAN.md) | Szalonkonzol route-kompatibilitás |
| [`plans/GLOWYSPOT_AUTH_ROUTE_SMOKE_PLAN.md`](plans/GLOWYSPOT_AUTH_ROUTE_SMOKE_PLAN.md) | Auth route smoke terv |
| [`plans/GLOWYSPOT_PLAYWRIGHT_ROUTE_SMOKE_PLAN.md`](plans/GLOWYSPOT_PLAYWRIGHT_ROUTE_SMOKE_PLAN.md) | Playwright smoke terv |
| [`plans/lint-audit-fix-plan.md`](plans/lint-audit-fix-plan.md) | Lint hibák javítási terve |
| [`plans/2026-03-19-security-fixes.md`](plans/2026-03-19-security-fixes.md) | Korábbi biztonsági javítási terv |

## Fejlesztési fázisriportok

A `phases/` mappa a 2A–3C fázisok elvégzett munkáját dokumentálja: dashboard átstrukturálás, szalonkonzol route-ok és shell, tartalom-kiszervezés, smoke- és E2E-tesztek, valamint VPS deploy.

| Dokumentum | Tartalom |
| --- | --- |
| [`phases/GLOWYSPOT_PHASE_2A_DASHBOARD_RESTRUCTURE_REPORT.md`](phases/GLOWYSPOT_PHASE_2A_DASHBOARD_RESTRUCTURE_REPORT.md) | 2A – Dashboard átstrukturálás |
| [`phases/GLOWYSPOT_PHASE_2B_SALON_CONSOLE_ROUTES_REPORT.md`](phases/GLOWYSPOT_PHASE_2B_SALON_CONSOLE_ROUTES_REPORT.md) | 2B – Szalonkonzol route-ok |
| [`phases/GLOWYSPOT_PHASE_2C_SALON_CONSOLE_SHELL_REPORT.md`](phases/GLOWYSPOT_PHASE_2C_SALON_CONSOLE_SHELL_REPORT.md) | 2C – Szalonkonzol shell |
| [`phases/GLOWYSPOT_PHASE_2D_SALON_CONTENT_EXTRACTION_REPORT.md`](phases/GLOWYSPOT_PHASE_2D_SALON_CONTENT_EXTRACTION_REPORT.md) | 2D – Tartalom-kiszervezés |
| [`phases/GLOWYSPOT_PHASE_2E_SALON_CONTENT_EXTRACTION_REPORT.md`](phases/GLOWYSPOT_PHASE_2E_SALON_CONTENT_EXTRACTION_REPORT.md) | 2E – Tartalom-kiszervezés folyt. |
| [`phases/GLOWYSPOT_PHASE_2F_ROUTE_SMOKE_REPORT.md`](phases/GLOWYSPOT_PHASE_2F_ROUTE_SMOKE_REPORT.md) | 2F – Route smoke riport |
| [`phases/GLOWYSPOT_PHASE_2F_MANUAL_SMOKE_CHECKLIST.md`](phases/GLOWYSPOT_PHASE_2F_MANUAL_SMOKE_CHECKLIST.md) | 2F – Kézi smoke ellenőrzőlista |
| [`phases/GLOWYSPOT_PHASE_3A_PLAYWRIGHT_SMOKE_REPORT.md`](phases/GLOWYSPOT_PHASE_3A_PLAYWRIGHT_SMOKE_REPORT.md) | 3A – Playwright smoke |
| [`phases/GLOWYSPOT_PHASE_3B_MVP_FLOW_E2E_REPORT.md`](phases/GLOWYSPOT_PHASE_3B_MVP_FLOW_E2E_REPORT.md) | 3B – MVP folyamat E2E |
| [`phases/GLOWYSPOT_PHASE_3C_VPS_DEPLOY_REPORT.md`](phases/GLOWYSPOT_PHASE_3C_VPS_DEPLOY_REPORT.md) | 3C – VPS deploy |
| [`phases/GLOWYSPOT_DASHBOARD_SIDEBAR_UI_CLEANUP_REPORT.md`](phases/GLOWYSPOT_DASHBOARD_SIDEBAR_UI_CLEANUP_REPORT.md) | Dashboard sidebar UI takarítás |

## Design specifikációk

A `superpowers/` mappa a UI-modernizáció, a warm-peach redesign, a sötét mód és a szalon-slug funkció terveit és specifikációit tartalmazza.
