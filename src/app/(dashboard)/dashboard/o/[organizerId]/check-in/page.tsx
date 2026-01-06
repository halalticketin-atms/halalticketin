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
import { scanTicketCode } from '@/lib/check-in-api';
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
      const scanResponse = await scanTicketCode(selectedEvent, trimmed);

      if (!scanResponse.valid || !scanResponse.ticket) {
        setScanResult({
          status: 'invalid',
          message: scanResponse.message || 'Ticket not valid for this event.',
        });
        return;
      }

      const normalizedTicket = transformCheckInTicket(scanResponse.ticket);

      if (scanResponse.alreadyCheckedIn) {
        setScanResult({
          status: 'already_checked_in',
          ticket: normalizedTicket,
          checkedInAt: normalizedTicket.checkedInAt || new Date(),
        });
        return;
      }

      await handleCheckIn(normalizedTicket.id);
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

  // Mobile/Tablet view
  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      <div className="container py-6">
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

        {/* Scanner Mode */}
        {mode === 'scan' && (
          <Card className="overflow-hidden border-0 shadow-none sm:border sm:shadow-sm">
            <CardContent className="p-0">
              <QRScanner
                onScan={handleScan}
                isActive={!isLoading && !!selectedEvent}
              />
            </CardContent>
          </Card>
        )}

        {/* Search Mode */}
        {mode === 'search' && (
          <>
            {/* Search & Filter */}
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
                    <SelectTrigger className="w-[120px]">
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
          </>
        )}
      </div>

      {/* Scan Result Overlay */}
      <ScanResultOverlay result={scanResult} onClose={() => setScanResult(null)} />
    </div>
  );
}
