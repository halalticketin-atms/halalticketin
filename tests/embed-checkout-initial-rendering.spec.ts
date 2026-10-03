import { expect, test, type Page } from '@playwright/test';
import type { PublicEventData } from '../src/lib/public-event-server';

const slug = process.env.PLAYWRIGHT_PUBLIC_EVENT_SLUG;
const fixtureApi = process.env.PLAYWRIGHT_PUBLIC_EVENT_API_URL ?? 'http://127.0.0.1:3001';
test.skip(!slug, 'Set PLAYWRIGHT_PUBLIC_EVENT_SLUG to an event served by the local GET-only fixture.');

let initialData: PublicEventData;
test.beforeAll(async ({ request }) => {
    if (!slug) return;
    const response = await request.get(`${fixtureApi}/api/v1/public/events/${encodeURIComponent(slug)}`);
    expect(response.ok()).toBe(true);
    initialData = await response.json();
});

async function isolateBrowserApi(page: Page) {
    await page.route('**/api/v1/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    await page.route('**/api/v1/exchange-rates', route => route.fulfill({ status: 503, body: '{}' }));
}

test('published embed tickets and appearance are visible without JavaScript', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    try {
        await isolateBrowserApi(page);
        const response = await page.goto(`/embed/checkout/${slug}?theme=dark&accent=%23ffcc00&font=serif&radius=0`);
        const html = await response!.text();
        expect(html).toContain(initialData.event.title!);
        expect(html).toContain(initialData.tickets[0].name);
        expect(html).not.toContain('Loading tickets');
        await expect(page.getByRole('heading', { name: initialData.event.title!, exact: true })).toBeVisible();
        await expect(page.getByText(initialData.tickets[0].name, { exact: true }).first()).toBeVisible();
        await expect(page.locator('main')).toHaveCSS('padding-top', '0px');
        await expect(page.getByTestId('embed-checkout-shell')).toHaveCSS('--primary', '#ffcc00');
        await expect(page.getByTestId('embed-checkout-shell')).toHaveCSS('--radius', '0px');
        await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(10, 18, 36)');
        const logo = page.locator('footer img');
        await expect(logo).toHaveAttribute('width', '1186');
        await expect(logo).toHaveAttribute('height', '448');
        const box = await logo.boundingBox();
        expect(box!.height).toBe(20);
        expect(Math.abs(box!.width - 20 * 1186 / 448)).toBeLessThan(1);
        await expect(page.getByRole('link', { name: 'Open event page' })).toHaveAttribute('target', '_top');
        await page.screenshot({ path: `output/playwright/embed-initial-nojs-${test.info().project.name}.png`, fullPage: true });
    } finally {
        await context.close();
    }
});

test('initial embed keeps its geometry and gates controls until current availability arrives', async ({ page }) => {
    await isolateBrowserApi(page);
    await page.setViewportSize({ width: 390, height: 844 });
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route(`**/api/v1/public/events/${slug}`, async route => {
        await gate;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(initialData) });
    });
    await page.goto(`/embed/checkout/${slug}?theme=dark&font=serif&radius=0`);
    const shell = page.getByTestId('embed-checkout-shell');
    await expect(page.getByText(initialData.tickets[0].name, { exact: true }).first()).toBeVisible();
    await expect(shell.locator('div[inert]')).toHaveCount(1);
    await expect(page.locator('main')).toHaveCSS('padding-top', '0px');
    await expect(page.getByText('Loading tickets...', { exact: true })).toHaveCount(0);
    const before = await shell.boundingBox();
    release();
    await expect(shell.locator('div[inert]')).toHaveCount(0);
    const after = await shell.boundingBox();
    expect(Math.abs(after!.y - before!.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(after!.height - before!.height)).toBeLessThanOrEqual(1);
    await expect(page.getByRole('link', { name: 'Open event page' })).toHaveAttribute('href', `/events/${encodeURIComponent(initialData.event.slug!)}`);
});

test('refreshed sold-out embed tickets cannot be selected', async ({ page }) => {
    await isolateBrowserApi(page);
    await page.route(`**/api/v1/public/events/${slug}`, route => route.fulfill({
        status: 200, contentType: 'application/json', body: JSON.stringify({
            event: { ...initialData.event, isSoldOut: true, remainingCapacity: 0 },
            tickets: initialData.tickets.map(ticket => ({ ...ticket, isSoldOut: true, remainingQuantity: 0, soldOutReason: 'event_capacity', waitlistEnabled: false })),
        }),
    }));
    await page.goto(`/embed/checkout/${slug}`);
    await expect(page.getByTestId('embed-checkout-shell').locator('div[inert]')).toHaveCount(0);
    await expect(page.getByText('Event sold out', { exact: true }).first()).toBeVisible();
    const ticket = page.locator('h4').filter({ hasText: initialData.tickets[0].name }).locator('..').locator('..').locator('..');
    await expect(ticket.locator('button').last()).toBeDisabled();
});

test('new access requirements clear the snapshot and preserve access-code retries', async ({ page }) => {
    await isolateBrowserApi(page);
    const codes: Array<string | undefined> = [];
    await page.route(`**/api/v1/public/events/${slug}`, route => {
        const code = route.request().headers()['x-event-access-code'];
        codes.push(code);
        return route.fulfill({
            status: code === 'valid-fixture-code' ? 200 : 403,
            contentType: 'application/json',
            body: JSON.stringify(code === 'valid-fixture-code' ? initialData : {
                error: { code: code ? 'EVENT_ACCESS_DENIED' : 'EVENT_ACCESS_REQUIRED' },
            }),
        });
    });
    await page.goto(`/embed/checkout/${slug}`);
    await expect(page.getByRole('heading', { name: 'Access code required' })).toBeVisible();
    await expect(page.getByRole('heading', { name: initialData.event.title!, exact: true })).toHaveCount(0);
    await expect(page.getByText(initialData.tickets[0].name, { exact: true })).toHaveCount(0);
    await expect(page.locator('div[inert]')).toHaveCount(0);
    await page.getByLabel('Access code', { exact: true }).fill('incorrect-fixture-code');
    await page.getByRole('button', { name: 'Unlock event' }).click();
    await expect(page.getByRole('heading', { name: 'Access code incorrect' })).toBeVisible();
    await page.getByLabel('Access code', { exact: true }).fill('valid-fixture-code');
    await page.getByRole('button', { name: 'Unlock event' }).click();
    await expect(page.getByRole('heading', { name: initialData.event.title!, exact: true })).toBeVisible();
    expect(codes).toEqual([undefined, 'incorrect-fixture-code', 'valid-fixture-code']);
});

test('private preview starts in the browser flow and keeps checkout disabled', async ({ page }) => {
    await isolateBrowserApi(page);
    await page.route(`**/api/v1/public/events/${slug}?preview=1`, route => route.fulfill({
        status: 200, contentType: 'application/json', body: JSON.stringify({
            ...initialData, event: { ...initialData.event, status: 'draft', title: 'Private draft fixture' },
        }),
    }));
    const response = await page.goto(`/embed/checkout/${slug}?preview=1`);
    expect(await response!.text()).toContain('Loading tickets');
    await expect(page.getByRole('heading', { name: 'Private draft fixture', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open event page' })).toHaveCount(0);
    await page.locator('div[aria-disabled="false"]').first().getByRole('button').last().click();
    await expect(page.getByRole('button', { name: 'Proceed to Checkout' })).toBeDisabled();
});
