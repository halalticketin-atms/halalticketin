'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ScanLine, Search, Users } from 'lucide-react';
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
  const [selectedEvent, setSelectedEvent] = useState(mockEvents[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [scanResult, setScanResult] = useState<CheckInResult | null>(null);
  const [mode, setMode] = useState<'scan' | 'search'>('scan');

  const { tickets, stats, checkIn, undo } = useCheckInTickets();

  const selectedEventData = mockEvents.find((e) => e.id === selectedEvent);

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

  const handleCheckIn = (ticketId: string) => {
    const result = checkIn(ticketId);
    if (result) {
      setScanResult(result);
    }
  };

  const handleUndo = (ticketId: string) => {
    undo(ticketId);
  };

  // Desktop view - show QR redirect
  if (!isMobile) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="container py-8">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="font-display text-3xl font-bold">Check-in</h1>
            <p className="text-muted-foreground mt-1">
              Scan tickets and manage attendee check-ins
            </p>
          </motion.div>

          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Select Event:</label>
                <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                  <SelectTrigger className="w-[300px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mockEvents.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

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
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="font-display text-2xl font-bold">Check-in</h1>
          <Select value={selectedEvent} onValueChange={setSelectedEvent}>
            <SelectTrigger className="w-full mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {mockEvents.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* Stats */}
        <CheckInStatsBar stats={stats} />

        {/* Mode Toggle */}
        <div className="flex gap-2 my-4">
          <Button
            variant={mode === 'scan' ? 'default' : 'outline'}
            className="flex-1"
            onClick={() => setMode('scan')}
          >
            <ScanLine className="h-4 w-4 mr-2" />
            Scan QR
          </Button>
          <Button
            variant={mode === 'search' ? 'default' : 'outline'}
            className="flex-1"
            onClick={() => setMode('search')}
          >
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>

        {/* Scanner Mode */}
        {mode === 'scan' && (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="aspect-square bg-black relative flex items-center justify-center">
                <div className="text-center text-white p-8">
                  <ScanLine className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-sm opacity-70">
                    Camera scanner will be initialized here.
                  </p>
                  <p className="text-xs opacity-50 mt-2">
                    Point camera at ticket QR code
                  </p>

                  {/* Demo buttons for testing */}
                  <div className="mt-6 space-y-2">
                    <p className="text-xs opacity-50">Demo Actions:</p>
                    <Button
                      size="sm"
                      variant="secondary"
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
                      className="ml-2"
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
              {filteredTickets.length === 0 ? (
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
