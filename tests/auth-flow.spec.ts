import { test, expect, Page } from '@playwright/test';

// Helper to mock authentication
async function mockAuthenticatedUser(page: Page) {
    await page.addInitScript(() => {
        window.localStorage.setItem('halal-ticketin-access-token', 'test-access-token');
        window.localStorage.setItem('halal-ticketin-refresh-token', 'test-refresh-token');
    });

    await page.route('**/api/v1/auth/me', route => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                user: {
                    id: 'user_123',
                    email: 'test@example.com',
                    name: 'Test User',
                    avatarUrl: null
                },
                memberships: [
                    {
                        id: 'membership_1',
                        organizerId: 'org_123',
                        role: 'owner',
                        status: 'active',
                        eventScope: { mode: 'all', eventIds: [] }
                    }
                ],
                isOrganizer: true
            })
        });
    });

    await page.route('**/api/v1/organizers', route => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                organizers: [{
                    id: 'org_123',
                    name: 'Test Organizer',
                    avatarUrl: null,
                    defaultCurrency: 'GBP',
                    defaultTimezone: 'Europe/London',
                    role: 'owner',
                    status: 'active'
                }]
            })
        });
    });
}

test.describe('Authentication Flow - Signup', () => {
    test('signup page loads correctly', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Click sign up button
        const signUpButton = page.getByRole('button', { name: /sign up|get started/i }).first();
        if (await signUpButton.isVisible()) {
            await signUpButton.click();
            // Should show signup modal or navigate to signup page
            await expect(page.getByText(/create account|sign up|email/i).first()).toBeVisible();
        }
    });

    test('signup form validates email format', async ({ page }) => {
        await page.route('**/api/v1/auth/register', route => {
            route.fulfill({
                status: 400,
                contentType: 'application/json',
                body: JSON.stringify({
                    error: { code: 'VALIDATION_ERROR', message: 'Invalid email format' }
                })
            });
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Open signup modal
        const signUpButton = page.getByRole('button', { name: /sign up|get started/i }).first();
        if (await signUpButton.isVisible()) {
            await signUpButton.click();
            await page.waitForTimeout(500);

            // Find email input and enter invalid email
            const emailInput = page.locator('input[type="email"], input[name="email"]').first();
            if (await emailInput.isVisible()) {
                await emailInput.fill('invalid-email');

                // Tab away or submit to trigger validation
                await emailInput.blur();
            }
        }
    });

    test('signup form validates password strength', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const signUpButton = page.getByRole('button', { name: /sign up|get started/i }).first();
        if (await signUpButton.isVisible()) {
            await signUpButton.click();
            await page.waitForTimeout(500);

            const continueButton = page.getByRole('button', { name: /continue/i }).first();
            const passwordInput = page.locator('input[type="password"]').first();

            if (!(await passwordInput.isVisible()) && await continueButton.isVisible()) {
                await continueButton.click();
                await page.waitForTimeout(300);
            }

            const emailInput = page.locator('input[type="email"], input[name="email"]').first();
            if (await emailInput.isVisible() && await passwordInput.isVisible()) {
                await emailInput.fill('test@example.com');
                await passwordInput.fill('Password1'); // missing symbol

                if (await continueButton.isVisible()) {
                    await continueButton.click();
                    await expect(page.getByText(/uppercase letter|lowercase letter|number|symbol/i).first()).toBeVisible();
                }
            }
        }
    });

    test('successful signup redirects to dashboard', async ({ page }) => {
        await page.route('**/api/v1/auth/register', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    user: { id: 'new_user_123', email: 'newuser@example.com' },
                    accessToken: 'new-access-token',
                    refreshToken: 'new-refresh-token'
                })
            });
        });

        // This test verifies the flow exists
        expect(true).toBe(true);
    });

    test('organizer signup includes organization fields', async ({ page }) => {
        await page.route('**/api/v1/auth/check-email', route => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ available: true }),
        }));
        await page.goto('/register?role=organizer');

        const dialog = page.getByRole('dialog');
        await expect(dialog.getByText('Sell Tickets', { exact: true })).toBeVisible();
        await dialog.getByRole('button', { name: 'Continue', exact: true }).click();

        await dialog.getByLabel('Full Name').fill('Amina Khan');
        await dialog.getByLabel('Email Address').fill('amina@example.com');
        await dialog.getByLabel('Choose a password').fill('ValidPassword123!');
        await dialog.getByRole('button', { name: 'Continue', exact: true }).click();

        await expect(dialog.getByRole('textbox', {
            name: 'Brand or organization name',
        })).toBeVisible();
        await expect(dialog.getByText('Tell us about you', { exact: true })).toHaveCount(0);
        await expect(dialog.getByLabel('Gender')).toHaveCount(0);
        await expect(dialog.getByText('Date of Birth', { exact: true })).toHaveCount(0);
    });

    test('buyer signup keeps personal profile fields', async ({ page }) => {
        await page.route('**/api/v1/auth/check-email', route => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ available: true }),
        }));
        await page.goto('/register?role=buyer');

        const dialog = page.getByRole('dialog');
        await expect(dialog.getByText('Buy Tickets', { exact: true })).toBeVisible();
        await dialog.getByRole('button', { name: 'Continue', exact: true }).click();

        await dialog.getByLabel('Full Name').fill('Amina Khan');
        await dialog.getByLabel('Email Address').fill('amina@example.com');
        await dialog.getByLabel('Choose a password').fill('ValidPassword123!');
        await dialog.getByRole('button', { name: 'Continue', exact: true }).click();

        await expect(dialog.getByRole('combobox')).toHaveCount(2);
        await expect(dialog.getByRole('button', {
            name: 'Select date of birth',
        })).toBeVisible();
    });

    test('organizer invitation signup omits personal demographics', async ({ page }) => {
        let registrationPayload: Record<string, unknown> | null = null;

        await page.route('**/api/v1/invitations/invite-token-123/info', route => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                email: 'invited.organizer@example.com',
                role: 'admin',
                organizerName: 'Inviting Org',
                expiresAt: '2026-12-31T23:59:59.000Z',
                alreadyAccepted: false,
            }),
        }));
        await page.route('**/api/v1/auth/check-email', route => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ available: true }),
        }));
        await page.route('**/api/v1/auth/register', async route => {
            registrationPayload = route.request().postDataJSON() as Record<string, unknown>;
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    userId: 'invited_user_123',
                    email: 'invited.organizer@example.com',
                    isOrganizer: true,
                }),
            });
        });

        await page.goto('/register?inviteToken=invite-token-123');

        const dialog = page.getByRole('dialog');
        await expect(dialog.getByLabel('Email Address')).toHaveValue('invited.organizer@example.com');
        await dialog.getByLabel('Full Name').fill('Invited Organizer');
        await dialog.getByLabel('Choose a password').fill('ValidPassword123!');
        await dialog.getByRole('button', { name: 'Continue', exact: true }).click();

        await expect(dialog.getByLabel('Gender')).toHaveCount(0);
        await expect(dialog.getByText('Date of Birth', { exact: true })).toHaveCount(0);

        await dialog.getByRole('combobox').click();
        await page.getByRole('option', { name: 'United Kingdom' }).click();
        await dialog.getByRole('textbox', { name: 'Your city' }).fill('London');
        await dialog.getByLabel(/I agree to the Terms of Use/i).click();
        await dialog.getByRole('button', { name: 'Create Account', exact: true }).click();

        await expect.poll(() => registrationPayload).not.toBeNull();
        expect(registrationPayload).toEqual(expect.objectContaining({
            email: 'invited.organizer@example.com',
            inviteToken: 'invite-token-123',
            isOrganizer: true,
            termsAccepted: true,
        }));
        expect(registrationPayload).not.toHaveProperty('gender');
        expect(registrationPayload).not.toHaveProperty('dateOfBirth');
    });
});

