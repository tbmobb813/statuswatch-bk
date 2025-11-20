# Frontend consolidation — migration plan

Goal
----
Consolidate the UI into the canonical `frontend/` Next app and migrate server-side pages from `src/app` into `frontend/app` while preserving runtime behaviour and accessibility.

Status (high-level)
--------------------
- `frontend/` is the canonical UI app. It currently contains migrated pages including the dashboard and homepage.
- `src/app/dashboard/page.tsx` remains in place as the original server-side implementation (Prisma + monitoringService). `frontend/app/dashboard/page.tsx` exists and uses server fetch to the backend API proxy.

Migration checklist (per-page)
----------------------------
- dashboard
  - Status: migrated -> `frontend/app/dashboard/page.tsx` (server fetch via API proxy)
  - Notes: Verify parity with `src/app/dashboard/page.tsx` (data shape and fields).

- other pages
  - Status: none detected in `src/app` beyond `dashboard`. If more pages are added, follow the pattern below.

Per-page migration steps (template)
----------------------------------
1. Create `frontend/app/<route>/page.tsx` as a server component.
2. Replace direct Prisma/monitoringService calls with a server fetch to the backend API (same-origin proxy `/api/proxy/...` or `NEXT_PUBLIC_API_URL`). Use `{ cache: 'no-store' }` for dynamic data.
3. Ensure accessible landmarks: include `<main id="main-content" role="main">` and page headings.
4. Reuse shared components from `frontend/components/*` (ServiceCard, IncidentList, UptimeChart) where appropriate.
5. Run `npm --prefix frontend run build` and the accessibility audit + Playwright tests. Fix type errors or import paths as needed.
6. When verified, remove or deprecate the old `src/app/<route>` files (in a later cleanup PR) to avoid confusion.

Branching and PR rules
----------------------
- Create a focused branch `consolidation/migrate-<route>` for each route or a grouped branch for small batches. Example: `consolidation/migrate-dashboard`.
- Each PR should include:
  - short description of the migration and rationale
  - verification steps (build, audit summary, Playwright test output)
  - any differences in UI or data shape called out

Next steps I'm going to take now
--------------------------------
1. Create a consolidation branch `consolidation/migrate-src-app` and commit this plan there.
2. If additional `src/app` pages are found, begin migrating them iteratively (copy + adapt and rebuild). Right now only `dashboard` exists and is migrated.
3. After migrating all pages, update CI to build/test `frontend/` (suggested follow-up PR).

Run / test notes
----------------
- To build and run the migrated frontend locally:

```bash
npm --prefix frontend install
npm --prefix frontend run build
npm --prefix frontend run start -- -p 3001
```

Then run the accessibility audit and Playwright tests (they accept `A11Y_BASE` env):

```bash
A11Y_BASE=http://localhost:3001 node scripts/accessibility-audit.mjs
A11Y_BASE=http://localhost:3001 node scripts/playwright-tests/db-unavailable-banner.mjs
```

If you'd like, I can now create the branch and push the plan, and begin migrating any additional pages. Currently the only `src/app` page is `dashboard` which has already been migrated.
