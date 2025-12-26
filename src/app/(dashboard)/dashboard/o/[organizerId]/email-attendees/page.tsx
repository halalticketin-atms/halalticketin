'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
    AlertCircle,
    ArrowLeft,
    Calendar,
    Mail,
    Send,
    Users,
    Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useOrganizerFromParams } from '@/hooks/useOrganizerFromParams';
import { useOrganizerEvents, type DashboardEvent, type DashboardEventStatus } from '@/hooks/useOrganizerEvents';
import { buildDashboardPath } from '@/lib/organizer-path';
import { cn } from '@/lib/utils';

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

const steps = [
    {
        id: 'event',
        title: 'Select event',
        description: 'Choose which event you are contacting.',
        icon: Calendar,
    },
    {
        id: 'audience',
        title: 'Choose audience',
        description: 'Pick who should receive the update.',
        icon: Users,
    },
    {
        id: 'compose',
        title: 'Compose message',
        description: 'Write the subject and message.',
        icon: Mail,
    },
    {
        id: 'review',
        title: 'Review & send',
        description: 'Check everything before sending.',
        icon: Send,
    },
];

export default function EmailAttendeesPage() {
    const organizerId = useOrganizerFromParams();
    const { events, isLoading, error } = useOrganizerEvents(organizerId);
    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const [subject, setSubject] = useState('Event update');
    const [message, setMessage] = useState('');
    const [currentStep, setCurrentStep] = useState(0);
    const [audience, setAudience] = useState({
        all: true,
        checkedIn: false,
        recent: false,
    });

    const selectedEvent = useMemo(
        () => events.find((event) => event.id === selectedEventId) ?? null,
        [events, selectedEventId]
    );

    useEffect(() => {
        if (!selectedEventId && events.length > 0) {
            setSelectedEventId(events[0].id);
        }
    }, [events, selectedEventId]);

    useEffect(() => {
        setSubject(buildSubject(selectedEvent));
    }, [selectedEvent]);

    const messageCount = message.length;
    const previewSubject = subject.trim() || 'Event update';
    const previewBody =
        message.trim() || 'Write your update here. Attendees will see it as soon as you send.';

    const statusMeta = selectedEvent ? statusStyles[selectedEvent.displayStatus] : null;
    const formattedDate = selectedEvent ? formatEventDate(selectedEvent) : null;
    const formattedLocation = selectedEvent ? formatEventLocation(selectedEvent) : null;
    const activeStep = steps[currentStep];
    const ActiveStepIcon = activeStep.icon;
    const selectedAudience = [
        audience.all ? 'All ticket holders' : null,
        audience.checkedIn ? 'Checked-in attendees' : null,
        audience.recent ? 'Recent buyers' : null,
    ].filter(Boolean) as string[];

    const stepReady = [
        Boolean(selectedEventId),
        selectedAudience.length > 0,
        subject.trim().length > 0 && message.trim().length > 0,
        true,
    ];

    const canMoveNext = stepReady[currentStep] && !isLoading;
    const canMoveBack = currentStep > 0;

    return (
        <div className="min-h-screen bg-muted/30">
            <div className="container py-8 space-y-6">
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
                            <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                                <Mail className="h-5 w-5" />
                            </div>
                            <div>
                                <h1 className="font-display text-2xl sm:text-3xl font-bold">
                                    Email Attendees
                                </h1>
                                <p className="text-muted-foreground">
                                    Simple, step-by-step updates for a single event.
                                </p>
                            </div>
                        </div>
                        <Badge variant="outline" className="w-fit">
                            Step {currentStep + 1} of {steps.length}
                        </Badge>
                    </div>
                </motion.div>

                <div className="grid gap-3 sm:grid-cols-4 max-w-4xl mx-auto">
                    {steps.map((step, index) => {
                        const StepIcon = step.icon;
                        const isActive = index === currentStep;
                        const isCompleted = index < currentStep;

                        return (
                            <button
                                key={step.id}
                                type="button"
                                onClick={() => {
                                    if (index <= currentStep) {
                                        setCurrentStep(index);
                                    }
                                }}
                                disabled={index > currentStep}
                                className={cn(
                                    'rounded-xl border px-4 py-3 text-left transition',
                                    isActive
                                        ? 'border-primary bg-primary/5 text-foreground'
                                        : isCompleted
                                            ? 'border-border bg-background'
                                            : 'border-dashed border-border/70 text-muted-foreground'
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className={cn(
                                            'h-9 w-9 rounded-lg flex items-center justify-center',
                                            isActive
                                                ? 'bg-primary text-primary-foreground'
                                                : isCompleted
                                                    ? 'bg-muted text-foreground'
                                                    : 'bg-muted/60 text-muted-foreground'
                                        )}
                                    >
                                        <StepIcon className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                            Step {index + 1}
                                        </p>
                                        <p className="text-sm font-semibold">{step.title}</p>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <Card className="max-w-4xl mx-auto">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ActiveStepIcon className="h-4 w-4 text-primary" />
                            {activeStep.title}
                        </CardTitle>
                        <CardDescription>{activeStep.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <motion.div
                            key={activeStep.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-4"
                        >
                            {activeStep.id === 'event' && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="event-select">Event</Label>
                                        <Select
                                            value={selectedEventId || undefined}
                                            onValueChange={setSelectedEventId}
                                            disabled={isLoading || events.length === 0}
                                        >
                                            <SelectTrigger id="event-select" className="h-11 bg-background">
                                                <SelectValue
                                                    placeholder={isLoading ? 'Loading events...' : 'Select event'}
                                                />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {events.map((event) => (
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

                                    {selectedEvent ? (
                                        <div className="flex flex-col gap-3 rounded-lg border border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between">
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
                                                    <div className="h-12 w-12 rounded-lg bg-muted/70 flex items-center justify-center text-sm text-muted-foreground">
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
                                    ) : (
                                        <div className="rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                                            No events yet. Create an event first to start emailing attendees.
                                        </div>
                                    )}
                                </>
                            )}

                            {activeStep.id === 'audience' && (
                                <div className="space-y-3">
                                    <label className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
                                        <Checkbox
                                            checked={audience.all}
                                            onCheckedChange={(checked) =>
                                                setAudience((prev) => ({ ...prev, all: Boolean(checked) }))
                                            }
                                        />
                                        <div>
                                            <p className="text-sm font-medium">All ticket holders</p>
                                            <p className="text-xs text-muted-foreground">
                                                Includes paid and free tickets.
                                            </p>
                                        </div>
                                    </label>
                                    <label className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
                                        <Checkbox
                                            checked={audience.checkedIn}
                                            onCheckedChange={(checked) =>
                                                setAudience((prev) => ({ ...prev, checkedIn: Boolean(checked) }))
                                            }
                                        />
                                        <div>
                                            <p className="text-sm font-medium">Checked-in attendees</p>
                                            <p className="text-xs text-muted-foreground">
                                                Use for on-site announcements.
                                            </p>
                                        </div>
                                    </label>
                                    <label className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
                                        <Checkbox
                                            checked={audience.recent}
                                            onCheckedChange={(checked) =>
                                                setAudience((prev) => ({ ...prev, recent: Boolean(checked) }))
                                            }
                                        />
                                        <div>
                                            <p className="text-sm font-medium">Recent buyers</p>
                                            <p className="text-xs text-muted-foreground">
                                                Purchased within the last 48 hours.
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            )}

                            {activeStep.id === 'compose' && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="subject">Subject</Label>
                                        <Input
                                            id="subject"
                                            value={subject}
                                            onChange={(event) => setSubject(event.target.value)}
                                            className="h-11"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Auto-filled from the event. Edit if needed.
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="message">Message</Label>
                                        <Textarea
                                            id="message"
                                            value={message}
                                            onChange={(event) => setMessage(event.target.value)}
                                            className="min-h-[220px] resize-none"
                                            placeholder="Share the update you want attendees to read..."
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            {messageCount} characters
                                        </p>
                                    </div>
                                </div>
                            )}

                            {activeStep.id === 'review' && (
                                <div className="space-y-4">
                                    <div className="rounded-lg border border-border/60 p-4 space-y-3">
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                                Event
                                            </p>
                                            <p className="text-sm font-semibold">
                                                {selectedEvent?.title || 'No event selected'}
                                            </p>
                                            {formattedDate && formattedLocation && (
                                                <p className="text-xs text-muted-foreground">
                                                    {formattedDate} · {formattedLocation}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                                Audience
                                            </p>
                                            {selectedAudience.length > 0 ? (
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    {selectedAudience.map((item) => (
                                                        <Badge key={item} variant="secondary">
                                                            {item}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">
                                                    No audience selected
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="rounded-lg border border-border/60 p-4 space-y-3">
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                                Subject
                                            </p>
                                            <p className="text-sm font-semibold">{previewSubject}</p>
                                        </div>
                                        <div className="h-px bg-border/60" />
                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                            {previewBody}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </motion.div>

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
                            <Button
                                variant="ghost"
                                onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 0))}
                                disabled={!canMoveBack}
                            >
                                Back
                            </Button>
                            {currentStep < steps.length - 1 ? (
                                <Button
                                    onClick={() => setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))}
                                    disabled={!canMoveNext}
                                >
                                    Next step
                                </Button>
                            ) : (
                                <div className="flex flex-col items-end gap-1">
                                    <Button disabled={!stepReady[2] || selectedAudience.length === 0 || !selectedEventId}>
                                        Send now
                                    </Button>
                                    <p className="text-xs text-muted-foreground">
                                        Sending will be enabled once delivery is connected.
                                    </p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
