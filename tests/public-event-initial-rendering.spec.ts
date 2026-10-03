import { expect, test, type Page } from '@playwright/test';
import type { PublicEventData } from '../src/lib/public-event-server';

const slug = process.env.PLAYWRIGHT_PUBLIC_EVENT_SLUG;
const fixtureApi = process.env.PLAYWRIGHT_PUBLIC_EVENT_API_URL ?? 'http://127.0.0.1:3001';

// Run these checks against the GET-only performance fixture, never an authenticated API.
test.skip(!slug, 'Set PLAYWRIGHT_PUBLIC_EVENT_SLUG to an event served by the local GET-only fixture.');

let initialData: PublicEventData;
test.beforeAll(async ({ request }) => {
    if (!slug) return;
    const response = await request.get(`${fixtureApi}/api/v1/public/events/${encodeURIComponent(slug)}`);
    expect(response.ok()).toBe(true);
    initialData = await response.json();
});

async function isolateBrowserApi(page: Page) {
    await page.route('**/api/v1/**', route => route.fulfill({
        status: 200, contentType: 'application/json', body: '{}',
    }));
    await page.route('**/api/v1/exchange-rates', route => route.fulfill({ status: 503, body: '{}' }));
}

test('event and poster are visible with JavaScript disabled', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
    const page = await context.newPage();
    try {
        await isolateBrowserApi(page);
        const response = await page.goto(`/events/${slug}`);
        const html = await response!.text();
        expect(html).toContain(initialData.event.title!);
        expect(html).toContain(initialData.tickets[0].name);
        expect(html).not.toContain('Loading event details');
        expect(html).toContain('rel="preload" as="image"');
        await expect(page.locator('h1').filter({ hasText: initialData.event.title! })).toBeVisible();
        const poster = page.locator('button[aria-label="Open event poster in fullscreen"] img');
        await expect(poster).toBeVisible();
        await expect.poll(() => poster.evaluate(image => {
            let element: Element | null = image;
            while (element) {
                if (getComputedStyle(element).opacity !== '1') return false;
                element = element.parentElement;
            }
            return true;
        })).toBe(true);
    } finally {
        await context.close();
    }
});

test('server content stays visible but inert until current browser availability arrives', async ({ page }) => {
    await isolateBrowserApi(page);
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route(`**/api/v1/public/events/${slug}`, async route => {
        await gate;
        await route.fulfill({
            status: 200, contentType: 'application/json', body: JSON.stringify({
                event: { ...initialData.event, isSoldOut: true, remainingCapacity: 0 },
                tickets: initialData.tickets.map(ticket => ({ ...ticket, isSoldOut: true, remainingQuantity: 0, soldOutReason: 'event_capacity', waitlistEnabled: false })),
            }),
        });
    });
    await page.goto(`/events/${slug}`);
    await expect(page.locator('h1')).toContainText(initialData.event.title!);
    await expect(page.locator('div[inert]')).toHaveCount(1);
    await expect(page.getByText('Loading event details...', { exact: true })).toHaveCount(0);
    release();
    await expect(page.locator('div[inert]')).toHaveCount(0);
    await expect(page.getByText('Event sold out', { exact: true }).first()).toBeVisible();
    const ticket = page.locator('h4').filter({ hasText: initialData.tickets[0].name }).locator('..').locator('..').locator('..');
    await expect(ticket.locator('button').last()).toBeDisabled();
});

test('a newly protected event clears the public snapshot and retains access-code retry', async ({ page }) => {
    await isolateBrowserApi(page);
    const submittedCodes: Array<string | undefined> = [];
    await page.route(`**/api/v1/public/events/${slug}`, async route => {
        const code = route.request().headers()['x-event-access-code'];
        submittedCodes.push(code);
        if (code === 'valid-fixture-code') {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(initialData) });
        } else {
            await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({
                error: { code: code ? 'EVENT_ACCESS_DENIED' : 'EVENT_ACCESS_REQUIRED' },
            }) });
        }
    });
    await page.goto(`/events/${slug}`);
    await expect(page.getByRole('heading', { name: 'Access code required' })).toBeVisible();
    await expect(page.getByRole('heading', { name: initialData.event.title!, exact: true })).toHaveCount(0);
    await expect(page.getByText(initialData.tickets[0].name, { exact: true })).toHaveCount(0);
    await page.getByLabel('Access code', { exact: true }).fill('incorrect-fixture-code');
    await page.getByRole('button', { name: 'Unlock event' }).click();
    await expect(page.getByRole('heading', { name: 'Access code incorrect' })).toBeVisible();
    await page.getByLabel('Access code', { exact: true }).fill('valid-fixture-code');
    await page.getByRole('button', { name: 'Unlock event' }).click();
    await expect(page.getByRole('heading', { name: initialData.event.title!, exact: true })).toBeVisible();
    expect(submittedCodes).toEqual([undefined, 'incorrect-fixture-code', 'valid-fixture-code']);
});

