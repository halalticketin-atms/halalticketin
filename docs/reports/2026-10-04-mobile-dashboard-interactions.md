# Mobile dashboard interaction investigation, 4 October 2026

The initial bottom-tab repair shipped as `b92452a8f62987ba2e3c94114a6d6e80fe9d4886`, with Orders search still unresolved at that point. The historical investigation below records that bounded result. The follow-up at the end records the subsequently reproduced filter touch/focus defects and inconsistent loading states, their repairs and fresh verification. Abdel authorised committing and pushing the reviewed fixes.

## Demonstrated navigation cause and repair

Baseline is deployed commit `adb127eb0a0aa4d743a7399f2336cbe34d5ea44b`, local production build `WtpURCRwBul6aca3r92at`. Main dashboard tabs render JavaScript-only buttons. With application JavaScript held, an ordinary WebKit touch on the visible Events tab leaves the browser on Orders. With JavaScript available but the Events RSC response held, one touch produces a click and one navigation request, but the tab retains inactive styling until the response arrives. A second tap is unnecessary internally, but the first has no visible acknowledgement.

`MobileBottomNav.tsx` now renders native Next links for main destinations. Before hydration, the browser follows their real hrefs. After hydration, a `useLinkStatus` descendant displays the existing teal text, pill and semibold label while its destination is pending. Committed selection still follows the pathname. Press feedback animates the descendant, keeping the anchor's hit box stable. More, expanded-menu navigation, role gating and scroll visibility retain their existing behaviour.

Two targeted browser regressions fail on the baseline for the stated reasons and pass after the change. The permission unit coverage also fails baseline native-href assertions and passes after the repair.

## Orders evidence and remaining gap

The supplied iPhone screenshot was inspected privately. Its visible field is within the normal Orders filter card. Customer details were not copied into fixtures or reports.

The baseline's visible search input accepted one ordinary WebKit touch and typing. It retained the original DOM node, text and focus through hydration and a held foreground refresh. The same check passes on the patched build. A warm diagnostic also preserved focus through foreground refresh. A separate mocked stored-SDK recovery and same-user token refresh retained the original input, typed text and focus. These are passing observations, not a reproduction or fix of Abdel's search complaint.

Read-only source analysis identified a possible identity-revision race if SDK recovery precedes private seed adoption. An isolated provider execution can advance identity in that ordering. The selective-hydration browser experiment did not establish it: holding the private-provider chunk also delayed root startup in the observed run. Holding Orders hydration while recovering the stored session preserved focus. No auth or Orders production code was changed on that hypothesis.

An initial geometry diagnostic put the input at the viewport edge, underneath the fixed bottom bar. The resulting touch hit Orders rather than the input. That observation was discarded as evidence for the screenshot complaint. The tracked test places the field at viewport y=240 and confirms `elementFromPoint` identifies the input before touching it.

Real iPhone evidence is still required to distinguish no activation from focus followed by loss. The unresolved observations are whether the keyboard or cursor appears briefly, whether failure follows scrolling or returning to Safari, and whether the input disconnects. WebKit emulation has no native iOS keyboard, browser toolbar or scroll momentum. Programmatic scroll placement and emulated focus checks do not prove those native behaviours. No usable local iOS simulator was available.

## Changed paths

- `src/components/dashboard/MobileBottomNav.tsx`
- `src/components/dashboard/check-in-access.test.tsx`
- `tests/mobile-dashboard-interactions.spec.ts`
- `tests/support/mobile-dashboard-fixture.ts`
- This report

The test fixture contains synthetic users and orders. Its server and browser responders reject mutations, unknown endpoints fail the check, and the browser blocks external HTTPS traffic. The fixture identity endpoint is checked before browser tests start. Existing AGENTS.md edits, .claude files and the untracked logo are preserved.

## Verification

Patched production build is `wkdUiKfflJh9FXmyt-qdi`.

- `npm run build` passed.
- All 614 unit tests across 106 files passed, including 16 focused access/navigation tests.
- Fresh `npx tsc --noEmit` passed. An earlier concurrent check observed generated type files disappearing during rebuild and failed; it is not counted as a passing run.
- Scoped ESLint on the four changed code/test files and `git diff --check` passed.
- Eight targeted checks passed across phone and tablet WebKit. They cover first-touch navigation with JavaScript held, visible acknowledgement while a route is held, search typing across hydration and foreground refresh, all main destinations, repeated switches, input-focus departure, browser back/forward and More.
- All 39 existing Orders browser cases passed across desktop Chromium, phone WebKit and tablet WebKit, covering filters, history, refresh, access revocation and mocked detail/edit/export flows. Together with the eight targeted checks, 47 browser cases passed.
- Four settled screenshots have zero differing pixels: mobile WebKit and desktop Chromium, each at the page top and at the search area. This comparison establishes settled appearance only.

The first patched browser run passed six cases and failed two because the synthetic fixture lacked the existing `/credits` read used by Overview. That fixture response was added, then all eight passed. No application change was made for that fixture failure.

GPT-6.1 Sol high performed bounded Orders/source diagnosis. GPT-6.1 Sol medium diagnosed and implemented the navigation repair with exclusive source ownership. GPT-6 Luna medium independently reviewed the diff, permission coverage and all eight screenshot files, finding no material issue in the bounded navigation repair. The owner alone operated browser sessions and verified execution results. Per-agent token totals were unavailable, and no task cost is claimed.

