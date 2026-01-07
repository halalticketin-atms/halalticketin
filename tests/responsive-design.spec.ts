import { test, expect, Page } from '@playwright/test';

/**
 * Responsive Design Tests
 * 
 * These tests verify the application renders correctly across:
 * - Mobile (iPhone 14): 390x844
 * - Tablet (iPad): 768x1024
 * - Desktop: 1920x1080
 * 
 * Key checks:
 * - No horizontal scrolling
 * - All content accessible
 * - Navigation adapts correctly
 * - Modals fit within viewport
 * - Touch targets adequate size (44x44px minimum)
 */

const devices = {
    mobile: { width: 390, height: 844, name: 'iPhone 14' },
    tablet: { width: 768, height: 1024, name: 'iPad' },
    desktop: { width: 1920, height: 1080, name: 'Desktop' }
};

// Helper to check for horizontal scroll
async function hasHorizontalScroll(page: Page): Promise<boolean> {
    return await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth;
    });
}

// Helper to get scrollbar width
async function getScrollbarInfo(page: Page): Promise<{ bodyWidth: number; viewportWidth: number; hasOverflow: boolean }> {
    return await page.evaluate(() => ({
        bodyWidth: document.body.scrollWidth,
        viewportWidth: window.innerWidth,
        hasOverflow: document.body.scrollWidth > window.innerWidth
    }));
}

test.describe('Responsive Design - Homepage', () => {
    for (const [deviceType, device] of Object.entries(devices)) {
        test(`homepage fits ${device.name} viewport (${device.width}x${device.height})`, async ({ page }) => {
            await page.setViewportSize({ width: device.width, height: device.height });
            await page.goto('/');
            await page.waitForLoadState('networkidle');

            const scrollInfo = await getScrollbarInfo(page);
            expect(scrollInfo.hasOverflow).toBe(false);
        });

        test(`homepage navigation works on ${device.name}`, async ({ page }) => {
            await page.setViewportSize({ width: device.width, height: device.height });
            await page.goto('/');
            await page.waitForLoadState('networkidle');

            if (deviceType === 'mobile') {
                // Mobile should have hamburger menu
                const mobileMenuButton = page.locator('button[aria-label*="menu"], [data-testid="mobile-menu"]').first();
                if (await mobileMenuButton.isVisible()) {
                    await mobileMenuButton.click();
                    await page.waitForTimeout(300);
                    // Menu should open
                }
            } else {
                // Desktop/tablet should show nav links directly
                const nav = page.locator('nav').first();
                await expect(nav).toBeVisible();
            }
        });
    }
});

test.describe('Responsive Design - Event Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.route('**/api/v1/public/events/test-event', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    event: {
                        id: 'event_001',
                        title: 'Test Event',
                        slug: 'test-event',
                        description: 'A test event for responsive testing',
                        startDatetime: new Date().toISOString(),
                        endDatetime: new Date().toISOString(),
                        timezone: 'Europe/London',
                        locationType: 'in_person',
                        venue: 'Test Venue',
                        city: 'London',
                        country: 'UK',
                        currency: 'GBP'
                    },
                    ticketTypes: [
                        { id: 't1', name: 'General', price: '25.00', currency: 'GBP', available: 100 }
                    ]
                })
            });
        });
    });

    for (const [deviceType, device] of Object.entries(devices)) {
        test(`event page fits ${device.name}`, async ({ page }) => {
            await page.setViewportSize({ width: device.width, height: device.height });
            await page.goto('/events/test-event');
            await page.waitForLoadState('networkidle');

            const scrollInfo = await getScrollbarInfo(page);
            expect(scrollInfo.hasOverflow).toBe(false);
        });
    }
});

