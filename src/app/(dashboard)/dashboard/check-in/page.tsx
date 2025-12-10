'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ScanLine, Search, Users } from 'lucide-react';
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
import { CheckInStatsBar } from '@/components/check-in/CheckInStatsBar';
import { DesktopQRRedirect } from '@/components/check-in/DesktopQRRedirect';
import { ScanResultOverlay } from '@/components/check-in/ScanResultOverlay';
import { AttendeeCard } from '@/components/check-in/AttendeeCard';
import { QRScanner } from '@/components/check-in/QRScanner';
import { CheckInHeader } from '@/components/check-in/CheckInHeader';
import { useCheckInTickets } from '@/hooks/useCheckInTickets';

// Mock events for selection (frontend scaffold)
const mockEvents = [
  { id: '1', name: 'Halal Food Festival 2024', date: 'Dec 15, 2024' },
  { id: '2', name: 'Islamic Art Exhibition', date: 'Jan 20, 2025' },
];

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

export default function CheckInPage() {
  const isMobile = useIsMobile();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [scanResult, setScanResult] = useState<CheckInResult | null>(null);

  const selectedEventFromUrl = searchParams.get('event');
  const modeFromUrl = searchParams.get('mode');
  const viewFromUrl = searchParams.get('view');

  const selectedEvent = useMemo(() => {
    const fallbackId = mockEvents[0]?.id;
    if (!fallbackId) return '';
    if (!selectedEventFromUrl) return fallbackId;
    const exists = mockEvents.some((e) => e.id === selectedEventFromUrl);
    return exists ? selectedEventFromUrl : fallbackId;
  }, [selectedEventFromUrl]);

  const mode: 'scan' | 'search' =
    modeFromUrl === 'search' ? 'search' : 'scan';

  const view: 'scanner' | 'monitor' =
    viewFromUrl === 'monitor' ? 'monitor' : 'scanner';

  const selectedEventData = mockEvents.find((e) => e.id === selectedEvent);

  const {
    tickets,
    stats,
    checkIn,
    undo,
    isLoading,
    updatingTicketId,
    error,
  } = useCheckInTickets(selectedEvent);

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

    const ticket = tickets.find(
      (t) => t.id === trimmed || t.orderNumber === trimmed,
    );

    if (!ticket) {
      setScanResult({
        status: 'invalid',
        message: 'Ticket not found for this code.',
      });
      return;
    }

    if (ticket.checkInStatus === 'checked_in') {
      setScanResult({
        status: 'already_checked_in',
        ticket,
        checkedInAt: ticket.checkedInAt || new Date(),
      });
      return;
    }

    await handleCheckIn(ticket.id);
  };

  // Desktop monitor view
  if (!isMobile && view === 'monitor') {
    return (
      <div className="min-h-screen bg-muted/30 pb-24">
        <div className="container py-6 space-y-4">
          <CheckInHeader
            events={mockEvents}
            selectedEventId={selectedEvent}
            onEventChange={(value) => updateQuery('event', value)}
            stats={stats}
            showModeToggle={false}
            error={error}
            subtitle="Monitor attendees and manage check-ins"
          />

          <div className="flex justify-end">
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
            events={mockEvents}
            selectedEventId={selectedEvent}
            onEventChange={(value) => updateQuery('event', value)}
            stats={stats}
            showModeToggle={false}
            subtitle="Scan tickets and manage attendee check-ins"
          />

          <div className="flex justify-end mb-4">
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
          events={mockEvents}
          selectedEventId={selectedEvent}
          onEventChange={(value) => updateQuery('event', value)}
          stats={stats}
          mode={mode}
          onModeChange={(next) => updateQuery('mode', next)}
          error={error}
        />

        {/* Scanner Mode */}
        {mode === 'scan' && (
          <Card className="overflow-hidden">
            <CardContent className="p-4 space-y-4">
              <QRScanner
                onScan={handleScan}
                isActive={!isLoading}
              />

              {/* Demo buttons for testing */}
              <div className="space-y-2 text-center">
                <p className="text-xs opacity-50">Demo Actions:</p>
                <div className="flex justify-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isLoading || !!updatingTicketId}
                    aria-label="Simulate scanning a valid ticket"
                    onClick={() => {
                      const unchecked = tickets.find(
                        (t) => t.checkInStatus === 'not_checked_in',
                      );
                      if (unchecked) handleCheckIn(unchecked.id);
                    }}
                  >
                    Simulate Valid Scan
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isLoading || !!updatingTicketId}
                    aria-label="Simulate scanning an already checked-in ticket"
                    onClick={() => {
                      const checked = tickets.find(
                        (t) => t.checkInStatus === 'checked_in',
                      );
                      if (checked) {
                        setScanResult({
                          status: 'already_checked_in',
                          ticket: checked,
                          checkedInAt: checked.checkedInAt || new Date(),
                        });
                      }
                    }}
                  >
                    Simulate Already In
                  </Button>
                </div>
              </div>
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
