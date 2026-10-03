import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ role: 'check_in', status: 'active', hasOrganizer: true, isLoading: false, pathname: '/dashboard/o/org/orders', effects: [] as (() => void)[], replace: vi.fn() }));
vi.mock('react', async (importOriginal) => ({ ...await importOriginal<typeof import('react')>(), useEffect: (effect: () => void) => state.effects.push(effect) }));
vi.mock('next/navigation', () => ({ useParams: () => ({ organizerId: 'org' }), usePathname: () => state.pathname, useRouter: () => ({ replace: state.replace, push: vi.fn() }) }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/context/organizer-context', () => ({ useOrganizers: () => ({ organizers: state.hasOrganizer ? [{ id: 'org', role: state.role, status: state.status }] : [], isLoading: state.isLoading, activeOrganizerId: 'org' }) }));
vi.mock('@/context/auth-context', () => ({ useAuth: () => ({ signOut: vi.fn() }) }));
vi.mock('@/hooks/useBodyScrollLock', () => ({ useBodyScrollLock: vi.fn() }));
vi.mock('@/hooks/useScrollVisibility', () => ({ useScrollVisibility: () => ({ isVisible: true }) }));
import { SuspendedAccessGuard } from './SuspendedAccessGuard';
import { MobileBottomNav } from './MobileBottomNav';
import { EventManagementAccessGuard } from './EventManagementAccessGuard';
import { isCheckInDashboardPath } from '@/lib/organizer-path';
beforeEach(() => { state.role = 'check_in'; state.status = 'active'; state.hasOrganizer = true; state.isLoading = false; state.pathname = '/dashboard/o/org/orders'; state.effects = []; state.replace.mockReset(); });
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
  it('keeps known authorised content mounted while organiser access refreshes', () => {
    state.role = 'owner'; state.isLoading = true;
    expect(renderToStaticMarkup(React.createElement(SuspendedAccessGuard, null, 'Orders search'))).toContain('Orders search');
    state.role = 'check_in'; state.pathname = '/dashboard/o/org/check-in';
    expect(renderToStaticMarkup(React.createElement(SuspendedAccessGuard, null, 'Scanner'))).toContain('Scanner');
  });
  it('hides content during initial loading before organiser access is known', () => {
    state.role = 'owner'; state.hasOrganizer = false; state.isLoading = true;
    expect(renderToStaticMarkup(React.createElement(SuspendedAccessGuard, null, 'Private orders'))).not.toContain('Private orders');
  });
  it.each(['suspended', 'removed'])('keeps %s organiser access blocked during refresh', (status) => {
    state.role = 'owner'; state.status = status; state.isLoading = true;
    const html = renderToStaticMarkup(React.createElement(SuspendedAccessGuard, null, 'Private orders'));
    expect(html).not.toContain('Private orders');
    expect(html).toContain(status === 'suspended' ? 'Access Suspended' : 'Removed from Team');
  });
  it('keeps a check-in user blocked from management during refresh', () => {
    state.isLoading = true;
    expect(renderToStaticMarkup(React.createElement(SuspendedAccessGuard, null, 'Private orders'))).not.toContain('Private orders');
    state.effects.forEach(effect => effect());
    expect(state.replace).toHaveBeenCalledWith('/dashboard/o/org/check-in');
  });
  it('shows only check-in and More in the mobile main navigation', () => {
    const html = renderToStaticMarkup(React.createElement(MobileBottomNav, { organizerId: 'org' }));
    expect(html).toContain('Check-in'); expect(html).toContain('More');
    for (const label of ['Overview', 'Orders', 'Analytics', 'Team', 'Credits']) expect(html).not.toContain(`>${label}<`);
    state.role = 'owner';
    expect(renderToStaticMarkup(React.createElement(MobileBottomNav, { organizerId: 'org' }))).toContain('Overview');
  });
  it('waits for the organiser role before showing mobile navigation', () => {
    state.hasOrganizer = false; state.isLoading = true;
    expect(renderToStaticMarkup(React.createElement(MobileBottomNav, { organizerId: 'org' }))).toBe('');
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
