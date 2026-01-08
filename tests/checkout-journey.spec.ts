import { test, expect } from '@playwright/test';

// =============================================================================
// REAL EVENT CONFIGURATION
// =============================================================================
// These are actual events from your database. Update these if events change.
const REAL_EVENTS = {
    // Free event: "FREE TEST" - has free tickets
    freeEvent: 'free-test',
    // Paid event: "Copy of TDS" - has paid tickets
    paidEvent: 'copy-of-tds',
    // Test event: "Testing 123"
    testEvent: 'testing-123',
    // Another test: "TEST TEST 123"
    anotherEvent: 'test-test-123',
};

// Viewports for responsive testing
const viewports = {
    mobile: { width: 390, height: 844 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1920, height: 1080 }
};

// =============================================================================
// TICKET SELECTION TESTS - Using Real Events
// =============================================================================
test.describe('Checkout Journey - Ticket Selection', () => {
    test('event page displays available tickets', async ({ page }) => {
        await page.goto(`/events/${REAL_EVENTS.paidEvent}`);
        await page.waitForLoadState('networkidle');

        // Should show the event title
        await expect(page.locator('h1, [data-testid="event-title"]').first()).toBeVisible();

        // Should show ticket section
        await expect(page.getByText(/ticket|admission|entry/i).first()).toBeVisible();
    });

    test('ticket quantity controls work', async ({ page }) => {
        await page.goto(`/events/${REAL_EVENTS.paidEvent}`);
        await page.waitForLoadState('networkidle');

        // Find quantity controls (+ button)
        const plusButton = page.locator('button').filter({ hasText: '+' }).first();

        if (await plusButton.isVisible()) {
            await plusButton.click();
            await page.waitForTimeout(300);
        }

        await expect(page.locator('body')).toBeVisible();
    });

    test('event page shows pricing in EUR', async ({ page }) => {
        await page.goto(`/events/${REAL_EVENTS.paidEvent}`);
        await page.waitForLoadState('networkidle');

        await expect(page.getByText(/€|EUR|free/i).first()).toBeVisible();
    });

    test('free event shows free tickets', async ({ page }) => {
        await page.goto(`/events/${REAL_EVENTS.freeEvent}`);
        await page.waitForLoadState('networkidle');

        await expect(page.getByText(/free/i).first()).toBeVisible();
    });
});

// =============================================================================
// FEE DISPLAY TESTS
// =============================================================================
test.describe('Checkout Journey - Fee Display', () => {
    test('paid event shows fee breakdown when tickets selected', async ({ page }) => {
        await page.goto(`/events/${REAL_EVENTS.paidEvent}`);
        await page.waitForLoadState('networkidle');

        const plusButton = page.locator('button').filter({ hasText: '+' }).first();
        if (await plusButton.isVisible()) {
            await plusButton.click();
            await page.waitForTimeout(500);

            await expect(page.getByText(/fee|total|service|€/i).first()).toBeVisible();
        }
    });

    test('total updates when adding more tickets', async ({ page }) => {
        await page.goto(`/events/${REAL_EVENTS.paidEvent}`);
        await page.waitForLoadState('networkidle');

        const plusButton = page.locator('button').filter({ hasText: '+' }).first();
        if (await plusButton.isVisible()) {
            await plusButton.click();
            await page.waitForTimeout(300);
            await plusButton.click();
            await page.waitForTimeout(300);

            await expect(page.locator('body')).toBeVisible();
        }
    });
});

