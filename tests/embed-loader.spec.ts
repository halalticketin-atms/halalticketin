import { test, expect } from '@playwright/test';

test('loader supports multiple containers, a legacy id, and repeat scripts without preview mode', async ({ page }) => {
    const baseURL = test.info().project.use.baseURL ?? 'http://127.0.0.1:3107';
    const hostUrl = `${baseURL}/embed-loader-multiple`;

    await page.route(hostUrl, (route) => {
        route.fulfill({
            contentType: 'text/html',
            body: `
                <div data-halal-ticketin-checkout data-event-slug="prayer-event" data-theme="dark" data-height="720px"></div>
                <div id="halal-ticketin-checkout" data-event-slug="legacy-event" data-background="transparent" data-show-details="false"></div>
                <script src="${baseURL}/embed/checkout.js"></script>
                <script src="${baseURL}/embed/checkout.js"></script>
            `,
        });
    });
    await page.route(`${baseURL}/embed/checkout.js`, (route) => {
        route.fulfill({ path: `${process.cwd()}/public/embed/checkout.js`, contentType: 'application/javascript' });
    });
    await page.route(`${baseURL}/embed/checkout/**`, (route) => {
        route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Checkout</title>' });
    });

    await page.goto(hostUrl);

    const frames = page.locator('iframe[title="Halal Ticketin Checkout"]');
    await expect(frames).toHaveCount(2);
    await expect(frames.nth(0)).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    await expect(frames.nth(0)).toHaveAttribute('src', `${baseURL}/embed/checkout/prayer-event?theme=dark`);
    await expect(frames.nth(0)).toHaveCSS('height', '720px');
    await expect(frames.nth(1)).toHaveAttribute(
        'src',
        `${baseURL}/embed/checkout/legacy-event?theme=light&background=transparent&showDetails=false`,
    );
});

test('loader keeps the checkout iframe on its own origin when pasted into another website', async ({ page }) => {
    const loaderOrigin = 'https://www.halalticketin.com';
    const hostUrl = 'https://example.squarespace.com/events/prayer-event';
    const iframeUrl = `${loaderOrigin}/embed/checkout/prayer-event?theme=dark`;
    const snippet = [
        '<div data-halal-ticketin-checkout data-event-slug="prayer-event" data-theme="dark"></div>',
        `<script src="${loaderOrigin}/embed/checkout.js"></script>`,
    ].join('\n');

    await page.route(hostUrl, (route) => {
        route.fulfill({
            status: 200,
            contentType: 'text/html',
            body: `<html><body>${snippet}</body></html>`,
        });
    });
    await page.route(`${loaderOrigin}/embed/checkout.js`, (route) => {
        route.fulfill({
            path: `${process.cwd()}/public/embed/checkout.js`,
            contentType: 'application/javascript',
        });
    });
    await page.route(iframeUrl, (route) => {
        route.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' });
    });

    await page.goto(hostUrl);

    const frame = page.locator('iframe[title="Halal Ticketin Checkout"]');
    await expect(frame).toHaveAttribute('src', iframeUrl);
});

test('loader only accepts finite, bounded resize messages from its own iframe', async ({ page }) => {
    const baseURL = test.info().project.use.baseURL ?? 'http://127.0.0.1:3107';
    const hostUrl = `${baseURL}/embed-loader-resize`;

    await page.route(hostUrl, (route) => {
        route.fulfill({
            contentType: 'text/html',
            body: `<div data-halal-ticketin-checkout data-event-slug="prayer-event"></div><script src="${baseURL}/embed/checkout.js"></script>`,
        });
    });
    await page.route(`${baseURL}/embed/checkout.js`, (route) => {
        route.fulfill({ path: `${process.cwd()}/public/embed/checkout.js`, contentType: 'application/javascript' });
    });
    await page.route(`${baseURL}/embed/checkout/prayer-event?theme=light`, (route) => {
        route.fulfill({
            contentType: 'text/html',
            body: `<script>
                parent.postMessage({ source: 'ht-embed', type: 'resize', height: 640 }, location.origin);
                parent.postMessage({ source: 'ht-embed', type: 'resize', height: Infinity }, location.origin);
                parent.postMessage({ source: 'ht-embed', type: 'resize', height: 5001 }, location.origin);
            </script>`,
        });
    });

    await page.goto(hostUrl);
    const frame = page.locator('iframe[title="Halal Ticketin Checkout"]');
    await expect(frame).toHaveCSS('height', '640px');

    await page.evaluate(() => {
        window.postMessage({ source: 'ht-embed', type: 'resize', height: 900 }, window.location.origin);
    });
    await expect(frame).toHaveCSS('height', '640px');
    await page.evaluate(() => {
        const source = document.querySelector('iframe')!.contentWindow;
        window.dispatchEvent(new MessageEvent('message', { source, origin: 'https://untrusted.example.test', data: { source: 'ht-embed', type: 'resize', height: 900 } }));
    });
    await expect(frame).toHaveCSS('height', '640px');
    await page.frames()[1].evaluate(() => parent.postMessage({ source: 'ht-embed', type: 'resize', height: 100 }, location.origin));
    await expect(frame).toHaveCSS('height', '160px');
});

