import React, { type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
    values: [] as unknown[],
    index: 0,
    effects: [] as Array<() => void>,
    params: new URLSearchParams(),
    replace: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
}));

// Run the component's effects and render their resulting state without a live API or browser.
vi.mock('react', async original => ({
    ...await original<typeof import('react')>(),
    useState: (initial: unknown) => {
        const index = harness.index++;
        if (!(index in harness.values)) harness.values[index] = initial;
        return [harness.values[index], (next: unknown) => {
            harness.values[index] = typeof next === 'function' ? next(harness.values[index]) : next;
        }];
    },
    useEffect: (effect: () => void) => harness.effects.push(effect),
    useCallback: (callback: unknown) => callback,
}));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ replace: harness.replace }),
    usePathname: () => '/settings',
    useSearchParams: () => harness.params,
}));
vi.mock('@/lib/api', () => ({
    default: { get: harness.get, post: harness.post },
    ApiError: class ApiError extends Error {},
}));
vi.mock('@/components/ui/dialog', () => ({
    Dialog: ({ open, children }: { open: boolean; children: ReactNode }) => open ? children : null,
    ...Object.fromEntries(['DialogContent', 'DialogDescription', 'DialogFooter', 'DialogHeader', 'DialogTitle']
        .map(name => [name, ({ children }: { children: ReactNode }) => <div>{children}</div>])),
}));

import { StripeConnectStatus } from './stripe-connect-status';

const linked = {
    hasStripeAccount: true,
    onboardingStatus: 'pending',
    chargesEnabled: false,
    payoutsEnabled: false,
    detailsSubmitted: false,
};

function render(organizerId = 'organiser-a') {
    harness.index = 0;
    harness.effects = [];
    const tree = StripeConnectStatus({ organizerId });
    return { tree, html: renderToStaticMarkup(tree) };
}

async function mount(status = linked) {
    harness.get.mockResolvedValue(status);
    render();
    harness.effects.forEach(effect => effect());
    await harness.get.mock.results[0].value;
    return render();
}

function text(node: ReactNode): string {
    return React.Children.toArray(node).map(child => React.isValidElement<{ children?: ReactNode }>(child)
        ? text(child.props.children) : String(child)).join('');
}

function button(tree: ReactNode, label: string): ReactElement<{ onClick: () => Promise<void> | void }> {
    for (const child of React.Children.toArray(tree)) {
        if (!React.isValidElement<{ children?: ReactNode; onClick?: () => void }>(child)) continue;
        if (child.props.onClick && text(child.props.children) === label) {
            return child as ReactElement<{ onClick: () => Promise<void> | void }>;
        }
        try { return button(child.props.children, label); } catch { /* Continue through siblings. */ }
    }
    throw new Error(`Button not found: ${label}`);
}

beforeEach(() => {
    harness.values = [];
    harness.params = new URLSearchParams();
    harness.replace.mockReset();
    harness.get.mockReset();
    harness.post.mockReset();
});

