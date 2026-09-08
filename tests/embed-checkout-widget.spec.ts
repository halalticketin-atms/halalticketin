import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    // Every API call is isolated from the shared production database.
    await page.route('**/api/v1/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    await page.route('**/api/v1/exchange-rates', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ base: 'GBP', rates: { GBP: 1 }, currencies: { GBP: { symbol: '£', name: 'British Pound' } } }) }));
});

async function mockEvent(page: import('@playwright/test').Page) {
    await page.route('**/api/v1/public/events/prayer-event', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                event: {
                    id: 'event_prayer_001',
                    organizerId: 'org_001',
                    slug: 'prayer-event',
                    title: 'Prayer Event',
                    description: null,
                    bannerImageUrl: null,
                    startDatetime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    endDatetime: null,
                    timezone: 'Europe/London',
                    isMultiDay: false,
                    locationType: 'online',
                    venue: null,
                    address: null,
                    city: null,
                    country: null,
                    onlineUrl: null,
                    latitude: null,
                    longitude: null,
                    currency: 'GBP',
                    refundPolicy: null,
                    organizerName: 'Prayer Org',
                    organizerAvatarUrl: null,
                    category: null,
                    absorbFee: false,
                    feeTier: 'payg',
                    customBookingFee: null,
                    metaPixelId: null,
                    attendeeInfoMode: 'buyer_choice',
                    customQuestions: null,
                },
                tickets: [
                    {
                        id: 'ticket_001',
                        name: 'General Admission',
                        description: null,
                        price: '10.00',
                        currency: 'GBP',
                        maxQuantity: 100,
                        minPerOrder: 1,
                        maxPerOrder: 4,
                        type: 'paid',
                        salesStart: null,
                        salesEnd: null,
                        earlyBirdPrice: null,
                        earlyBirdEndDate: null,
                    },
                ],
            }),
        });
    });

}

test('embed checkout page renders ticket widget shell', async ({ page }) => {
    await mockEvent(page);
    await page.goto('/embed/checkout/prayer-event');

    await expect(page.getByTestId('embed-checkout-shell')).toBeVisible();
    await expect(page.getByText('General Admission')).toBeVisible();
});


test('appearance overrides, hidden details and transparent minimal layout work on small screens', async ({ page }) => {
    await mockEvent(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/embed/checkout/prayer-event?theme=dark&background=transparent&accent=%23ffffff&font=serif&radius=0&minimal=1&showDetails=0');
    await expect(page.getByText('General Admission')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Prayer Event', exact: true })).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('data-ht-embed', 'dark');
    expect(await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
    expect(await page.locator('[data-slot="card"]').first().evaluate(el => getComputedStyle(el).borderTopWidth)).toBe('0px');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole('link', { name: 'Open event page' })).toHaveAttribute('target', '_top');
    await expect(page.locator('[data-slot="card"]').first().locator('..')).toHaveCSS('opacity', '1');
    await page.screenshot({ path: `output/playwright/embed-mobile-${test.info().project.name}.png`, fullPage: true });
});

test('desktop embed applies theme and has no horizontal overflow', async ({ page }) => {
    await mockEvent(page);
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.goto('/embed/checkout/prayer-event?accent=%23993322&radius=8');
    await expect(page.getByRole('heading', { name: 'Prayer Event', exact: true })).toBeVisible();
    await expect(page.locator('html')).toHaveCSS('--primary', '#993322');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.locator('[data-slot="card"]').first().locator('..')).toHaveCSS('opacity', '1');
    await page.screenshot({ path: `output/playwright/embed-desktop-${test.info().project.name}.png`, fullPage: true });
});

test('unavailable event offers a compact hosted fallback', async ({ page }) => {
    await page.route('**/api/v1/public/events/missing-event', route => route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'Event not found' }) }));
    await page.goto('/embed/checkout/missing-event');
    await expect(page.getByRole('heading', { name: 'Tickets unavailable' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open event page' })).toHaveAttribute('href', '/events/missing-event');
    const height = await page.getByTestId('embed-checkout-shell').evaluate(el => el.getBoundingClientRect().height);
    expect(height).toBeLessThan(400);
});

test('checkout dialog keeps embed colours and fits a narrow viewport', async ({ page }) => {
    await mockEvent(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.route('**/checkout/quote', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, isFreeOrder: false, currency: 'GBP', subtotal: 10, discount: 0, organizerFee: 0, platformFee: 0, processingFee: 0, processingFeeVat: 0, total: 10, useCreditsApplied: false, creditsApplied: 0, paidTicketCount: 1, promoCodeApplied: false, lineAllocations: [] }) }));
    await page.goto('/embed/checkout/prayer-event?theme=dark&accent=%23ffcc00');
    await page.locator('div[aria-disabled="false"]').first().getByRole('button').last().click();
    await page.getByRole('button', { name: 'Proceed to Checkout' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveCSS('--primary', '#ffcc00');
    const box = await dialog.boundingBox();
    expect(box!.width).toBeLessThanOrEqual(375);
    await page.getByRole('button', { name: 'Close checkout', exact: true }).click();
    await expect(dialog).not.toBeVisible();
});

