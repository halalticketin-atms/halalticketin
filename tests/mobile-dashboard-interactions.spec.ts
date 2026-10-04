import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { fixtureResponse, nonce, organiserId, token } from './support/mobile-dashboard-fixture';

// The server-rendered seed also uses the local GET-only fixture. Never point this proof at production.
const base = process.env.MOBILE_DASHBOARD_BASE_URL ?? 'https://127.0.0.1:3211';
const root = `/dashboard/o/${organiserId}`;
const searchPlaceholder = 'Search by order ID, name, email, or promo code...';
test.use({ baseURL: base, ignoreHTTPSErrors: true });
test.skip(({ isMobile }) => !isMobile, 'Ordinary touch regression for mobile browsers');

async function install(context: BrowserContext) {
  const issues: string[] = [];
  await context.addCookies([
    { name: 'ht-web-session', value: Buffer.from(JSON.stringify({ accessToken: token, nonce })).toString('base64url'), url: base, httpOnly: true, secure: base.startsWith('https:') },
    { name: 'ht-web-session-active', value: nonce, url: base, secure: base.startsWith('https:') },
  ]);
  await context.addInitScript(({ token, nonce, organiserId }) => {
    if (!localStorage.getItem('mobile-fixture-seeded')) {
      localStorage.setItem('mobile-fixture-seeded', '1');
      localStorage.setItem('halal-ticketin-access-token', token);
      localStorage.setItem('halal-ticketin:last-organizer-id', organiserId);
      localStorage.setItem('halal-ticketin:web-session-binding', token);
      localStorage.setItem('halal-ticketin:web-session-nonce', nonce);
    }
    const fetchOriginal = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.startsWith('http://localhost:3001/api/v1/')) {
        const mapped = location.origin + new URL(url).pathname + new URL(url).search;
        return fetchOriginal(input instanceof Request ? new Request(mapped, input) : mapped, init);
      }
      return fetchOriginal(input, init);
    };
  }, { token, nonce, organiserId });
  await context.route('**/api/v1/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const response = fixtureResponse(request.method(), path);
    if (response.status !== 200) issues.push(`${request.method()} ${path}: ${response.status}`);
    await route.fulfill({ status: response.status, contentType: 'application/json', body: JSON.stringify(response.body) });
  });
  await context.route(/https:\/\/(?!127\.0\.0\.1)/, route => route.abort());
  return issues;
}

async function visibleSearch(page: Page) {
  const input = page.getByPlaceholder(searchPlaceholder);
  await input.waitFor();
  // Place the field where it appears in the report, clear of both fixed navigation bars.
  await input.evaluate(e => window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 240));
  const box = await input.boundingBox();
  expect(box).not.toBeNull();
  const centre = { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };
  expect(await input.evaluate((e, p) => document.elementFromPoint(p.x, p.y) === e, centre)).toBe(true);
  return { input, centre };
}

function mainNav(page: Page) { return page.locator('nav').filter({ has: page.getByText('More', { exact: true }) }); }
function tab(page: Page, name: string) { return mainNav(page).getByRole('link', { name, exact: true }); }

test.beforeAll(async ({ request }) => {
  const response = await request.get('http://127.0.0.1:3001/__mobile-fixture');
  expect(await response.json()).toMatchObject({ fixture: 'mobile-dashboard-get-only' });
});

test('one tab tap works while application JavaScript is unavailable', async ({ page, context }) => {
  const issues = await install(context);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await context.route('**/_next/static/chunks/*.js', async route => { await gate; await route.continue().catch(() => {}); });
  try {
    await page.goto(`${root}/orders`, { waitUntil: 'commit' });
    const events = mainNav(page).getByText('Events', { exact: true });
    await events.waitFor();
    await events.tap();
    await expect(page).toHaveURL(`${base}${root}/events`);
    expect(issues).toEqual([]);
  } finally { release(); }
});

