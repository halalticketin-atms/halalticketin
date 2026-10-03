# Website performance audit, 3 October 2026

Abdel stopped further optimisation and authorised delivery after functional verification. The current changes fix the reproduced mobile search problems, preserve the existing design and API contracts, and reduce initial loading costs. The final production build, TypeScript check and exact-build browser acceptance pass. The earlier mobile audits remain below 95; this report does not claim a 95 score on every page.

## Shipping build and verification

Build `WtpURCRwBul6aca3r92at` passes the ordinary production build and TypeScript check. All 613 unit tests pass across 106 files, including the 131 focused auth/session/startup checks. Full ESLint reports zero errors and four existing internal-navigation warnings. The production dependency audit reports zero advisories for the unchanged lockfile.

The exact build passes 105 custom browser/security/loading/visual checks, one held-React rendering proof and all 141 cases in the seven tracked browser suites. That is 247 distinct checks, with zero failures, skips or flaky results. Three seeded/fallback pixel comparisons show zero differing pixels across mobile Chromium, mobile WebKit and desktop Chromium. Three separate reduced-motion style checks pass. Existing search, filters, URL history, refresh, access restrictions and first-click dialog behaviour pass on the same build.

Initial API-only Orders and anonymous Home request no SDK; seeded Orders request no duplicate browser profile data. A stored SDK session still loads once and preserves recovery. Orders render before React release; separate local observed LCP is 412 ms and TTFB 16.7 ms. These fixture observations do not replace simulated Lighthouse timings or predict production API latency.

Three final standard-mobile Orders samples score 87, 87 and 87, with median LCP 3.982 seconds and CLS zero. All use the original Lighthouse 12.8.2 calibration and populated 24-order fixture, with no runtime errors, unknown endpoints or mutations. Candidate eight's three samples scored 83 with median LCP 4.643 seconds. The final result is four points higher and about 660 ms faster, a 14.2% reduction. The 95 target remains unmet. No full final-build breadth or desktop rerun is claimed, and no individual loading cut is credited with the whole gain.

GPT-6 Astra low approved the plan with safeguards. The fresh GPT-6.1 Sol extra-high review approved the final source and mandatory acceptance evidence, with no unresolved material finding. The first final build attempt found an incomplete mock SDK event type; its optional user field was added, with 46 focused tests and the subsequent build passing. Earlier failed or interrupted runs remain separately labelled and uncredited. No further optimisation is authorised or planned. The verified patch is approved for delivery to main.

## Method and coverage

Lighthouse 12.8.2 runs against a local Next 16.3.8 production build. The PageSpeed API returned HTTP 429 because its shared quota was exhausted, so these are direct Lighthouse lab audits. Mobile tests retain the standard simulated mobile profile: 412 × 823 pixels, device scale 1.75, 150 ms latency, 1,638.4 Kbps throughput and four times CPU slowdown. Every sample uses a fresh browser profile and cold downloads. Desktop results are reported separately.

Browser APIs and server-rendered anonymous event requests use synthetic fixtures. The dataset contains 12 catalogue events, 24 orders and four dashboard event summaries. The fixture server accepts GET requests only. These measurements do not establish production API latency, large-account performance or a guarantee for every event poster and connection.

The inventory contains 51 page routes: 44 rendered screens, three redirect aliases and four exclusions. Two gift routes intentionally return notFound. OAuth and Stripe callbacks require completed external transactions. Password reset, invitation and temporary-access coverage includes guest landing states only. Event-specific check-in coverage uses the existing demonstration state. Redirects and missing content never receive a populated-screen score.

Raw JSON, HTML reports, build identifiers and calibrated conditions are retained under `output/playwright/performance-95/`. A sample is invalid if it contains unknown API requests, runtime errors, mutations or missing expected fixture content. Candidate eight measured seven representative pages with three mobile samples and the remaining screens with one breadth sample. Its full table below is historical. The final delivery scope retains functional verification and a bounded Orders audit, rather than repeating the full breadth matrix after Abdel stopped optimisation. Only a valid median of at least 95 confirms that threshold.

## Historical candidate-eight and candidate-nine measurements

The standard mobile target remains unmet: no assessed screen reaches 95. These scores measure the synthetic states described above. Desktop results are single samples and do not confirm a repeated median.