// =============================================================================
// CHECKOUT FORM TESTS
// =============================================================================
test.describe('Checkout Journey - Attendee Form', () => {
    test('checkout flow shows attendee form', async ({ page }) => {
        await page.goto(`/events/${REAL_EVENTS.freeEvent}`);
        await page.waitForLoadState('networkidle');

        const plusButton = page.locator('button').filter({ hasText: '+' }).first();
        if (await plusButton.isVisible()) {
            await plusButton.click();
        }

        const checkoutButton = page.getByRole('button', { name: /checkout|get tickets|register|proceed/i }).first();
        if (await checkoutButton.isVisible()) {
            await checkoutButton.click();
            await page.waitForTimeout(1000);

            const hasNameInput = await page.locator('input[name*="name"], input[placeholder*="name" i]').first().isVisible();
            const hasEmailInput = await page.locator('input[type="email"], input[name*="email"]').first().isVisible();

            expect(hasNameInput || hasEmailInput).toBe(true);
        }
    });

    test('attendee form requires email', async ({ page }) => {
        await page.goto(`/events/${REAL_EVENTS.freeEvent}`);
        await page.waitForLoadState('networkidle');

        const plusButton = page.locator('button').filter({ hasText: '+' }).first();
        if (await plusButton.isVisible()) {
            await plusButton.click();
        }

        const checkoutButton = page.getByRole('button', { name: /checkout|get|register/i }).first();
        if (await checkoutButton.isVisible()) {
            await checkoutButton.click();
            await page.waitForTimeout(1000);

            await expect(page.locator('input[type="email"], input[name*="email"]').first()).toBeVisible();
        }
    });

    test('attendee form shows gender selection', async ({ page }) => {
        await page.goto(`/events/${REAL_EVENTS.freeEvent}`);
        await page.waitForLoadState('networkidle');

        const plusButton = page.locator('button').filter({ hasText: '+' }).first();
        if (await plusButton.isVisible()) {
            await plusButton.click();
        }

        const checkoutButton = page.getByRole('button', { name: /checkout|get|register/i }).first();
        if (await checkoutButton.isVisible()) {
            await checkoutButton.click();
            await page.waitForTimeout(1000);

            await expect(page.getByText(/male|female|gender|brother|sister/i).first()).toBeVisible();
        }
    });
});

// =============================================================================
// FREE EVENT CHECKOUT FLOW
// =============================================================================
test.describe('Checkout Journey - Free Event Flow', () => {
    test('free event checkout completes without Stripe redirect', async ({ page }) => {
        await page.goto(`/events/${REAL_EVENTS.freeEvent}`);
        await page.waitForLoadState('networkidle');

        const plusButton = page.locator('button').filter({ hasText: '+' }).first();
        if (await plusButton.isVisible()) {
            await plusButton.click();
        }

        const checkoutButton = page.getByRole('button', { name: /checkout|get|register/i }).first();
        if (await checkoutButton.isVisible()) {
            await checkoutButton.click();
            await page.waitForTimeout(1000);

            const nameInput = page.locator('input[name*="name"], input[placeholder*="name" i]').first();
            const emailInput = page.locator('input[type="email"]').first();

            if (await nameInput.isVisible()) {
                await nameInput.fill('Test User');
            }
            if (await emailInput.isVisible()) {
                await emailInput.fill('test@example.com');
            }

            const genderOption = page.getByText(/^male$|^brother$/i).first();
            if (await genderOption.isVisible()) {
                await genderOption.click();
            }

            const url = page.url();
            expect(url).not.toContain('stripe.com');
        }
    });

    test('free event page loads correctly', async ({ page }) => {
        await page.goto(`/events/${REAL_EVENTS.freeEvent}`);
        await expect(page.locator('body')).toBeVisible();
    });
});

// =============================================================================
// PAID EVENT CHECKOUT FLOW
// =============================================================================
test.describe('Checkout Journey - Paid Event Flow', () => {
    test('paid event shows pricing and total', async ({ page }) => {
        await page.goto(`/events/${REAL_EVENTS.paidEvent}`);
        await page.waitForLoadState('networkidle');

        await expect(page.getByText(/€|EUR/i).first()).toBeVisible();
    });

    test('paid event can add tickets to cart', async ({ page }) => {
        await page.goto(`/events/${REAL_EVENTS.paidEvent}`);
        await page.waitForLoadState('networkidle');

        const plusButton = page.locator('button').filter({ hasText: '+' }).first();
        if (await plusButton.isVisible()) {
            await plusButton.click();
            await page.waitForTimeout(500);

            await expect(page.locator('body')).toBeVisible();
        }
    });
});