test('canonical redirects preserve the query and hash after browser validation', async ({ page }) => {
    await isolateBrowserApi(page);
    await page.route(`**/api/v1/public/events/${slug}`, route => route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ ...initialData, event: { ...initialData.event, slug: 'canonical-fixture-event' } }),
    }));
    await page.route('**/api/v1/public/events/canonical-fixture-event', route => route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ ...initialData, event: { ...initialData.event, slug: 'canonical-fixture-event' } }),
    }));
    await page.goto(`/events/${slug}?utm_source=fixture&campaign=summer#tickets`);
    await expect(page).toHaveURL(/\/events\/canonical-fixture-event\?utm_source=fixture&campaign=summer#tickets$/);
});

test('poster sizes and event map retain the mobile and desktop layout', async ({ page }) => {
    await isolateBrowserApi(page);
    await page.route(`**/api/v1/public/events/${slug}`, route => route.fulfill({
        status: 200, contentType: 'application/json', body: JSON.stringify(initialData),
    }));
    for (const viewport of [{ width: 390, height: 844, posterWidth: 280 }, { width: 1440, height: 1000, posterWidth: 360 }]) {
        await page.setViewportSize(viewport);
        await page.goto(`/events/${slug}`);
        await expect(page.locator('div[inert]')).toHaveCount(0);
        const poster = page.getByRole('button', { name: 'Open event poster in fullscreen' });
        await expect(poster).toBeVisible();
        await expect.poll(async () => {
            const box = await poster.boundingBox();
            return box ? Math.abs(box.width - viewport.posterWidth) : Infinity;
        }).toBeLessThanOrEqual(1);
        if (initialData.event.latitude !== null && initialData.event.longitude !== null) {
            const mapShell = page.getByTestId('event-location-map');
            const shellBefore = await mapShell.boundingBox();
            if (shellBefore!.y > viewport.height + 400) {
                await expect(page.locator('.leaflet-container')).toHaveCount(0);
            }
            await mapShell.scrollIntoViewIfNeeded();
            await expect(page.locator('.leaflet-container')).toBeVisible();
            await expect(page.locator('.leaflet-marker-icon')).toBeVisible();
            const mapBox = await page.locator('.leaflet-container').boundingBox();
            expect(mapBox!.height).toBe(300);
            const shellAfter = await mapShell.boundingBox();
            expect(Math.abs(shellAfter!.height - shellBefore!.height)).toBeLessThanOrEqual(1);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(2);
        await page.screenshot({ path: `output/playwright/public-event-${viewport.width}-${test.info().project.name}.png`, fullPage: true });
    }
});

test('the map loads when IntersectionObserver is unavailable', async ({ page }) => {
    test.skip(initialData.event.latitude === null || initialData.event.longitude === null, 'Fixture needs a map location.');
    await isolateBrowserApi(page);
    await page.addInitScript(() => {
        Object.defineProperty(window, 'IntersectionObserver', { value: undefined, configurable: true });
    });
    await page.route(`**/api/v1/public/events/${slug}`, route => route.fulfill({
        status: 200, contentType: 'application/json', body: JSON.stringify(initialData),
    }));
    await page.goto(`/events/${slug}`);
    await expect(page.locator('.leaflet-container')).toBeVisible();
    await expect(page.locator('.leaflet-marker-icon')).toBeVisible();
});

test('favourite animations retain authenticated add and remove behaviour', async ({ page }) => {
    await isolateBrowserApi(page);
    await page.addInitScript(() => {
        localStorage.setItem('halal-ticketin-access-token', 'fixture-access-token');
    });
    await page.route('**/api/v1/auth/me', route => route.fulfill({
        status: 200, contentType: 'application/json', body: JSON.stringify({
            user: { id: 'user-favourite-fixture', email: 'fixture@example.test', name: 'Fixture attendee' },
            memberships: [], isOrganizer: false, needsOnboarding: false,
        }),
    }));
    await page.route(`**/api/v1/public/events/${slug}`, route => route.fulfill({
        status: 200, contentType: 'application/json', body: JSON.stringify(initialData),
    }));
    await page.route(`**/api/v1/users/me/favorites/${initialData.event.id}/check`, route => route.fulfill({
        status: 200, contentType: 'application/json', body: '{"favorited":false}',
    }));
    const mutations: string[] = [];
    await page.route(`**/api/v1/users/me/favorites/${initialData.event.id}`, route => {
        mutations.push(route.request().method());
        return route.fulfill({
            status: 200, contentType: 'application/json', body: JSON.stringify({
                success: true, favorited: route.request().method() === 'POST',
            }),
        });
    });
    const checkedFavourite = page.waitForResponse(response => response.url().endsWith(`/favorites/${initialData.event.id}/check`));
    await page.goto(`/events/${slug}`);
    await checkedFavourite;
    await expect(page.locator('div[inert]')).toHaveCount(0);
    await page.getByRole('button', { name: 'Add to favorites', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Remove from favorites', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Remove from favorites', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Add to favorites', exact: true })).toBeVisible();
    expect(mutations).toEqual(['POST', 'DELETE']);
});
