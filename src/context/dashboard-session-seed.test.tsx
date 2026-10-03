import React, { useContext, useEffect } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DashboardSessionSeed } from '@/lib/web-session-types';

const state = vi.hoisted(() => ({ refs: [] as unknown[], index: 0, effects: [] as Array<() => void>, current: true, adoptedNonce: null as string | null, needsOnboarding: false, memberships: [] as Array<{ role: string }>, user: null as { id: string } | null, adopt: vi.fn() }));
vi.mock('react', async original => ({
    ...await original<typeof import('react')>(),
    useRef: (initial: unknown) => {
        const index = state.index++;
        if (!(index in state.refs)) state.refs[index] = { current: initial };
        return state.refs[index];
    },
    useEffect: (effect: () => void) => state.effects.push(effect),
    useSyncExternalStore: (_subscribe: unknown, getSnapshot: () => unknown) => getSnapshot(),
}));
vi.mock('@/lib/web-session-client', () => ({ isWebSessionSeedCurrent: () => state.current, subscribeWebSession: () => () => {} }));
vi.mock('@/lib/api', () => ({ subscribeAuthSession: () => () => {} }));
vi.mock('./auth-context', async () => ({
    AuthContext: (await import('react')).createContext(null),
    useAuth: () => ({ user: state.user, adoptSessionSeed: state.adopt, adoptedSeedNonce: state.adoptedNonce, memberships: state.memberships, needsOnboarding: state.needsOnboarding, isLoading: false }),
}));
import { AuthContext } from './auth-context';
import { DashboardSessionSeedProvider, useDashboardSessionSeed } from './dashboard-session-seed';
let visible: DashboardSessionSeed | null;
let authView: React.ContextType<typeof AuthContext>;
function Read() { const current = useDashboardSessionSeed(); const auth = useContext(AuthContext); useEffect(() => { visible = current; authView = auth; }, [current, auth]); return null; }
function render(seed: DashboardSessionSeed) {
    state.index = 0; state.effects = [];
    renderToStaticMarkup(<DashboardSessionSeedProvider seed={seed}><Read /></DashboardSessionSeedProvider>);
    state.effects.at(-1)!();
}
const seed = (id: string) => ({ nonce: 'synthetic-nonce-1234567890', profile: { user: { id } }, organizers: [] } as unknown as DashboardSessionSeed);
beforeEach(() => { state.refs = []; state.index = 0; state.effects = []; state.current = true; state.adoptedNonce = null; state.needsOnboarding = false; state.memberships = []; state.user = null; state.adopt.mockReset(); });

describe('dashboard seed lifetime', () => {
    it('exposes verified initial data and adopts it through the single root owner', () => {
        const initial = seed('a');
        render(initial);
        expect(visible).toBe(initial);
        state.effects.forEach(effect => effect());
        expect(state.adopt).toHaveBeenCalledExactlyOnceWith(initial);
    });

    it.each(['revoked membership', 'onboarding'])('uses the authoritative root after adoption when refresh reports %s', condition => {
        const initial = seed('a');
        initial.profile.memberships = [{ role: 'owner' }] as import('./auth-context').ProfileResponse['memberships'];
        initial.profile.needsOnboarding = false;
        render(initial);
        expect(authView?.memberships[0]?.role).toBe('owner');
        state.effects.forEach(effect => effect());
        state.adoptedNonce = initial.nonce;
        state.user = { id: 'a' };
        state.memberships = [];
        state.needsOnboarding = condition === 'onboarding';
        render(initial);
        expect(authView?.memberships).toEqual([]);
        expect(authView?.needsOnboarding).toBe(condition === 'onboarding');
        expect(visible).toBe(initial);
    });

    it('permanently rejects an instance after logout even if its old nonce becomes current again', () => {
        const initial = seed('a');
        render(initial);
        state.current = false;
        render(initial);
        expect(visible).toBeNull();
        state.current = true;
        render(initial);
        expect(visible).toBeNull();
    });

    it('rejects cached account-A data when account B shares its organiser', () => {
        const initial = seed('a');
        state.user = { id: 'b' };
        render(initial);
        expect(visible).toBeNull();
        expect(state.adopt).not.toHaveBeenCalled();
    });
});
