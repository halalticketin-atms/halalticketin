# Bug Fix Ledger

Use this ledger for recurring frontend bugs where the root cause, failed approach, or verification method should be reused. Keep entries short and concrete.

## Mobile Flex Text Overflow

- Date: 2026-06-28
- Area: Contact page attachment preview on mobile web
- Symptom: Long attachment filenames visually expanded beyond the form/card on narrow screens.
- Failed fix: Adding `truncate`, `max-w-full`, or `overflow-hidden` only to an outer card did not reliably fix the layout.
- Root cause: In flexbox, long text keeps its intrinsic width unless the shrinkable flex child has `min-w-0`.
- Working pattern: fixed-size siblings use `shrink-0`; the text wrapper uses `min-w-0 flex-1 overflow-hidden`; the text node uses `w-full overflow-hidden text-ellipsis whitespace-nowrap`; parent flex/card/form containers may also need `min-w-0`.
- Verification: test at both `393px` and `320px`; check `document.documentElement.scrollWidth` and `document.body.scrollWidth` match the viewport; inspect the filename/card bounding boxes, not only the screenshot.
- Reference commits: `d822e9a` showed the incomplete outer-card clipping fix; `137208d` applied the flex child shrink fix and passed live verification.

## Public Event Links From Dashboard Data

- Date: 2026-07-02
- Area: Organiser dashboard event cards
- Symptom: The `View Event` shortcut opened `/events/{eventId}` and failed for published public events.
- Root cause: The dashboard performance API returned only the UUID, while the public event route expects the event slug.
- Working pattern: include `slug` in organiser/dashboard API payloads that build public event URLs; build public links from `slug` with an ID fallback only for compatibility.
- Verification: focused URL-helper unit test plus backend/frontend/mobile type checks.

## Tailwind v4 Scanner Misses Classes In Template Literals

- Date: 2026-07-09
- Area: FAQ deep-link scroll offset (`FaqPageClient.tsx`)
- Symptom: `scroll-mt-[calc(var(--nav-safe-offset)+1rem)]` was in the DOM `class` attribute but computed `scroll-margin-top: 0px`; the utility was absent from both dev and production CSS.
- Root cause: the Tailwind v4 source scanner does not extract an arbitrary-value candidate placed at the start of a JSX template literal (`` className={`scroll-mt-[...]${...}`} ``). The identical utility in a plain quoted string elsewhere in the repo was generated fine.
- Working pattern: hoist the class into a plain string constant (`const x = 'scroll-mt-[...]'`) and interpolate the constant.
- Verification: check the computed style in the browser, and grep the built CSS in `.next/static/chunks/*.css` for the escaped selector; do not trust the class being present in the DOM.

## Hash Deep-Link Scroll Lands Under The Floating Nav

- Date: 2026-07-09
- Area: `/faq#<item-id>` deep links
- Symptom: after navigation to a hash URL, the target element sat behind the fixed navbar despite a correct computed `scroll-margin-top`.
- Root cause: two scroll actors ignore the margin. Next.js App Router performs its own hash scroll without honoring `scroll-margin`, and `scrollIntoView` loses the margin when an ancestor is an `overflow-hidden` wrapper (it is treated as a scroll container in the ancestor chain).
- Working pattern: after mount, wait for Next's scroll and any entrance animation (`animate-fade-up` is 0.6s), then `window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - parseFloat(getComputedStyle(el).scrollMarginTop), behavior: 'smooth' })`.
- Verification: measure `el.getBoundingClientRect().top` after settle in Playwright at both 375 and 1440 widths; it should equal the intended offset, not 0 or negative.

## Browser Check Hits The Wrong Local App

- Date: 2026-07-09
- Area: Local browser verification
- Symptom: Browser checks against port 3000 inspected an unrelated project's dev server.
- Root cause: A previously running local server owned the expected port, so route/content checks were validating the wrong app.
- Working pattern: before browser-verifying a local port, confirm the served app by title, screenshot, route content, or process cwd. If the port is stale or unrelated, use a spare port for the fresh build rather than stopping a server unless Abdel explicitly asks.
- Verification: screenshot/title check before assertions; when using a fresh production build, start it on a spare port such as `npx next start -p <port>`.

## Open Graph Image Build Tries To Fetch Fonts

- Date: 2026-07-12
- Area: Next.js Open Graph images
- Symptom: Static generation can fail or become network-dependent when an OG image uses a Unicode symbol whose font is not embedded.
- Root cause: the image renderer may attempt a dynamic font download for the glyph during static generation.
- Working pattern: avoid Unicode symbols in OG images unless the font is bundled and registered; prefer CSS geometry or bundled brand assets for simple social-image marks.
- Verification: run the production build path that renders OG images and confirm no dynamic font/network fetch is needed.

## Stale Next Dev CSS Mimics Layout Regression

- Date: 2026-07-14
- Area: Next.js/Tailwind image layout debugging
- Symptom: fill images suddenly rendered at viewport scale even though source classes looked correct.
- Root cause: stale `.next/dev` assets can make correct Tailwind source appear unapplied.
- Working pattern: verify a clean production build and inspect the emitted stylesheet before changing global CSS.
- Verification: compare the production build CSS and rendered image bounds before editing layout rules.

## Third-Party Widget Z-Index Escapes

- Date: 2026-07-16
- Area: Embedded widgets and overlays
- Symptom: a third-party widget with large internal z-index values overlapped app UI.
- Root cause: the widget created its own high stacking values inside the page's global stacking context.
- Working pattern: contain the widget with a local stacking context such as `isolation: isolate` before escalating global modal or overlay z-indexes.
- Verification: prove the overlap and fix with browser hit-testing, not only screenshots.

## Search Favicon Double Inset

- Date: 2026-07-19
- Area: Google Search favicon rendering
- Symptom: Google Search can double-inset a transparent circular favicon inside its own outlined holder.
- Root cause: transparent circular artwork leaves Google to draw another circular container around it.
- Working pattern: preserve the logo artwork but extend its background to an opaque square canvas, then let Google apply the final circular mask.
- Verification: inspect the generated favicon files and request recrawl/preview without changing the core logo mark.
