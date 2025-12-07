'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    ScanLine,
    Search,
    Check,
    X,
    AlertCircle,
    Users,
    Smartphone,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { CheckInTicket, CheckInStats, CheckInResult } from '@/types';

// Mock events for selection
const mockEvents = [
    { id: '1', name: 'Halal Food Festival 2024', date: 'Dec 15, 2024' },
    { id: '2', name: 'Islamic Art Exhibition', date: 'Jan 20, 2025' },
];

// Mock tickets data
const mockTickets: CheckInTicket[] = [
    {
        id: 'TKT-001',
        orderId: 'ORD-2024-001',
        orderNumber: 'ORD-2024-001',
        attendeeName: 'Ahmed Hassan',
        attendeeEmail: 'ahmed@example.com',
        ticketType: 'VIP Pass',
        checkInStatus: 'not_checked_in',
        groupSize: 2,
        groupCheckedIn: 0,
    },
    {
        id: 'TKT-002',
        orderId: 'ORD-2024-001',
        orderNumber: 'ORD-2024-001',
        attendeeName: 'Ahmed Hassan',
        attendeeEmail: 'ahmed@example.com',
        ticketType: 'VIP Pass',
        checkInStatus: 'not_checked_in',
        groupSize: 2,
        groupCheckedIn: 0,
    },
    {
        id: 'TKT-003',
        orderId: 'ORD-2024-002',
        orderNumber: 'ORD-2024-002',
        attendeeName: 'Fatima Khan',
        attendeeEmail: 'fatima.k@example.com',
        ticketType: 'General Admission',
        checkInStatus: 'checked_in',
        checkedInAt: new Date('2024-12-07T14:30:00'),
        groupSize: 1,
        groupCheckedIn: 1,
    },
    {
        id: 'TKT-004',
        orderId: 'ORD-2024-003',
        orderNumber: 'ORD-2024-003',
        attendeeName: 'Omar Ali',
        attendeeEmail: 'omar.ali@example.com',
        ticketType: 'General Admission',
        checkInStatus: 'not_checked_in',
        groupSize: 1,
        groupCheckedIn: 0,
    },
    {
        id: 'TKT-005',
        orderId: 'ORD-2024-004',
        orderNumber: 'ORD-2024-004',
        attendeeName: 'Aisha Mohammed',
        attendeeEmail: 'aisha.m@example.com',
        ticketType: 'Family Pack',
        checkInStatus: 'not_checked_in',
        groupSize: 4,
        groupCheckedIn: 0,
    },
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

// Stats component
function CheckInStatsBar({ stats }: { stats: CheckInStats }) {
    return (
        <div className="flex items-center gap-4 p-4 bg-card rounded-xl border">
            <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">
                    <span className="text-green-600 dark:text-green-400">{stats.checkedIn}</span>
                    <span className="text-muted-foreground"> / {stats.totalTickets}</span>
                </span>
            </div>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.percentage}%` }}
                    className="h-full bg-green-500 rounded-full"
                />
            </div>
            <span className="text-sm font-bold text-green-600 dark:text-green-400">
                {stats.percentage.toFixed(0)}%
            </span>
        </div>
    );
}

// Desktop QR Redirect Component
function DesktopQRRedirect({ eventId, eventName }: { eventId: string; eventName: string }) {
    const scannerUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/dashboard/check-in?event=${eventId}&mode=scan`
        : '';

    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
            >
                <div className="mb-6">
                    <Smartphone className="h-16 w-16 mx-auto text-primary mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Open Scanner on Your Phone</h2>
                    <p className="text-muted-foreground max-w-md">
                        Scan this QR code with your phone to open the check-in scanner for <strong>{eventName}</strong>
                    </p>
                </div>

                <Card className="inline-block p-6 bg-white">
                    <QRCodeSVG
                        value={scannerUrl}
                        size={200}
                        level="H"
                        includeMargin
                    />
                </Card>

                <p className="mt-6 text-sm text-muted-foreground">
                    Or open this URL on your phone:<br />
                    <code className="text-xs bg-muted px-2 py-1 rounded mt-1 inline-block">
                        {scannerUrl}
                    </code>
                </p>
            </motion.div>
        </div>
    );
}

