# Mobile dashboard interaction investigation, 4 October 2026

The bottom-tab repair is verified locally. The reported Orders search failure remains unresolved. This patch must not be presented as completing both complaints. The initial verification made no commit, push or deployment. Abdel subsequently authorised committing and pushing this bounded repair to main.

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

## Delivery status

The demonstrated navigation defects have a narrow, reviewed repair. The overall two-complaint acceptance is unmet because Orders has no demonstrated failing reproduction and native iPhone behaviour remains unverified. Shipping this as a complete fix would repeat the previous evidence mistake. A supervised, instrumented iPhone reproduction is the next step for Orders. Abdel authorised commit and push after reviewing this result. Vercel status will be checked after the push; no manual redeploy, backend deployment or production-data change is part of this patch.
