# Website performance implementation plan

**Goal:** Improve website loading and dashboard responsiveness while preserving appearance, functionality and API contracts.

**Architecture:** Keep existing routes, providers and backend contracts. Remove demonstrated waste, persist client-only search state through Next's supported browser history integration, and retain authorised dashboard children during organiser refresh.

**Stack:** Next 16.3.8, React 19.2, TypeScript, Vitest, Playwright and Lighthouse.

## 1. Establish evidence

Run a production build and mobile Lighthouse on the live homepage and local production homepage. Reproduce order search in Chromium and mobile WebKit with mocked APIs. Record RSC requests per keystroke, tap interception and organiser-refresh remount behaviour. Keep all customer data unchanged.

## 2. Repair dashboard interactions

Update `src/app/(dashboard)/dashboard/o/[organizerId]/orders/page.tsx` to persist filter URLs without router navigation. Make decorative search icons pass pointer events to inputs, including sibling search pages. Update `src/components/dashboard/SuspendedAccessGuard.tsx` to retain known authorised content during refresh. Verify URL persistence, filters, single-tap focus, typing, refresh focus and existing access restrictions through focused unit and browser checks.

## 3. Reduce loading costs and dead code

Remove the unused Geist Sans font from `src/app/layout.tsx`. Load SalesChart on demand from `src/components/dashboard/EventPerformanceCards.tsx`, retaining chart dimensions. Keep Leaflet styles with `EventLocationMap`, removing the duplicate root CSS import. Use Knip plus caller searches to remove verified unused source files and dependencies. Preserve embed assets, Storybook and tested reusable code that static analysis misclassifies.

## 4. Verify and report

Run unit tests, TypeScript, ESLint, production build, mocked dashboard browser checks on desktop/mobile/tablet, map/chart layout checks and Lighthouse before/after comparisons. Request an independent review of material changes and resolve actionable findings. Record measurements, architectural findings, remaining limits and delivery status in `docs/reports/2026-10-03-performance.md`.

## 5. Raise mobile scores and deliver

Abdel requested 95 or higher on every page and authorised committing and pushing reviewed changes. Measure populated routes with the standard simulated mobile Lighthouse settings, synthetic browser API fixtures and a GET-only server fixture. Record one sample for route breadth and three samples for representative routes. Reject loader, error and redirect samples. Report excluded routes and guest-only states explicitly.

Improve demonstrated initial loading costs without changing appearance or contracts. Share anonymous public server data for initial rendering, preserve fresh browser validation for ticket availability and event access, defer maps/charts until near the viewport, and reduce unused animation features. Test authentication ordering, filtered URLs, timezone hydration, early-bird cutoffs, touch focus and mobile menu dismissal. Compare inline CSS against external CSS on cold loads, repeat visits and client navigation before retaining it.

Resolve material independent review findings, rerun affected checks, and record the actual final scores. Commit only task changes and push to the existing frontend remote. Check the automatic deployment result. A below-95 result remains an unmet target and must be stated plainly.

Delivery scope updated on 4 October: Abdel stopped further optimisation and authorised the verified changes to be committed and pushed. Final build `WtpURCRwBul6aca3r92at` passes 613 unit and 247 browser checks; the fresh extra-high review approves delivery. Orders scores 87 in three final mobile samples. The full prior breadth table remains historical and 95 on every page is not claimed.
