# Frontend Repository Guidelines

## Project Overview
Halal Ticketin frontend: Next.js App Router with TypeScript, Tailwind, Radix UI, Storybook, Vitest, Playwright, Supabase, maps, QR tooling, checkout, and event-management flows.

## Structure
- `src/app/`: routes, layouts, pages, route groups.
- `src/components/`: shared UI and feature components.
- `src/lib/`, `src/hooks/`, `src/context/`: API clients, shared behavior, client state.
- `src/stories/`: Storybook.
- `tests/`: Playwright smoke/browser tests.
- `public/`: static assets and embedded public resources.

## Source of Truth
- API helpers: `src/lib/api.ts`, `src/lib/checkout-api.ts`, related `src/lib/*-api.ts`.
- Supabase browser: `src/lib/supabase.ts`.
- Pricing/fees/currencies: `src/lib/fees.ts`, `src/lib/stripe-fees.ts`.
- Public event/organizer routes: `src/app/(public)/events/`, `src/app/(public)/organizers/`.
- Dashboard flows: `src/app/(dashboard)/dashboard/`, `src/app/(dashboard)/events/`, `src/app/(dashboard)/settings/`.
- Checkout/gift flows: `src/app/checkout/`, `src/app/(public)/gift/`.

## Environment
- `NEXT_PUBLIC_API_URL`: backend URL, default local `http://localhost:3001`.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase client.
- `NEXT_PUBLIC_SITE_URL`: metadata, robots, sitemap URLs.
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: browser-facing Google Maps key used directly by the web event wizard. Configure it in Vercel/local frontend env and restrict it by allowed web referrers and required browser APIs. It is distinct from the backend's server-only Places key used by mobile.
- `NEXT_PUBLIC_STRIPE_FEE_PERCENT`, `NEXT_PUBLIC_STRIPE_FEE_FIXED`: displayed fee calculations.

## Commands
- `npm run dev`: local Next app.
- `npm run build`: production build.
- `npm run lint`: ESLint.
- `npm run test:unit`: Vitest unit tests.
- `npm run test:storybook`: Storybook test project.
- `npm run test:all`: all Vitest projects.
- `npm run test:smoke`: Playwright smoke tests.
- `npm run storybook`: Storybook on port 6006.

## Git Author and Vercel
- Before frontend commits, verify `git config user.name` and `git config user.email`.
- Use `halalticketin-atms <halalticketin@gmail.com>` unless Abdel says otherwise.
- Do not use `2480904692+halalticketin-atms@users.noreply.github.com`; GitHub does not map it and Vercel blocks deployments.
- After pushing commits intended for auto-deploy, confirm GitHub author maps to `halalticketin-atms` and check Vercel commit status. Do not manually trigger/redeploy unless Abdel asks.
- If Abdel asks in the current request to push/deploy/redeploy/publish this frontend, that approves the requested GitHub/Vercel action. Pause only if target project, account, environment, visibility, or action is ambiguous/materially different.

## Coding Guidelines
- Keep App Router server/client boundaries explicit. Use client components only for browser state, effects, or interactivity.
- Reuse Radix UI and shared components before adding primitives.
- Centralize API access through existing helpers; do not scatter fetch logic or duplicate endpoint constants.
- UI work must be polished on desktop/mobile: spacing, overflow, touch targets.
- Preserve accessibility for forms, dialogs, menus, QR flows, maps, checkout, and dashboards.
- Treat checkout, order/refund/gift/check-in state as backend/mobile contracts.
- Do not route the web event wizard through the mobile Places proxy merely to make the implementations identical: web intentionally uses the browser SDK, while mobile uses the backend proxy because an Expo public variable cannot protect a server credential.
- Use "organiser" in UI copy unless source text already uses another spelling.
- For recurring frontend bug patterns, check `docs/engineering/bug-fix-ledger.md` and add concise reusable lessons.

## Verification
- Normal frontend changes: `npm run lint` and `npm run test:unit`.
- Routing/server component/env/deployment-sensitive changes: `npm run build`.
- Auth, checkout, dashboard, event editing, or QR flows: `npm run test:smoke`.
- Reusable components with stories: use Storybook.
- Manually test touched login, public event detail, checkout success/cancel, dashboard, event edit/publish, orders, and check-in flows.
