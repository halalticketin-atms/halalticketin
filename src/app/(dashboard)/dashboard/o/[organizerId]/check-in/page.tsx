'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Search, Users, Loader2, Calendar, ChevronRight, ScanLine, Monitor } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CheckInResult } from '@/types';
import { DesktopQRRedirect } from '@/components/check-in/DesktopQRRedirect';
import { ScanResultOverlay } from '@/components/check-in/ScanResultOverlay';
import { AttendeeCard } from '@/components/check-in/AttendeeCard';
import { QRScanner } from '@/components/check-in/QRScanner';
import { CheckInHeader } from '@/components/check-in/CheckInHeader';
import { isCheckInEligibleStatus, useCheckInTickets, transformCheckInTicket } from '@/hooks/useCheckInTickets';
import { useOrganizerFromParams } from '@/hooks/useOrganizerFromParams';
import { useOrganizerEvents } from '@/hooks/useOrganizerEvents';
import { scanAndCheckInTicket } from '@/lib/check-in-api';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { resolveCheckInEventResolution } from '@/lib/check-in-event-resolution';

// Detect if mobile/tablet
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

function CheckInFallback() {
  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center">
      <div className="text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Loading check-in...</p>
      </div>
    </div>
  );
}

export default function CheckInPage() {
  useOrganizerFromParams();
  return (
    <Suspense fallback={<CheckInFallback />}>
      <CheckInContent />
    </Suspense>
  );
}

