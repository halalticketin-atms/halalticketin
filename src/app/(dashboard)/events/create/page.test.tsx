import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DraftEventInitial, DraftTicketType } from '@/hooks/useEventDraft';
import type { TicketInputPayload, UpsertEventPayload } from '@/lib/events-api';

const fake = vi.hoisted(() => ({
    actions: new Map<string, () => Promise<void>>(), calls: [] as string[],
    serverHasEligibleTicket: false, update: vi.fn(), tickets: vi.fn(), publish: vi.fn(),
    details: vi.fn(),
    currency: null as string | null, waitlistEnabled: false, ticketFailures: 0, enableFailures: 0,
    hooks: null as null | {
        cursor: number; slots: { value: unknown }[];
        effects: Array<() => void | (() => void)>;
    },
}));
// Retain wizard hook state across renders without adding a browser or a test-only component API.
vi.mock('react', async original => {
    const react = await original<typeof import('react')>();
    const slot = (initial: () => unknown) => {
        const hooks = fake.hooks!;
        const index = hooks.cursor++;
        return hooks.slots[index] ??= { value: initial() };
    };
    return {
        ...react,
        useState: <T,>(initial: T | (() => T)) => {
            if (!fake.hooks) return react.useState(initial);
            const state = slot(() => typeof initial === 'function' ? (initial as () => T)() : initial);
            return [state.value as T, (next: T | ((previous: T) => T)) => {
                state.value = typeof next === 'function' ? (next as (previous: T) => T)(state.value as T) : next;
            }];
        },
        useRef: <T,>(initial: T) => fake.hooks
            ? slot(() => ({ current: initial })).value as { current: T }
            : react.useRef(initial),
        useMemo: <T,>(compute: () => T, deps: React.DependencyList) => fake.hooks ? compute() : react.useMemo(compute, deps),
        useCallback: <T extends (...args: never[]) => unknown>(callback: T, deps: React.DependencyList) =>
            fake.hooks ? callback : react.useCallback(callback, deps),
        useEffect: (effect: () => void | (() => void), deps?: React.DependencyList) => {
            if (fake.hooks) fake.hooks.effects.push(effect);
            else react.useEffect(effect, deps);
        },
    };
});
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    usePathname: () => '/events/test/edit', useSearchParams: () => new URLSearchParams(),
}));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/context/auth-context', () => ({ useAuth: () => ({ user: { id: 'user' }, isLoading: false }) }));
vi.mock('@/context/organizer-context', () => ({ useOrganizers: () => ({
    activeOrganizerId: 'organiser', isLoading: false,
    organizers: [{ id: 'organiser', replyToEmail: 'organiser@example.test', feeTier: 'payg' }],
}) }));
vi.mock('@/hooks/useExchangeRates', () => ({ useExchangeRates: () => ({ rates: { EUR: 1 }, isLoading: false }) }));
vi.mock('@/lib/notifications', () => ({
    getUserFriendlyMessage: (error: Error) => error.message,
    toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));
vi.mock('@/lib/events-api', () => ({
    updateEventDraft: fake.update, saveEventTickets: fake.tickets, publishEvent: fake.publish,
    fetchEventDetails: fake.details,
    fetchEventPromoCodes: vi.fn().mockResolvedValue({ promoCodes: [] }),
}));
vi.mock('@/components/ui/button', () => ({ Button: ({ children, ...props }: React.ComponentProps<'button'>) => {
    const label = props['aria-label'];
    if (label && props.onClick) fake.actions.set(label, props.onClick as unknown as () => Promise<void>);
    return React.createElement('button', null, children);
} }));

import { EventWizard } from './page';

const eventId = '11111111-1111-4111-8111-111111111111';
const ticket: DraftTicketType = {
    id: '22222222-2222-4222-8222-222222222222', name: 'Admission', type: 'free', isFree: true,
    price: '0', customFee: '0', quantity: 10, minPerOrder: 1, maxPerOrder: 10, description: '',
    salesStart: '', salesStartTime: '', salesEnd: '', salesEndTime: '', hasEarlyBird: false,
    earlyBirdPrice: '', earlyBirdEndDate: '', visibility: 'public', waitlistEnabled: true,
};
const recoveredDraft: DraftEventInitial = {
    eventId, eventStatus: 'published', currentStep: 5,
    formData: {
        title: 'Recovered event', description: 'A community event.', currency: 'EUR', totalCapacity: 10,
        date: '2099-10-12', startTime: '10:00', endTime: '12:00', timezone: 'Europe/Dublin',
        locationType: 'online', onlineUrl: 'https://example.test/event', waitlistEnabled: true,
        refundPolicy: 'Refunds are available before the event.',
    },
    tickets: [ticket], promoCodes: [],
};

beforeEach(() => {
    fake.hooks = null;
    fake.currency = null; fake.waitlistEnabled = false; fake.ticketFailures = 0; fake.enableFailures = 0;
    fake.actions.clear(); fake.calls.length = 0; fake.serverHasEligibleTicket = false;
    fake.tickets.mockReset().mockImplementation(async (_id: string, payload: TicketInputPayload[]) => {
        fake.calls.push('PUT tickets');
        if (fake.currency && payload.some(row => row.currency !== fake.currency)) {
            throw new Error(`Ticket currency must match event currency (${fake.currency}).`);
        }
        if (fake.ticketFailures > 0) { fake.ticketFailures--; throw new Error('Temporary ticket save failure'); }
        fake.serverHasEligibleTicket = true;
        return { tickets: [] };
    });
    fake.update.mockReset().mockImplementation(async (_id: string, payload: UpsertEventPayload) => {
        fake.calls.push('PATCH event');
        if (payload.waitlistEnabled && !fake.serverHasEligibleTicket) throw new Error('Live waitlist requires an eligible ticket');
        if (payload.waitlistEnabled && fake.enableFailures > 0) { fake.enableFailures--; throw new Error('Temporary event save failure'); }
        if (fake.currency && payload.currency) fake.currency = payload.currency;
        fake.waitlistEnabled = payload.waitlistEnabled ?? fake.waitlistEnabled;
        return { event: { id: eventId, status: 'published', updatedAt: '2026-10-12T12:00:00Z' } };
    });
    fake.publish.mockReset().mockImplementation(async () => {
        fake.calls.push('POST publish'); return { event: { slug: 'recovered-event' } };
    });
});
afterEach(() => { fake.hooks = null; vi.unstubAllGlobals(); });

function renderStatefulWizard(props: React.ComponentProps<typeof EventWizard> = {
    mode: 'edit', initialDraft: recoveredDraft,
    persistedWaitlistEnabled: true, serverUpdatedAt: '2026-10-12T11:00:00Z',
}) {
    const hooks = fake.hooks!;
    hooks.cursor = 0; hooks.effects = []; fake.actions.clear();
    const tree = EventWizard(props);
    const visit = (node: React.ReactNode) => {
        if (!React.isValidElement(node)) return;
        const props = node.props as { children?: React.ReactNode; onClick?: () => Promise<void>; 'aria-label'?: string };
        const label = props['aria-label'] ?? (typeof props.children === 'string' ? props.children : undefined);
        if (label && props.onClick) fake.actions.set(label, props.onClick);
        React.Children.forEach(props.children, visit);
    };
    visit(tree);
}

describe('EventWizard recovered waitlist save', () => {
    it('changes persisted currency before staging tickets for live waitlist enable', async () => {
        fake.currency = 'GBP';
        renderToStaticMarkup(<EventWizard mode="edit" initialDraft={recoveredDraft}
            persistedWaitlistEnabled={false} persistedCurrency="GBP" recoveryNotice={{ onDiscard: vi.fn() }} />);
        await fake.actions.get('Update event')!();
        expect(fake.calls).toEqual(['PATCH event', 'PUT tickets', 'PATCH event', 'POST publish']);
        expect(fake.update.mock.calls.map(([, payload]) => payload.waitlistEnabled)).toEqual([false, true]);
        expect(fake.currency).toBe('EUR');
        expect(fake.waitlistEnabled).toBe(true);
    });
    it.each(['tickets', 'enable'])('retries safely after partial currency save failure at %s', async failure => {
        fake.currency = 'GBP';
        if (failure === 'tickets') fake.ticketFailures = 1;
        else fake.enableFailures = 1;
        fake.hooks = { cursor: 0, slots: [], effects: [] };
        const props: React.ComponentProps<typeof EventWizard> = {
            mode: 'edit', initialDraft: recoveredDraft, persistedWaitlistEnabled: false,
            persistedCurrency: 'GBP', recoveryNotice: { onDiscard: vi.fn() },
        };
        renderStatefulWizard(props);
        await fake.actions.get('Update event')!();
        expect(fake.calls).toEqual(failure === 'tickets'
            ? ['PATCH event', 'PUT tickets'] : ['PATCH event', 'PUT tickets', 'PATCH event']);
        expect(fake.currency).toBe('EUR');
        expect(fake.waitlistEnabled).toBe(false);
        expect(fake.hooks.slots.find(slot => Boolean(slot.value && typeof slot.value === 'object' && 'title' in slot.value))?.value)
            .toMatchObject({ currency: 'EUR', waitlistEnabled: true });
        expect(fake.publish).not.toHaveBeenCalled();
        fake.calls.length = 0;
        renderStatefulWizard(props);
        await fake.actions.get('Update event')!();
        expect(fake.calls).toEqual(['PUT tickets', 'PATCH event', 'POST publish']);
        expect(fake.waitlistEnabled).toBe(true);
        expect(fake.update.mock.calls.at(-1)?.[1]).toMatchObject({ currency: 'EUR', waitlistEnabled: true });
    });
    it.each([false, true])('keeps dirty edits and stages tickets after a foreground conflict, changed tickets=%s', async changedTickets => {
        fake.hooks = { cursor: 0, slots: [], effects: [] };
        const listeners = new Map<string, () => void>();
        vi.stubGlobal('window', {
            addEventListener: (name: string, callback: () => void) => listeners.set(name, callback),
            removeEventListener: vi.fn(),
            sessionStorage: { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() },
        });
        vi.stubGlobal('document', { addEventListener: vi.fn(), removeEventListener: vi.fn(), visibilityState: 'visible' });
        renderStatefulWizard();
        const savedSnapshotRef = fake.hooks.slots.find(slot =>
            slot.value && typeof slot.value === 'object' && 'current' in slot.value
            && typeof slot.value.current === 'string' && slot.value.current.includes('Recovered event'))!
            .value as { current: string };
        const savedSnapshot = savedSnapshotRef.current;
        const formSlot = fake.hooks.slots.find(slot => Boolean(slot.value && typeof slot.value === 'object' && 'title' in slot.value))!;
        formSlot.value = { ...formSlot.value as object, title: 'My unsaved local title' };
        const ticketsSlot = fake.hooks.slots.find(slot => Array.isArray(slot.value) && slot.value[0]?.id === ticket.id)!;
        if (changedTickets) ticketsSlot.value = [{ ...ticket, quantity: 11 }];
        renderStatefulWizard();
        // Run the wizard's dirty-state effect and actual foreground listener registration.
        fake.hooks.effects.find(effect => effect.toString().includes('nextHasUnsavedChanges'))!();
        const removeListener = fake.hooks.effects.find(effect => effect.toString().includes('handleFocus'))!();
        fake.details.mockResolvedValue({
            event: {
                id: eventId, status: 'published', title: 'Canonical title', updatedAt: '2026-10-12T12:00:00Z',
                waitlistEnabled: false, currency: 'EUR', timezone: 'Europe/Dublin', totalCapacity: 10,
                startDatetime: '2099-10-12T09:00:00Z', endDatetime: '2099-10-12T11:00:00Z',
                locationType: 'online', onlineUrl: 'https://example.test/event', isListedPublicly: true,
            },
            tickets: [{ ...ticket, maxQuantity: 10, visibility: 'hidden', waitlistEnabled: false }],
        });
        listeners.get('focus')!();
        await new Promise<void>(resolve => setImmediate(resolve));
        renderStatefulWizard();
        expect(fake.actions.has('Continue editing')).toBe(true);
        await fake.actions.get('Continue editing')!();
        renderStatefulWizard();
        expect(formSlot.value).toMatchObject({ title: 'My unsaved local title', waitlistEnabled: true });
        expect(ticketsSlot.value).toEqual([{ ...ticket, quantity: changedTickets ? 11 : 10 }]);
        expect(savedSnapshotRef.current).toBe(savedSnapshot);
        await fake.actions.get('Update event')!();
        expect(fake.calls).toEqual(['PUT tickets', 'PATCH event', 'POST publish']);
        expect(fake.update).toHaveBeenCalledWith(eventId, expect.objectContaining({ title: 'My unsaved local title' }));
        expect(fake.tickets).toHaveBeenCalledWith(eventId, expect.arrayContaining([
            expect.objectContaining({ maxQuantity: changedTickets ? 11 : 10, visibility: 'public', waitlistEnabled: true }),
        ]));
        if (typeof removeListener === 'function') removeListener();
    });
    it('persists recovered eligible tickets before enabling a disabled server waitlist', async () => {
        renderToStaticMarkup(<EventWizard mode="edit" initialDraft={recoveredDraft}
            persistedWaitlistEnabled={false} recoveryNotice={{ onDiscard: vi.fn() }} />);
        await fake.actions.get('Update event')!();
        expect(fake.calls).toEqual(['PUT tickets', 'PATCH event', 'POST publish']);
        expect(fake.tickets).toHaveBeenCalledWith(eventId, expect.arrayContaining([
            expect.objectContaining({ waitlistEnabled: true, visibility: 'public' }),
        ]));
        expect(fake.update).toHaveBeenCalledWith(eventId, expect.objectContaining({ waitlistEnabled: true }));
    });
    it('keeps event-first saves when the persisted waitlist was already enabled', async () => {
        fake.serverHasEligibleTicket = true;
        renderToStaticMarkup(<EventWizard mode="edit" initialDraft={recoveredDraft}
            persistedWaitlistEnabled recoveryNotice={{ onDiscard: vi.fn() }} />);
        await fake.actions.get('Update event')!();
        expect(fake.calls).toEqual(['PATCH event', 'PUT tickets', 'POST publish']);
    });
    it('does not resave unchanged tickets in an ordinary edit without recovery', async () => {
        fake.serverHasEligibleTicket = true;
        renderToStaticMarkup(<EventWizard mode="edit" initialDraft={recoveredDraft} />);
        await fake.actions.get('Update event')!();
        expect(fake.calls).toEqual(['PATCH event', 'POST publish']);
        expect(fake.tickets).not.toHaveBeenCalled();
    });
});
