# Frontend Repository Guidelines

## Project Overview
This is the Halal Ticketin frontend: a Next.js App Router app using TypeScript, Tailwind CSS, Radix UI, Storybook, Vitest, Playwright, Supabase, maps, QR tooling, and checkout/event-management flows.

## Project Structure
- `src/app/`: App Router routes, layouts, pages, and route groups.
- `src/components/`: Shared UI and feature components.
- `src/lib/`, `src/hooks/`, `src/context/`: API clients, shared behavior, and client state.
- `src/stories/`: Storybook stories.
- `tests/`: Playwright smoke and browser tests.
- `public/`: Static assets and embedded public resources.

## Source of Truth
- API client helpers: `src/lib/api.ts`, `src/lib/checkout-api.ts`, and related `src/lib/*-api.ts` files.
- Supabase browser setup: `src/lib/supabase.ts`.
- Pricing/fees/currencies: `src/lib/fees.ts` and `src/lib/stripe-fees.ts`.
- Public event and organizer routes: `src/app/(public)/events/` and `src/app/(public)/organizers/`.
- Dashboard flows: `src/app/(dashboard)/dashboard/`, `src/app/(dashboard)/events/`, and `src/app/(dashboard)/settings/`.
- Checkout and gift flows: `src/app/checkout/` and `src/app/(public)/gift/`.

## Environment
- `NEXT_PUBLIC_API_URL` points to the backend, defaulting locally to `http://localhost:3001`.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` configure Supabase client access.
- `NEXT_PUBLIC_SITE_URL` controls metadata, robots, and sitemap URLs.
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is used for maps/location autocomplete.
- `NEXT_PUBLIC_STRIPE_FEE_PERCENT` and `NEXT_PUBLIC_STRIPE_FEE_FIXED` affect displayed fee calculations.

## Commands
- `npm run dev`: Start the local Next.js app.
- `npm run build`: Build the production app.
- `npm run lint`: Run ESLint.
- `npm run test:unit`: Run Vitest unit tests.
- `npm run test:storybook`: Run Storybook test project.
- `npm run test:all`: Run all Vitest projects.
- `npm run test:smoke`: Run Playwright smoke tests.
- `npm run storybook`: Start Storybook on port 6006.

## Git Author and Vercel Deployment
- Before creating frontend commits, verify `git config user.name` and `git config user.email`.
- Use `halalticketin-atms <halalticketin@gmail.com>` unless Abdel explicitly instructs otherwise.
- Do not use `2480904692+halalticketin-atms@users.noreply.github.com`; GitHub does not map that malformed noreply address to the `halalticketin-atms` account and Vercel blocks deployments from it.
- After pushing commits that should auto-deploy, confirm the GitHub author maps to `halalticketin-atms` and check the Vercel commit status. Do not manually trigger or redeploy in Vercel unless Abdel explicitly asks.
- If Abdel clearly asks in the current request to push, deploy, redeploy, or publish this frontend, treat that as approval for the requested GitHub or Vercel action. Do not ask for an extra approval round unless the target project, account, environment, visibility, or action is ambiguous or materially different from the request.

## Coding Guidelines
- Keep App Router server/client boundaries explicit. Use client components only for browser state, effects, or interactivity.
- Use existing Radix UI and shared components before adding new primitives.
- Keep API access centralized through existing helpers; do not scatter fetch logic or duplicate endpoint constants.
- UI work must be polished on desktop and mobile, including spacing, overflow, and touch targets.
- Preserve accessibility for forms, dialogs, menus, QR flows, maps, checkout, and organiser dashboards.
- Treat checkout, order status, refund status, gift claims, and check-in state as cross-app contracts with the backend and mobile app.
- Keep organiser-facing language consistent: use "organiser" in UI copy unless existing source text uses another spelling.

## Verification
- Run `npm run lint` and `npm run test:unit` for normal frontend changes.
- Run `npm run build` for routing, server component, env, or deployment-sensitive changes.
- Run `npm run test:smoke` for auth, checkout, organiser dashboard, event editing, or QR-related flows.
- Use Storybook when changing reusable components with stories.
- Manually test login, public event detail, checkout success/cancel, organiser dashboard, event edit/publish, orders, and check-in when those flows are touched.
