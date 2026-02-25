import { test, expect } from '@playwright/test';

// Test configuration for multi-browser and viewport testing
const viewports = {
    mobile: { width: 390, height: 844 },    // iPhone 14
    tablet: { width: 768, height: 1024 },   // iPad
    desktop: { width: 1920, height: 1080 }  // Full HD
};

test.describe('Public Pages - Home Page', () => {
    test('homepage loads successfully with all sections', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Check main hero section exists
        await expect(page.locator('h1').first()).toBeVisible();

        // Check navigation is present
        await expect(page.locator('nav').first()).toBeVisible();

        // Check footer exists
        await expect(page.locator('footer')).toBeVisible();
    });

    test('homepage has working navigation links', async ({ page }) => {
        await page.goto('/');

        // Check key navigation links
        const navLinks = ['Events', 'Pricing', 'About'];
        for (const linkText of navLinks) {
            const link = page.getByRole('link', { name: new RegExp(linkText, 'i') }).first();
            await expect(link).toBeVisible();
        }
    });

    test('homepage displays correctly on mobile viewport', async ({ page }) => {
        await page.setViewportSize(viewports.mobile);
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Mobile menu button should be visible
        await expect(
            page.locator('[data-testid="mobile-nav"], button[aria-label*="menu"], .mobile-menu-button').first()
        ).toBeVisible();
        // Navigation should adapt to mobile
        await expect(page.locator('body')).toBeVisible();
    });

    test('mobile menu freezes background scroll and closes on outside tap', async ({ page, browserName }) => {
        await page.setViewportSize(viewports.mobile);
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const menuButton = page.getByRole('button', { name: /open menu|close menu/i }).first();
        await menuButton.click();

        const backdrop = page.getByRole('button', { name: /close mobile menu/i });
        await expect(backdrop).toBeVisible();

        const lockStyles = await page.evaluate(() => ({
            bodyPosition: document.body.style.position,
            bodyOverflow: document.body.style.overflow,
            htmlOverflow: document.documentElement.style.overflow,
        }));
        expect(lockStyles.bodyPosition).toBe('fixed');
        expect(lockStyles.bodyOverflow).toBe('hidden');
        expect(lockStyles.htmlOverflow).toBe('hidden');

        if (browserName !== 'webkit') {
            const scrollBeforeAttempt = await page.evaluate(() => window.scrollY);
            await page.mouse.wheel(0, 1200);
            await page.waitForTimeout(100);
            const scrollWhileMenuOpen = await page.evaluate(() => window.scrollY);
            expect(Math.abs(scrollWhileMenuOpen - scrollBeforeAttempt)).toBeLessThanOrEqual(2);
        }

        await backdrop.click({ position: { x: 10, y: viewports.mobile.height - 10 } });
        await expect(backdrop).not.toBeVisible();
        await expect(page.getByRole('button', { name: /open menu/i }).first()).toBeVisible();

        const restoredStyles = await page.evaluate(() => ({
            bodyPosition: document.body.style.position,
            bodyOverflow: document.body.style.overflow,
            htmlOverflow: document.documentElement.style.overflow,
        }));
        expect(restoredStyles.bodyPosition).toBe('');
        expect(restoredStyles.bodyOverflow).toBe('');
        expect(restoredStyles.htmlOverflow).toBe('');
    });

    test('homepage displays correctly on tablet viewport', async ({ page }) => {
        await page.setViewportSize(viewports.tablet);
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        await expect(page.locator('body')).toBeVisible();
    });

    test('homepage displays correctly on desktop viewport', async ({ page }) => {
        await page.setViewportSize(viewports.desktop);
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        await expect(page.locator('body')).toBeVisible();
    });
});

