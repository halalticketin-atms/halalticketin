'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    Calendar,
    Check,
    Eye,
    Loader2,
    Mail,
    RotateCcw,
    Search,
    Send,
    Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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
import { toast } from '@/lib/notifications';

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

type Step = 'event' | 'audience' | 'compose' | 'send';

const STEPS: { id: Step; label: string; icon: React.ElementType }[] = [
    { id: 'event', label: 'Event', icon: Calendar },
    { id: 'audience', label: 'Audience', icon: Users },
    { id: 'compose', label: 'Message', icon: Mail },
    { id: 'send', label: 'Review & Send', icon: Send },
];

interface StepIndicatorProps {
    steps: typeof STEPS;
    currentStep: Step;
    completedSteps: Set<Step>;
    onStepClick: (step: Step) => void;
}

function StepIndicator({ steps, currentStep, completedSteps, onStepClick }: StepIndicatorProps) {
    const currentIndex = steps.findIndex(s => s.id === currentStep);

    return (
        <div className="flex items-center justify-center gap-0 w-full max-w-2xl mx-auto">
            {steps.map((step, index) => {
                const isCompleted = completedSteps.has(step.id);
                const isCurrent = step.id === currentStep;
                const isPast = index < currentIndex;
                const isClickable = isCompleted || isPast;
                const Icon = step.icon;

                return (
                    <div key={step.id} className="flex items-center flex-1 last:flex-none">
                        {/* Step circle */}
                        <button
                            onClick={() => isClickable && onStepClick(step.id)}
                            disabled={!isClickable}
                            className={cn(
                                'relative flex flex-col items-center gap-2 group transition-all duration-300',
                                isClickable && 'cursor-pointer',
                                !isClickable && 'cursor-default'
                            )}
                        >
                            <motion.div
                                className={cn(
                                    'h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm',
                                    isCurrent && 'bg-gradient-to-br from-[oklch(0.78_0.14_165)] to-[oklch(0.72_0.15_185)] text-white shadow-lg scale-110',
                                    isCompleted && !isCurrent && 'bg-emerald-500 text-white',
                                    !isCurrent && !isCompleted && 'bg-muted/60 text-muted-foreground border-2 border-dashed border-border/60'
                                )}
                                whileHover={isClickable ? { scale: 1.05 } : undefined}
                                whileTap={isClickable ? { scale: 0.95 } : undefined}
                            >
                                {isCompleted && !isCurrent ? (
                                    <Check className="h-5 w-5" />
                                ) : (
                                    <Icon className="h-5 w-5" />
                                )}
                            </motion.div>
                            <span className={cn(
                                'text-xs font-medium transition-colors whitespace-nowrap',
                                isCurrent && 'text-foreground',
                                isCompleted && !isCurrent && 'text-emerald-600',
                                !isCurrent && !isCompleted && 'text-muted-foreground'
                            )}>
                                {step.label}
                            </span>
                        </button>

                        {/* Connector line */}
                        {index < steps.length - 1 && (
                            <div className="flex-1 h-0.5 mx-3 relative">
                                <div className="absolute inset-0 bg-border/40 rounded-full" />
                                <motion.div
                                    className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full origin-left"
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: isCompleted || isPast ? 1 : 0 }}
                                    transition={{ duration: 0.4, ease: 'easeOut' }}
                                />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
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
    const searchParams = useSearchParams();
    const organizerId = useOrganizerFromParams();
    const { events, isLoading, error } = useOrganizerEvents(organizerId);
    const [currentStep, setCurrentStep] = useState<Step>('event');
    const [completedSteps, setCompletedSteps] = useState<Set<Step>>(new Set());

    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const [subject, setSubject] = useState('Event update');
    const [message, setMessage] = useState('');
    const [audience, setAudience] = useState<'all' | 'individual' | 'recent' | 'refunded'>('all');
    const [showMobilePreview, setShowMobilePreview] = useState(false);

    // Enhanced audience filters
    const [selectedAttendeeIds, setSelectedAttendeeIds] = useState<Set<string>>(new Set());
    const [attendeeSearchQuery, setAttendeeSearchQuery] = useState('');
    const [orders, setOrders] = useState<OrderResponse[]>([]);
    const [isLoadingOrders, setIsLoadingOrders] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const activeOrders = useMemo(
        () => orders.filter((order) => order.status !== 'refunded'),
        [orders]
    );
    const refundedOrders = useMemo(
        () => orders.filter((order) => order.status === 'refunded'),
        [orders]
    );
    const selectedEventFromUrl = searchParams.get('eventId');
    const eligibleEvents = useMemo(
        () => events.filter((event) => event.canEmailAttendees),
        [events]
    );

    const selectedEvent = useMemo(
        () => events.find((event) => event.id === selectedEventId) ?? null,
        [events, selectedEventId]
    );

    const getEventEndedAt = (event: DashboardEvent) => {
        if (event.endDatetime) {
            return new Date(event.endDatetime).getTime();
        }
        if (event.startDatetime) {
            return new Date(event.startDatetime).getTime();
        }
        return 0;
    };

    // Auto-select the best eligible event
    useEffect(() => {
        if (eligibleEvents.length === 0) {
            if (selectedEventId) {
                setSelectedEventId('');
            }
            return;
        }

        const existingSelection = eligibleEvents.find((event) => event.id === selectedEventId);
        if (existingSelection) {
            return;
        }

        const requestedEvent = selectedEventFromUrl
            ? eligibleEvents.find((event) => event.id === selectedEventFromUrl)
            : null;
        if (requestedEvent) {
            setSelectedEventId(requestedEvent.id);
            return;
        }

        const activeEvent = eligibleEvents.find((event) => event.displayStatus === 'active');
        if (activeEvent) {
            setSelectedEventId(activeEvent.id);
            return;
        }

        const mostRecentlyEndedEvent = [...eligibleEvents]
            .sort((a, b) => getEventEndedAt(b) - getEventEndedAt(a))[0];

        if (mostRecentlyEndedEvent) {
            setSelectedEventId(mostRecentlyEndedEvent.id);
        }
    }, [eligibleEvents, selectedEventFromUrl, selectedEventId]);

    // Auto-update subject when event changes
    useEffect(() => {
        setSubject(buildSubject(selectedEvent));
    }, [selectedEvent]);

    useEffect(() => {
        setSelectedAttendeeIds(new Set());
    }, [selectedEventId]);

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
        if (audience === 'refunded') filters.push('Refunded attendees');
        if (audience === 'individual' && selectedAttendeeIds.size > 0) {
            filters.push(`${selectedAttendeeIds.size} selected attendee${selectedAttendeeIds.size > 1 ? 's' : ''}`);
        }

        return filters;
    }, [audience, selectedAttendeeIds]);

    const formattedDate = selectedEvent ? formatEventDate(selectedEvent) : null;
    const formattedLocation = selectedEvent ? formatEventLocation(selectedEvent) : null;
    const statusMeta = selectedEvent ? statusStyles[selectedEvent.displayStatus] : null;

    // Step validation
    const canProceedFromEvent = !!selectedEventId;
    const hasAttendees = activeOrders.length > 0;
    const hasRefundedAttendees = refundedOrders.length > 0;
    const canProceedFromAudience =
        (audience === 'all' && hasAttendees) ||
        (audience === 'recent' && hasAttendees) ||
        (audience === 'refunded' && hasRefundedAttendees) ||
        (audience === 'individual' && selectedAttendeeIds.size > 0);
    const canProceedFromCompose = subject.trim().length >= 5 && message.trim().length >= 10;
    const canSend = canProceedFromEvent && canProceedFromAudience && canProceedFromCompose;

    useEffect(() => {
        setCompletedSteps((prev) => {
            const next = new Set(prev);

            if (!canProceedFromEvent) {
                next.delete('event');
                next.delete('audience');
                next.delete('compose');
                next.delete('send');
                return next;
            }

            if (!canProceedFromAudience) {
                next.delete('audience');
                next.delete('compose');
                next.delete('send');
            }

            if (!canProceedFromCompose) {
                next.delete('compose');
                next.delete('send');
            }

            return next;
        });
    }, [canProceedFromAudience, canProceedFromCompose, canProceedFromEvent]);

    const handleContinue = () => {
        const stepOrder: Step[] = ['event', 'audience', 'compose', 'send'];
        const currentIndex = stepOrder.indexOf(currentStep);

        if (currentIndex < stepOrder.length - 1) {
            setCompletedSteps(prev => new Set([...prev, currentStep]));
            setCurrentStep(stepOrder[currentIndex + 1]);
        }
    };

    const handleBack = () => {
        const stepOrder: Step[] = ['event', 'audience', 'compose', 'send'];
        const currentIndex = stepOrder.indexOf(currentStep);

        if (currentIndex > 0) {
            setCurrentStep(stepOrder[currentIndex - 1]);
        }
    };

    const handleStepClick = (step: Step) => {
        setCurrentStep(step);
    };

    const handleSendEmail = async () => {
        if (!organizerId || !selectedEventId) {
            return;
        }

        const payload = {
            eventId: selectedEventId,
            audience,
            subject: subject.trim(),
            message: message.trim(),
            orderIds: audience === 'individual' ? Array.from(selectedAttendeeIds) : undefined,
        };

        setIsSending(true);
        try {
            const response = await api.post<{ sent: number; skipped: number; failed: number }>(
                `/api/v1/organizers/${organizerId}/attendee-emails`,
                payload
            );
            toast.success('Email sent', {
                description: `${response.sent} recipient${response.sent === 1 ? '' : 's'} queued${response.failed ? ` · ${response.failed} failed` : ''}`,
            });
        } catch (err) {
            toast.error(err);
        } finally {
            setIsSending(false);
        }
    };

    // Get summary badges for completed steps
    const getSummaryBadges = () => {
        const badges: { label: string; icon: React.ElementType }[] = [];

        if (completedSteps.has('event') && selectedEvent) {
            badges.push({ label: selectedEvent.title || 'Untitled', icon: Calendar });
        }
        if (completedSteps.has('audience')) {
            badges.push({ label: selectedAudience[0] || 'No audience', icon: Users });
        }
        if (completedSteps.has('compose')) {
            badges.push({ label: subject.substring(0, 30) + (subject.length > 30 ? '...' : ''), icon: Mail });
        }

        return badges;
    };

    const summaryBadges = getSummaryBadges();

    return (
        <div className="min-h-screen bg-gradient-to-br from-muted/30 via-background to-muted/20">
            <div className="container py-8 space-y-8">
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
                                    Send updates to your event attendees in 4 simple steps
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Step Indicator */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="py-4"
                >
                    <StepIndicator
                        steps={STEPS}
                        currentStep={currentStep}
                        completedSteps={completedSteps}
                        onStepClick={handleStepClick}
                    />
                </motion.div>

                {/* Summary Badges */}
                {summaryBadges.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-wrap justify-center gap-2"
                    >
                        {summaryBadges.map((badge, i) => (
                            <Badge
                                key={i}
                                variant="secondary"
                                className="px-3 py-1.5 gap-2 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
                            >
                                <badge.icon className="h-3.5 w-3.5" />
                                {badge.label}
                            </Badge>
                        ))}
                    </motion.div>
                )}

                {/* Main Content - Split Screen */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-8 items-start">
                    {/* Left Column - Step Content */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                            className="rounded-2xl border border-border/60 bg-white/80 backdrop-blur-sm shadow-xl overflow-hidden"
                            style={{
                                background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, oklch(0.78 0.14 165 / 0.3), oklch(0.72 0.15 185 / 0.3)) border-box',
                                borderColor: 'transparent',
                            }}
                        >
                            {/* Step Header */}
                            <div className="border-b border-border/40 px-6 py-5 bg-gradient-to-r from-muted/30 to-transparent">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[oklch(0.78_0.14_165)] to-[oklch(0.72_0.15_185)] text-white flex items-center justify-center">
                                        {STEPS.find(s => s.id === currentStep)?.icon && (
                                            (() => {
                                                const Icon = STEPS.find(s => s.id === currentStep)!.icon;
                                                return <Icon className="h-5 w-5" />;
                                            })()
                                        )}
                                    </div>
                                    <div>
                                        <h2 className="font-display text-xl font-semibold">
                                            {STEPS.find(s => s.id === currentStep)?.label}
                                        </h2>
                                        <p className="text-sm text-muted-foreground">
                                            {currentStep === 'event' && 'Choose which event you\'re messaging about'}
                                            {currentStep === 'audience' && 'Select who should receive this email'}
                                            {currentStep === 'compose' && 'Write your email subject and message'}
                                            {currentStep === 'send' && 'Review your email and send it'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Step Content */}
                            <div className="p-6">
                                {/* Event Selection Step */}
                                {currentStep === 'event' && (
                                    <div className="space-y-5">
                                        <div className="space-y-2">
                                                <Label htmlFor="event-select">Select an event</Label>
                                            <Select
                                                value={selectedEventId || undefined}
                                                onValueChange={setSelectedEventId}
                                                disabled={isLoading || eligibleEvents.length === 0}
                                            >
                                                <SelectTrigger id="event-select" className="h-12 bg-background">
                                                    <SelectValue
                                                        placeholder={isLoading ? 'Loading events...' : 'Select eligible event'}
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {eligibleEvents
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
                                            {!isLoading && !error && eligibleEvents.length === 0 && (
                                                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                                                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600" />
                                                    <span>
                                                        Email attendees stays available while an event is active and for 7 days after it ends.
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {selectedEvent && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="flex flex-col gap-3 rounded-xl border border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between bg-muted/20"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {selectedEvent.bannerImageUrl ? (
                                                        <div className="relative h-14 w-14 rounded-xl overflow-hidden">
                                                            <Image
                                                                src={selectedEvent.bannerImageUrl}
                                                                alt=""
                                                                fill
                                                                sizes="56px"
                                                                className="object-cover"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center text-lg text-muted-foreground">
                                                            {(selectedEvent.title || 'E').charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-semibold">
                                                            {selectedEvent.title || 'Untitled event'}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {formattedDate} · {formattedLocation}
                                                        </p>
                                                    </div>
                                                </div>
                                                {statusMeta && (
                                                    <div className="flex flex-col items-end gap-2">
                                                        <Badge variant="outline" className={cn('border shrink-0', statusMeta.className)}>
                                                            {statusMeta.label}
                                                        </Badge>
                                                        {selectedEvent.displayStatus === 'past' && selectedEvent.canEmailAttendees && (
                                                            <p className="max-w-48 text-right text-xs text-muted-foreground">
                                                                Emailing remains available for 7 days after the event ends.
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </div>
                                )}

                                {/* Audience Selection Step */}
                                {currentStep === 'audience' && (
                                    <div className="space-y-4">
                                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                            {/* All Attendees */}
                                            <button
                                                onClick={() => setAudience('all')}
                                                className={cn(
                                                    'group relative rounded-xl border-2 p-5 text-left transition-all hover:shadow-md',
                                                    audience === 'all'
                                                        ? 'border-[oklch(0.72_0.15_185)] bg-gradient-to-br from-[oklch(0.78_0.14_165)]/5 to-[oklch(0.72_0.15_185)]/10'
                                                        : 'border-border/60 hover:border-border'
                                                )}
                                            >
                                                <div className="flex flex-col gap-2">
                                                    <div className={cn(
                                                        'h-10 w-10 rounded-lg flex items-center justify-center transition-colors',
                                                        audience === 'all'
                                                            ? 'bg-gradient-to-br from-[oklch(0.78_0.14_165)] to-[oklch(0.72_0.15_185)] text-white'
                                                            : 'bg-muted text-muted-foreground'
                                                    )}>
                                                        <Users className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold">All Attendees</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {activeOrders.length > 0 ? `${activeOrders.length} attendee${activeOrders.length !== 1 ? 's' : ''}` : 'No attendees yet'}
                                                        </p>
                                                    </div>
                                                </div>
                                                {audience === 'all' && activeOrders.length > 0 && (
                                                    <Badge className="absolute top-3 right-3 bg-[oklch(0.72_0.15_185)]">
                                                        {activeOrders.length}
                                                    </Badge>
                                                )}
                                                {audience === 'all' && activeOrders.length === 0 && (
                                                    <div className="absolute top-3 right-3">
                                                        <Check className="h-5 w-5 text-[oklch(0.72_0.15_185)]" />
                                                    </div>
                                                )}
                                            </button>

                                            {/* Individual Selection */}
                                            <button
                                                onClick={() => setAudience('individual')}
                                                className={cn(
                                                    'group relative rounded-xl border-2 p-5 text-left transition-all hover:shadow-md',
                                                    audience === 'individual'
                                                        ? 'border-[oklch(0.72_0.15_185)] bg-gradient-to-br from-[oklch(0.78_0.14_165)]/5 to-[oklch(0.72_0.15_185)]/10'
                                                        : 'border-border/60 hover:border-border'
                                                )}
                                            >
                                                <div className="flex flex-col gap-2">
                                                    <div className={cn(
                                                        'h-10 w-10 rounded-lg flex items-center justify-center transition-colors',
                                                        audience === 'individual'
                                                            ? 'bg-gradient-to-br from-[oklch(0.78_0.14_165)] to-[oklch(0.72_0.15_185)] text-white'
                                                            : 'bg-muted text-muted-foreground'
                                                    )}>
                                                        <Search className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold">Select Individuals</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Choose specific people
                                                        </p>
                                                    </div>
                                                </div>
                                                {audience === 'individual' && selectedAttendeeIds.size > 0 && (
                                                    <Badge className="absolute top-3 right-3 bg-[oklch(0.72_0.15_185)]">
                                                        {selectedAttendeeIds.size}
                                                    </Badge>
                                                )}
                                            </button>

                                            {/* Recent Buyers */}
                                            <button
                                                onClick={() => setAudience('recent')}
                                                className={cn(
                                                    'group relative rounded-xl border-2 p-5 text-left transition-all hover:shadow-md',
                                                    audience === 'recent'
                                                        ? 'border-[oklch(0.72_0.15_185)] bg-gradient-to-br from-[oklch(0.78_0.14_165)]/5 to-[oklch(0.72_0.15_185)]/10'
                                                        : 'border-border/60 hover:border-border'
                                                )}
                                            >
                                                <div className="flex flex-col gap-2">
                                                    <div className={cn(
                                                        'h-10 w-10 rounded-lg flex items-center justify-center transition-colors',
                                                        audience === 'recent'
                                                            ? 'bg-gradient-to-br from-[oklch(0.78_0.14_165)] to-[oklch(0.72_0.15_185)] text-white'
                                                            : 'bg-muted text-muted-foreground'
                                                    )}>
                                                        <Calendar className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold">Recent Buyers</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Last 48 hours
                                                        </p>
                                                    </div>
                                                </div>
                                                {audience === 'recent' && activeOrders.length > 0 && (
                                                    <Badge className="absolute top-3 right-3 bg-[oklch(0.72_0.15_185)]">
                                                        {activeOrders.length}
                                                    </Badge>
                                                )}
                                                {audience === 'recent' && activeOrders.length === 0 && (
                                                    <div className="absolute top-3 right-3">
                                                        <Check className="h-5 w-5 text-[oklch(0.72_0.15_185)]" />
                                                    </div>
                                                )}
                                            </button>

                                            {/* Refunded Attendees */}
                                            <button
                                                onClick={() => setAudience('refunded')}
                                                className={cn(
                                                    'group relative rounded-xl border-2 p-5 text-left transition-all hover:shadow-md',
                                                    audience === 'refunded'
                                                        ? 'border-rose-300 bg-rose-50/60'
                                                        : 'border-border/60 hover:border-border'
                                                )}
                                            >
                                                <div className="flex flex-col gap-2">
                                                    <div className={cn(
                                                        'h-10 w-10 rounded-lg flex items-center justify-center transition-colors',
                                                        audience === 'refunded'
                                                            ? 'bg-rose-500 text-white'
                                                            : 'bg-muted text-muted-foreground'
                                                    )}>
                                                        <RotateCcw className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold">Refunded Attendees</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {refundedOrders.length > 0 ? `${refundedOrders.length} attendee${refundedOrders.length !== 1 ? 's' : ''}` : 'No refunded attendees'}
                                                        </p>
                                                    </div>
                                                </div>
                                                {audience === 'refunded' && refundedOrders.length > 0 && (
                                                    <Badge className="absolute top-3 right-3 bg-rose-500">
                                                        {refundedOrders.length}
                                                    </Badge>
                                                )}
                                                {audience === 'refunded' && refundedOrders.length === 0 && (
                                                    <div className="absolute top-3 right-3">
                                                        <Check className="h-5 w-5 text-rose-500" />
                                                    </div>
                                                )}
                                            </button>
                                        </div>

                                        {/* Empty attendees warning */}
                                        {(audience === 'all' || audience === 'recent') && !isLoadingOrders && activeOrders.length === 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900"
                                            >
                                                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                                                <div>
                                                    <p className="font-medium">No attendees found</p>
                                                    <p className="text-sm text-amber-700">
                                                        This event has no orders yet. Attendees will appear here once tickets are purchased.
                                                    </p>
                                                </div>
                                            </motion.div>
                                        )}
                                        {audience === 'refunded' && !isLoadingOrders && refundedOrders.length === 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900"
                                            >
                                                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                                                <div>
                                                    <p className="font-medium">No refunded attendees</p>
                                                    <p className="text-sm text-rose-700">
                                                        Refunded orders will appear here after a refund is processed.
                                                    </p>
                                                </div>
                                            </motion.div>
                                        )}

                                        {/* Individual attendee list */}
                                        {audience === 'individual' && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="space-y-3 pt-2"
                                            >
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        placeholder="Search attendees by name or email..."
                                                        value={attendeeSearchQuery}
                                                        onChange={(e) => setAttendeeSearchQuery(e.target.value)}
                                                        className="pl-9 h-11"
                                                    />
                                                </div>

                                                <div className="max-h-64 overflow-y-auto space-y-1 pr-1 rounded-xl border border-border/60 p-2 bg-muted/20">
                                                    {isLoadingOrders ? (
                                                        <div className="flex items-center justify-center py-8 text-muted-foreground">
                                                            <Loader2 className="h-5 w-5 animate-spin" />
                                                        </div>
                                                    ) : activeOrders.length === 0 ? (
                                                        <p className="text-sm text-center py-8 text-muted-foreground">
                                                            No attendees found for this event
                                                        </p>
                                                    ) : (
                                                        activeOrders
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
                                                                        className={cn(
                                                                            'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition',
                                                                            isSelected ? 'bg-[oklch(0.78_0.14_165)]/10' : 'hover:bg-muted/50'
                                                                        )}
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
                                            </motion.div>
                                        )}
                                    </div>
                                )}

                                {/* Compose Message Step */}
                                {currentStep === 'compose' && (
                                    <div className="space-y-5">
                                        <div className="space-y-2">
                                            <Label htmlFor="subject">Subject line</Label>
                                            <Input
                                                id="subject"
                                                value={subject}
                                                onChange={(e) => setSubject(e.target.value)}
                                                minLength={5}
                                                maxLength={100}
                                                className="h-12"
                                                placeholder="Email subject line"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Auto-filled from your event. Edit as needed.
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="message">Your message</Label>
                                            <Textarea
                                                id="message"
                                                value={message}
                                                onChange={(e) => setMessage(e.target.value)}
                                                minLength={10}
                                                maxLength={10000}
                                                className="min-h-[200px] resize-none"
                                                placeholder="Write your message to attendees..."
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                {message.length} characters
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Review & Send Step */}
                                {currentStep === 'send' && (
                                    <div className="space-y-6">
                                        {/* Summary Cards */}
                                        <div className="grid gap-4 sm:grid-cols-3">
                                            <div className="rounded-xl border border-border/60 p-4 bg-muted/20">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-xs text-muted-foreground">Event</span>
                                                </div>
                                                <p className="font-semibold text-sm truncate">
                                                    {selectedEvent?.title || 'Not selected'}
                                                </p>
                                            </div>
                                            <div className="rounded-xl border border-border/60 p-4 bg-muted/20">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Users className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-xs text-muted-foreground">Audience</span>
                                                </div>
                                                <p className="font-semibold text-sm truncate">
                                                    {selectedAudience[0] || 'Not selected'}
                                                </p>
                                            </div>
                                            <div className="rounded-xl border border-border/60 p-4 bg-muted/20">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-xs text-muted-foreground">Subject</span>
                                                </div>
                                                <p className="font-semibold text-sm truncate">
                                                    {subject || 'No subject'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Message Preview */}
                                        <div className="rounded-xl border border-border/60 p-4 bg-muted/10">
                                            <p className="text-xs text-muted-foreground mb-2">Message preview</p>
                                            <p className="text-sm whitespace-pre-wrap line-clamp-4">
                                                {message || 'No message written'}
                                            </p>
                                        </div>

                                        {/* Validation Warnings */}
                                        {!canSend && (
                                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                                <div className="flex items-start gap-2">
                                                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                                                    <div className="text-sm text-amber-800">
                                                        <p className="font-medium">Please complete all steps before sending:</p>
                                                        <ul className="mt-1 list-disc list-inside text-xs space-y-0.5">
                                                            {!canProceedFromEvent && <li>Select an event</li>}
                                                            {!canProceedFromAudience && <li>Choose an audience</li>}
                                                            {!canProceedFromCompose && <li>Write your message</li>}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Send Button */}
                                        <Button
                                            disabled={!canSend || isSending}
                                            className="w-full h-14 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 font-semibold text-base shadow-lg"
                                            onClick={handleSendEmail}
                                        >
                                            {isSending ? (
                                                <>
                                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                                    Sending...
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="h-5 w-5 mr-2" />
                                                    Send Email Now
                                                </>
                                            )}
                                        </Button>
                                        {canSend && (
                                            <p className="text-xs text-center text-muted-foreground">
                                                Emails are sent immediately to the selected audience.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Step Navigation */}
                            {currentStep !== 'send' && (
                                <div className="border-t border-border/40 px-6 py-4 bg-muted/10 flex items-center justify-between">
                                    <Button
                                        variant="ghost"
                                        onClick={handleBack}
                                        disabled={currentStep === 'event'}
                                        className="gap-2"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Back
                                    </Button>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowMobilePreview(true)}
                                            className="lg:hidden gap-1.5"
                                        >
                                            <Eye className="h-4 w-4" />
                                            Preview
                                        </Button>
                                        <Button
                                            onClick={handleContinue}
                                            disabled={
                                                (currentStep === 'event' && !canProceedFromEvent) ||
                                                (currentStep === 'audience' && !canProceedFromAudience) ||
                                                (currentStep === 'compose' && !canProceedFromCompose)
                                            }
                                            className="gap-2 bg-gradient-to-r from-[oklch(0.78_0.14_165)] to-[oklch(0.72_0.15_185)] hover:from-[oklch(0.75_0.14_165)] hover:to-[oklch(0.68_0.15_185)]"
                                        >
                                            Continue
                                            <ArrowRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {currentStep === 'send' && (
                                <div className="border-t border-border/40 px-6 py-4 bg-muted/10 flex items-center justify-between">
                                    <Button
                                        variant="ghost"
                                        onClick={handleBack}
                                        className="gap-2"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Back to Edit
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowMobilePreview(true)}
                                        className="lg:hidden gap-1.5"
                                    >
                                        <Eye className="h-4 w-4" />
                                        Preview
                                    </Button>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>

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
