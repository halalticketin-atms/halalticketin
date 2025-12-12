'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
    ArrowLeft,
    Search,
    Check,
    Clock,
    UserCheck,
    Users,
    Ticket,
    Mail,
    Phone,
    AlertCircle,
    ChevronDown,
    RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { useOrganizerFromParams } from '@/hooks/useOrganizerFromParams';
import { buildDashboardPath } from '@/lib/organizer-path';

// Mock attendees data
interface Attendee {
    id: string;
    orderId: string;
    name: string;
    email: string;
    phone?: string;
    ticketType: string;
    ticketNumber: string;
    checkedIn: boolean;
    checkedInAt: string | null;
    checkedInBy: string | null;
}

const mockAttendees: Attendee[] = [
    { id: '1', orderId: 'ORD-001', name: 'Ahmed Hassan', email: 'ahmed@example.com', phone: '+44 7123 456789', ticketType: 'VIP Pass', ticketNumber: 'TKT-001', checkedIn: true, checkedInAt: '2024-12-06T09:15:00Z', checkedInBy: 'Staff Member' },
    { id: '2', orderId: 'ORD-001', name: 'Ahmed Hassan', email: 'ahmed@example.com', ticketType: 'VIP Pass', ticketNumber: 'TKT-002', checkedIn: true, checkedInAt: '2024-12-06T09:15:00Z', checkedInBy: 'Staff Member' },
    { id: '3', orderId: 'ORD-002', name: 'Fatima Khan', email: 'fatima.k@example.com', ticketType: 'General Admission', ticketNumber: 'TKT-003', checkedIn: false, checkedInAt: null, checkedInBy: null },
    { id: '4', orderId: 'ORD-002', name: 'Fatima Khan', email: 'fatima.k@example.com', ticketType: 'General Admission', ticketNumber: 'TKT-004', checkedIn: false, checkedInAt: null, checkedInBy: null },
    { id: '5', orderId: 'ORD-003', name: 'Omar Ali', email: 'omar.ali@example.com', phone: '+44 7987 654321', ticketType: 'General Admission', ticketNumber: 'TKT-005', checkedIn: true, checkedInAt: '2024-12-06T10:30:00Z', checkedInBy: 'Staff Member' },
    { id: '6', orderId: 'ORD-004', name: 'Aisha Mohammed', email: 'aisha.m@example.com', ticketType: 'Family Pack', ticketNumber: 'TKT-006', checkedIn: false, checkedInAt: null, checkedInBy: null },
    { id: '7', orderId: 'ORD-005', name: 'Yusuf Ibrahim', email: 'yusuf.i@example.com', ticketType: 'VIP Pass', ticketNumber: 'TKT-007', checkedIn: false, checkedInAt: null, checkedInBy: null },
    { id: '8', orderId: 'ORD-006', name: 'Khadija Osman', email: 'khadija.o@example.com', phone: '+44 7111 222333', ticketType: 'General Admission', ticketNumber: 'TKT-008', checkedIn: true, checkedInAt: '2024-12-06T11:00:00Z', checkedInBy: 'Staff Member' },
];

const mockEvent = {
    id: '1',
    name: 'Halal Food Festival 2024',
    date: '2024-12-06',
    time: '10:00 AM - 6:00 PM',
    venue: 'ExCeL London',
};