| Representative screen | Baseline mobile single | Candidate-eight mobile median | Candidate-eight LCP | Candidate-eight desktop single |
| --- | ---: | ---: | ---: | ---: |
| Home | 86 | 93 | 3.14 s | 100 |
| Catalogue | 82 | 92 | 3.37 s | 100 |
| Event | 79 | 89 | 3.77 s | 99 |
| Pricing | 86 | Unassessed | NO_LCP | NO_LCP |
| Overview | 78 | 85 | 4.34 s | 97 |
| Orders | 80 | 83 | 4.64 s | 98 |
| Event wizard | 80 | 83 | 4.61 s | 99 |

The baseline uses the same fixtures and standard mobile conditions but only one sample per screen. It does not establish a repeated before-and-after comparison. Desktop uses Lighthouse's installed desktop configuration: 1,350 × 940 pixels, DPR 1, 40 ms latency, 10,240 Kbps throughput and CPU multiplier 1.

The first mobile seven-page batch cleared fixture authentication on each document and interfered with cross-tab logout. It is archived without credit. The first desktop attempts inherited mobile settings because the Node API does not apply the CLI preset option; those attempts are also archived without credit. The corrected runs verify the raw calibration and seed authentication once per fresh origin/context.

The mobile simulation predicts late content arrival. Home and catalogue's shared React chunk transfers 73,438 bytes and completes at simulated 3.01 and 3.31 seconds. Orders waits for client code, profile/organiser state and page data; its first sample's Orders and event requests finish at simulated 4.80 seconds. Event detail's 25,337-byte page chunk completes at simulated 3.77 seconds. These dependency timings are separate from local observed timings and do not prove that one proposed change alone will reach 95.

