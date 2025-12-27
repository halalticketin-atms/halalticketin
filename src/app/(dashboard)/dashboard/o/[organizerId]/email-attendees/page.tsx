'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
    AlertCircle,
    ArrowLeft,
    Calendar,
    Mail,
    Send,
    Users,
    Loader2,
    Check,
    Eye,
    ChevronDown,
    Search,
    X,
    Filter,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { useOrganizerFromParams } from '@/hooks/useOrganizerFromParams';
import { useOrganizerEvents, type DashboardEvent, type DashboardEventStatus } from '@/hooks/useOrganizerEvents';
import { buildDashboardPath } from '@/lib/organizer-path';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

type OrderStatus = 'completed' | 'refunded' | 'partially_refunded';

interface OrderResponse {
    id: string;
    orderNumber: string;
    createdAt: string;
    attendee: {
        name: string | null;
        email: string;
    };
    event: {
        id: string;
        name: string | null;
    };
    status: OrderStatus;
}

const statusStyles: Record<DashboardEventStatus, { label: string; className: string }> = {
    active: {
        label: 'Active',
        className: 'border-emerald-200/80 bg-emerald-50 text-emerald-700',
    },
    past: {
        label: 'Past',
        className: 'border-slate-200 bg-slate-50 text-slate-600',
    },
    draft: {
        label: 'Draft',
        className: 'border-amber-200 bg-amber-50 text-amber-700',
    },
};

const formatEventDate = (event: DashboardEvent) => {
    if (!event.startDatetime) {
        return 'Date TBD';
    }
    const start = new Date(event.startDatetime);
    return start.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

const formatEventLocation = (event: DashboardEvent) => {
    if (event.locationType === 'online') {
        return 'Online event';
    }
    if (event.venue && event.city) {
        return `${event.venue}, ${event.city}`;
    }
    if (event.venue) {
        return event.venue;
    }
    if (event.city) {
        return event.city;
    }
    return 'Location TBD';
};

const buildSubject = (event: DashboardEvent | null) => {
    if (!event) {
        return 'Event update';
    }
    const date = event.startDatetime
        ? new Date(event.startDatetime).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
        })
        : null;
    const title = event.title ?? 'your event';
    return `Update for ${title}${date ? ` - ${date}` : ''}`;
};

type CardType = 'event' | 'audience' | 'compose';

interface ExpandableCardProps {
    id: CardType;
    title: string;
    description: string;
    icon: React.ElementType;
    isExpanded: boolean;
    isCompleted: boolean;
    isPending: boolean;
    summary?: string;
    onExpand: () => void;
    children: React.ReactNode;
}

function ExpandableCard({
    id,
    title,
    description,
    icon: Icon,
    isExpanded,
    isCompleted,
    isPending,
    summary,
    onExpand,
    children,
}: ExpandableCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                'rounded-2xl border-2 transition-all duration-300',
                isExpanded && 'shadow-xl',
                isCompleted && !isExpanded && 'border-emerald-200 bg-emerald-50/30',
                isExpanded && 'border-transparent bg-gradient-to-br from-[oklch(0.78_0.14_165)]/10 to-[oklch(0.72_0.15_185)]/10',
                isPending && 'border-dashed border-border/50 opacity-60',
                !isExpanded && !isCompleted && !isPending && 'border-border/60'
            )}
            style={
                isExpanded
                    ? {
                        background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, oklch(0.78 0.14 165), oklch(0.72 0.15 185)) border-box',
                        borderColor: 'transparent',
                    }
                    : undefined
            }
        >
            <button
                onClick={onExpand}
                disabled={isPending}
                className="w-full text-left"
            >
                <div className="flex items-center justify-between p-5">
                    <div className="flex items-center gap-4">
                        <div
                            className={cn(
                                'h-12 w-12 rounded-xl flex items-center justify-center transition-all',
                                isExpanded && 'bg-gradient-to-br from-[oklch(0.78_0.14_165)] to-[oklch(0.72_0.15_185)] text-white shadow-lg',
                                isCompleted && !isExpanded && 'bg-emerald-500 text-white',
                                !isExpanded && !isCompleted && 'bg-muted text-muted-foreground'
                            )}
                        >
                            {isCompleted && !isExpanded ? (
                                <Check className="h-5 w-5" />
                            ) : (
                                <Icon className="h-5 w-5" />
                            )}
                        </div>
                        <div>
                            <h3 className="font-display text-lg font-semibold">{title}</h3>
                            {!isExpanded && summary ? (
                                <p className="text-sm text-muted-foreground mt-0.5">{summary}</p>
                            ) : (
                                !isExpanded && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                            )}
                        </div>
                    </div>
                    <ChevronDown
                        className={cn(
                            'h-5 w-5 text-muted-foreground transition-transform',
                            isExpanded && 'rotate-180'
                        )}
                    />
                </div>
            </button>

            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="overflow-hidden"
                    >
                        <div className="border-t border-border/50 p-6 pt-5">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