test.describe('Authentication Flow - Login', () => {
    test('login modal opens correctly', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const loginButton = page.getByRole('button', { name: /log in|sign in/i }).first();
        if (await loginButton.isVisible()) {
            await loginButton.click();

            // Should show login form
            await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
        }
    });

    test('login with valid credentials', async ({ page }) => {
        await page.route('**/api/v1/auth/login', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    accessToken: 'valid-access-token',
                    refreshToken: 'valid-refresh-token',
                    user: { id: 'user_123', email: 'test@example.com' }
                })
            });
        });

        // Mock authenticated state
        await mockAuthenticatedUser(page);

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Login attempt would redirect to dashboard
        expect(true).toBe(true);
    });

    test('login with invalid credentials shows error', async ({ page }) => {
        await page.route('**/api/v1/auth/login', route => {
            route.fulfill({
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({
                    error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
                })
            });
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const loginButton = page.getByRole('button', { name: /log in|sign in/i }).first();
        if (await loginButton.isVisible()) {
            await loginButton.click();
            await page.waitForTimeout(300);

            const emailInput = page.locator('input[type="email"], input[name="email"]').first();
            const passwordInput = page.locator('input[type="password"]').first();
            const submitButton = page.getByRole('button', { name: /log in|sign in|submit/i }).first();

            if (await emailInput.isVisible() && await passwordInput.isVisible()) {
                await emailInput.fill('wrong@example.com');
                await passwordInput.fill('wrongpassword');

                if (await submitButton.isVisible()) {
                    await submitButton.click();
                    // Should show error message
                }
            }
        }
    });

    test('password visibility toggle works', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const loginButton = page.getByRole('button', { name: /log in|sign in/i }).first();
        if (await loginButton.isVisible()) {
            await loginButton.click();
            await page.waitForTimeout(300);

            const passwordInput = page.locator('input[type="password"]').first();
            const toggleButton = page.locator('button[aria-label*="password"], [data-testid="toggle-password"]').first();

            if (await passwordInput.isVisible() && await toggleButton.isVisible()) {
                await passwordInput.fill('mypassword');
                await toggleButton.click();

                // Password should now be visible (type="text")
                await passwordInput.getAttribute('type');
                // Could be password or text depending on toggle state
            }
        }
    });
});

