import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ role: 'check_in', pathname: '/dashboard/o/org/orders', effects: [] as (() => void)[], replace: vi.fn() }));
vi.mock('react', async (importOriginal) => ({ ...await importOriginal<typeof import('react')>(), useEffect: (effect: () => void) => state.effects.push(effect) }));
vi.mock('next/navigation', () => ({ useParams: () => ({ organizerId: 'org' }), usePathname: () => state.pathname, useRouter: () => ({ replace: state.replace, push: vi.fn() }) }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/context/organizer-context', () => ({ useOrganizers: () => ({ organizers: [{ id: 'org', role: state.role, status: 'active' }], isLoading: false, activeOrganizerId: 'org' }) }));
vi.mock('@/context/auth-context', () => ({ useAuth: () => ({ signOut: vi.fn() }) }));
vi.mock('@/hooks/useBodyScrollLock', () => ({ useBodyScrollLock: vi.fn() }));
vi.mock('@/hooks/useScrollVisibility', () => ({ useScrollVisibility: () => ({ isVisible: true }) }));
import { SuspendedAccessGuard } from './SuspendedAccessGuard';
import { MobileBottomNav } from './MobileBottomNav';
import { EventManagementAccessGuard } from './EventManagementAccessGuard';
import { isCheckInDashboardPath } from '@/lib/organizer-path';
beforeEach(() => { state.role = 'check_in'; state.pathname = '/dashboard/o/org/orders'; state.effects = []; state.replace.mockReset(); });
describe('check-in web access', () => {
  it('redirects a direct management URL without rendering its child', () => {
    const child = vi.fn(() => React.createElement('div', null, 'Private orders'));
    const html = renderToStaticMarkup(React.createElement(SuspendedAccessGuard, null, React.createElement(child)));
    expect(html).not.toContain('Private orders');
    expect(child).not.toHaveBeenCalled();
    state.effects.forEach(effect => effect());
    expect(state.replace).toHaveBeenCalledWith('/dashboard/o/org/check-in');
  });
  it('renders check-in pages and preserves manager pages', () => {
    state.pathname = '/dashboard/o/org/events/event/check-in';
    expect(renderToStaticMarkup(React.createElement(SuspendedAccessGuard, null, 'Scanner'))).toContain('Scanner');
    state.role = 'owner'; state.pathname = '/dashboard/o/org/orders';
    expect(renderToStaticMarkup(React.createElement(SuspendedAccessGuard, null, 'Orders'))).toContain('Orders');
  });
  it('shows only check-in and More in the mobile main navigation', () => {
    const html = renderToStaticMarkup(React.createElement(MobileBottomNav, { organizerId: 'org' }));
    expect(html).toContain('Check-in'); expect(html).toContain('More');
    for (const label of ['Overview', 'Orders', 'Analytics', 'Team', 'Credits']) expect(html).not.toContain(`>${label}<`);
    state.role = 'owner';
    expect(renderToStaticMarkup(React.createElement(MobileBottomNav, { organizerId: 'org' }))).toContain('Overview');
  });
  it.each(['/events/new', '/events/create', '/events/new/ai', '/events/create/registration', '/events/id/edit'])('blocks direct creation route %s', (path) => {
    state.pathname = path;
    expect(renderToStaticMarkup(React.createElement(EventManagementAccessGuard, null, 'Creation wizard'))).not.toContain('Creation wizard');
    state.effects.forEach(effect => effect());
    expect(state.replace).toHaveBeenCalledWith('/dashboard/o/org/check-in');
  });
  it('only allows scanner paths in the selected organiser', () => {
    expect(isCheckInDashboardPath('/dashboard/o/org/check-in', 'org')).toBe(true);
    expect(isCheckInDashboardPath('/dashboard/o/org/events/event/check-in', 'org')).toBe(true);
    for (const path of ['/dashboard/o/org/events', '/dashboard/o/org/events/event', '/dashboard/o/other/check-in', '/dashboard/o/org/check-in/extra']) expect(isCheckInDashboardPath(path, 'org')).toBe(false);
  });
});