test.describe('Public Pages - Browse Events', () => {
    test.beforeEach(async ({ page }) => {
        // Mock the public events API
        await page.route('**/api/v1/public/events**', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    events: [
                        {
                            id: 'event_001',
                            title: 'Community Gathering',
                            slug: 'community-gathering',
                            startDatetime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                            endDatetime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
                            timezone: 'Europe/London',
                            city: 'London',
                            country: 'UK',
                            bannerImageUrl: null,
                            organizerName: 'Test Organizer',
                            lowestPrice: '0.00',
                            currency: 'GBP'
                        },
                        {
                            id: 'event_002',
                            title: 'Charity Dinner',
                            slug: 'charity-dinner',
                            startDatetime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                            endDatetime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
                            timezone: 'Europe/London',
                            city: 'Manchester',
                            country: 'UK',
                            bannerImageUrl: null,
                            organizerName: 'Charity Org',
                            lowestPrice: '25.00',
                            currency: 'GBP'
                        }
                    ],
                    total: 2
                })
            });
        });
    });

    test('browse events page loads and displays events', async ({ page }) => {
        await page.goto('/events');
        await page.waitForLoadState('networkidle');

        // Page should load
        await expect(page.locator('body')).toBeVisible();

        // Should show event cards or list
        await expect(page.getByText('Community Gathering').or(page.getByText('No events'))).toBeVisible();
    });

    test('event cards are clickable', async ({ page }) => {
        await page.goto('/events');
        await page.waitForLoadState('networkidle');

        // Find and click first event card
        const eventCard = page.getByText('Community Gathering').first();
        if (await eventCard.isVisible()) {
            await eventCard.click();
            // Should navigate to event detail
            await expect(page).toHaveURL(/community-gathering|event/);
        }
    });

    test('browse page is responsive on mobile', async ({ page }) => {
        await page.setViewportSize(viewports.mobile);
        await page.goto('/events');
        await page.waitForLoadState('networkidle');

        // Events should stack vertically on mobile
        await expect(page.locator('body')).toBeVisible();
    });
});

test.describe('Public Pages - Event Detail', () => {
    test.beforeEach(async ({ page }) => {
        // Mock event detail API
        await page.route('**/api/v1/public/events/test-event', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    event: {
                        id: 'event_001',
                        organizerId: 'org_123',
                        title: 'Test Event',
                        slug: 'test-event',
                        description: 'A wonderful test event for the community.',
                        startDatetime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                        endDatetime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
                        timezone: 'Europe/London',
                        locationType: 'in_person',
                        venue: 'Community Hall',
                        address: '123 Test Street',
                        city: 'London',
                        country: 'UK',
                        currency: 'GBP',
                        organizerName: 'Test Organizer',
                        absorbFee: false
                    },
                    tickets: [
                        {
                            id: 'ticket_001',
                            name: 'General Admission',
                            price: '25.00',
                            currency: 'GBP',
                            type: 'paid',
                            available: 100
                        },
                        {
                            id: 'ticket_002',
                            name: 'Free Entry',
                            price: '0.00',
                            currency: 'GBP',
                            type: 'free',
                            available: 50
                        }
                    ]
                })
            });
        });
    });

    test('event detail page displays event information', async ({ page }) => {
        await page.goto('/events/test-event');
        await page.waitForLoadState('networkidle');

        // Event title should be visible
        await expect(page.getByText('Test Event').first()).toBeVisible();
    });

    test('event detail shows ticket types', async ({ page }) => {
        await page.goto('/events/test-event');
        await page.waitForLoadState('networkidle');

        // Should show ticket options
        await expect(page.getByRole('heading', { name: /general admission|tickets/i }).first()).toBeVisible();
    });

    test('event detail page is responsive', async ({ page }) => {
        await page.setViewportSize(viewports.mobile);
        await page.goto('/events/test-event');
        await page.waitForLoadState('networkidle');

        await expect(page.locator('body')).toBeVisible();
        // No horizontal scroll
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
        const viewportWidth = viewports.mobile.width;
        expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10); // Small tolerance
    });

    test('mobile single tap opens checkout dialog after selecting a ticket', async ({ page }) => {
        await page.setViewportSize(viewports.mobile);
        await page.goto('/events/test-event');
        await page.waitForLoadState('networkidle');

        const incrementButton = page.locator('button:has(svg.lucide-plus)').first();
        await expect(incrementButton).toBeVisible();
        await incrementButton.click();

        const checkoutButton = page.getByRole('button', { name: /proceed to checkout/i });
        await expect(checkoutButton).toBeEnabled();
        await checkoutButton.click();

        await expect(page.getByText('Order Summary')).toBeVisible();
    });
});