test('one tap acknowledges a destination while its route response is pending', async ({ page, context }) => {
  const issues = await install(context);
  await page.goto(`${root}/orders`);
  await expect(mainNav(page)).toBeVisible();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let routeRequests = 0;
  await context.route(`**${root}/events?**`, async route => { routeRequests++; await gate; await route.continue(); });
  // Works on deployed buttons too, so the red check measures missing acknowledgement rather than element type.
  const events = mainNav(page).getByText('Events', { exact: true });
  try {
    await events.tap();
    await expect.poll(() => routeRequests).toBeGreaterThan(0);
    const pending = mainNav(page).locator('[aria-busy="true"]');
    await expect(pending).toContainText('Events');
    await expect(pending.locator('.animate-spin')).toBeVisible();
    const ordersColour = await mainNav(page).getByText('Orders', { exact: true }).evaluate(e => getComputedStyle(e).color);
    expect(await pending.evaluate(e => getComputedStyle(e).color)).toBe(ordersColour);
    expect(page.url()).toContain('/orders');
    release();
    await expect(page).toHaveURL(`${base}${root}/events`);
    await expect(tab(page, 'Events')).toHaveAttribute('aria-current', 'page');
    expect(issues).toEqual([]);
  } finally { release(); }
});

test('visible search accepts its first touch and preserves focus through refresh and hydration', async ({ page, context }) => {
  const issues = await install(context);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await context.route('**/_next/static/chunks/*.js', async route => { await gate; await route.continue(); });
  try {
    await page.goto(`${root}/orders`, { waitUntil: 'commit' });
    const { input, centre } = await visibleSearch(page);
    const original = await input.elementHandle();
    await page.touchscreen.tap(centre.x, centre.y);
    await expect(input).toBeFocused();
    await page.keyboard.type('Amina');
    release();
    await expect(page).toHaveURL(/search=Amina/);
    await expect(input).toHaveValue('Amina');
    await expect(input).toBeFocused();
    expect(await original!.evaluate(e => e.isConnected)).toBe(true);
    let releaseRefresh!: () => void;
    const refresh = new Promise<void>(resolve => { releaseRefresh = resolve; });
    let refreshes = 0;
    await context.route('**/api/v1/orders?**', async route => { refreshes++; await refresh; await route.fallback(); });
    try {
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await expect.poll(() => refreshes).toBeGreaterThan(0);
      await expect(input).toBeFocused();
      await expect(input).toHaveValue('Amina');
      releaseRefresh();
      await expect(input).toBeFocused();
      expect(await original!.evaluate(e => e.isConnected)).toBe(true);
    } finally { releaseRefresh(); }
    expect(issues).toEqual([]);
  } finally { release(); }
});

test('repeated ordinary tab taps, input focus and browser history stay correct', async ({ page, context }) => {
  const issues = await install(context);
  await page.goto(`${root}/orders`);
  const { input, centre } = await visibleSearch(page);
  await page.touchscreen.tap(centre.x, centre.y);
  await page.keyboard.type('Amina');
  await expect(input).toBeFocused();
  // Re-reveal the scroll-sensitive bar with an upward scroll, then tap while the input still owns focus.
  await page.evaluate(() => window.scrollTo(0, 0));
  for (const [name, suffix] of [['Events', '/events'], ['Analytics', '/analytics'], ['Overview', ''], ['Orders', '/orders'], ['Events', '/events'], ['Orders', '/orders']]) {
    await tab(page, name).tap();
    await expect(page).toHaveURL(`${base}${root}${suffix}`);
    await expect(tab(page, name)).toHaveAttribute('aria-current', 'page');
  }
  await page.goBack();
  await expect(page).toHaveURL(`${base}${root}/events`);
  await page.goForward();
  await expect(page).toHaveURL(`${base}${root}/orders`);
  await mainNav(page).getByRole('button', { name: 'More', exact: true }).tap();
  await expect(page.getByText('Quick Navigation', { exact: true })).toBeVisible();
  expect(issues).toEqual([]);
});