test('loader reserves a compact height when checkout starts inside a closed accordion', async ({ page }) => {
    const baseURL = test.info().project.use.baseURL ?? 'http://127.0.0.1:3107';
    const hostUrl = `${baseURL}/embed-loader-accordion`;

    await page.route(hostUrl, (route) => {
        route.fulfill({
            contentType: 'text/html',
            body: `
                <button type="button" id="book-now">Book now</button>
                <section id="checkout-panel" style="display:none">
                    <div data-halal-ticketin-checkout data-event-slug="prayer-event"></div>
                </section>
                <script>
                    document.querySelector('#book-now').addEventListener('click', () => {
                        document.querySelector('#checkout-panel').style.display = 'block';
                    });
                </script>
                <script src="${baseURL}/embed/checkout.js"></script>
            `,
        });
    });
    await page.route(`${baseURL}/embed/checkout.js`, (route) => {
        route.fulfill({ path: `${process.cwd()}/public/embed/checkout.js`, contentType: 'application/javascript' });
    });
    await page.route(`${baseURL}/embed/checkout/prayer-event?theme=light`, (route) => {
        route.fulfill({
            contentType: 'text/html',
            body: `<script>setTimeout(() => parent.postMessage({ source: 'ht-embed', type: 'resize', height: 480 }, location.origin), 250)</script>`,
        });
    });

    await page.goto(hostUrl);
    const frame = page.locator('iframe[title="Halal Ticketin Checkout"]');
    await expect(frame).toHaveCount(1);
    await expect(frame).toHaveCSS('height', '160px');
    expect(await frame.evaluate((element) => element.style.transition)).toContain('height');

    await page.getByRole('button', { name: 'Book now' }).click();
    await expect(frame).toHaveCSS('height', '480px');

    await page.locator('#checkout-panel').evaluate((panel) => { panel.style.display = 'none'; });
    await page.frames()[1].evaluate(() => parent.postMessage({ source: 'ht-embed', type: 'resize', height: 100 }, location.origin));
    await expect(frame).toHaveCSS('height', '480px');
    await page.locator('#checkout-panel').evaluate((panel) => { panel.style.display = 'block'; });
    await expect(frame).toHaveCSS('height', '480px');
});

test('loader honours reduced-motion preferences', async ({ page }) => {
    const baseURL = test.info().project.use.baseURL ?? 'http://127.0.0.1:3107';
    const hostUrl = `${baseURL}/embed-loader-reduced-motion`;

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.route(hostUrl, (route) => {
        route.fulfill({
            contentType: 'text/html',
            body: `<div data-halal-ticketin-checkout data-event-slug="prayer-event"></div><script src="${baseURL}/embed/checkout.js"></script>`,
        });
    });
    await page.route(`${baseURL}/embed/checkout.js`, (route) => {
        route.fulfill({ path: `${process.cwd()}/public/embed/checkout.js`, contentType: 'application/javascript' });
    });

    await page.goto(hostUrl);
    await expect(page.locator('iframe[title="Halal Ticketin Checkout"]')).toHaveCount(1);
    expect(await page.locator('iframe').evaluate((element) => element.style.transition)).toBe('');
});
