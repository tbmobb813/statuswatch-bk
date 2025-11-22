# Accessibility Triage (automated audit results)

Source: logs/accessibility-summary.md + logs/accessibility-*.json

Summary (prioritized)

1) Color contrast (High impact)

- Files: accessibility-_.json (crawl), accessibility-home.json
- Why: Low contrast text (small text) fails WCAG AA for normal and/or large text. This affects readability for low-vision users.
- Quick wins:
  - Use slightly darker text tokens for secondary/smaller text: replace `text-gray-500` -> `text-gray-600`, and `text-gray-600` -> `text-gray-700` where used for body/secondary text.
  - Avoid very light background + light text blends (e.g., small text on bg-green-50). Prefer stronger text color or darker background variant for small/inline text.
- Candidate files to edit:
  - `frontend/app/page.tsx` (header description, "Last updated", footer copy) — already patched in this PR.
  - `frontend/components/*` where textual meta or timestamps use `text-gray-500/600`.
- Validation: re-run Playwright+axe and confirm contrast violations drop.

2) Landmark / region issues (Moderate-High)

- Files: accessibility-dashboard.json, accessibility-incidents.json, accessibility-home.json
- Why: axe reported "landmark-one-main" / "region" issues — pages should have a single main landmark and content should be contained within landmarks (header/nav/main/footer).
- Quick wins:
  - Ensure there is exactly one <main> element with role="main" or an aria-label. Add `id="main-content"` so skip links can target it.
  - Add an accessible "Skip to main content" link at the beginning of the document to improve keyboard navigation.
  - Verify that modals or dynamic banners are not adding additional main-like landmarks.
- Candidate files to edit:
  - `frontend/app/layout.tsx` — add skip link (done).
  - `frontend/app/page.tsx` & other route pages — ensure `<main id="main-content" role="main">` is present (done for main page). Check `frontend/app/dashboard/*` and `frontend/app/incidents/*` pages/components.
- Validation: re-run axe and confirm landmark errors are resolved.

3) ARIA / live region for dynamic updates (Moderate)

- Files: DBUnavailable banner, status update banners
- Why: Dynamic content (outage banners, status updates) should be announced to assistive tech. Use `role="status" aria-live="polite"` for non-interruptive announcements; `aria-live="assertive"` for critical urgent messages.
- Quick wins:
  - Ensure `DBUnavailableBanner` uses `role="status"` and `aria-live="polite"` (it already does). Confirm the element is visually perceivable and focusable if it includes actions.
  - Ensure interactive controls (Retry, Dismiss) have accessible names and keyboard focus styles.
- Candidate files:
  - `frontend/components/DBUnavailableBanner.tsx` (verify focus, labels)

4) Headings & document structure (Low-Moderate)

- Files: pages where axe cited "region" but also flagged missing heading hierarchy.
- Why: Proper heading hierarchy (H1, H2) helps screen reader navigation.
- Quick wins:
  - Ensure every major region/section has a heading (H2/H3) and headings are in logical order.
  - Where repeated landmarks exist (sidebars, repeated headers) ensure headings are unique or labelled.
- Candidate files:
  - `frontend/app/page.tsx` (sections use H2 already), check `IncidentList` and `ServiceCard` content.

Planned immediate actions

- Done (quick fixes applied):
  - Add skip link to `frontend/app/layout.tsx`.
  - Add `id="main-content" role="main" aria-label="Primary content"` to the home page main element.
  - Increase text contrast in `frontend/app/page.tsx` for header description, "Last updated" text, and footer text.

- Next (recommended):
  1. Re-run Playwright+axe (scripts/accessibility-audit.mjs) to confirm the above changes reduce violations.
  2. Triage remaining JSONs to map violations to exact component lines. (I can parse and produce a component-by-component list.)
  3. Fix additional instances of `text-gray-500/600` across `frontend/components/*` where used for small text (timestamps, metadata).
  4. Verify DBUnavailableBanner keyboard focus and labels; add visually-visible focus outlines to its buttons if missing.
  5. Add a small Playwright test to assert banner behavior (appears on 503, dismissible, Retry clears when backend recovers).

How I validated changes

- I ran the accessibility audit script and produced `logs/accessibility-*.json` and `logs/accessibility-summary.md`.
- I then applied small visual/landmark fixes to reduce the most common/obvious axe flags (contrast + landmark). Re-run of the audit is recommended next to confirm.

If you want, I can now:

- Parse all `logs/accessibility-*.json` and produce a file-by-file, rule-by-rule mapping with exact HTML snippets and suggested code diffs (I can auto-generate PR-ready patches for trivial fixes like color token replacements and missing aria attributes).
- Apply the remaining quick fixes across components and re-run the audit to produce a new summary.

Preferred next step: confirm if you'd like me to (A) auto-apply all small fixes (contrast, landmarks, focus styles) and re-run the audit, or (B) produce the full per-file triage report first so you can review before changes.