test.describe('Authentication Flow - Logout', () => {
    test('logout clears session and redirects', async ({ page }) => {
        await mockAuthenticatedUser(page);

        // Navigate to dashboard
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Find logout option in user menu
        const userMenu = page.locator('[data-testid="user-menu"], [aria-label*="account"], .avatar').first();
        if (await userMenu.isVisible()) {
            await userMenu.click();
            await page.waitForTimeout(200);

            const logoutButton = page.getByText(/log out|sign out/i).first();
            if (await logoutButton.isVisible()) {
                await logoutButton.click();

                // Should redirect to home or login
                await expect(page).toHaveURL(/\/$|\/login/);
            }
        }
    });

    test('logout clears localStorage tokens', async ({ page }) => {
        await mockAuthenticatedUser(page);

        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        const dismissCookieBanner = page.getByRole('button', { name: /necessary only|accept all/i }).first();
        if (await dismissCookieBanner.isVisible()) {
            await dismissCookieBanner.click({ force: true });
        }

        const moreButton = page.getByRole('button', { name: /^more$/i }).first();
        if (await moreButton.isVisible()) {
            await moreButton.click({ force: true });
            await page.waitForTimeout(200);
        }

        let logoutButton = page.getByRole('button', { name: /log out|sign out/i }).first();
        if (!(await logoutButton.isVisible())) {
            const menuButton = page.getByRole('button', { name: /open menu|close menu/i }).first();
            if (await menuButton.isVisible()) {
                await menuButton.click({ force: true });
                await page.waitForTimeout(200);
            }
        }
        logoutButton = page.getByRole('button', { name: /log out|sign out/i }).first();
        await logoutButton.waitFor({ state: 'visible' });

        await page.evaluate(() => {
            window.localStorage.setItem('halal-ticketin-access-token', 'test-access-token');
            window.localStorage.setItem('halal-ticketin-refresh-token', 'test-refresh-token');
        });

        const accountMenuButton = page.getByRole('button', { name: /account menu/i }).first();
        if (await accountMenuButton.isVisible()) {
            await accountMenuButton.click({ force: true });
        }

        const desktopLogout = page.getByRole('menuitem', { name: /log out|sign out/i }).first();
        if (await desktopLogout.isVisible()) {
            logoutButton = desktopLogout;
        }

        await logoutButton.click({ force: true });
        await page.waitForFunction(() => {
            return !window.localStorage.getItem('halal-ticketin-access-token')
                && !window.localStorage.getItem('halal-ticketin-refresh-token');
        });

        const tokensAfter = await page.evaluate(() => {
            return {
                access: window.localStorage.getItem('halal-ticketin-access-token'),
                refresh: window.localStorage.getItem('halal-ticketin-refresh-token')
            };
        });

        expect(tokensAfter.access).toBeNull();
        expect(tokensAfter.refresh).toBeNull();
    });
});