A candidate-nine browser diagnostic held the shared React download until about 1.02 seconds. Home, catalogue and the event hero painted before release, with LCP entries at 112, 60 and 64 ms respectively. Hydration did not replace those entries. The candidate-eight observed LCP values are similarly early. The simulated public LCP cannot therefore be treated as proof of an application visibility gate. A separate standard-mobile check using Lighthouse 13.5.0 on unchanged candidate nine returns Home 93, LCP 3.142 seconds, and Pricing NO_LCP. It runs under supported Node 24.19 with the same fixture guards. Its version and single-sample results remain separate from the original 12.8.2 comparisons; no application improvement is attributed to the version change. [Google's release notes](https://github.com/GoogleChrome/lighthouse/releases/tag/v13.5.0) identify the current release; [version 13.2](https://github.com/GoogleChrome/lighthouse/releases/tag/v13.2.0) also added an LCP invalidation fallback.

Events has a confirmed loader/content transition defect. The same DOM node changes from a centred 123 × 64 pixel spinner container to the full 412 × 2,776 pixel page container, producing CLS 0.3983654915. Candidate nine, build `UjN1hQfq6jZBgwhMgSmvv`, separates the loading status from the loaded content region within a stable shell. Its ordinary production build and TypeScript check pass; scoped Events ESLint reports zero findings. Nine populated, empty, error and refresh checks pass across mobile Chromium, mobile WebKit and desktop Chromium. Loading and populated screenshots are byte-identical after fixing the spinner animation frame for comparison. The observer records zero layout shifts, retains the outer shell, disconnects the loading status and mounts a new content section. Refresh retains the content node, Active tab and selected events. Three standard mobile Lighthouse samples score 85, 85 and 85, with CLS zero in each. Median LCP is 4.30 seconds and TBT is 41 ms. Candidate eight had one Events sample of 67 with CLS 0.398365. The latest Events result still falls short of 95. This change does not reduce loading time. Settings CLS is now zero, compared with 0.395848 in candidate four; Embed CLS is 0.006556, compared with 0.253153. Those comparisons use single breadth samples.

Pricing and About display the expected content without runtime errors but produce no LCP entry. An equivalent fade declaration preserved eight paused screenshots exactly and still produced no LCP entry. That experiment was rejected; no source or emitted asset was changed. These pages receive no invented score.

### Historical candidate-eight mobile breadth

The following table records candidate eight only. The later Events wrapper fix has a separate build and must not be counted as a rerun of every screen.

| Screen | Valid runs | Performance samples | Result | Score | LCP seconds | TBT ms | CLS | SEO samples | Meets 95 | Confirmed by repeats |
| --- | ---: | --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| home | 3/3 | 93, 93, 93 | median | 93 | 3.14 | 5 | 0.000 | 100, 100, 100 | No | No |
| catalogue | 3/3 | 92, 92, 92 | median | 92 | 3.37 | 4 | 0.000 | 100, 100, 100 | No | No |
| event | 3/3 | 89, 89, 89 | median | 89 | 3.77 | 14 | 0.000 | 100, 100, 100 | No | No |
| pricing | 0/3 |  | unassessed | Unassessed |  |  |  |  | No | No |
| overview | 3/3 | 85, 86, 83 | median | 85 | 4.34 | 12 | 0.000 | 69, 69, 69 | No | No |
| orders | 3/3 | 83, 83, 83 | median | 83 | 4.64 | 52 | 0.000 | 69, 69, 69 | No | No |
| wizard | 3/3 | 84, 83, 83 | median | 83 | 4.61 | 23 | 0.000 | 66, 66, 66 | No | No |
| about | 0/1 |  | unassessed | Unassessed |  |  |  |  | No | No |
| contact | 1/1 | 93 | single | 93 | 3.15 | 5 | 0.000 | 100 | No | No |
| faq | 1/1 | 94 | single | 94 | 3.06 | 4 | 0.000 | 100 | No | No |
| privacy | 1/1 | 93 | single | 93 | 3.21 | 9 | 0.000 | 100 | No | No |
| terms | 1/1 | 94 | single | 94 | 3.07 | 7 | 0.000 | 100 | No | No |
| cookie-policy | 1/1 | 93 | single | 93 | 3.21 | 8 | 0.000 | 100 | No | No |
| organiser | 1/1 | 87 | single | 87 | 4.09 | 12 | 0.000 | 100 | No | No |
| embed | 1/1 | 91 | single | 91 | 3.47 | 14 | 0.007 | 69 | No | No |
| login | 1/1 | 91 | single | 91 | 3.49 | 7 | 0.000 | 69 | No | No |
| register | 1/1 | 86 | single | 86 | 4.21 | 16 | 0.000 | 69 | No | No |
| forgot-password | 1/1 | 92 | single | 92 | 3.29 | 3 | 0.000 | 69 | No | No |
| reset-password | 1/1 | 92 | single | 92 | 3.29 | 4 | 0.000 | 69 | No | No |
| heightspr | 1/1 | 90 | single | 90 | 3.61 | 4 | 0.000 | 69 | No | No |
| analytics | 1/1 | 86 | single | 86 | 4.24 | 35 | 0.000 | 69 | No | No |
| events | 1/1 | 67 | single | 67 | 4.30 | 58 | 0.398 | 69 | No | No |
| team | 1/1 | 85 | single | 85 | 4.39 | 25 | 0.000 | 69 | No | No |
| check-in | 1/1 | 86 | single | 86 | 4.23 | 2 | 0.000 | 69 | No | No |
| email-attendees | 1/1 | 85 | single | 85 | 4.34 | 34 | 0.024 | 69 | No | No |
| billing | 1/1 | 87 | single | 87 | 4.02 | 8 | 0.000 | 69 | No | No |
| billing-purchase | 1/1 | 86 | single | 86 | 4.18 | 10 | 0.000 | 69 | No | No |
| profile | 1/1 | 81 | single | 81 | 5.05 | 3 | 0.000 | 69 | No | No |
| settings | 1/1 | 87 | single | 87 | 4.06 | 32 | 0.000 | 69 | No | No |
| create-choice | 1/1 | 86 | single | 86 | 4.16 | 2 | 0.000 | 69 | No | No |
| create-ai | 1/1 | 87 | single | 87 | 4.11 | 8 | 0.000 | 69 | No | No |
| registration | 1/1 | 88 | single | 88 | 3.92 | 7 | 0.000 | 69 | No | No |
| event-edit | 1/1 | 82 | single | 82 | 4.88 | 9 | 0.000 | 69 | No | No |
| event-check-in | 1/1 | 86 | single | 86 | 4.21 | 26 | 0.000 | 69 | No | No |
| published | 1/1 | 88 | single | 88 | 3.94 | 3 | 0.000 | 69 | No | No |
| checkout-cancel | 1/1 | 93 | single | 93 | 3.21 | 6 | 0.000 | 69 | No | No |
| checkout-success | 1/1 | 90 | single | 90 | 3.56 | 8 | 0.000 | 69 | No | No |
| billing-success | 1/1 | 86 | single | 86 | 4.18 | 10 | 0.000 | 69 | No | No |
| event-preview | 1/1 | 83 | single | 83 | 4.74 | 8 | 0.000 | 69 | No | No |
| preview-shell | 1/1 | 86 | single | 86 | 4.12 | 7 | 0.010 | 66 | No | No |
| admin | 1/1 | 83 | single | 83 | 4.72 | 33 | 0.000 | 69 | No | No |
| heightspr-admin | 1/1 | 93 | single | 93 | 3.14 | 3 | 0.000 | 69 | No | No |
| invitation-guest | 1/1 | 92 | single | 92 | 3.29 | 3 | 0.000 | 69 | No | No |
| temporary-access-guest | 1/1 | 92 | single | 92 | 3.28 | 3 | 0.000 | 69 | No | No |

## Retained improvements

Orders filter URLs now use Next's native browser-history integration. Typing five letters previously caused five RSC route requests; it now causes zero. Back, forward, reload and existing filters remain supported. Decorative search icons pass taps through to the input, fixing the reproduced Safari tap interception.

The organiser access guard keeps known authorised content mounted while refreshing. Initial unknown access and revoked access remain gated. Settings and Events keep their known content during refresh, preserving unsaved values, focus and DOM identity. Initial loading reserves the existing layout space; the mobile navigation waits for its role before appearing. Losing a role also releases an expanded menu's body lock.

Authentication startup owns one profile request, including recovered-session notifications. Generation checks prevent delayed session recovery or token refresh from restoring an explicitly cleared session. The actual installed SDK was tested with delayed storage. The proof covers sign-out during SDK recovery; unit tests also cover sign-out before the SDK import resolves.

The full Supabase client is replaced by its matching authentication-only package, with the same project storage key, headers, persistence, refresh and OAuth settings. Actual production SDK gzip size fell from 44,146 to 20,869 bytes, a saving of 23,277 bytes. The isolated bundle estimate is not used as the production saving.

Public catalogue, event and embed screens render anonymous server snapshots before browser data loading. One request-scoped event fetch supplies metadata and page content. Browser validation still controls current availability and protected-event access. Preview requests retain their existing behaviour. Tests cover failed validation, access denial, timezone hydration, early-bird deadlines, query filtering and pagination during background refresh.

Confirmed anonymous mobile pages defer SDK construction while stored sessions, auth callbacks, later factory calls and cross-tab session arrival initialise it. The readiness module has no runtime SDK import. Anonymous Home, Pricing, catalogue and event-detail browser checks each request zero SDK and profile resources. Authenticated public tabs still observe other-tab logout.

Pricing renders with an anonymous server exchange-rate snapshot in a route-local provider. It retains the original browser fallback, manual refresh and conversions. No-JavaScript GBP content, organiser EUR preferences and USD selection pass browser checks, with no redundant browser rate request when seeded.

Maps and charts load when close to the viewport, with matching placeholder dimensions. Recharts is absent from the initial overview bundle. Duplicate global Leaflet CSS is removed while the map stylesheet remains. Exchange rates load only when consumed and retain the existing cache and conversions.

Unused font preloads are removed while remaining font assets and classes are retained. Actual representative text continues to use the same native fonts. Tailwind scans application source rather than generated output. TypeScript discovery excludes the unrelated nested worktree, audit output and reports, matching the tooling boundary already used by ESLint. A build stalled during discovery before these exclusions; the ordinary build passed after them. Header account controls load separately on desktop and are absent from mobile downloads. The avatar fallback retains its geometry and first click or keyboard action. Pricing prefetches Contact Sales after intent; blocked preview links do not prefetch destinations.

Public and authentication animations use synchronous LazyMotion with domAnimation. Existing animation props, gestures, entrance timing and rendered markup remain intact. The asynchronous feature-loading experiment was rejected after interaction regressions. CSS inlining and a CSS splitting experiment were also rejected because their measured costs increased.

## Dead code and dependency checks

Nine verified unreferenced source files were deleted: fee-breakdown, refund-dialog, ui/navigation-menu, data/mock-events, hooks/useInView, lib/errors, lib/fetchWithTimeout, lib/geocoding and lib/toast-examples. Caller searches and explicit tooling entry points were checked before deletion.

Unused runtime dependencies cobe, next-themes and @radix-ui/react-navigation-menu were removed. Unused development packages eslint-config-prettier, eslint-plugin-prettier and eslint-plugin-storybook were removed. Visually Hidden and Storybook React are now declared directly where used. Knip reports no unused dependencies or development dependencies. Its three remaining server-only declaration findings are supported Next aliases.

Next and eslint-config-next are updated to 16.3.8; the four direct Vitest packages are updated together to 4.1.11. These patches address published advisories. The application does not use attacker-controlled SVG input in its OG image route. The production dependency audit reports zero advisories. The complete development dependency tree still reports 11 flagged packages, including nine high-severity entries. This is a dependency audit, not an exploit assessment.

## Architecture and verification

The retained changes keep the current routes, providers and response contracts. Initial public data now has a clear server/browser boundary. Authentication generation checks protect session changes; organiser refresh preserves mounted content. Lighthouse unused-at-load JavaScript includes framework code and later interactions, so it is not treated as a deletion list.

Candidate eight, build `ZO16HNQ2Ri3BCoEG7jJGF`, passed the ordinary TypeScript check and production build. All 478 unit tests passed across 97 files. ESLint reports zero errors and four existing internal-navigation warnings. The seven tracked browser suites passed 141 distinct cases across desktop Chromium, mobile WebKit and tablet WebKit, with no skips or flaky results. Separate fixture checks passed 41 cases; the deferred Header passed 12 checks and public motion passed nine checks on the same production build. The final mobile audit returned 54 valid samples across 42 screens from 58 attempts. Six representative screens have three valid samples each. Pricing returned NO_LCP in three samples and About in one; both remain unassessed. All six valid representative desktop singles scored 97 to 100; Pricing returned NO_LCP.

Fresh GPT-6.1 Sol high reviews checked the authentication-only migration, all 46 migrated Motion prop lists and 24 existing function bodies. The final review caught a cross-tab logout regression in the anonymous SDK deferral. Authoritative access-token removal and storage.clear now clear local authentication and invalidate pending recovery/profile requests. Refresh-token removal alone keeps valid access. The fix passed 55 shuffled source tests, independent real-SDK/reproduction checks and all three red-to-green browser cases. No unresolved source defect remains from those authentication reviews. The performance acceptance target remains unmet. Existing unrelated AGENTS.md edits, the nested Claude worktree and the untracked logo remain excluded from task delivery.

No customer records, migrations, payments, emails or backend contracts were changed. Abdel subsequently authorised Astra low review of the presented web-session bridge and Orders SSR plan, conditional implementation, tests, a fresh GPT-6.1 Sol extra-high final review, and commit/push. Astra approved with session-isolation and access-refresh safeguards. Implementation is frozen; the final build and functional delivery checks pass. The latest target accepts 95 or close. The detailed plan is in `../plans/2026-10-03-authenticated-ssr.md`.

## Delegated checks

GPT-6 Astra low reviewed the authenticated SSR plan. GPT-6.1 Sol extra-high performed the fresh final source and acceptance review. GPT-6.1 Sol high handled eight assignments: architecture; dashboard diagnosis and calibrated audits; Events status/content review; independent SDK recovery review; public rendering; Orders SSR; the client session bridge and ownership repairs; browser and audit verification. GPT-6.1 Sol medium handled Header loading and first-interaction/motion checks. Existing agents were reused. Per-agent token and usage totals are unavailable.

## Authenticated Orders pilot and final delivery scope

The authorised Orders pilot adds a same-origin web-session bridge and request-scoped server rendering. A token and nonce share one HttpOnly, host-only Secure production cookie. A separate activation marker prevents a delayed cookie response from reactivating an old session. Private HTML, RSC and bridge responses use no-store headers. Profile, onboarding, active membership, role and event scope are checked before Orders data is returned. Tokens are not exposed in rendered seed data. Browser fallback remains available when the bridge or cookie is missing or expired.

Pilot build `cCb7vLpvuwXohWQOXbvRP` scored 86, 86 and 86 in standard mobile Orders samples, with median LCP 4.187 seconds and CLS zero. Candidate eight scored 83 with LCP 4.64 seconds. A separate held-React check showed Orders content before React release, with observed fixture LCP 528 ms and TTFB 60.8 ms. These local observed timings do not predict deployed timings or replace the simulated Lighthouse result.

The final source adopts text entered or cleared before hydration on Orders, Home and catalogue. It retains URL filters and later URL synchronisation. Initial Orders resources remain owned across search and history changes; manual refresh still updates them. The closed organiser-creation dialog loads on first use and remains mounted after closing. Backend-only sessions use the existing profile path without constructing an SDK; stored SDK sessions, callbacks, conservative unreadable-storage fallback and later SDK arrival keep the recovery path. Late SDK arrival does not repeat a current profile load, while revised credentials still reverify and explicit refresh remains active.

The final extra-high review reproduced and repaired delayed SDK/account-switch, offline logout, reload restoration, queued storage/sign-out, request retry and failed-refresh cleanup races. Automatic credential setters and clears bind to the observed session owner before mutation and after synchronous activation listeners. Paired access and refresh credentials are published before auth listeners run. Callers update local ownership and UI only after acceptance. This protects observed shared-storage changes and synchronous callbacks; it does not claim a transactional localStorage operation across tabs.
