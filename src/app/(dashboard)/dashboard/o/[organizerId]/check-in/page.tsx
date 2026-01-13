'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { Search, Users, Loader2 } from 'lucide-react';
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
import { TempStaffDialog } from '@/components/check-in/TempStaffDialog';
import { useCheckInTickets, transformCheckInTicket } from '@/hooks/useCheckInTickets';
import { useOrganizerFromParams } from '@/hooks/useOrganizerFromParams';
import { useOrganizerEvents } from '@/hooks/useOrganizerEvents';
import { scanAndCheckInTicket } from '@/lib/check-in-api';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/context/auth-context';

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
  const { events, isLoading: eventsLoading } = useOrganizerEvents(organizerId);
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

  const selectedEvent = useMemo(() => {
    const fallbackId = activeEvents[0]?.id;
    if (!fallbackId) return '';
    if (!selectedEventFromUrl) return fallbackId;
    const exists = activeEvents.some((e) => e.id === selectedEventFromUrl);
    return exists ? selectedEventFromUrl : fallbackId;
  }, [selectedEventFromUrl, activeEvents]);

  const mode: 'scan' | 'search' =
    modeFromUrl === 'search' ? 'search' : 'scan';

  const view: 'scanner' | 'monitor' =
    viewFromUrl === 'monitor' ? 'monitor' : 'scanner';

  const selectedEventData = activeEvents.find((e) => e.id === selectedEvent);
  const organizerMembership = memberships.find(
    (membership) => membership.organizerId === organizerId && membership.status === 'active'
  );
  const canInviteTempStaff = organizerMembership
    ? ['owner', 'co_owner', 'admin', 'editor'].includes(organizerMembership.role)
    : false;

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

  const noActiveEvents = !eventsLoading && activeEvents.length === 0;

  if (eventsLoading && activeEvents.length === 0) {
    return <CheckInFallback />;
  }

  if (noActiveEvents || !selectedEvent) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-3">
            <Users className="h-10 w-10 mx-auto text-muted-foreground" />
            <h2 className="font-semibold text-lg">No active events available</h2>
            <p className="text-muted-foreground">
              Publish an event with a future end time to start checking in attendees.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const updateQuery = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const filteredTickets = tickets.filter((ticket) => {
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

  const handleScan = async (data: string) => {
    const trimmed = data.trim();
    if (!trimmed) return;

    if (!selectedEvent) {
      setScanResult({
        status: 'invalid',
        message: 'Select an event before scanning tickets.',
      });
      return;
    }

    try {
      const scanResponse = await scanAndCheckInTicket(selectedEvent, trimmed);
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

      applyCheckInUpdate(normalizedTicket);
      setScanResult({ status: 'success', ticket: normalizedTicket });
    } catch (err) {
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
        <div className="container py-6 space-y-4">
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

          <div className="flex justify-end gap-2">
            {canInviteTempStaff && selectedEvent && selectedEventData && (
              <TempStaffDialog eventId={selectedEvent} eventName={selectedEventData.name} />
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateQuery('view', 'scanner')}
            >
              Back to scanner view
            </Button>
          </div>

          <Card className="mb-4">
            <CardContent className="py-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search name, email, order..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="not_checked_in">Pending</SelectItem>
                    <SelectItem value="checked_in">Checked In</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {isLoading ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <p>Loading tickets...</p>
                </CardContent>
              </Card>
            ) : tickets.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No tickets for this event yet</p>
                </CardContent>
              </Card>
            ) : filteredTickets.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No attendees found</p>
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
        <div className="container py-8">
          <CheckInHeader
            events={activeEvents}
            selectedEventId={selectedEvent}
            onEventChange={(value) => updateQuery('event', value)}
            stats={stats}
            showModeToggle={false}
            subtitle="Scan tickets and manage attendee check-ins"
            isEventLoading={eventsLoading}
          />

          <div className="flex justify-end gap-2 mb-4">
            {canInviteTempStaff && selectedEvent && selectedEventData && (
              <TempStaffDialog eventId={selectedEvent} eventName={selectedEventData.name} />
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateQuery('view', 'monitor')}
            >
              Open monitor view
            </Button>
          </div>

          <Card>
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
    <div className="min-h-screen flex flex-col">
      {/* Scan Mode - Full Screen Immersive */}
      {mode === 'scan' && (
        <div className="flex-1 bg-black relative pt-(--nav-safe-offset)">
          {/* Floating Header - Stacked for better responsiveness */}
          <div className="absolute top-(--nav-safe-offset) left-0 right-0 z-20 p-4 pointer-events-none">
            <div className="flex flex-col gap-3 w-full animate-in fade-in slide-in-from-top-4 duration-500">
              {/* Row 1: Stats Container */}
              <div className="flex items-center justify-center pointer-events-auto">
                <div className="flex items-center gap-6 bg-black/60 backdrop-blur-xl rounded-2xl px-5 py-2.5 border border-white/10 shadow-2xl">
                  {/* Total */}
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-black text-white">{stats.totalTickets}</span>
                    <span className="text-[9px] uppercase tracking-tighter font-bold text-white/40">Total</span>
                  </div>
                  <div className="h-6 w-px bg-white/10" />
                  {/* Checked In */}
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-black text-green-400">{stats.checkedIn}</span>
                    <span className="text-[9px] uppercase tracking-tighter font-bold text-green-400/40">Checked In</span>
                  </div>
                  <div className="h-6 w-px bg-white/10" />
                  {/* Remaining */}
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-black text-white/60">{stats.totalTickets - stats.checkedIn}</span>
                    <span className="text-[9px] uppercase tracking-tighter font-bold text-white/20">Left</span>
                  </div>
                </div>
              </div>

              {/* Row 2: Event Selector - More Centered & Modern */}
              {activeEvents.length > 1 && (
                <div className="flex justify-center pointer-events-auto">
                  <Select
                    value={selectedEvent}
                    onValueChange={(value) => updateQuery('event', value)}
                  >
                    <SelectTrigger className="w-auto h-10 gap-2 bg-white/10 border-white/10 text-white text-xs backdrop-blur-md rounded-xl px-4 font-bold active:scale-95 transition-all">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 backdrop-blur-xl border-white/10 text-white rounded-xl">
                      {activeEvents.map((event) => (
                        <SelectItem key={event.id} value={event.id} className="focus:bg-white/10 focus:text-white rounded-lg my-1">
                          {event.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Full Screen Scanner */}
          <div className="flex-1 relative">
            <QRScanner
              onScan={handleScan}
              isActive={!isLoading && !!selectedEvent}
            />
          </div>

          {/* Search FAB */}
          <button
            onClick={() => updateQuery('mode', 'search')}
            className="absolute bottom-28 right-6 z-20 h-14 px-6 rounded-2xl bg-primary shadow-xl shadow-primary/40 flex items-center gap-3 text-sm font-black text-primary-foreground active:scale-95 transition-all hover:bg-primary/95"
          >
            <div className="bg-white/20 p-2 rounded-xl">
              <Search className="h-4 w-4" />
            </div>
            Attendee List
          </button>
        </div>
      )}

      {/* Search Mode - Clean white background */}
      {mode === 'search' && (
        <div className="flex-1 bg-background pt-(--nav-safe-offset) pb-32">
          <div className="container py-6 px-4">
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
            <div className="flex gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                <Input
                  placeholder="Search name, email, order..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 pl-11 bg-white border-2 border-black/5 rounded-xl shadow-sm transition-all"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px] h-12 bg-white border-2 border-black/5 rounded-xl shadow-sm font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-2">
                  <SelectItem value="all" className="rounded-lg">All</SelectItem>
                  <SelectItem value="not_checked_in" className="rounded-lg">Pending</SelectItem>
                  <SelectItem value="checked_in" className="rounded-lg">Checked In</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Attendee List */}
            <div className="space-y-3">
              {isLoading ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <p>Loading tickets...</p>
                  </CardContent>
                </Card>
              ) : tickets.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No tickets for this event yet</p>
                  </CardContent>
                </Card>
              ) : filteredTickets.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No attendees found</p>
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