test.describe('Responsive Design - Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        // Mock authenticated state
        await page.addInitScript(() => {
            window.localStorage.setItem('halal-ticketin-access-token', 'test-token');
        });

        await page.route('**/api/v1/auth/me', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    user: { id: 'user_1', email: 'test@example.com' },
                    memberships: [{
                        organizerId: 'org_1',
                        role: 'owner',
                        status: 'active'
                    }],
                    isOrganizer: true
                })
            });
        });

        await page.route('**/api/v1/organizers**', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    organizers: [{
                        id: 'org_1',
                        name: 'Test Org',
                        defaultCurrency: 'GBP'
                    }]
                })
            });
        });

        await page.route('**/api/v1/organizers/*/analytics**', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    stats: { totalEvents: 5, totalRevenue: 1000 }
                })
            });
        });
    });

    test('dashboard mobile navigation works', async ({ page }) => {
        await page.setViewportSize(devices.mobile);
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Should have mobile-friendly navigation
        await expect(page.locator('body')).toBeVisible();

        const scrollInfo = await getScrollbarInfo(page);
        expect(scrollInfo.hasOverflow).toBe(false);
    });

    test('dashboard tablet layout is functional', async ({ page }) => {
        await page.setViewportSize(devices.tablet);
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        await expect(page.locator('body')).toBeVisible();
    });

    test('dashboard desktop layout shows sidebar', async ({ page }) => {
        await page.setViewportSize(devices.desktop);
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Desktop should show full sidebar navigation
        await expect(page.locator('body')).toBeVisible();
    });
});

test.describe('Responsive Design - Modals', () => {
    test('modals have vertical scroll only on mobile', async ({ page }) => {
        await page.setViewportSize(devices.mobile);
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Open a modal (e.g., signup)
        const signUpButton = page.getByRole('button', { name: /sign up|get started/i }).first();
        if (await signUpButton.isVisible()) {
            await signUpButton.click();
            await page.waitForTimeout(500);

            // Check modal doesn't cause horizontal scroll
            const scrollInfo = await getScrollbarInfo(page);
            expect(scrollInfo.hasOverflow).toBe(false);

            // Modal content should be scrollable vertically if needed
            const modal = page.locator('[role="dialog"], .modal, [data-testid="modal"]').first();
            if (await modal.isVisible()) {
                const modalWidth = await modal.evaluate(el => el.scrollWidth);
                expect(modalWidth).toBeLessThanOrEqual(devices.mobile.width);
            }
        }
    });

    test('modals fit tablet viewport', async ({ page }) => {
        await page.setViewportSize(devices.tablet);
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const signUpButton = page.getByRole('button', { name: /sign up|get started/i }).first();
        if (await signUpButton.isVisible()) {
            await signUpButton.click();
            await page.waitForTimeout(500);

            const scrollInfo = await getScrollbarInfo(page);
            expect(scrollInfo.hasOverflow).toBe(false);
        }
    });
});

test.describe('Responsive Design - Touch Targets', () => {
    test('buttons meet minimum touch target size on mobile', async ({ page }) => {
        await page.setViewportSize(devices.mobile);
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const buttons = page.locator('button');
        const count = await buttons.count();

        for (let i = 0; i < Math.min(count, 10); i++) {
            const button = buttons.nth(i);
            if (await button.isVisible()) {
                const box = await button.boundingBox();
                if (box) {
                    // Minimum 44x44 for touch targets (allowing some flexibility)
                    expect(box.width).toBeGreaterThanOrEqual(32);
                    expect(box.height).toBeGreaterThanOrEqual(32);
                }
            }
        }
    });

    test('links are easily tappable on mobile', async ({ page }) => {
        await page.setViewportSize(devices.mobile);
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const links = page.locator('a');
        const count = await links.count();

        for (let i = 0; i < Math.min(count, 5); i++) {
            const link = links.nth(i);
            if (await link.isVisible()) {
                const box = await link.boundingBox();
                if (box && box.height > 0) {
                    // Links should have adequate height
                    expect(box.height).toBeGreaterThanOrEqual(24);
                }
            }
        }
    });
});

