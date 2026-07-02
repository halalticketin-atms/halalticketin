'use client';

import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import { Calendar, Ticket, DollarSign, AlertCircle, RefreshCw } from 'lucide-react';

import { StatCard, EventPerformanceCards, CreditBalancePanel } from '@/components/dashboard';

import { useAuth } from '@/context/auth-context';
import { useOrganizers } from '@/context/organizer-context';
import { useOrganizerFromParams } from '@/hooks/useOrganizerFromParams';
import { buildDashboardPath } from '@/lib/organizer-path';
import api from '@/lib/api';
import { getCreditAccounting, getCreditStatus } from '@/lib/credit-accounting';
import { getCreditBalance, CreditBalanceResponse } from '@/lib/credits-api';
import { MIN_CREDITS } from '@/lib/fees';

interface AnalyticsStats {
  totalRevenue: number;
  netRevenue?: number; // Revenue after fees, optional for backwards compatibility
  ticketRevenue?: number;
  donationRevenue?: number;
  ticketsSold: number;
  paidOrders: number;
  totalEvents: number;
  currency: string;
}

interface AnalyticsResponse {
  stats: AnalyticsStats;
}

interface EventPerformanceData {
  id: string;
  slug?: string | null;
  title: string;
  startDatetime: string | null;
  venue: string | null;
  city: string | null;
  bannerImageUrl: string | null;
  ticketsSold: number;
  donationCount?: number;
  totalTickets: number;
  revenue: number;
  ticketRevenue?: number;
  donationRevenue?: number;
  currency: string;
  status: 'published' | 'draft' | 'cancelled' | 'archived';
  displayStatus: 'published' | 'draft' | 'past';
  salesTrend: number[];
  trendPercentage: number;
  weeklySales: Array<{
    weekStart: string;
    ticketsSold: number;
    revenue: number;
  }>;
  ticketTypeBreakdown: Array<{
    id: string;
    name: string;
    sold: number;
    total: number;
    revenue: number;
    isArchived?: boolean;
  }>;
}

interface EventsPerformanceResponse {
  events: EventPerformanceData[];
}

const formatCurrency = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount);
  } catch {
    return `£${amount.toFixed(2)}`;
  }
};

const buildRevenueSplitLabel = (
  ticketRevenue: number,
  donationRevenue: number,
  currency: string
) => {
  if (donationRevenue > 0) {
    return `Tickets ${formatCurrency(ticketRevenue, currency)} • Donations ${formatCurrency(donationRevenue, currency)}`;
  }
  // Without donations the split would just repeat the headline figure.
  return undefined;
};