for (const filter of ['Status', 'Events', 'Export']) {
  test(`one deliberate search touch leaves the open ${filter} filter and keeps native focus`, async ({ page, context }) => {
    const issues = await install(context);
    await page.goto(`${root}/orders`);
    const { input, centre } = await visibleSearch(page);
    const original = await input.elementHandle();
    if (filter === 'Status') {
      await page.getByRole('combobox').filter({ hasText: 'All Status' }).tap();
      await page.getByRole('option', { name: 'Paid', exact: true }).waitFor();
    } else {
      await page.locator('[data-slot="dropdown-menu-trigger"]').filter({ hasText: filter }).tap();
      await page.locator('[data-slot="dropdown-menu-content"][data-state="open"]').waitFor();
    }
    // Raw touch keeps the original visible-field coordinates and never retries or forces focus.
    await page.touchscreen.tap(centre.x, centre.y);
    await expect(input).toBeFocused();
    await page.keyboard.type('Amina');
    await expect(page.locator('[data-slot="select-content"],[data-slot="dropdown-menu-content"]')).toHaveCount(0);
    await expect(input).toBeFocused();
    await expect(input).toHaveValue('Amina');
    expect(await original!.evaluate(e => e.isConnected)).toBe(true);
    expect(await page.evaluate(() => getComputedStyle(document.body).pointerEvents)).toBe('auto');
    expect(issues).toEqual([]);
  });
}

test('closing Events does not take focus back after a quick search touch', async ({ page, context }) => {
  await install(context);
  await page.goto(`${root}/orders`);
  const { input, centre } = await visibleSearch(page);
  const events = page.locator('[data-slot="dropdown-menu-trigger"]').filter({ hasText: 'Events' });
  await events.tap();
  await page.locator('[data-slot="dropdown-menu-content"][data-state="open"]').waitFor();
  // Escape is a diagnostic control for beginning the real closing animation, not a focus workaround.
  await page.keyboard.press('Escape');
  await expect(events).toHaveAttribute('aria-expanded', 'false');
  await page.touchscreen.tap(centre.x, centre.y);
  await page.keyboard.type('Amina');
  await expect(page.locator('[data-slot="dropdown-menu-content"]')).toHaveCount(0);
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('Amina');
});

test('filter Escape and selection still return keyboard focus to the trigger', async ({ page, context }) => {
  await install(context);
  await page.goto(`${root}/orders`);
  await visibleSearch(page);
  const events = page.locator('[data-slot="dropdown-menu-trigger"]').filter({ hasText: 'Events' });
  await events.tap();
  await page.locator('[data-slot="dropdown-menu-content"][data-state="open"]').waitFor();
  await page.keyboard.press('Escape');
  await expect(events).toBeFocused();
  const status = page.getByRole('combobox').filter({ hasText: 'All Status' });
  await status.tap();
  await page.getByRole('option', { name: 'Paid', exact: true }).tap();
  await expect(page.getByRole('combobox').filter({ hasText: 'Paid' })).toBeFocused();
});


test('Orders route switches before its server data resolves and shows the loading wheel', async ({ page, context }) => {
  const issues = await install(context);
  const fixture = await (await page.request.get('http://127.0.0.1:3001/__mobile-fixture')).json();
  expect(fixture.ordersDelayMs).toBe(1200);
  await page.goto(`${root}/events`);
  await expect(mainNav(page)).toBeVisible();
  const orders = tab(page, 'Orders');
  await orders.tap();
  await expect(page).toHaveURL(`${base}${root}/orders`, { timeout: 800 });
  await expect(page.getByRole('status', { name: 'Loading dashboard', exact: true })).toBeVisible();
  await expect(page.getByPlaceholder(searchPlaceholder)).toBeVisible();
  await expect(tab(page, 'Orders')).toHaveAttribute('aria-current', 'page');
  expect(issues).toEqual([]);
});