export default function CheckInPage() {
    const organizerId = useOrganizerFromParams();
    const [attendees, setAttendees] = useState<Attendee[]>(mockAttendees);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'checked-in' | 'not-checked'>('all');
    const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const filteredAttendees = useMemo(() => {
        return attendees.filter(attendee => {
            const matchesSearch =
                attendee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                attendee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                attendee.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                attendee.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'checked-in' && attendee.checkedIn) ||
                (statusFilter === 'not-checked' && !attendee.checkedIn);

            return matchesSearch && matchesStatus;
        });
    }, [attendees, searchQuery, statusFilter]);

    const stats = useMemo(() => {
        const total = attendees.length;
        const checkedIn = attendees.filter(a => a.checkedIn).length;
        return { total, checkedIn, pending: total - checkedIn };
    }, [attendees]);

    const handleCheckIn = (attendee: Attendee) => {
        if (attendee.checkedIn) return;
        setSelectedAttendee(attendee);
        setIsConfirmOpen(true);
    };

    const confirmCheckIn = () => {
        if (!selectedAttendee) return;

        setAttendees(prev => prev.map(a =>
            a.id === selectedAttendee.id
                ? { ...a, checkedIn: true, checkedInAt: new Date().toISOString(), checkedInBy: 'You' }
                : a
        ));
        setIsConfirmOpen(false);
        setSelectedAttendee(null);
    };

    const handleUndoCheckIn = (attendee: Attendee) => {
        setAttendees(prev => prev.map(a =>
            a.id === attendee.id
                ? { ...a, checkedIn: false, checkedInAt: null, checkedInBy: null }
                : a
        ));
    };

    return (
        <div className="min-h-screen bg-muted/30">
            {/* Sticky Header */}
            <div className="sticky top-0 z-40 bg-background border-b">
                <div className="container flex h-14 items-center gap-4">
                    <Button variant="ghost" size="icon" asChild className="shrink-0">
                        <Link href={organizerId ? `${buildDashboardPath(organizerId)}/events` : '/dashboard'}>
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div className="flex-1 min-w-0">
                        <h1 className="font-display text-lg font-semibold truncate">{mockEvent.name}</h1>
                        <p className="text-xs text-muted-foreground">{mockEvent.venue}</p>
                    </div>
                </div>
            </div>

            <div className="container py-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0 }}
                    >
                        <Card className="border-primary/20">
                            <CardContent className="py-4 px-4 text-center">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                                    <Users className="h-5 w-5 text-primary" />
                                </div>
                                <p className="text-2xl font-bold">{stats.total}</p>
                                <p className="text-xs text-muted-foreground">Total</p>
                            </CardContent>
                        </Card>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Card className="border-green-500/20">
                            <CardContent className="py-4 px-4 text-center">
                                <div className="h-10 w-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-2">
                                    <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                                </div>
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.checkedIn}</p>
                                <p className="text-xs text-muted-foreground">Checked In</p>
                            </CardContent>
                        </Card>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Card className="border-amber-500/20">
                            <CardContent className="py-4 px-4 text-center">
                                <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-2">
                                    <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                </div>
                                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pending}</p>
                                <p className="text-xs text-muted-foreground">Pending</p>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                    <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Check-in Progress</span>
                        <span className="font-medium">{Math.round((stats.checkedIn / stats.total) * 100)}%</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-primary to-primary/80"
                            initial={{ width: 0 }}
                            animate={{ width: `${(stats.checkedIn / stats.total) * 100}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                        />
                    </div>
                </div>

                {/* Search & Filters */}
                <Card className="mb-4">
                    <CardContent className="py-3">
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search name, email, order, or ticket..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 h-11"
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={(val: typeof statusFilter) => setStatusFilter(val)}>
                                <SelectTrigger className="w-[130px] h-11">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="checked-in">Checked In</SelectItem>
                                    <SelectItem value="not-checked">Not Yet</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Attendee List */}
                <div className="space-y-2">
                    {filteredAttendees.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <AlertCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                                <p className="font-medium text-muted-foreground">No attendees found</p>
                                <p className="text-sm text-muted-foreground/70">Try adjusting your search or filter</p>
                            </CardContent>
                        </Card>
                    ) : (
                        filteredAttendees.map((attendee, index) => (
                            <motion.div
                                key={attendee.id}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.02 }}
                            >
                                <Card className={`transition-all ${attendee.checkedIn ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800/30' : 'hover:border-primary/50'}`}>
                                    <CardContent className="py-4 px-4">
                                        <div className="flex items-center gap-4">
                                            {/* Avatar / Status */}
                                            <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${attendee.checkedIn
                                                    ? 'bg-green-100 dark:bg-green-900/40'
                                                    : 'bg-muted'
                                                }`}>
                                                {attendee.checkedIn ? (
                                                    <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                                                ) : (
                                                    <span className="text-lg font-semibold text-muted-foreground">
                                                        {attendee.name.charAt(0)}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-semibold truncate">{attendee.name}</p>
                                                    <Badge variant="secondary" className="text-xs shrink-0">
                                                        {attendee.ticketType}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Ticket className="h-3 w-3" />
                                                        {attendee.ticketNumber}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Mail className="h-3 w-3" />
                                                        <span className="truncate max-w-[120px]">{attendee.email}</span>
                                                    </span>
                                                </div>
                                                {attendee.checkedIn && attendee.checkedInAt && (
                                                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                                        ✓ Checked in at {new Date(attendee.checkedInAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Action */}
                                            {attendee.checkedIn ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-muted-foreground hover:text-foreground"
                                                    onClick={() => handleUndoCheckIn(attendee)}
                                                >
                                                    <RefreshCw className="h-4 w-4 mr-1" />
                                                    Undo
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    className="bg-green-600 hover:bg-green-700 text-white"
                                                    onClick={() => handleCheckIn(attendee)}
                                                >
                                                    <Check className="h-4 w-4 mr-1" />
                                                    Check In
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>

            {/* Confirm Check-in Dialog */}
            <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Confirm Check-in</DialogTitle>
                        <DialogDescription>
                            Check in the following attendee?
                        </DialogDescription>
                    </DialogHeader>
                    {selectedAttendee && (
                        <div className="py-4">
                            <div className="bg-muted/50 rounded-xl p-4 text-center">
                                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                                    <span className="text-xl font-bold text-primary">
                                        {selectedAttendee.name.charAt(0)}
                                    </span>
                                </div>
                                <p className="font-semibold text-lg">{selectedAttendee.name}</p>
                                <p className="text-sm text-muted-foreground">{selectedAttendee.email}</p>
                                <Badge className="mt-2">{selectedAttendee.ticketType}</Badge>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsConfirmOpen(false)} className="flex-1">
                            Cancel
                        </Button>
                        <Button onClick={confirmCheckIn} className="flex-1 bg-green-600 hover:bg-green-700">
                            <Check className="h-4 w-4 mr-2" />
                            Confirm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