## Running the targeted proof

Use a local frontend build configured for the task's synthetic API on port 3001. That port must be available for this fixture; do not replace an unrelated running backend. Start the fixture with `node --experimental-strip-types tests/support/mobile-dashboard-fixture.ts --serve`, then start the production frontend on port 3210. The recorded run used the existing task-only HTTPS proxy on port 3211.

Run `PLAYWRIGHT_SKIP_BACKEND=1 PLAYWRIGHT_PORT=3210 npx playwright test tests/mobile-dashboard-interactions.spec.ts --project='Mobile Safari' --project='Tablet' --workers=1`. `MOBILE_DASHBOARD_BASE_URL` can point to the local HTTP frontend when the loopback HTTPS proxy is unavailable. The test defaults to `https://127.0.0.1:3211`.

Raw local evidence is under `output/playwright/mobile-interaction-repro/`, including baseline failures, patched passes, synthetic touch traces, mocked recovery evidence and appearance captures. That directory is ignored. The tracked tests and fixture are the durable regression.

## Initial delivery status

The demonstrated navigation defects have a narrow, reviewed repair. The overall two-complaint acceptance is unmet because Orders has no demonstrated failing reproduction and native iPhone behaviour remains unverified. Shipping this as a complete fix would repeat the previous evidence mistake. A supervised, instrumented iPhone reproduction is the next step for Orders. Abdel authorised commit and push after reviewing this result. Vercel status will be checked after the push; no manual redeploy, backend deployment or production-data change is part of this patch.

## Follow-up reproduction and repair

The real production frontend at `b92452a` was tested in touch WebKit with synthetic API responses. Session-cookie bridge writes were intercepted, and no production account or customer data was used. Cold, warm, foreground-return and status-selection checks accepted the first search touch. With Status, Events or Export left open, three raw touches on the visible search field failed. Radix's modal body pointer lock made the touch hit HTML instead of the input. Its outside-touch dismissal waited for a compatibility click that this WebKit run did not produce.

A diagnostic HTML click listener allowed outside dismissal and demonstrated a three-touch Events sequence: the first dismissed the menu, the second focused and typed into search, then the closing menu restored focus to its trigger, and the third retained search focus. This diagnostic change was never an application fix. It demonstrates the timing mechanism, not the exact sequence on Abdel's physical iPhone. The local baseline separately failed an unmodified regression that touches search immediately after Escape begins the real Events closing animation; the input received text and then lost focus.

Orders now controls the three filter menus together. While one is open, only the search input overrides its inherited pointer lock. A native pointerdown on search closes the filter without forcing focus or synthesising a click. Menu close autofocus leaves an already focused search input alone. Escape and selecting an option still restore trigger focus. Rapid Events/search/Status/search cleanup leaves neither a body pointer lock nor an aria-hidden page ancestor.

The old Orders server page also held navigation on Events while its initial Orders read was delayed by 1,200 ms. That baseline failed the 800 ms destination-URL check. A shared organiser `loading.tsx` boundary now commits the destination and displays a wheel while the seed resolves. Settings has the same route fallback. All main and expanded destinations have native hrefs. Main pending links and the visible More button display a wheel while the initial route response is unavailable. Analytics now shows a wheel during its initial client data read, replacing its previous skeleton cards.

The initial candidate still failed the Analytics wheel and More pending-wheel tests. Those gaps were repaired before delivery. A wholly withheld first route response cannot provide an uncached destination shell; the pending navigation wheel acknowledges that interval. The shared dashboard session layout on first entry is outside the child loading boundaries, but it is retained for the dashboard-to-dashboard and Settings switches tested here.

## Follow-up checks

Final local production build is `zFJdxmYfc4eInpiPv2_Pa`.

- `npm run build`, all 614 unit tests in 106 files, fresh `npx tsc --noEmit`, scoped ESLint and `git diff --check` passed.
- The first follow-up candidate passed all 20 initial phone/tablet checks, including the previously failing search and Orders server-loading regressions.
- The final combined browser run passed 79 cases: 40 targeted phone/tablet interactions and all 39 existing Orders cases across desktop Chromium, phone WebKit and tablet WebKit. The 20 touch-only cases intentionally skip desktop Chromium. Held reads prove each destination's wheel and destination URL before page data is released; Settings holds its client module, and Orders holds its server seed.
- Four settled before/after screenshots have zero differing pixels, covering phone WebKit and desktop Chromium at the page top and search field. This compares settled Orders appearance only.
- Fresh GPT-6.1 Sol high review found no outstanding material code defect after resolving the More pending-feedback finding. It inspected the pinned Radix and Next implementation, test coverage and mutation guards. GPT-6.1 Sol medium implemented navigation/loading changes and checked the 16 focused permission/navigation unit cases. The earlier GPT-6.1 Sol high Orders diagnosis and GPT-6 Luna medium bounded visual review remain recorded above. Root alone operated browsers. Per-agent token totals are unavailable.

The task's nine destinations are Overview, Events, Orders, Analytics, Team, Check-in, Email, Credits and Settings. Native iPhone keyboard presentation, VoiceOver and precise physical touch duration remain unverified. The repaired conditions have reproducible automated failures and passing checks; these checks do not establish that every possible cause of Abdel's original device behaviour has been reproduced.
