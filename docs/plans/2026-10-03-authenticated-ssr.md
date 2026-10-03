# Authenticated dashboard rendering proposal

Status: Astra low approved with revisions on 3 October 2026. Abdel authorised implementation after that review, verification, a fresh GPT-6.1 Sol extra-high final review, and commit/push. Implementation and final source/functional verification are complete. Abdel stopped further optimisation and authorised commit/push after verification. The current optimisation patch retains the existing browser-token authentication. This proposal adds a web access-token cookie/session bridge and server rendering for the dashboard Orders pilot. The latest user instruction approves this previously presented authentication change conditional on review. The final performance target is 95 or close, with honest measured results.

## Problem and measurable outcome

Standard mobile Lighthouse still scores the populated dashboard below 95. In candidate six, the shared React chunk finishes at simulated 3.611 seconds; profile and organiser requests finish at 3.791 and 3.876 seconds. Orders page requests begin at 4.167 seconds and complete at 4.647 seconds, producing LCP. These are computed lab dependencies with synthetic data, not production API timings.

The pilot will render verified Orders content in the first server response. Compare the same fixtures and mobile settings before and after, using three samples and a median. Retain it only if it removes the demonstrated waterfall, preserves interactions and passes the privacy/session checks below. A higher score is expected; 95 is an acceptance target, not a guaranteed prediction. Expand to other private pages only after the pilot proves the approach.

## Proposed files and ownership

Add a small bridge client module and same-origin `POST/DELETE /api/web-session` handler. Update the existing token-change seam in `src/lib/api.ts` to schedule access-token bridge updates. Add server session/data helpers with request-local credentials. Split the private dashboard layout into a server wrapper and the existing client layout. Add seed support to the existing auth/organiser contexts and Orders data state, plus awaited logout navigation where necessary. No backend endpoints, schemas or released-mobile response contracts change.

Keep one root SDK/session owner. The private route group exposes a verified server seed through a context view until that owner adopts or rejects it. Bind every seed to its activation nonce, verified user, organiser and request parameters. Reject late or cached RSC seeds when their nonce or identity no longer matches. Read cookies in the private route group only; reading them in RootLayout would make currently static public pages request-time routes.

## Session lifecycle

Mirror only the current access token into an HttpOnly web cookie. Retain refresh tokens and refresh ownership in the browser. Cover backend password login, registration, Supabase callbacks, SDK refresh and API refresh through the existing token-setting seam. Also bootstrap returning backend-password sessions whose SDK session is null and whose token setter is not called during restoration. Bound acknowledgement before post-login private navigation. Bridge failure, expiry or a missing cookie falls back to the current browser loading and refresh flow without prematurely redirecting a valid browser session.

Store access token and write nonce atomically in one HttpOnly cookie. Pair that cookie with a client-writable activation cookie that SSR can read. Server rendering requires matching values. Rotate the marker synchronously on account switching and clear it synchronously on logout, before any network request. POST and DELETE responses must never set the activation marker. Serialise bridge writes and invalidate obsolete generations. Serialisation in one tab cannot order writes from another tab; mismatched responses must remain inactive and trigger reconciliation with the current shared session. A delayed account-A cookie response cannot reactivate account A after logout or account B's activation marker. Offline logout must also disable server rendering immediately.

The bridge checks the same-origin request before changing cookies. Use host-only Secure cookies with explicit SameSite and Path settings in production; the activation cookie remains client-writable. Backend verification decides access; an unverified client claim never supplies private data. Use explicit Bearer headers, `cache: 'no-store'`, bounded timeouts and request-scoped responses. Apply private no-store response headers to HTML, RSC and bridge responses. Never use the browser API client's module-level token state on the server. Tokens must never appear in HTML, RSC payloads, logs or exposed seed props.

## Access and refresh behaviour

Verify profile, onboarding, active organiser membership, role and event scope at every private server data helper/page before rendering its data. A shared-layout check alone is insufficient because Next layouts can be reused across navigation. Preserve restricted check-in, suspended access, removed membership and existing redirects. Seed only matching organiser, URL filters and request parameters. Skip matching initial browser reads, while retaining manual refresh, focus refresh and mutation reloads. Identity and generation checks must cover profile, organiser and Orders responses, so delayed account-A reads cannot overwrite account B. Explicitly define adoption and invalidation across the single auth owner and each seeded context.

## Required checks

- Backend password sessions and SDK sessions render the same authorised screen.
- Expired cookies fall back to browser refresh, with no stale private content.
- Delayed writes after logout or account switching cannot activate the old account.
- Delayed profile, organiser and Orders responses cannot overwrite the new account, including cached private navigation.
- Delayed SDK recovery and broadcast events cannot replace a newer account or restore a completed logout. A legitimate subsequent sign-in still works.
- A request awaiting refresh cannot retry its original body using another account's credentials.
- Returning backend-token sessions bootstrap the bridge; acknowledgement failure retains browser loading.
- Offline logout and cross-tab clearing remove private content and disable server seeds.
- Two concurrent users never share credentials, cached data or server responses.
- Onboarding, suspended, removed and restricted users retain their existing gates.
- HTML and RSC contain no tokens; private reads and responses are uncached.
- Each initial resource is read once; later refresh still updates it.
- Orders filters, URL back/forward/reload, single-tap search, editing, exports and existing actions work on desktop, mobile and tablet. Text entered or cleared before hydration survives and updates the existing URL/filter state without another input event.
- The same populated-screen audit markers validate the server-rendered page, with three standard mobile samples.

Use an isolated API fixture for server tests. Browser request interception cannot mock Next's outbound server requests. Production customer data is not part of the pilot tests.

## Approval boundary

The shared rule in `~/.agents/rules/approval-gates.md` requires an explicit instruction naming the target before “changing credentials, authentication, permissions”. The approval target is adding the frontend web access-token cookie/session bridge and authenticated SSR for the dashboard Orders pilot, followed by measured rollout to other private pages if the pilot passes. The original performance request did not explicitly name this mechanism. The subsequent instruction to review this presented plan, implement it if approved, verify it and commit/push supplies that authorisation. Astra approved the plan with the safeguards below.

## Astra review prerequisites

Use one observable session revision at the token seam. Account changes must invalidate profile, organiser and Orders success, error and completion updates. Reset organiser request/cooldown bookkeeping by identity. Reconcile shared storage before bridge writes, including non-empty storage events. A stale tab must not republish its cached token or restore the activation marker. Define permanent server-seed invalidation and one-owner adoption before component splitting. Bound seeded data to Orders, ticket breakdown and organiser events required by the initial Orders tab; keep attendee/waitlist paths unchanged. Request-local memoisation must remain explicit when fetch uses abort timeouts. Verify actual HTML/RSC cache headers and concurrent account isolation.