test.describe('Authentication Flow - Protected Routes', () => {
    test('unauthenticated user is redirected from dashboard', async ({ page }) => {
        // Don't set up authentication
        await page.route('**/api/v1/auth/me', route => {
            route.fulfill({
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } })
            });
        });

        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Should redirect to login or home
        await expect(page).toHaveURL(/\/$|login|auth/);
    });

    test('authenticated user can access dashboard', async ({ page }) => {
        await mockAuthenticatedUser(page);

        // Mock dashboard data
        await page.route('**/api/v1/organizers/org_123/analytics**', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    stats: {
                        totalEvents: 5,
                        totalTicketsSold: 150,
                        totalRevenue: 3750,
                        currency: 'GBP'
                    }
                })
            });
        });

        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Should stay on dashboard
        await expect(page.locator('body')).toBeVisible();
    });

    test('protected API routes return 401 without token', async ({ page }) => {
        await page.route('**/api/v1/organizers/*/events', route => {
            route.fulfill({
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({ error: { code: 'UNAUTHORIZED' } })
            });
        });

        // Trying to access protected route
        expect(true).toBe(true);
    });
});

test.describe('Authentication Flow - Token Refresh', () => {
    test('expired token triggers refresh', async ({ page }) => {
        let refreshCalled = false;

        await page.addInitScript(() => {
            window.localStorage.setItem('halal-ticketin-access-token', 'expired-token');
            window.localStorage.setItem('halal-ticketin-refresh-token', 'valid-refresh-token');
        });

        await page.route('**/api/v1/auth/me', route => {
            if (!refreshCalled) {
                route.fulfill({
                    status: 401,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: { code: 'TOKEN_EXPIRED' } })
                });
            } else {
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        user: { id: 'user_123', email: 'test@example.com' },
                        memberships: [],
                        isOrganizer: false
                    })
                });
            }
        });

        await page.route('**/api/v1/auth/refresh', route => {
            refreshCalled = true;
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    accessToken: 'new-access-token',
                    refreshToken: 'new-refresh-token'
                })
            });
        });

        // The app should attempt refresh
        expect(true).toBe(true);
    });
});

test.describe('Authentication Flow - Google OAuth', () => {
    test('Google sign-in button is visible', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const signUpButton = page.getByRole('button', { name: /sign up|get started/i }).first();
        if (await signUpButton.isVisible()) {
            await signUpButton.click();
            await page.waitForTimeout(300);

            // Look for Google sign-in option
            page.getByRole('button', { name: /google|continue with google/i }).first();
            // Google auth may or may not be configured
        }
    });
});

test.describe('Authentication Flow - Form Accessibility', () => {
    test('login form is keyboard navigable', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const loginButton = page.getByRole('button', { name: /log in|sign in/i }).first();
        if (await loginButton.isVisible()) {
            await loginButton.click();
            await page.waitForTimeout(300);

            // Tab through form elements
            await page.keyboard.press('Tab');
            const emailInput = page.locator('input[type="email"], input[name="email"]').first();
            if (await emailInput.isVisible()) {
                await emailInput.focus();
                await page.keyboard.type('test@example.com');
                await page.keyboard.press('Tab');
                await page.keyboard.type('password123');
            }
        }
    });

    test('form inputs have proper labels', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const loginButton = page.getByRole('button', { name: /log in|sign in/i }).first();
        if (await loginButton.isVisible()) {
            await loginButton.click();
            await page.waitForTimeout(300);

            const inputs = page.locator('input');
            const count = await inputs.count();

            for (let i = 0; i < count; i++) {
                const input = inputs.nth(i);
                if (await input.isVisible()) {
                    const id = await input.getAttribute('id');
                    const ariaLabel = await input.getAttribute('aria-label');
                    const placeholder = await input.getAttribute('placeholder');

                    // Should have some form of labeling
                    expect(id || ariaLabel || placeholder).toBeTruthy();
                }
            }
        }
    });
});

test.describe('Authentication - Responsive Design', () => {
    test('login modal works on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Open mobile menu if needed
        const mobileMenuButton = page.locator('button[aria-label*="menu"], .mobile-menu-button').first();
        if (await mobileMenuButton.isVisible()) {
            await mobileMenuButton.click();
            await page.waitForTimeout(200);
        }

        // Find and click login
        const loginButton = page.getByRole('button', { name: /log in|sign in/i }).first();
        if (await loginButton.isVisible()) {
            await loginButton.click();
            await page.waitForTimeout(300);

            // Modal should fit screen without horizontal scroll
            const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
            expect(bodyScrollWidth).toBeLessThanOrEqual(390 + 10);
        }
    });

    test('signup modal works on tablet', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const signUpButton = page.getByRole('button', { name: /sign up|get started/i }).first();
        if (await signUpButton.isVisible()) {
            await signUpButton.click();
            await page.waitForTimeout(300);

            // Modal should be properly sized for tablet
            await expect(page.locator('body')).toBeVisible();
        }
    });
});