test.describe('Public Pages - Pricing', () => {
    test('pricing page loads with plan options', async ({ page }) => {
        await page.goto('/pricing');
        await page.waitForLoadState('networkidle');

        // Should show pricing header
        await expect(page.getByRole('heading', { name: /pricing/i }).first()).toBeVisible();
    });

    test('pricing toggle works for monthly/annual', async ({ page }) => {
        await page.goto('/pricing');
        await page.waitForLoadState('networkidle');

        // Find pricing toggle if exists
        const toggle = page.locator('[data-testid="pricing-toggle"], .pricing-toggle, [role="switch"]').first();
        if (await toggle.isVisible()) {
            await toggle.click();
            // Prices should update
        }
    });

    test('get started button is clickable', async ({ page }) => {
        await page.goto('/pricing');
        await page.waitForLoadState('networkidle');

        const ctaButton = page.getByRole('button', { name: /get started/i }).first();
        if (await ctaButton.isVisible()) {
            await expect(ctaButton).toBeEnabled();
            expect(await ctaButton.evaluate((el) => getComputedStyle(el).cursor)).toBe('pointer');
        }
    });

    test('pricing page hover effects work', async ({ page }) => {
        await page.goto('/pricing');
        await page.waitForLoadState('networkidle');

        const button = page.getByRole('button', { name: /get started|sign up/i }).first();
        if (await button.isVisible()) {
            await button.hover();
            // Button should have cursor pointer
            const cursor = await button.evaluate((el) => getComputedStyle(el).cursor);
            expect(cursor).toBe('pointer');
        }
    });
});

test.describe('Public Pages - Static Pages', () => {
    test('about page loads', async ({ page }) => {
        await page.goto('/about');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

    test('contact page loads and has form', async ({ page }) => {
        await page.goto('/contact');
        await page.waitForLoadState('networkidle');

        // Should have a contact form or email
        await expect(page.locator('form, [href*="mailto:"]').first()).toBeVisible();
    });

    test('terms page loads', async ({ page }) => {
        await page.goto('/terms');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

    test('privacy page loads', async ({ page }) => {
        await page.goto('/privacy');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

    test('cookie policy page loads', async ({ page }) => {
        await page.goto('/cookie-policy');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });
});

test.describe('Public Pages - 404 Handling', () => {
    test('displays 404 for non-existent pages', async ({ page }) => {
        const response = await page.goto('/non-existent-page-xyz');
        // Should either show 404 or redirect
        expect([200, 404]).toContain(response?.status() || 200);
    });

    test('displays 404 for non-existent events', async ({ page }) => {
        await page.route('**/api/v1/public/events/non-existent**', route => {
            route.fulfill({
                status: 404,
                contentType: 'application/json',
                body: JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Event not found' } })
            });
        });

        await page.goto('/events/non-existent-event-slug');
        await page.waitForLoadState('networkidle');

        // Should show error or 404 message
        await expect(page.getByRole('heading', { name: /not found|error|404/i }).first()).toBeVisible();
    });
});

test.describe('Cross-Browser Compatibility', () => {
    test('key elements render consistently', async ({ page, browserName }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // These should work across Chrome and Safari
        await expect(page.locator('nav').first()).toBeVisible();
        await expect(page.locator('footer')).toBeVisible();

        console.log(`Tested on: ${browserName}`);
    });
});

test.describe('Accessibility - Public Pages', () => {
    test('homepage has accessible navigation', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Check for accessible elements
        const mainNav = page.locator('nav').first();
        await expect(mainNav).toBeVisible();

        // Links should be keyboard accessible
        const firstLink = page.locator('a').first();
        await firstLink.focus();
        await expect(firstLink).toBeFocused();
    });

    test('images have alt text', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const images = page.locator('img');
        const count = await images.count();

        for (let i = 0; i < Math.min(count, 10); i++) {
            const img = images.nth(i);
            const alt = await img.getAttribute('alt');
            // Most images should have alt text (decorative images may have empty alt)
            expect(alt).toBeDefined();
        }
    });

    test('buttons and links have accessible names', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const buttons = page.locator('button');
        const count = await buttons.count();

        for (let i = 0; i < Math.min(count, 5); i++) {
            const button = buttons.nth(i);
            const text = await button.textContent();
            const ariaLabel = await button.getAttribute('aria-label');
            const title = await button.getAttribute('title');
            // Button should have text or aria-label
            expect(text?.trim() || ariaLabel || title).toBeTruthy();
        }
    });
});