export default function DashboardPage() {
  const router = useRouter();
  const organizerId = useOrganizerFromParams();
  const { user } = useAuth();
  const { organizers } = useOrganizers();
  const [analyticsStats, setAnalyticsStats] = useState<AnalyticsStats | null>(null);
  const [eventsPerformance, setEventsPerformance] = useState<EventPerformanceData[]>([]);
  const [isEventsLoading, setIsEventsLoading] = useState(false);
  const [hasLoadedEvents, setHasLoadedEvents] = useState(false);
  const [creditData, setCreditData] = useState<CreditBalanceResponse | null>(null);
  const [isCreditsLoading, setIsCreditsLoading] = useState(false);
  const [creditError, setCreditError] = useState(false);
  const [creditReload, setCreditReload] = useState(0);

  // Get the current user's role for this organizer
  const activeOrganizer = organizers.find((org) => org.id === organizerId);
  const userRole = activeOrganizer?.role;
  const isCharity = Boolean(activeOrganizer?.isCharityVerified && activeOrganizer?.charityNumber);
  const showCharityBanner = Boolean(organizerId && isCharity);

  // Redirect check-in users to the check-in page
  useEffect(() => {
    if (organizerId && userRole === 'check_in') {
      router.replace(`${buildDashboardPath(organizerId)}/check-in`);
    }
  }, [organizerId, userRole, router]);

  const fetchStats = useEffectEvent(async (currentOrganizerId: string | null) => {
    if (!currentOrganizerId || userRole === 'check_in') {
      setAnalyticsStats(null);
      return;
    }

    try {
      const analyticsRes = await api.get<AnalyticsResponse>('/api/v1/analytics/overview', {
        params: { organizerId: currentOrganizerId, include: 'stats' },
      });
      setAnalyticsStats(analyticsRes.stats);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    }
  });

  useEffect(() => {
    void fetchStats(organizerId ?? null);
  }, [organizerId]);

  useEffect(() => {
    setHasLoadedEvents(false);
    setEventsPerformance([]);
  }, [organizerId]);

  const fetchEventsPerformance = useEffectEvent(async (currentOrganizerId: string | null) => {
    if (!currentOrganizerId || userRole === 'check_in') {
      setEventsPerformance([]);
      setHasLoadedEvents(true);
      return;
    }

    setIsEventsLoading(true);
    try {
      const eventsRes = await api.get<EventsPerformanceResponse>(
        '/api/v1/analytics/events-performance',
        {
          params: { organizerId: currentOrganizerId },
        }
      );
      setEventsPerformance(eventsRes.events);
    } catch (error) {
      console.error('Failed to fetch events performance:', error);
    } finally {
      setIsEventsLoading(false);
      setHasLoadedEvents(true);
    }
  });

  useEffect(() => {
    void fetchEventsPerformance(organizerId ?? null);
  }, [hasLoadedEvents, organizerId]);

  useEffect(() => {
    if (!organizerId) {
      setCreditData(null);
      return;
    }

    let cancelled = false;
    setIsCreditsLoading(true);
    getCreditBalance(organizerId)
      .then((credits) => {
        if (!cancelled) {
          setCreditData(credits);
          setCreditError(false);
        }
      })
      .catch((error) => {
        console.error('Failed to fetch credit balance:', error);
        if (!cancelled) {
          // Clear stale data and flag the error so we never render a misleading
          // zero balance or "running low" banner during an outage.
          setCreditData(null);
          setCreditError(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsCreditsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [organizerId, creditReload]);

  const greetingName = user?.name || user?.email?.split('@')[0] || '';
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimateWave = !prefersReducedMotion;
  const welcomeTitle = (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
        Salaam{greetingName ? `, ${greetingName}` : ''}
      </span>
      {shouldAnimateWave ? (
        <motion.span
          className="inline-block bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] bg-clip-text text-transparent"
          animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
        >
          👋
        </motion.span>
      ) : (
        <span className="inline-block bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] bg-clip-text text-transparent">
          👋
        </span>
      )}
    </span>
  );
  const welcomeSubtitle = user
    ? "Here's what's happening with your events"
    : 'Sign in to start creating and managing your halal events.';

  const stats = useMemo(() => {
    const currency = analyticsStats?.currency ?? 'GBP';
    const totalRevenue = analyticsStats?.netRevenue ?? analyticsStats?.totalRevenue ?? 0;
    const donationRevenue = analyticsStats?.donationRevenue ?? 0;
    const ticketRevenue =
      analyticsStats?.ticketRevenue ?? Math.max(0, totalRevenue - donationRevenue);

    return [
      {
        title: 'Net Revenue',
        value: analyticsStats ? formatCurrency(totalRevenue, currency) : '—',
        subtitle: analyticsStats
          ? buildRevenueSplitLabel(ticketRevenue, donationRevenue, currency)
          : undefined,
        icon: DollarSign,
        color: 'green' as const,
      },
      {
        title: 'Tickets Sold',
        value: analyticsStats ? analyticsStats.ticketsSold ?? 0 : '—',
        icon: Ticket,
        color: 'blue' as const,
      },
      {
        title: 'Active Events',
        value: hasLoadedEvents ? eventsPerformance.length : '—',
        icon: Calendar,
        color: 'purple' as const,
      },
    ];
  }, [analyticsStats, eventsPerformance, hasLoadedEvents]);

  // Single source of truth for the credits module: available/used accounting
  // plus a health status that drives the bar colour and copy.
  const creditAccounting = useMemo(
    () => (creditData ? getCreditAccounting(creditData) : null),
    [creditData]
  );
  const creditStatus = creditAccounting
    ? getCreditStatus(creditAccounting.available, MIN_CREDITS)
    : null;

  const isTokenTier = activeOrganizer?.feeTier === 'token';
  // Token-tier organisers always see their balance (so a zero state prompts a
  // top-up); other tiers only see it if they have historical credit activity.
  const showCreditsModule =
    Boolean(organizerId) &&
    !isCreditsLoading &&
    !creditError &&
    creditAccounting !== null &&
    creditStatus !== null &&
    (isTokenTier || creditAccounting.hasActivity);

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container py-8 overflow-x-hidden">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="font-display text-2xl sm:text-3xl font-bold">{welcomeTitle}</h1>
          <p className="text-muted-foreground mt-1">{welcomeSubtitle}</p>
        </motion.div>

        {creditError && !isCreditsLoading && organizerId && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-xl border border-amber-200/70 bg-amber-50/80 px-4 py-3 text-sm text-amber-900"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-semibold">Couldn&rsquo;t load your credit balance</p>
                  <p className="text-amber-900/80">
                    Your credits are safe &mdash; this is a temporary connection issue, not a change
                    to your balance.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreditReload((count) => count + 1)}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-amber-300/70 bg-white/70 px-3 py-1.5 text-xs font-semibold text-amber-900 transition-colors hover:bg-white"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </button>
            </div>
          </motion.div>
        )}

        {/* Credit Balance: moved to the top so balance, low and zero states are
            communicated in one module instead of a separate banner + bar. */}
        {showCreditsModule && creditAccounting && creditStatus && organizerId && (
          <div className="mb-6">
            <CreditBalancePanel
              accounting={creditAccounting}
              status={creditStatus}
              purchaseHref={`${buildDashboardPath(organizerId)}/billing/purchase`}
            />
          </div>
        )}

        {showCharityBanner && (
          <div className="mb-6 rounded-xl border border-emerald-200/70 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">Charity discounts active</p>
                <p className="text-emerald-900/80">
                  50% off platform fees and 25% off credits are applied automatically.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid - Only 3 cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          {stats.map((stat, i) => (
            <StatCard key={stat.title} {...stat} delay={i * 0.1} />
          ))}
        </div>

        {/* Event Performance Cards */}
        <div>
          {isEventsLoading || !hasLoadedEvents ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            </div>
          ) : (
            <EventPerformanceCards events={eventsPerformance} organizerId={organizerId} />
          )}
        </div>
      </div>
    </div>
  );
}
