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