// Scan Result Overlay
function ScanResultOverlay({
    result,
    onClose,
}: {
    result: CheckInResult | null;
    onClose: () => void;
}) {
    if (!result) return null;

    const isSuccess = result.status === 'success';
    const isAlreadyIn = result.status === 'already_checked_in';
    const isInvalid = result.status === 'invalid';

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <div
                    className={`absolute inset-0 ${isSuccess
                        ? 'bg-green-500/20'
                        : isAlreadyIn
                            ? 'bg-amber-500/20'
                            : 'bg-red-500/20'
                        }`}
                />
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className={`relative z-10 p-8 rounded-2xl text-center max-w-sm w-full ${isSuccess
                        ? 'bg-green-500 text-white'
                        : isAlreadyIn
                            ? 'bg-amber-500 text-white'
                            : 'bg-red-500 text-white'
                        }`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="mb-4">
                        {isSuccess && <Check className="h-16 w-16 mx-auto" />}
                        {isAlreadyIn && <AlertCircle className="h-16 w-16 mx-auto" />}
                        {isInvalid && <X className="h-16 w-16 mx-auto" />}
                    </div>

                    <h3 className="text-xl font-bold mb-2">
                        {isSuccess && 'Checked In!'}
                        {isAlreadyIn && 'Already Checked In'}
                        {isInvalid && 'Invalid Ticket'}
                    </h3>

                    {(isSuccess || isAlreadyIn) && (
                        <>
                            <p className="text-lg font-medium">{result.ticket.attendeeName}</p>
                            <p className="text-sm opacity-80">{result.ticket.ticketType}</p>
                            {isAlreadyIn && (
                                <p className="text-sm opacity-80 mt-2">
                                    Checked in at {result.checkedInAt.toLocaleTimeString()}
                                </p>
                            )}
                        </>
                    )}

                    {isInvalid && (
                        <p className="text-sm opacity-80">{result.message}</p>
                    )}

                    <Button
                        variant="secondary"
                        className="mt-6"
                        onClick={onClose}
                    >
                        Continue Scanning
                    </Button>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

// Attendee Card for manual search
function AttendeeCard({
    ticket,
    onCheckIn,
    onUndo,
}: {
    ticket: CheckInTicket;
    onCheckIn: (id: string) => void;
    onUndo: (id: string) => void;
}) {
    const isCheckedIn = ticket.checkInStatus === 'checked_in';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-card rounded-xl border flex items-center gap-4"
        >
            <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{ticket.attendeeName}</p>
                <p className="text-sm text-muted-foreground truncate">{ticket.attendeeEmail}</p>
                <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                        {ticket.ticketType}
                    </Badge>
                    {ticket.groupSize > 1 && (
                        <Badge variant="secondary" className="text-xs">
                            {ticket.groupCheckedIn}/{ticket.groupSize} in group
                        </Badge>
                    )}
                </div>
            </div>
            <div>
                {isCheckedIn ? (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onUndo(ticket.id)}
                        className="text-amber-600 border-amber-200 hover:bg-amber-50"
                    >
                        Undo
                    </Button>
                ) : (
                    <Button
                        size="sm"
                        onClick={() => onCheckIn(ticket.id)}
                        className="bg-green-600 hover:bg-green-700 text-white min-w-[100px]"
                    >
                        <Check className="h-4 w-4 mr-1" />
                        Check In
                    </Button>
                )}
            </div>
        </motion.div>
    );
}

export default function CheckInPage() {
    const isMobile = useIsMobile();
    const [selectedEvent, setSelectedEvent] = useState(mockEvents[0].id);
    const [tickets, setTickets] = useState<CheckInTicket[]>(mockTickets);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [scanResult, setScanResult] = useState<CheckInResult | null>(null);
    const [mode, setMode] = useState<'scan' | 'search'>('scan');

    const selectedEventData = mockEvents.find((e) => e.id === selectedEvent);

    // Calculate stats
    const stats: CheckInStats = {
        totalTickets: tickets.length,
        checkedIn: tickets.filter((t) => t.checkInStatus === 'checked_in').length,
        notCheckedIn: tickets.filter((t) => t.checkInStatus === 'not_checked_in').length,
        percentage:
            tickets.length > 0
                ? (tickets.filter((t) => t.checkInStatus === 'checked_in').length / tickets.length) * 100
                : 0,
    };

    // Filter tickets
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

    // Check in handler
    const handleCheckIn = (ticketId: string) => {
        setTickets((prev) =>
            prev.map((t) =>
                t.id === ticketId
                    ? {
                        ...t,
                        checkInStatus: 'checked_in' as const,
                        checkedInAt: new Date(),
                        groupCheckedIn: t.groupCheckedIn + 1,
                    }
                    : t.orderId === prev.find((p) => p.id === ticketId)?.orderId
                        ? { ...t, groupCheckedIn: t.groupCheckedIn + 1 }
                        : t
            )
        );

        const ticket = tickets.find((t) => t.id === ticketId);
        if (ticket) {
            setScanResult({
                status: 'success',
                ticket: { ...ticket, checkInStatus: 'checked_in' },
            });
        }
    };

    // Undo check in
    const handleUndo = (ticketId: string) => {
        setTickets((prev) =>
            prev.map((t) =>
                t.id === ticketId
                    ? {
                        ...t,
                        checkInStatus: 'not_checked_in' as const,
                        checkedInAt: undefined,
                        groupCheckedIn: Math.max(0, t.groupCheckedIn - 1),
                    }
                    : t.orderId === prev.find((p) => p.id === ticketId)?.orderId
                        ? { ...t, groupCheckedIn: Math.max(0, t.groupCheckedIn - 1) }
                        : t
            )
        );
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
                                                    (t) => t.checkInStatus === 'not_checked_in'
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
                                                    (t) => t.checkInStatus === 'checked_in'
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