test('real widget content resizes each iframe independently', async ({ page }) => {
    await mockEvent(page);
    await page.route('**/api/v1/public/events/missing-event', route => route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }));
    const baseURL = test.info().project.use.baseURL ?? 'http://127.0.0.1:3107';
    await page.route(`${baseURL}/embed-host-fixture`, route => route.fulfill({ contentType: 'text/html', body: `<div style="width:375px"><div data-halal-ticketin-checkout data-event-slug="prayer-event"></div><div data-halal-ticketin-checkout data-event-slug="missing-event"></div></div><script src="${baseURL}/embed/checkout.js"></script>` }));
    await page.goto('/embed-host-fixture');
    const frames = page.locator('iframe');
    await expect(frames).toHaveCount(2);
    await expect(page.frameLocator('iframe').first().getByText('General Admission')).toBeVisible();
    await expect.poll(async () => parseFloat(await frames.nth(0).evaluate(frame => frame.style.height))).toBeLessThan(700);
    await expect.poll(async () => parseFloat(await frames.nth(1).evaluate(frame => frame.style.height))).toBeLessThan(300);
});

test('real widget remeasures after a collapsed accordion reopens', async ({ page }) => {
    await mockEvent(page);
    const baseURL = test.info().project.use.baseURL ?? 'http://127.0.0.1:3107';
    await page.route(`${baseURL}/embed-host-accordion`, route => route.fulfill({
        contentType: 'text/html',
        body: `
            <button type="button" id="book-now">Book now</button>
            <section id="checkout-panel" style="display:none">
                <div data-halal-ticketin-checkout data-event-slug="prayer-event"></div>
            </section>
            <script>document.querySelector('#book-now').onclick = () => { document.querySelector('#checkout-panel').style.display = 'block'; };</script>
            <script src="${baseURL}/embed/checkout.js"></script>
        `,
    }));

    await page.goto('/embed-host-accordion');
    const frame = page.locator('iframe[title="Halal Ticketin Checkout"]');
    await expect(frame).toHaveCSS('height', '160px');

    await page.getByRole('button', { name: 'Book now' }).click();
    await expect(page.frameLocator('iframe').getByText('General Admission')).toBeVisible();
    await expect.poll(async () => parseFloat(await frame.evaluate(element => element.style.height))).toBeGreaterThan(160);
    const measuredHeight = parseFloat(await frame.evaluate(element => element.style.height));

    await page.locator('#checkout-panel').evaluate((panel) => { panel.style.display = 'none'; });
    const checkoutFrame = page.frames().find(candidate => candidate.url().includes('/embed/checkout/prayer-event'))!;
    await checkoutFrame.evaluate(() => {
        const shell = document.querySelector('[data-testid="embed-checkout-shell"]');
        const spacer = document.createElement('div');
        spacer.style.height = '48px';
        shell?.appendChild(spacer);
    });
    await expect(frame).toHaveCSS('height', `${measuredHeight}px`);

    await page.locator('#checkout-panel').evaluate((panel) => { panel.style.display = 'block'; });
    await expect.poll(async () => parseFloat(await frame.evaluate(element => element.style.height))).toBeGreaterThan(measuredHeight);
});

test('configurator preview uses published data with checkout disabled', async ({ page }) => {
    await mockEvent(page);
    const requests: string[] = [];
    page.on('request', request => requests.push(request.url()));
    await page.goto('/embed/checkout/prayer-event?configure=1');
    await expect(page.getByText('Preview: checkout disabled')).toHaveCount(0);
    await expect(page.getByText("Delivered with Ihsan by HalalTicketin'")).toBeVisible();
    await page.locator('div[aria-disabled="false"]').first().getByRole('button').last().click();
    await expect(page.getByRole('button', { name: 'Proceed to Checkout' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Proceed to Checkout' })).toHaveCSS('opacity', '1');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Open event page' })).toHaveCount(0);
    expect(requests.some(url => url.includes('/checkout/session') || url.includes('preview=1'))).toBe(false);
});