function CheckInContent() {
  const organizerId = useOrganizerFromParams();
  const isMobile = useIsMobile();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { memberships } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [scanResult, setScanResult] = useState<CheckInResult | null>(null);

  // Fetch real events and filter to only active ones
  const {
    events,
    isLoading: eventsLoading,
    error: eventsError,
    resolvedOrganizerId,
  } = useOrganizerEvents(organizerId);
  const activeEvents = useMemo(() => {
    return events
      .filter(e => e.displayStatus === 'active')
      .map(e => ({
        id: e.id,
        name: e.title || 'Untitled Event',
      }));
  }, [events]);

  const selectedEventFromUrl = searchParams.get('event');
  const modeFromUrl = searchParams.get('mode');
  const viewFromUrl = searchParams.get('view');

  const updateQuery = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.replace(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);

  const eventResolution = useMemo(() => (
    resolveCheckInEventResolution({
      activeEvents,
      hasFreshEvents: organizerId !== null && resolvedOrganizerId === organizerId,
      isLoading: eventsLoading,
      error: resolvedOrganizerId === organizerId ? eventsError : null,
      requestedEventId: selectedEventFromUrl,
    })
  ), [activeEvents, eventsError, eventsLoading, organizerId, resolvedOrganizerId, selectedEventFromUrl]);

  const selectedEvent =
    eventResolution.status === 'ready' ? eventResolution.selectedEventId : '';

  const mode: 'scan' | 'search' =
    modeFromUrl === 'search' ? 'search' : 'scan';

  const view: 'scanner' | 'monitor' =
    viewFromUrl === 'monitor' ? 'monitor' : 'scanner';

  const selectedEventData = activeEvents.find((e) => e.id === selectedEvent);
  const organizerMembership = memberships.find(
    (membership) => membership.organizerId === organizerId && membership.status === 'active'
  );

  const {
    tickets,
    stats,
    checkIn,
    undo,
    applyCheckInUpdate,
    isLoading,
    updatingTicketId,
    error,
  } = useCheckInTickets(selectedEvent || null);

  useEffect(() => {
    if (
      eventResolution.status === 'ready' &&
      eventResolution.shouldNormalizeUrl &&
      selectedEventFromUrl !== eventResolution.selectedEventId
    ) {
      updateQuery('event', eventResolution.selectedEventId);
    }
  }, [eventResolution, selectedEventFromUrl, updateQuery]);

  if (eventResolution.status === 'loading') {
    return <CheckInFallback />;
  }

  if (eventResolution.status === 'access_error') {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="container py-8">
          <div className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <h1 className="font-display text-2xl sm:text-3xl font-bold">Check-in</h1>
            <p className="text-muted-foreground mt-1">Scan tickets and manage attendee check-ins</p>
          </div>

          <Card className="border-2 border-amber-200/60 rounded-2xl shadow-sm animate-in fade-in slide-in-from-bottom-3 duration-500">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="shrink-0 w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <div className="space-y-2">
                  <h2 className="font-bold text-lg">Check-in access unavailable</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {organizerMembership
                      ? 'We could not load the live events for this organizer.'
                      : 'Your temporary check-in access could not be verified for this organizer.'}
                  </p>
                  {eventResolution.errorMessage && (
                    <p className="text-xs text-muted-foreground/70 bg-muted/50 rounded-lg px-3 py-2 mt-2 inline-block">{eventResolution.errorMessage}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (eventResolution.status === 'no_active_events') {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="container py-8">
          <div className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <h1 className="font-display text-2xl sm:text-3xl font-bold">Check-in</h1>
            <p className="text-muted-foreground mt-1">Scan tickets and manage attendee check-ins</p>
          </div>

          <Card className="border-2 border-black/5 rounded-2xl shadow-sm animate-in fade-in slide-in-from-bottom-3 duration-500">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="shrink-0 w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h2 className="font-bold text-lg">No active events</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Publish an event with a future end time to start checking in attendees.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (eventResolution.status === 'selection_required') {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="container py-8">
          {/* Header */}
          <div className="space-y-3 mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <ScanLine className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Check-in</h1>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
              {eventResolution.invalidEventId
                ? 'That event is no longer available for check-in. Choose one of the live events below.'
                : 'Multiple live events found. Select the event you want to manage.'}
            </p>
          </div>

          {/* Event count label */}
          <p className="text-xs text-muted-foreground/50 font-medium uppercase tracking-widest mb-4 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '50ms', animationFillMode: 'backwards' }}>
            {activeEvents.length} active {activeEvents.length === 1 ? 'event' : 'events'}
          </p>

          {/* Event Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeEvents.map((event, i) => (
              <button
                key={event.id}
                className="w-full group cursor-pointer text-left animate-in fade-in slide-in-from-bottom-2 duration-300"
                style={{ animationDelay: `${(i + 1) * 80}ms`, animationFillMode: 'backwards' }}
                onClick={() => updateQuery('event', event.id)}
              >
                <Card className="h-full border-2 border-black/5 hover:border-primary/30 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 rounded-2xl overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex items-center gap-4 p-4 sm:p-5">
                      <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/10 group-hover:bg-primary/15 flex items-center justify-center transition-colors duration-300">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-base truncate">{event.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 font-medium">Tap to open check-in</div>
                      </div>
                      <div className="shrink-0 w-8 h-8 rounded-xl bg-black/[0.03] group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-all duration-300">
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-white transition-colors duration-300" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const filteredTickets = tickets.filter((ticket) => {
    if (!isCheckInEligibleStatus(ticket.status)) {
      return false;
    }

    const matchesSearch =
      ticket.attendeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.attendeeEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.orderNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'checked_in' && ticket.checkInStatus === 'checked_in') ||
      (statusFilter === 'not_checked_in' && ticket.checkInStatus === 'not_checked_in');
    return matchesSearch && matchesStatus;
  });

  const handleCheckIn = async (ticketId: string) => {
    if (!selectedEvent) {
      setScanResult({
        status: 'invalid',
        message: 'Select an event before checking in attendees.',
      });
      return;
    }

    const result = await checkIn(ticketId);
    if (result) {
      setScanResult(result);
    }
  };

  const handleUndo = async (ticketId: string) => {
    await undo(ticketId);
  };

  const extractTicketCode = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return '';

    const withoutPrefix = trimmed.replace(/^ticket:/i, '').trim();
    const ticketCodePattern = /^[0-9a-f]{16,}$/i;

    try {
      const url = new URL(withoutPrefix);
      const param =
        url.searchParams.get('ticketCode') ||
        url.searchParams.get('ticket') ||
        url.searchParams.get('code');
      if (param) {
        return param.trim();
      }

      const lastSegment = url.pathname.split('/').filter(Boolean).pop();
      if (lastSegment && ticketCodePattern.test(lastSegment)) {
        return lastSegment.trim();
      }

      return '';
    } catch {
      const match = withoutPrefix.match(/(?:ticketCode|ticket|code)=([A-Za-z0-9_-]+)/i);
      return match ? match[1].trim() : withoutPrefix;
    }
  };

  const getMismatchDetails = (
    error: unknown
  ): { eventId: string; eventName?: string | null } | null => {
    if (!(error instanceof ApiError)) return null;
    const payload = error.payload;
    if (!payload || typeof payload !== 'object') return null;

    const apiError = (payload as { error?: { details?: unknown } }).error;
    const details = apiError?.details;
    if (!details || typeof details !== 'object') return null;

    const mismatch = details as { eventId?: string; eventName?: string | null };
    if (typeof mismatch.eventId !== 'string' || !mismatch.eventId) return null;

    return { eventId: mismatch.eventId, eventName: mismatch.eventName ?? null };
  };

  const handleScan = async (data: string) => {
    const ticketCode = extractTicketCode(data);
    if (!ticketCode) {
      setScanResult({
        status: 'invalid',
        message: 'QR code does not include a ticket code.',
      });
      return;
    }

    if (!selectedEvent) {
      setScanResult({
        status: 'invalid',
        message: 'Select an event before scanning tickets.',
      });
      return;
    }

    try {
      const scanResponse = await scanAndCheckInTicket(selectedEvent, ticketCode);
      const normalizedTicket = transformCheckInTicket(scanResponse.ticket);

      if (scanResponse.status === 'already_checked_in') {
        setScanResult({
          status: 'already_checked_in',
          ticket: normalizedTicket,
          checkedInAt: scanResponse.checkedInAt
            ? new Date(scanResponse.checkedInAt)
            : normalizedTicket.checkedInAt || new Date(),
        });
        return;
      }

      if (scanResponse.status === 'needs_claim') {
        setScanResult({
          status: 'needs_claim',
          ticket: normalizedTicket,
          message: scanResponse.message,
        });
        return;
      }

      applyCheckInUpdate(normalizedTicket);
      setScanResult({ status: 'success', ticket: normalizedTicket });
    } catch (err) {
      const mismatch = getMismatchDetails(err);
      if (mismatch) {
        const hasEvent = activeEvents.some((event) => event.id === mismatch.eventId);
        if (hasEvent) {
          updateQuery('event', mismatch.eventId);
        }
        const label = mismatch.eventName ? `"${mismatch.eventName}"` : 'the correct event';
        const actionMessage = hasEvent ? `Switched to ${label}. Please scan again.` : `Please select ${label} and scan again.`;
        setScanResult({
          status: 'invalid',
          message: `Wrong event selected. ${actionMessage}`,
        });
        return;
      }
      const message =
        err instanceof ApiError ? err.message : 'Failed to scan ticket. Please try again.';
      setScanResult({
        status: 'invalid',
        message,
      });
    }
  };

  // Desktop monitor view
  if (!isMobile && view === 'monitor') {
    return (
      <div className="min-h-screen bg-muted/30 pb-24">
        <div className="container py-8 space-y-5">
          <CheckInHeader
            events={activeEvents}
            selectedEventId={selectedEvent}
            onEventChange={(value) => updateQuery('event', value)}
            stats={stats}
            showModeToggle={false}
            error={error}
            subtitle="Monitor attendees and manage check-ins"
            isEventLoading={eventsLoading}
          />

          <div className="flex items-center justify-between gap-3">
            {/* Search & Filter */}
            <div className="flex gap-2 flex-1 max-w-xl">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input
                  placeholder="Search name, email, order..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 pl-10 bg-card border-border/60 rounded-xl shadow-sm"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px] h-11 bg-card border-border/60 rounded-xl shadow-sm font-medium text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/60">
                  <SelectItem value="all" className="rounded-lg">All</SelectItem>
                  <SelectItem value="not_checked_in" className="rounded-lg">Pending</SelectItem>
                  <SelectItem value="checked_in" className="rounded-lg">Checked In</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="rounded-xl h-11 px-4 border-border/60 font-semibold text-sm gap-2 hover:border-primary/30 hover:text-primary transition-colors"
              onClick={() => updateQuery('view', 'scanner')}
            >
              <ScanLine className="h-4 w-4" />
              Scanner view
            </Button>
          </div>

          <div className="space-y-2.5">
            {isLoading ? (
              <Card className="rounded-xl border-border/60">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3 text-primary" />
                  <p className="text-sm font-medium">Loading tickets...</p>
                </CardContent>
              </Card>
            ) : tickets.length === 0 ? (
              <Card className="rounded-xl border-border/60">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Users className="h-7 w-7 mx-auto mb-2.5 opacity-30" />
                  <p className="text-sm font-medium">No tickets for this event yet</p>
                </CardContent>
              </Card>
            ) : filteredTickets.length === 0 ? (
              <Card className="rounded-xl border-border/60">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Search className="h-7 w-7 mx-auto mb-2.5 opacity-30" />
                  <p className="text-sm font-medium">No attendees match your search</p>
                </CardContent>
              </Card>
            ) : (
              filteredTickets.map((ticket) => (
                <AttendeeCard
                  key={ticket.id}
                  ticket={ticket}
                  isUpdating={updatingTicketId === ticket.id}
                  onCheckIn={handleCheckIn}
                  onUndo={handleUndo}
                />
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // Desktop scanner entry view - QR redirect
  if (!isMobile && view === 'scanner') {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="container py-8 space-y-5">
          <CheckInHeader
            events={activeEvents}
            selectedEventId={selectedEvent}
            onEventChange={(value) => updateQuery('event', value)}
            stats={stats}
            showModeToggle={false}
            subtitle="Scan tickets and manage attendee check-ins"
            isEventLoading={eventsLoading}
          />

          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl h-11 px-4 border-border/60 font-semibold text-sm gap-2 hover:border-primary/30 hover:text-primary transition-colors"
              onClick={() => updateQuery('view', 'monitor')}
            >
              <Monitor className="h-4 w-4" />
              Monitor view
            </Button>
          </div>

          <Card className="rounded-xl border-border/60 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-500" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
            <DesktopQRRedirect
              eventId={selectedEvent}
              eventName={selectedEventData?.name || ''}
              organizerId={organizerId || ''}
            />
          </Card>
        </div>
      </div>
    );
  }

  // Mobile/Tablet view - Immersive Scanner
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      {/* Scan Mode - Full Screen Immersive */}
      {mode === 'scan' && (
        <div className="flex-1 bg-black flex flex-col overflow-hidden">
          {/* Scanner Area - Takes remaining space */}
          <div className="flex-1 relative min-h-0">
            <QRScanner
              onScan={handleScan}
              isActive={!isLoading && !!selectedEvent}
            />
          </div>

          {/* Bottom Control Bar - Always visible, docked below scanner */}
          <div className="shrink-0 bg-black/90 backdrop-blur-xl border-t border-white/10 safe-area-pb">
            <div className="px-4 pt-3 pb-4 space-y-3">
              <div className="flex items-center gap-3">
                {activeEvents.length > 1 ? (
                  <Select
                    value={selectedEvent}
                    onValueChange={(value) => updateQuery('event', value)}
                  >
                    <SelectTrigger className="w-full h-12 gap-2 bg-white/10 border-white/10 text-white text-xs backdrop-blur-md rounded-2xl px-4 font-black active:scale-95 transition-all overflow-hidden">
                      <SelectValue className="truncate" />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 backdrop-blur-xl border-white/10 text-white rounded-xl">
                      {activeEvents.map((event) => (
                        <SelectItem key={event.id} value={event.id} className="focus:bg-white/10 focus:text-white rounded-lg my-1">
                          {event.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="w-full h-12 flex items-center px-4 rounded-2xl bg-white/10 border border-white/10 text-white text-xs font-black truncate">
                    {selectedEventData?.name || 'Event'}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 w-full">
                <div className="flex-1 min-w-0 flex items-center justify-between gap-3 bg-white/5 rounded-2xl px-4 py-2.5 border border-white/10 shadow-2xl">
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-black text-white">{stats.totalTickets}</span>
                    <span className="text-[9px] uppercase tracking-tighter font-bold text-white/40">Total</span>
                  </div>
                  <div className="h-6 w-px bg-white/10" />
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-black text-green-400">{stats.checkedIn}</span>
                    <span className="text-[9px] uppercase tracking-tighter font-bold text-green-400/40">Checked In</span>
                  </div>
                  <div className="h-6 w-px bg-white/10" />
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-black text-white/60">{stats.totalTickets - stats.checkedIn}</span>
                    <span className="text-[9px] uppercase tracking-tighter font-bold text-white/20">Left</span>
                  </div>
                </div>

                <button
                  onClick={() => updateQuery('mode', 'search')}
                  className="h-12 px-4 rounded-2xl bg-primary shadow-xl shadow-primary/40 flex items-center gap-2 text-[11px] font-black text-primary-foreground active:scale-95 transition-all hover:bg-primary/95 whitespace-normal leading-tight shrink-0 max-w-[132px]"
                >
                  <div className="bg-white/20 p-2 rounded-xl">
                    <Search className="h-4 w-4" />
                  </div>
                  <span className="block text-left">
                    Attendee
                    <br />
                    List
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Mode - Clean white background */}
      {mode === 'search' && (
        <div className="flex-1 bg-background pt-(--nav-safe-offset) lg:pt-0 pb-32">
          <div className="container pt-3 pb-6 px-4">
            <CheckInHeader
              events={activeEvents}
              selectedEventId={selectedEvent}
              onEventChange={(value) => updateQuery('event', value)}
              stats={stats}
              mode={mode}
              onModeChange={(next) => updateQuery('mode', next)}
              error={error}
              isEventLoading={eventsLoading}
            />

            {/* Search & Filter */}
            <div className="flex gap-2 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input
                  placeholder="Search name, email, order..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 pl-10 bg-card border border-border/60 rounded-xl shadow-sm transition-all"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px] h-12 bg-card border border-border/60 rounded-xl shadow-sm font-medium text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/60">
                  <SelectItem value="all" className="rounded-lg">All</SelectItem>
                  <SelectItem value="not_checked_in" className="rounded-lg">Pending</SelectItem>
                  <SelectItem value="checked_in" className="rounded-lg">Checked In</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Attendee List */}
            <div className="space-y-2.5">
              {isLoading ? (
                <Card className="rounded-xl border-border/60">
                  <CardContent className="py-10 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3 text-primary" />
                    <p className="text-sm font-medium">Loading tickets...</p>
                  </CardContent>
                </Card>
              ) : tickets.length === 0 ? (
                <Card className="rounded-xl border-border/60">
                  <CardContent className="py-10 text-center text-muted-foreground">
                    <Users className="h-7 w-7 mx-auto mb-2.5 opacity-30" />
                    <p className="text-sm font-medium">No tickets for this event yet</p>
                  </CardContent>
                </Card>
              ) : filteredTickets.length === 0 ? (
                <Card className="rounded-xl border-border/60">
                  <CardContent className="py-10 text-center text-muted-foreground">
                    <Search className="h-7 w-7 mx-auto mb-2.5 opacity-30" />
                    <p className="text-sm font-medium">No attendees match your search</p>
                  </CardContent>
                </Card>
              ) : (
                filteredTickets.map((ticket) => (
                  <AttendeeCard
                    key={ticket.id}
                    ticket={ticket}
                    isUpdating={updatingTicketId === ticket.id}
                    onCheckIn={handleCheckIn}
                    onUndo={handleUndo}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Scan Result Overlay */}
      <ScanResultOverlay result={scanResult} onClose={() => setScanResult(null)} />
    </div>
  );
}
