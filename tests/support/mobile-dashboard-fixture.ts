import http from 'node:http';

export const organiserId = '550e8400-e29b-41d4-a716-446655440000';
export const eventId = '550e8400-e29b-41d4-a716-446655440020';
export const nonce = 'synthetic_mobile_nonce_000000';
export const token = 'synthetic-mobile-dashboard';
export const profile = {
  user: { id: 'synthetic-user', name: 'Fixture Owner', email: 'owner@example.test', avatarUrl: null },
  memberships: [{ id: 'fixture-membership', organizerId: organiserId, role: 'owner', status: 'active', eventScope: { mode: 'all', eventIds: [] } }],
  isOrganizer: true, needsOnboarding: false,
};
const organiser = { id: organiserId, name: 'Fixture Organiser', role: 'owner', status: 'active', eventScope: { mode: 'all', eventIds: [] }, avatarUrl: null, defaultTimezone: 'Europe/Dublin', defaultCurrency: 'EUR', feeTier: 'payg' };
const stats = { totalRevenue: 600, netRevenue: 600, ticketRevenue: 600, donationRevenue: 0, ticketsSold: 24, paidOrders: 24, totalEvents: 1, activeEvents: 1, currency: 'EUR' };
const orders = Array.from({ length: 24 }, (_, index) => ({
  id: `550e8400-e29b-41d4-a716-${String(index + 100).padStart(12, '0')}`, orderNumber: `FIXTURE-${index + 1000}`, createdAt: '2026-06-01T10:00:00.000Z',
  attendee: { name: index % 2 ? 'Yusuf Buyer' : 'Amina Buyer', email: `buyer-${index}@example.test` },
  event: { id: eventId, name: 'Fixture Workshop' }, status: 'completed', promo: null, paymentMethod: 'Card',
  totals: { subtotal: 25, total: 25, net: 25, ticketRevenue: 25, donationRevenue: 0, currency: 'EUR', remainingRefundable: 25 },
  items: [{ id: `item-${index}`, ticketTypeId: 'fixture-ticket', name: 'General', quantity: 1, unitPrice: 25, organizerFee: 0, ticketType: 'standard' }],
}));

export function fixtureResponse(method: string, pathname: string) {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) return { status: 403, body: { message: 'Fixture rejects mutations' } };
  if (pathname === '/__mobile-fixture') return { status: 200, body: { fixture: 'mobile-dashboard-get-only' } };
  const bodies: Record<string, unknown> = {
    '/api/v1/auth/me': profile,
    '/api/v1/auth/me/consent': { analytics: false, marketing: false, version: 2, updatedAt: null },
    '/api/v1/organizers': { organizers: [organiser] },
    '/api/v1/orders': { orders, total: orders.length },
    '/api/v1/orders/ticket-breakdown': { events: [], currency: 'EUR' },
    [`/api/v1/organizers/${organiserId}/events`]: { events: [] },
    '/api/v1/analytics/overview': { stats, filters: { events: [] }, charts: { revenueMonthly: [], ticketsMonthly: [], revenueYearly: [], ticketsYearly: [] }, eventPerformance: [] },
    '/api/v1/analytics/events-performance': { events: [] },
    [`/api/v1/organizers/${organiserId}/credits`]: { balance: 1000, totalPurchased: 1000, availableBalance: 1000, usedCredits: 0, lastPurchaseAt: null, history: [] },
    '/api/v1/exchange-rates': { base: 'GBP', rates: { GBP: 1, EUR: 1.18 }, currencies: [], date: '2026-10-04', lastUpdated: '2026-10-04T00:00:00.000Z' },
  };
  return pathname in bodies ? { status: 200, body: bodies[pathname] } : { status: 404, body: { message: `Unknown fixture endpoint ${pathname}` } };
}

if (process.argv.includes('--serve')) {
  const server = http.createServer((req, res) => {
    const response = fixtureResponse(req.method ?? 'GET', new URL(req.url ?? '/', 'http://127.0.0.1').pathname);
    res.writeHead(response.status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(response.body));
  });
  server.listen(3001, '127.0.0.1', () => console.log('Mobile dashboard GET-only fixture on 3001'));
}
