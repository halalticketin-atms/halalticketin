import React, { useEffect } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OrganizerSummary } from './organizer-context';

const state = vi.hoisted(() => ({
    hooks: [] as unknown[], index: 0, effects: [] as Array<() => void>,
    revision: 0, identity: 0, user: { id: 'a' } as { id: string } | null,
    seed: null as import('../lib/web-session-types').DashboardSessionSeed | null,
    get: vi.fn(), signOut: vi.fn(),
}));
vi.mock('react', async original => ({
    ...await original<typeof import('react')>(),
    useState: (initial: unknown) => {
        const index = state.index++;
        if (!(index in state.hooks)) state.hooks[index] = initial;
        return [state.hooks[index], (value: unknown) => { state.hooks[index] = value; }];
    },
    useRef: (initial: unknown) => {
        const index = state.index++;
        if (!(index in state.hooks)) state.hooks[index] = { current: initial };
        return state.hooks[index];
    },
    useCallback: (callback: unknown) => callback,
    useMemo: (callback: () => unknown) => callback(),
    useEffect: (effect: () => void) => state.effects.push(effect),
    useSyncExternalStore: () => state.identity,
}));
vi.mock('@/lib/api', () => ({
    default: { get: state.get },
    ApiError: class extends Error { constructor(public message: string, public status: number, public payload: unknown) { super(message); } },
    getAuthSessionRevision: () => state.revision,
    getAuthIdentityRevision: () => state.identity,
    subscribeAuthSession: () => () => {},
}));
vi.mock('./auth-context', () => ({ useAuth: () => ({ user: state.user, signOut: state.signOut }) }));
vi.mock('./dashboard-session-seed', () => ({ useDashboardSessionSeed: () => state.seed }));

import { ApiError } from '@/lib/api';
import { OrganizerProvider, useOrganizers } from './organizer-context';
let value: ReturnType<typeof useOrganizers>;
function Read() { const current = useOrganizers(); useEffect(() => { value = current; }, [current]); return null; }
function render() {
    state.index = 0; state.effects = [];
    renderToStaticMarkup(<OrganizerProvider><Read /></OrganizerProvider>);
    state.effects.at(-1)!();
}
const org = (name: string) => ({ id: 'shared-org', name, status: 'active', role: 'owner' } as OrganizerSummary);
beforeEach(() => {
    state.hooks = []; state.index = 0; state.effects = []; state.revision = 0; state.identity = 0;
    state.user = { id: 'a' }; state.seed = null;
    state.get.mockReset().mockResolvedValue({ organizers: [org('Fresh')] });
    state.signOut.mockReset();
    vi.stubGlobal('window', { localStorage: { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() }, addEventListener: vi.fn(), removeEventListener: vi.fn() });
});

describe('organiser session ownership', () => {
    it('uses matching verified initial data once and retains manual refresh', async () => {
        state.seed = { nonce: 'synthetic-nonce-1234567890', profile: { user: state.user } as import('./auth-context').ProfileResponse, organizers: [org('Seeded')] };
        render();
        expect(value.organizers[0].name).toBe('Seeded');
        state.effects[0]();
        expect(state.get).not.toHaveBeenCalled();
        await value.refresh();
        render();
        expect(value.organizers[0].name).toBe('Fresh');
        expect(state.get).toHaveBeenCalledOnce();
    });

    it('retains authoritative refreshed organiser roles when a later profile effect sees the initial seed', async () => {
        state.seed = { nonce: 'synthetic-nonce-1234567890', profile: { user: state.user } as import('./auth-context').ProfileResponse, organizers: [org('Seeded owner')] };
        render();
        state.effects[0]();
        state.get.mockResolvedValue({ organizers: [{ ...org('Revoked role'), role: 'staff', status: 'suspended' }] });
        await value.refresh();
        state.user = { id: 'a' };
        render();
        state.effects[0]();
        await Promise.resolve();
        render();
        expect(value.organizers[0].role).toBe('staff');
        expect(value.organizers[0].status).toBe('suspended');
    });

    it('retains accepted organiser selection through a proven same-account refresh', async () => {
        render();
        await value.refresh();
        render();
        const accepted = value.organizers;
        const active = value.activeOrganizerId;
        state.revision += 1;
        render();
        expect(value.organizers).toBe(accepted);
        expect(value.activeOrganizerId).toBe(active);
    });

    it.each(['success', 'unauthorised', 'cooldown'])('ignores delayed account-A %s when account B uses the same organiser', async result => {
        let resolve!: (value: { organizers: OrganizerSummary[] }) => void;
        let reject!: (error: Error) => void;
        state.get.mockImplementationOnce(() => new Promise((ok, fail) => { resolve = ok; reject = fail; }));
        render();
        const pendingA = value.refresh();
        state.user = { id: 'b' }; state.revision += 1; state.identity += 1;
        render();
        expect(value.organizers).toEqual([]);
        const pendingB = value.refresh();
        await pendingB;
        if (result === 'success') resolve({ organizers: [org('Old account A')] });
        else reject(new ApiError('Old account failure', result === 'unauthorised' ? 401 : 429, { retryAfter: 300 }));
        await pendingA;
        render();
        expect(value.organizers[0].name).toBe('Fresh');
        expect(value.error).toBeNull();
        expect(value.isLoading).toBe(false);
        expect(state.signOut).not.toHaveBeenCalled();
        await value.refresh();
        expect(state.get).toHaveBeenCalledTimes(3);
    });
});