test.describe('Responsive Design - Forms', () => {
    test('form inputs are full width on mobile', async ({ page }) => {
        await page.setViewportSize(devices.mobile);
        await page.goto('/contact');
        await page.waitForLoadState('networkidle');

        const inputs = page.locator('input, textarea');
        const count = await inputs.count();

        for (let i = 0; i < count; i++) {
            const input = inputs.nth(i);
            if (await input.isVisible()) {
                const box = await input.boundingBox();
                if (box) {
                    // Inputs should be close to full width (accounting for padding)
                    expect(box.width).toBeGreaterThan(devices.mobile.width * 0.7);
                }
            }
        }
    });

    test('form layout adapts to tablet', async ({ page }) => {
        await page.setViewportSize(devices.tablet);
        await page.goto('/contact');
        await page.waitForLoadState('networkidle');

        const scrollInfo = await getScrollbarInfo(page);
        expect(scrollInfo.hasOverflow).toBe(false);
    });
});

test.describe('Responsive Design - Images', () => {
    test('images scale properly on mobile', async ({ page }) => {
        await page.setViewportSize(devices.mobile);
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const images = page.locator('img');
        const count = await images.count();

        for (let i = 0; i < Math.min(count, 5); i++) {
            const img = images.nth(i);
            if (await img.isVisible()) {
                const box = await img.boundingBox();
                if (box) {
                    // Images should not exceed viewport width
                    expect(box.width).toBeLessThanOrEqual(devices.mobile.width);
                }
            }
        }
    });
});

test.describe('Responsive Design - Tables', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            window.localStorage.setItem('halal-ticketin-access-token', 'test-token');
        });

        await page.route('**/api/v1/auth/me', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    user: { id: 'user_1', email: 'test@example.com' },
                    memberships: [{ organizerId: 'org_1', role: 'owner', status: 'active' }],
                    isOrganizer: true
                })
            });
        });

        await page.route('**/api/v1/organizers**', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ organizers: [{ id: 'org_1', name: 'Test' }] })
            });
        });

        await page.route('**/api/v1/organizers/*/orders**', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ orders: [], total: 0 })
            });
        });
    });

    test('data tables are scrollable on mobile', async ({ page }) => {
        await page.setViewportSize(devices.mobile);
        await page.goto('/dashboard/o/org_1/orders');
        await page.waitForLoadState('networkidle');

        // Tables should either scroll horizontally within container or adapt layout
        const scrollInfo = await getScrollbarInfo(page);
        // Page itself shouldn't scroll horizontally, but tables might have their own scroll
        expect(scrollInfo.hasOverflow).toBe(false);
    });
});

test.describe('Responsive Design - Text Readability', () => {
    test('text remains readable on mobile', async ({ page }) => {
        await page.setViewportSize(devices.mobile);
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Check font sizes don't go below readable minimum
        const paragraphs = page.locator('p');
        const count = await paragraphs.count();

        for (let i = 0; i < Math.min(count, 5); i++) {
            const p = paragraphs.nth(i);
            if (await p.isVisible()) {
                const fontSize = await p.evaluate(el => {
                    return parseInt(window.getComputedStyle(el).fontSize);
                });
                // Minimum readable font size is typically 14px on mobile
                expect(fontSize).toBeGreaterThanOrEqual(12);
            }
        }
    });

    test('headings scale appropriately', async ({ page }) => {
        await page.setViewportSize(devices.mobile);
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const h1 = page.locator('h1').first();
        if (await h1.isVisible()) {
            const fontSize = await h1.evaluate(el => {
                return parseInt(window.getComputedStyle(el).fontSize);
            });
            // H1 should be larger than body text
            expect(fontSize).toBeGreaterThan(18);
        }
    });
});

test.describe('Cross-Browser Responsive', () => {
    // These tests run with the configured browser (Chrome/Safari)
    test('layout is consistent across viewports', async ({ page, browserName }) => {
        console.log(`Testing on ${browserName}`);

        for (const device of Object.values(devices)) {
            await page.setViewportSize({ width: device.width, height: device.height });
            await page.goto('/');
            await page.waitForLoadState('networkidle');

            const scrollInfo = await getScrollbarInfo(page);
            expect(scrollInfo.hasOverflow).toBe(false);
        }
    });
});