for (const [name, suffix, dataPath] of [
  ['Overview', '', `/api/v1/organizers/${organiserId}/credits`],
  ['Events', '/events', `/api/v1/organizers/${organiserId}/events`],
  ['Analytics', '/analytics', '/api/v1/analytics/overview'],
  ['Team', '/team', `/api/v1/organizers/${organiserId}/memberships`],
  ['Check-in', '/check-in', `/api/v1/organizers/${organiserId}/events`],
  ['Email', '/email-attendees', `/api/v1/organizers/${organiserId}/attendee-emails/history`],
  ['Credits', '/billing', `/api/v1/organizers/${organiserId}/credits`],
]) {
  test(`${name} switches on one touch and shows a wheel while its page data is held`, async ({ page, context }) => {
    const issues = await install(context);
    await page.goto(`${root}/orders`);
    await expect(page.getByPlaceholder(searchPlaceholder)).toBeVisible();
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    let reads = 0;
    await context.route('**/api/v1/**', async route => {
      if (new URL(route.request().url()).pathname === dataPath) reads++;
      await gate;
      await route.fallback();
    });
    try {
      if (['Overview', 'Events', 'Analytics'].includes(name)) await tab(page, name).tap();
      else {
        await mainNav(page).getByRole('button', { name: 'More', exact: true }).tap();
        await page.getByRole('link', { name, exact: true }).filter({ has: page.locator('span') }).last().tap();
      }
      await expect(page).toHaveURL(`${base}${root}${suffix}`, { timeout: 800 });
      await expect.poll(() => reads).toBeGreaterThan(0);
      const wheel = page.locator('main .animate-spin');
      await expect(wheel.first()).toBeVisible();
      expect(await wheel.first().evaluate(e => getComputedStyle(e).animationName)).not.toBe('none');
      release();
      await expect(wheel).toHaveCount(0);
      await expect(page.getByText('Quick Navigation', { exact: true })).toHaveCount(0);
      expect(issues).toEqual([]);
    } finally { release(); }
  });
}

test('More shows a wheel while a destination route response is held', async ({ page, context }) => {
  const issues = await install(context);
  await page.goto(`${root}/orders`);
  await expect(mainNav(page)).toBeVisible();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let routeRequests = 0;
  await context.route(`**${root}/billing?**`, async route => { routeRequests++; await gate; await route.continue(); });
  try {
    await mainNav(page).getByRole('button', { name: 'More', exact: true }).tap();
    await page.getByRole('link', { name: 'Credits', exact: true }).last().tap();
    await expect.poll(() => routeRequests).toBeGreaterThan(0);
    const more = mainNav(page).getByRole('button', { name: 'More', exact: true });
    await expect(more).toHaveAttribute('aria-busy', 'true');
    await expect(more.locator('.animate-spin')).toBeVisible();
    expect(page.url()).toContain('/orders');
    release();
    await expect(page).toHaveURL(`${base}${root}/billing`);
    await expect(more).not.toHaveAttribute('aria-busy', 'true');
    expect(issues).toEqual([]);
  } finally { release(); }
});

test('Settings switches before its client module arrives and shows the shared wheel', async ({ page, context }) => {
  const issues = await install(context);
  await page.goto(`${root}/orders`);
  await expect(mainNav(page)).toBeVisible();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let chunks = 0;
  await context.route('**/_next/static/chunks/*.js', async route => { chunks++; await gate; await route.continue(); });
  try {
    await mainNav(page).getByRole('button', { name: 'More', exact: true }).tap();
    await page.getByRole('link', { name: 'Settings', exact: true }).last().tap();
    await expect(page).toHaveURL(`${base}/settings`, { timeout: 800 });
    await expect.poll(() => chunks).toBeGreaterThan(0);
    await expect(page.getByRole('status', { name: 'Loading dashboard', exact: true })).toBeVisible();
    release();
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
    await expect(page.getByRole('status', { name: 'Loading dashboard', exact: true })).toHaveCount(0);
    expect(issues).toEqual([]);
  } finally { release(); }
});

test('a rapid Events search and Status search leave no pointer lock or hidden page', async ({ page, context }) => {
  const issues = await install(context);
  await page.goto(`${root}/orders`);
  const { input, centre } = await visibleSearch(page);
  await page.locator('[data-slot="dropdown-menu-trigger"]').filter({ hasText: 'Events' }).tap();
  await page.touchscreen.tap(centre.x, centre.y);
  await page.getByRole('combobox').filter({ hasText: 'All Status' }).tap();
  await page.touchscreen.tap(centre.x, centre.y);
  await page.keyboard.type('Amina');
  await expect(page.locator('[data-slot="select-content"],[data-slot="dropdown-menu-content"]')).toHaveCount(0);
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('Amina');
  expect(await input.evaluate(e => e.closest('[aria-hidden="true"]'))).toBeNull();
  expect(await page.evaluate(() => getComputedStyle(document.body).pointerEvents)).toBe('auto');
  expect(issues).toEqual([]);
});