function LiveEmailPreview({
    subject,
    message,
    selectedEvent,
    selectedAudience,
}: {
    subject: string;
    message: string;
    selectedEvent: DashboardEvent | null;
    selectedAudience: string[];
}) {
    return (
        <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-white/70 to-white/50 backdrop-blur-xl p-6 space-y-6 sticky top-6">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[oklch(0.78_0.14_165)] to-[oklch(0.72_0.15_185)] flex items-center justify-center">
                    <Eye className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h3 className="font-display font-semibold">Live Preview</h3>
                    <p className="text-xs text-muted-foreground">See how attendees will view this email</p>
                </div>
            </div>

            {/* Email Preview */}
            <div className="rounded-xl border border-border/60 bg-white shadow-sm overflow-hidden">
                {/* Email Header */}
                <div className="border-b border-border/40 p-4 bg-muted/30">
                    <div className="flex items-center gap-2 mb-3">
                        {selectedEvent?.bannerImageUrl ? (
                            <div className="relative h-8 w-8 rounded-lg overflow-hidden">
                                <Image
                                    src={selectedEvent.bannerImageUrl}
                                    alt=""
                                    fill
                                    sizes="32px"
                                    className="object-cover"
                                />
                            </div>
                        ) : (
                            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-xs font-semibold">
                                {(selectedEvent?.title || 'E').charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className="flex-1">
                            <p className="text-sm font-semibold">
                                {selectedEvent?.title || 'Your Event'}
                            </p>
                        </div>
                    </div>
                    <h2 className="text-base font-semibold">
                        {subject || 'Email subject will appear here'}
                    </h2>
                </div>

                {/* Email Body */}
                <div className="p-6">
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                        {message || 'Your message content will appear here as you type...'}
                    </p>
                </div>

                {/* Email Footer */}
                <div className="border-t border-border/40 p-4 bg-muted/20">
                    <p className="text-xs text-muted-foreground">
                        Sending to: {selectedAudience.join(', ') || 'No audience selected'}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function EmailAttendeesPage() {
    const organizerId = useOrganizerFromParams();
    const { events, isLoading, error } = useOrganizerEvents(organizerId);
    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const [subject, setSubject] = useState('Event update');
    const [message, setMessage] = useState('');
    const [expandedCard, setExpandedCard] = useState<CardType>('event');
    const [completedCards, setCompletedCards] = useState({
        event: false,
        audience: false,
        compose: false,
    });
    const [audience, setAudience] = useState<'all' | 'individual' | 'recent'>('all');
    const [showMobilePreview, setShowMobilePreview] = useState(false);

    // Enhanced audience filters
    const [selectedAttendeeIds, setSelectedAttendeeIds] = useState<Set<string>>(new Set());
    const [attendeeSearchQuery, setAttendeeSearchQuery] = useState('');
    const [dateRangeFilter, setDateRangeFilter] = useState({ start: '', end: '' });
    const [orders, setOrders] = useState<OrderResponse[]>([]);
    const [isLoadingOrders, setIsLoadingOrders] = useState(false);

    const selectedEvent = useMemo(
        () => events.find((event) => event.id === selectedEventId) ?? null,
        [events, selectedEventId]
    );

    // Auto-select first event
    useEffect(() => {
        if (!selectedEventId && events.length > 0) {
            setSelectedEventId(events[0].id);
        }
    }, [events, selectedEventId]);

    // Auto-update subject when event changes
    useEffect(() => {
        setSubject(buildSubject(selectedEvent));
    }, [selectedEvent]);

    // Fetch orders for selected event
    useEffect(() => {
        const fetchOrders = async () => {
            if (!organizerId || !selectedEventId) {
                setOrders([]);
                return;
            }

            setIsLoadingOrders(true);
            try {
                const response = await api.get<{ orders: OrderResponse[] }>('/api/v1/orders', {
                    params: { organizerId, eventId: selectedEventId },
                });
                setOrders(response.orders || []);
            } catch (err) {
                console.error('Failed to fetch orders:', err);
                setOrders([]);
            } finally {
                setIsLoadingOrders(false);
            }
        };

        void fetchOrders();
    }, [organizerId, selectedEventId]);

    const selectedAudience = useMemo(() => {
        const filters = [];

        if (audience === 'all') filters.push('All ticket holders');
        if (audience === 'recent') filters.push('Recent buyers');
        if (audience === 'individual' && selectedAttendeeIds.size > 0) {
            filters.push(`${selectedAttendeeIds.size} selected attendee${selectedAttendeeIds.size > 1 ? 's' : ''}`);
        }

        return filters;
    }, [audience, selectedAttendeeIds]);

    const formattedDate = selectedEvent ? formatEventDate(selectedEvent) : null;
    const formattedLocation = selectedEvent ? formatEventLocation(selectedEvent) : null;
    const statusMeta = selectedEvent ? statusStyles[selectedEvent.displayStatus] : null;

    const handleCompleteCard = (card: CardType) => {
        setCompletedCards((prev) => ({ ...prev, [card]: true }));
        // Auto-expand next card
        if (card === 'event') {
            setExpandedCard('audience');
        } else if (card === 'audience') {
            setExpandedCard('compose');
        }
    };

    const eventSummary = selectedEvent
        ? `${selectedEvent.title} - ${formattedDate}`
        : undefined;

    const audienceSummary = selectedAudience.length > 0
        ? selectedAudience.join(', ')
        : undefined;

    const composeSummary = subject && message
        ? `${subject.substring(0, 50)}${subject.length > 50 ? '...' : ''}`
        : undefined;

    const completionPercentage =
        (Object.values(completedCards).filter(Boolean).length / 3) * 100;

    const canSend = completedCards.event && completedCards.audience && completedCards.compose;

    return (
        <div className="min-h-screen bg-gradient-to-br from-muted/30 via-background to-muted/20">
            <div className="container py-8 space-y-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-4"
                >
                    <Button variant="ghost" size="sm" className="w-fit px-2" asChild>
                        <Link href={organizerId ? buildDashboardPath(organizerId) : '/dashboard'}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Dashboard
                        </Link>
                    </Button>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[oklch(0.78_0.14_165)] to-[oklch(0.72_0.15_185)] text-white flex items-center justify-center shadow-lg">
                                <Mail className="h-6 w-6" />
                            </div>
                            <div>
                                <h1 className="font-display text-2xl sm:text-3xl font-bold">
                                    Email Attendees
                                </h1>
                                <p className="text-muted-foreground">
                                    Compose and send updates to your event attendees
                                </p>
                            </div>
                        </div>

                        {/* Progress Indicator */}
                        <div className="flex items-center gap-3">
                            <div className="hidden sm:flex flex-col items-end gap-1">
                                <p className="text-xs font-medium text-muted-foreground">
                                    {Math.round(completionPercentage)}% complete
                                </p>
                                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-[oklch(0.78_0.14_165)] to-[oklch(0.72_0.15_185)]"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${completionPercentage}%` }}
                                        transition={{ duration: 0.5, ease: 'easeOut' }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Main Content - Split Screen */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-6 items-start">
                    {/* Left Column - Cards */}
                    <div className="space-y-4">
                        {/* Event Selection Card */}
                        <ExpandableCard
                            id="event"
                            title="Select Event"
                            description="Choose which event you're messaging about"
                            icon={Calendar}
                            isExpanded={expandedCard === 'event'}
                            isCompleted={completedCards.event}
                            isPending={false}
                            summary={eventSummary}
                            onExpand={() => setExpandedCard('event')}
                        >
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="event-select">Event</Label>
                                    <Select
                                        value={selectedEventId || undefined}
                                        onValueChange={setSelectedEventId}
                                        disabled={isLoading || events.length === 0}
                                    >
                                        <SelectTrigger id="event-select" className="h-12 bg-background">
                                            <SelectValue
                                                placeholder={isLoading ? 'Loading events...' : 'Select event'}
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {events
                                                .filter(event => event.displayStatus === 'active')
                                                .map((event) => (
                                                    <SelectItem key={event.id} value={event.id}>
                                                        <div className="flex items-center gap-3">
                                                            {event.bannerImageUrl ? (
                                                                <div className="relative h-6 w-6 rounded overflow-hidden">
                                                                    <Image
                                                                        src={event.bannerImageUrl}
                                                                        alt=""
                                                                        fill
                                                                        sizes="24px"
                                                                        className="object-cover"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="h-6 w-6 rounded bg-muted/70 flex items-center justify-center text-[10px] text-muted-foreground">
                                                                    {(event.title || 'E')
                                                                        .charAt(0)
                                                                        .toUpperCase()}
                                                                </div>
                                                            )}
                                                            <span>{event.title || 'Untitled event'}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                    {isLoading && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            Loading events
                                        </div>
                                    )}
                                    {error && (
                                        <div className="flex items-center gap-2 text-xs text-destructive">
                                            <AlertCircle className="h-3.5 w-3.5" />
                                            {error}
                                        </div>
                                    )}
                                </div>

                                {selectedEvent && (
                                    <div className="flex flex-col gap-3 rounded-xl border border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between bg-muted/30">
                                        <div className="flex items-center gap-3">
                                            {selectedEvent.bannerImageUrl ? (
                                                <div className="relative h-12 w-12 rounded-lg overflow-hidden">
                                                    <Image
                                                        src={selectedEvent.bannerImageUrl}
                                                        alt=""
                                                        fill
                                                        sizes="48px"
                                                        className="object-cover"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center text-sm text-muted-foreground">
                                                    {(selectedEvent.title || 'E').charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-sm font-semibold">
                                                    {selectedEvent.title || 'Untitled event'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formattedDate} · {formattedLocation}
                                                </p>
                                            </div>
                                        </div>
                                        {statusMeta && (
                                            <Badge variant="outline" className={cn('border', statusMeta.className)}>
                                                {statusMeta.label}
                                            </Badge>
                                        )}
                                    </div>
                                )}

                                <Button
                                    onClick={() => handleCompleteCard('event')}
                                    disabled={!selectedEventId}
                                    className="w-full bg-gradient-to-r from-[oklch(0.78_0.14_165)] to-[oklch(0.72_0.15_185)] hover:from-[oklch(0.75_0.14_165)] hover:to-[oklch(0.68_0.15_185)]"
                                >
                                    Continue to Audience
                                </Button>
                            </div>
                        </ExpandableCard>

                        {/* Audience Selection Card */}
                        <ExpandableCard
                            id="audience"
                            title="Choose Audience"
                            description="Select who should receive this email"
                            icon={Users}
                            isExpanded={expandedCard === 'audience'}
                            isCompleted={completedCards.audience}
                            isPending={!completedCards.event}
                            summary={audienceSummary}
                            onExpand={() => completedCards.event && setExpandedCard('audience')}
                        >
                            <div className="space-y-4">
                                <div className="space-y-3">
                                    <label className="flex items-start gap-3 rounded-xl border border-border/60 p-4 cursor-pointer hover:bg-muted/30 transition">
                                        <Checkbox
                                            checked={audience === 'all'}
                                            onCheckedChange={(checked) => {
                                                if (checked) setAudience('all');
                                            }}
                                        />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">All ticket holders</p>
                                            <p className="text-xs text-muted-foreground">
                                                Includes paid and free tickets
                                            </p>
                                        </div>
                                    </label>

                                    {/* Individual Attendee Selection - Checkbox with expandable list */}
                                    <div className="rounded-xl border border-border/60 overflow-hidden">
                                        <label className="flex items-start gap-3 p-4 cursor-pointer hover:bg-muted/30 transition">
                                            <Checkbox
                                                checked={audience === 'individual'}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setAudience('individual');
                                                    } else {
                                                        setAudience('all');
                                                        setSelectedAttendeeIds(new Set());
                                                        setAttendeeSearchQuery('');
                                                    }
                                                }}
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium">Select Individual Attendees</p>
                                                    {selectedAttendeeIds.size > 0 && (
                                                        <Badge variant="secondary" className="ml-2">
                                                            {selectedAttendeeIds.size}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Choose specific attendees from the list
                                                </p>
                                            </div>
                                        </label>

                                        {/* Expandable attendee list - only shows when checkbox checked */}
                                        {audience === 'individual' && (
                                            <div className="px-4 pb-4 pt-2 space-y-3 border-t border-border/60">
                                                {/* Search */}
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        placeholder="Search attendees by name or email..."
                                                        value={attendeeSearchQuery}
                                                        onChange={(e) => setAttendeeSearchQuery(e.target.value)}
                                                        className="pl-9 h-9"
                                                    />
                                                </div>

                                                {/* Attendee List */}
                                                <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                                                    {isLoadingOrders ? (
                                                        <div className="flex items-center justify-center py-8 text-muted-foreground">
                                                            <Loader2 className="h-5 w-5 animate-spin" />
                                                        </div>
                                                    ) : orders.length === 0 ? (
                                                        <p className="text-sm text-center py-8 text-muted-foreground">
                                                            No attendees found for this event
                                                        </p>
                                                    ) : (
                                                        orders
                                                            .filter(order => {
                                                                const query = attendeeSearchQuery.toLowerCase();
                                                                return (
                                                                    (order.attendee.name?.toLowerCase() || '').includes(query) ||
                                                                    order.attendee.email.toLowerCase().includes(query)
                                                                );
                                                            })
                                                            .map((order) => {
                                                                const isSelected = selectedAttendeeIds.has(order.id);
                                                                return (
                                                                    <label
                                                                        key={order.id}
                                                                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition"
                                                                    >
                                                                        <Checkbox
                                                                            checked={isSelected}
                                                                            onCheckedChange={(checked) => {
                                                                                const newSet = new Set(selectedAttendeeIds);
                                                                                if (checked) {
                                                                                    newSet.add(order.id);
                                                                                } else {
                                                                                    newSet.delete(order.id);
                                                                                }
                                                                                setSelectedAttendeeIds(newSet);
                                                                            }}
                                                                        />
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-sm font-medium truncate">
                                                                                {order.attendee.name || 'Unnamed'}
                                                                            </p>
                                                                            <p className="text-xs text-muted-foreground truncate">
                                                                                {order.attendee.email}
                                                                            </p>
                                                                        </div>
                                                                    </label>
                                                                );
                                                            })
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <label className="flex items-start gap-3 rounded-xl border border-border/60 p-4 cursor-pointer hover:bg-muted/30 transition">
                                        <Checkbox
                                            checked={audience === 'recent'}
                                            onCheckedChange={(checked) => {
                                                if (checked) setAudience('recent');
                                            }}
                                        />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">Recent buyers</p>
                                            <p className="text-xs text-muted-foreground">
                                                Purchased within the last 48 hours
                                            </p>
                                        </div>
                                    </label>
                                </div>

                                <Button
                                    onClick={() => handleCompleteCard('audience')}
                                    disabled={selectedAudience.length === 0}
                                    className="w-full bg-gradient-to-r from-[oklch(0.78_0.14_165)] to-[oklch(0.72_0.15_185)] hover:from-[oklch(0.75_0.14_165)] hover:to-[oklch(0.68_0.15_185)]"
                                >
                                    Continue to Compose
                                </Button>
                            </div>
                        </ExpandableCard>

                        {/* Compose Message Card */}
                        <ExpandableCard
                            id="compose"
                            title="Compose Message"
                            description="Write your email subject and message"
                            icon={Mail}
                            isExpanded={expandedCard === 'compose'}
                            isCompleted={completedCards.compose}
                            isPending={!completedCards.audience}
                            summary={composeSummary}
                            onExpand={() => completedCards.audience && setExpandedCard('compose')}
                        >
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="subject">Subject</Label>
                                    <Input
                                        id="subject"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        className="h-12"
                                        placeholder="Email subject line"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Auto-filled from your event. Edit as needed.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="message">Message</Label>
                                    <Textarea
                                        id="message"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        className="min-h-[240px] resize-none"
                                        placeholder="Write your message to attendees..."
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {message.length} characters
                                    </p>
                                </div>

                                <Button
                                    onClick={() => handleCompleteCard('compose')}
                                    disabled={!subject.trim() || !message.trim()}
                                    className="w-full bg-gradient-to-r from-[oklch(0.78_0.14_165)] to-[oklch(0.72_0.15_185)] hover:from-[oklch(0.75_0.14_165)] hover:to-[oklch(0.68_0.15_185)]"
                                >
                                    Mark as Complete
                                </Button>
                            </div>
                        </ExpandableCard>

                        {/* Send Button */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{
                                opacity: canSend ? 1 : 0.5,
                                scale: canSend ? 1 : 0.95
                            }}
                            className="rounded-2xl border-2 border-dashed border-border/60 p-6 space-y-3 bg-muted/20"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center">
                                    <Send className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-display font-semibold">Ready to Send</h3>
                                    <p className="text-xs text-muted-foreground">
                                        {canSend
                                            ? `Send email to ${selectedAudience.join(', ')}`
                                            : 'Complete all sections above to send'}
                                    </p>
                                </div>
                            </div>
                            <Button
                                disabled={!canSend}
                                className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 font-semibold"
                            >
                                Send Email Now
                            </Button>
                            {canSend && (
                                <p className="text-xs text-center text-muted-foreground">
                                    Email delivery will be enabled once the backend integration is complete
                                </p>
                            )}
                        </motion.div>
                    </div>

                    {/* Right Column - Live Preview (Desktop) */}
                    <div className="hidden lg:block">
                        <LiveEmailPreview
                            subject={subject}
                            message={message}
                            selectedEvent={selectedEvent}
                            selectedAudience={selectedAudience}
                        />
                    </div>
                </div>
            </div>

            {/* Mobile Preview FAB */}
            <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowMobilePreview(true)}
                className="lg:hidden fixed bottom-6 right-6 h-14 px-6 rounded-full bg-gradient-to-r from-[oklch(0.78_0.14_165)] to-[oklch(0.72_0.15_185)] text-white shadow-2xl flex items-center gap-2 font-semibold z-50"
            >
                <Eye className="h-5 w-5" />
                Preview
            </motion.button>

            {/* Mobile Preview Sheet */}
            <Sheet open={showMobilePreview} onOpenChange={setShowMobilePreview}>
                <SheetContent side="bottom" className="h-[90vh]">
                    <SheetHeader>
                        <SheetTitle>Email Preview</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6 overflow-y-auto h-[calc(90vh-80px)]">
                        <LiveEmailPreview
                            subject={subject}
                            message={message}
                            selectedEvent={selectedEvent}
                            selectedAudience={selectedAudience}
                        />
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
