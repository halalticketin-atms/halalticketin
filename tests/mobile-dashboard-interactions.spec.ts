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
  expect(await response.json()).toEqual({ fixture: 'mobile-dashboard-get-only' });
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