describe('Stripe connection status', () => {
    it('offers connection only for a missing account', async () => {
        const { html } = await mount({ ...linked, hasStripeAccount: false });
        expect(html).toContain('Not Connected');
        expect(html).toContain('Connect Stripe Account');
        expect(html).not.toContain('Open Stripe Dashboard');
        expect(html).not.toContain('Disconnect Stripe');
        expect(harness.get).toHaveBeenCalledExactlyOnceWith('/api/v1/organizers/organiser-a/stripe/status');
    });

    it.each(['pending', 'in_progress'])('shows a linked %s account with setup guidance and no OAuth action', async onboardingStatus => {
        const { html } = await mount({ ...linked, onboardingStatus });
        expect(html).toContain('Connected, setup incomplete');
        expect(html).toContain('outstanding setup or verification requirements');
        expect(html).toContain('then select Refresh Status');
        expect(html).toContain('account details have not been submitted yet');
        expect(html).toContain('Charges not enabled');
        expect(html).toContain('Payouts not enabled');
        expect(html).toContain('href="https://dashboard.stripe.com"');
        expect(html).toContain('Open Stripe Dashboard');
        expect(html).toContain('Disconnect Stripe');
        expect(html).not.toContain('Not Connected');
        expect(html).not.toContain('Connect Stripe Account');
        expect(html).not.toContain('Complete Setup');
        expect(harness.post).not.toHaveBeenCalled();
    });

    it('shows ready payment copy only for a fully enabled linked account', async () => {
        const { html } = await mount({ ...linked, onboardingStatus: 'completed', chargesEnabled: true, payoutsEnabled: true, detailsSubmitted: true });
        expect(html).toContain('You can receive payments for your events.');
        expect(html).toContain('Charges enabled');
        expect(html).toContain('Payouts enabled');
        expect(html).toContain('Open Stripe Dashboard');
        expect(html).not.toContain('setup incomplete');
        expect(html).not.toContain('Connect Stripe Account');
    });

    it('does not claim payment readiness when completed status disagrees with enablement', async () => {
        const { html } = await mount({ ...linked, onboardingStatus: 'completed', detailsSubmitted: true });
        expect(html).toContain('Connected, setup incomplete');
        expect(html).not.toContain('You can receive payments');
        expect(html).not.toContain('account details have not been submitted');
    });

    it('keeps a successful callback truthful for a linked incomplete account and preserves other query parameters', async () => {
        harness.params = new URLSearchParams('stripe=connected&organizerId=organiser-a&tab=payments');
        const { html } = await mount();
        expect(html).toContain('Stripe account connected successfully.');
        expect(html).toContain('Connected, setup incomplete');
        expect(html).not.toContain('You can receive payments');
        expect(harness.replace).toHaveBeenCalledWith('/settings?tab=payments', { scroll: false });
    });

    it('does not show or consume a callback for another organiser', async () => {
        harness.params = new URLSearchParams('stripe=connected&organizerId=organiser-b');
        const { html } = await mount();
        expect(html).not.toContain('Stripe account connected successfully.');
        expect(harness.replace).not.toHaveBeenCalled();
    });

    it('does not carry a successful callback banner to another organiser', async () => {
        harness.params = new URLSearchParams('stripe=connected&organizerId=organiser-a');
        await mount();
        harness.params = new URLSearchParams();
        expect(render('organiser-b').html).not.toContain('Stripe account connected successfully.');
        harness.effects.forEach(effect => effect());
        await harness.get.mock.results.at(-1)!.value;
        expect(harness.get).toHaveBeenLastCalledWith('/api/v1/organizers/organiser-b/stripe/status');
        expect(render('organiser-b').html).not.toContain('Stripe account connected successfully.');
    });

    it('does not show callback success when no account is linked', async () => {
        harness.params = new URLSearchParams('stripe=connected&organizerId=organiser-a');
        const { html } = await mount({ ...linked, hasStripeAccount: false });
        expect(html).not.toContain('Stripe account connected successfully.');
    });

    it('preserves callback errors', async () => {
        harness.params = new URLSearchParams('stripe=error&organizerId=organiser-a&stripe_error=Connection+cancelled');
        expect((await mount()).html).toContain('Connection cancelled');
    });

    it('refreshes the scoped status and keeps errors visible without claiming a missing account', async () => {
        harness.get.mockRejectedValueOnce(new Error('Status unavailable'));
        render();
        harness.effects.forEach(effect => effect());
        await harness.get.mock.results[0].value.catch(() => {});
        const failed = render();
        expect(failed.html).toContain('Status unavailable');
        expect(failed.html).not.toContain('Not Connected');
        expect(failed.html).not.toContain('Connect Stripe Account');
        harness.get.mockResolvedValue(linked);
        await button(failed.tree, 'Refresh Status').props.onClick();
        expect(render().html).toContain('Connected, setup incomplete');
        expect(render().html).not.toContain('Status unavailable');
        expect(harness.get).toHaveBeenLastCalledWith('/api/v1/organizers/organiser-a/stripe/status');
    });

    it('retains the active-event disconnect block without making a disconnect request', async () => {
        const blockedStatus = { ...linked, disconnectBlocked: true, blockingEvents: [{ id: 'event-a', title: 'Test paid event' }] };
        const { tree } = await mount(blockedStatus);
        await button(tree, 'Disconnect Stripe').props.onClick();
        const { html } = render();
        expect(html).toContain('Unable to disconnect Stripe');
        expect(html).toContain('Test paid event');
        expect(harness.post).not.toHaveBeenCalled();
    });
});