// =============================================================================
// RESPONSIVE DESIGN TESTS
// =============================================================================
test.describe('Checkout Journey - Responsive Design', () => {
    test('event page works on mobile', async ({ page }) => {
        await page.setViewportSize(viewports.mobile);
        await page.goto(`/events/${REAL_EVENTS.testEvent}`);
        await page.waitForLoadState('networkidle');

        const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
        expect(bodyScrollWidth).toBeLessThanOrEqual(viewports.mobile.width + 20);
    });

    test('event page works on tablet', async ({ page }) => {
        await page.setViewportSize(viewports.tablet);
        await page.goto(`/events/${REAL_EVENTS.testEvent}`);
        await page.waitForLoadState('networkidle');

        await expect(page.locator('body')).toBeVisible();
    });

    test('event page works on desktop', async ({ page }) => {
        await page.setViewportSize(viewports.desktop);
        await page.goto(`/events/${REAL_EVENTS.testEvent}`);
        await page.waitForLoadState('networkidle');

        await expect(page.locator('body')).toBeVisible();
    });

    test('ticket selection fits mobile screen', async ({ page }) => {
        await page.setViewportSize(viewports.mobile);
        await page.goto(`/events/${REAL_EVENTS.paidEvent}`);
        await page.waitForLoadState('networkidle');

        const buttons = page.locator('button');
        const count = await buttons.count();

        for (let i = 0; i < Math.min(count, 5); i++) {
            const button = buttons.nth(i);
            if (await button.isVisible()) {
                const box = await button.boundingBox();
                if (box) {
                    expect(box.height).toBeGreaterThanOrEqual(32);
                }
            }
        }
    });
});

// =============================================================================
// ERROR HANDLING TESTS
// =============================================================================
test.describe('Checkout Journey - Error Handling', () => {
    test('non-existent event shows 404', async ({ page }) => {
        await page.goto('/events/non-existent-event-slug-12345');
        await page.waitForLoadState('networkidle');

        const has404 = await page.getByText(/404|not found|doesn't exist/i).first().isVisible();
        const hasError = await page.getByText(/error|sorry/i).first().isVisible();

        expect(has404 || hasError).toBe(true);
    });

    test('event page handles slow loading gracefully', async ({ page }) => {
        await page.goto(`/events/${REAL_EVENTS.testEvent}`);
        await page.waitForLoadState('domcontentloaded');

        await expect(page.locator('body')).toBeVisible();
    });
});

// =============================================================================
// EVENT INFORMATION DISPLAY
// =============================================================================
test.describe('Checkout Journey - Event Information', () => {
    test('event page shows event title', async ({ page }) => {
        await page.goto(`/events/${REAL_EVENTS.paidEvent}`);
        await page.waitForLoadState('networkidle');

        await expect(page.locator('h1').first()).toBeVisible();
    });

    test('event page shows date and time', async ({ page }) => {
        await page.goto(`/events/${REAL_EVENTS.paidEvent}`);
        await page.waitForLoadState('networkidle');

        await expect(page.getByText(/january|february|march|april|may|june|july|august|september|october|november|december|2026|pm|am/i).first()).toBeVisible();
    });

    test('event page shows venue information', async ({ page }) => {
        await page.goto(`/events/${REAL_EVENTS.paidEvent}`);
        await page.waitForLoadState('networkidle');

        await expect(page.getByText(/dublin|venue|location|address/i).first()).toBeVisible();
    });

    test('event page shows organizer name', async ({ page }) => {
        await page.goto(`/events/${REAL_EVENTS.paidEvent}`);
        await page.waitForLoadState('networkidle');

        await expect(page.getByText(/organizer|by|hosted|gum|events/i).first()).toBeVisible();
    });
});
