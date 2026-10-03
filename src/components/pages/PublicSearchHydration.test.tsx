import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicEventRecord } from '@/lib/events-api';

const state = vi.hoisted(() => ({
    params: new URLSearchParams(),
    nativeValue: '',
    controlledValue: '',
    slot: 0,
    values: new Map<number, unknown>(),
    deps: new Map<number, unknown[] | undefined>(),
    effects: [] as Array<() => void>,
    push: vi.fn(),
}));

vi.mock('react', async original => {
    const react = await original<typeof import('react')>();
    const effect = (callback: () => void, deps?: unknown[]) => {
        const slot = state.slot++;
        const previous = state.deps.get(slot);
        if (!state.deps.has(slot) || !deps || deps.some((value, index) => value !== previous?.[index])) {
            state.effects.push(callback);
        }
        state.deps.set(slot, deps);
    };
    return { ...react, useEffect: effect, useLayoutEffect: effect, useEffectEvent: (fn: unknown) => fn,
        useRef: (initial: unknown) => {
            const slot = state.slot++;
            if (!state.values.has(slot)) state.values.set(slot, { current: initial });
            return state.values.get(slot);
        },
        useState: (initial: unknown) => {
            const slot = state.slot++;
            if (!state.values.has(slot)) state.values.set(slot, typeof initial === 'function' ? (initial as () => unknown)() : initial);
            return [state.values.get(slot), (next: unknown) => state.values.set(slot, next)];
        },
    };
});
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: state.push }), useSearchParams: () => state.params }));
vi.mock('@/context/auth-context', () => ({ useOptionalAuth: () => null }));
vi.mock('@/components/home/FeaturedEventsCarousel', () => ({ default: () => null }));
vi.mock('@/components/ui/FavoriteButton', () => ({ FavoriteButton: () => null }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
vi.mock('next/image', () => ({ default: () => null }));
vi.mock('motion/react', () => ({ LazyMotion: ({ children }: { children: React.ReactNode }) => children, domAnimation: {}, useReducedMotion: () => false }));
vi.mock('motion/react-m', () => ({
    div: ({ children, className }: { children: React.ReactNode; className: string }) => <div className={className}>{children}</div>,
    p: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));
vi.mock('@/components/ui/input', () => ({ Input: (props: React.ComponentProps<'input'>) => {
    state.controlledValue = String(props.value ?? '');
    if (props.ref && typeof props.ref === 'object' && !props.ref.current) {
        props.ref.current = { value: state.nativeValue } as HTMLInputElement;
    }
    return <input placeholder={props.placeholder} value={props.value} readOnly />;
} }));
const events = [
    { id: 'family', slug: 'family', title: 'Family Workshop', city: 'Dublin', category: 'Workshop' },
    { id: 'community', slug: 'community', title: 'Community Gathering', city: 'Dublin', category: 'Conference' },
    { id: 'london', slug: 'london', title: 'London Gathering', city: 'London', category: 'Conference' },
] as PublicEventRecord[];
vi.mock('@/hooks/usePublicEvents', () => ({ usePublicEvents: () => ({ events, isLoading: false, hasMore: false }) }));

import Home from './HomePageClient';
import BrowseEventsClient from './BrowseEventsClient';

beforeEach(() => {
    state.params = new URLSearchParams(); state.nativeValue = ''; state.slot = 0;
    state.values.clear(); state.deps.clear(); state.effects = []; state.push.mockReset();
});
function render(page: 'home' | 'catalogue') {
    state.slot = 0; state.effects = [];
    return renderToStaticMarkup(page === 'home' ? <Home /> : <BrowseEventsClient initialData={null} />);
}
function mountEffects() {
    // Safari detection is independent of input adoption and needs a real browser.
    for (const effect of state.effects) if (!effect.toString().includes('navigator')) effect();
}
function findSubmit(node: React.ReactNode): ((event: React.FormEvent) => void) | undefined {
    if (!React.isValidElement<{ children?: React.ReactNode; onSubmit?: (event: React.FormEvent) => void }>(node)) return;
    if (node.type === 'form') return node.props.onSubmit;
    return React.Children.toArray(node.props.children).map(findSubmit).find(Boolean);
}

describe('native search values entered before hydration', () => {
    it('adopts Home text before the next controlled render and submits the adopted query', () => {
        state.nativeValue = 'Family'; render('home'); mountEffects(); render('home');
        expect(state.controlledValue).toBe('Family');
        state.slot = 0;
        const submit = findSubmit(Home());
        expect(submit).toBeDefined();
        submit!({ preventDefault: vi.fn() } as unknown as React.FormEvent);
        expect(state.push).toHaveBeenCalledWith('/events?q=Family');
    });

    it.each([['', 'Family'], ['q=Family&location=Dublin', '']] as const)('adopts catalogue native value %s → %s and filters the actual cards', (query, nativeValue) => {
        state.params = new URLSearchParams(query); state.nativeValue = nativeValue;
        render('catalogue'); mountEffects();
        // StrictMode can replay mount effects with the same initial URL.
        mountEffects(); const html = render('catalogue');
        expect(state.controlledValue).toBe(nativeValue);
        expect(html).toContain('Family Workshop');
        expect(html.includes('Community Gathering')).toBe(nativeValue === '');
        if (query) expect(html).not.toContain('London Gathering');
        expect(state.params.toString()).toBe(query);
        expect(state.push).not.toHaveBeenCalled();
    });

    it('preserves later catalogue URL synchronisation after native text was adopted', () => {
        state.nativeValue = 'Family'; render('catalogue'); mountEffects(); render('catalogue');
        state.params = new URLSearchParams('q=Community&location=Dublin');
        render('catalogue'); mountEffects(); const html = render('catalogue');
        expect(state.controlledValue).toBe('Community');
        expect(html).toContain('Community Gathering');
        expect(html).not.toContain('Family Workshop');
    });
});
