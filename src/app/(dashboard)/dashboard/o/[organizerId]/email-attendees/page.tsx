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
    MapPin,
    Send,
    Sparkles,
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

export default function EmailAttendeesPage() {
    const organizerId = useOrganizerFromParams();
    const { events, isLoading, error } = useOrganizerEvents(organizerId);
    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const [subject, setSubject] = useState('Event update');
    const [message, setMessage] = useState('');

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

    return (
        <div className="min-h-screen bg-muted/30">
            <div className="container py-8 space-y-8">
                <motion.div
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"
                >
                    <div className="space-y-4">
                        <Button variant="ghost" size="sm" className="px-2" asChild>
                            <Link href={organizerId ? buildDashboardPath(organizerId) : '/dashboard'}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Dashboard
                            </Link>
                        </Button>
                        <div className="flex items-start gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                                <Mail className="h-5 w-5" />
                            </div>
                            <div>
                                <h1 className="font-display text-2xl sm:text-3xl font-bold">
                                    Email Attendees
                                </h1>
                                <p className="text-muted-foreground">
                                    Send targeted updates to the people registered for a specific event.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="gap-2">
                            <Sparkles className="h-3.5 w-3.5" />
                            Auto subject
                        </Badge>
                        <Badge variant="outline" className="gap-2">
                            <Users className="h-3.5 w-3.5" />
                            Event-only audience
                        </Badge>
                    </div>
                </motion.div>

                <div className="grid gap-6 lg:grid-cols-[1.45fr_0.85fr]">
                    <div className="space-y-6">
                        <Card className="border-primary/10 bg-gradient-to-br from-background via-background to-primary/5">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Calendar className="h-4 w-4 text-primary" />
                                    Choose event
                                </CardTitle>
                                <CardDescription>
                                    Pick the event you want to contact. The subject is auto-filled from the event details.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
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
                                                                {(event.title || 'E').charAt(0).toUpperCase()}
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
                                            Loading event details
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
                                    <div className="flex flex-wrap gap-2">
                                        {statusMeta && (
                                            <Badge variant="outline" className={cn('border', statusMeta.className)}>
                                                {statusMeta.label}
                                            </Badge>
                                        )}
                                        {formattedDate && (
                                            <Badge variant="secondary" className="gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {formattedDate}
                                            </Badge>
                                        )}
                                        {formattedLocation && (
                                            <Badge variant="secondary" className="gap-1">
                                                <MapPin className="h-3 w-3" />
                                                {formattedLocation}
                                            </Badge>
                                        )}
                                    </div>
                                ) : (
                                    <div className="rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                                        No events yet. Create an event first to start emailing attendees.
                                    </div>
                                )}

                                <div className="grid gap-3 sm:grid-cols-3">
                                    <div className="rounded-lg border border-border/60 bg-background/70 p-3">
                                        <p className="text-xs text-muted-foreground">Recipients</p>
                                        <p className="text-lg font-semibold">--</p>
                                        <p className="text-[11px] text-muted-foreground">
                                            Connect orders to populate
                                        </p>
                                    </div>
                                    <div className="rounded-lg border border-border/60 bg-background/70 p-3">
                                        <p className="text-xs text-muted-foreground">Recent signups</p>
                                        <p className="text-lg font-semibold">--</p>
                                        <p className="text-[11px] text-muted-foreground">
                                            Last 7 days
                                        </p>
                                    </div>
                                    <div className="rounded-lg border border-border/60 bg-background/70 p-3">
                                        <p className="text-xs text-muted-foreground">Delivery window</p>
                                        <p className="text-lg font-semibold">Now</p>
                                        <p className="text-[11px] text-muted-foreground">
                                            Scheduling coming soon
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="border-b border-border/60">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <CardTitle className="flex items-center gap-2 text-base">
                                            <Mail className="h-4 w-4 text-primary" />
                                            Compose update
                                        </CardTitle>
                                        <CardDescription>
                                            Craft the message you want attendees to receive.
                                        </CardDescription>
                                    </div>
                                    <Badge variant="secondary" className="gap-1">
                                        <Sparkles className="h-3 w-3" />
                                        Draft
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-6">
                                <div className="space-y-2">
                                    <Label htmlFor="subject">Subject</Label>
                                    <Input
                                        id="subject"
                                        value={subject}
                                        onChange={(event) => setSubject(event.target.value)}
                                        className="h-11"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Auto-filled based on the selected event. Edit if needed.
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
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                                        <span>{messageCount} characters</span>
                                        <span>Plain text for now. Rich formatting coming soon.</span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <Button className="gap-2" disabled>
                                        <Send className="h-4 w-4" />
                                        Send update
                                    </Button>
                                    <Button variant="secondary" disabled>
                                        Save draft
                                    </Button>
                                    <Badge variant="outline" className="gap-2 text-xs">
                                        <Sparkles className="h-3 w-3" />
                                        Delivery wiring next
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Users className="h-4 w-4 text-primary" />
                                    Audience filters
                                </CardTitle>
                                <CardDescription>
                                    Start with everyone, then narrow the list.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <label className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
                                    <Checkbox defaultChecked />
                                    <div>
                                        <p className="text-sm font-medium">All ticket holders</p>
                                        <p className="text-xs text-muted-foreground">
                                            Includes paid and free tickets.
                                        </p>
                                    </div>
                                </label>
                                <label className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
                                    <Checkbox />
                                    <div>
                                        <p className="text-sm font-medium">Checked-in attendees</p>
                                        <p className="text-xs text-muted-foreground">
                                            Use for on-site announcements.
                                        </p>
                                    </div>
                                </label>
                                <label className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
                                    <Checkbox />
                                    <div>
                                        <p className="text-sm font-medium">Recent buyers</p>
                                        <p className="text-xs text-muted-foreground">
                                            Last 48 hours after purchase.
                                        </p>
                                    </div>
                                </label>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Sparkles className="h-4 w-4 text-primary" />
                                    Personalization
                                </CardTitle>
                                <CardDescription>
                                    Drop tags into the message to personalize each email.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="secondary">{'{{first_name}}'}</Badge>
                                    <Badge variant="secondary">{'{{event_title}}'}</Badge>
                                    <Badge variant="secondary">{'{{event_date}}'}</Badge>
                                    <Badge variant="secondary">{'{{ticket_type}}'}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-3">
                                    Personalization will activate once email delivery is connected.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-primary/10 bg-gradient-to-br from-background via-background to-primary/5">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Mail className="h-4 w-4 text-primary" />
                                    Preview
                                </CardTitle>
                                <CardDescription>
                                    See how your message will look to attendees.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-xl border border-border/60 bg-background/80 p-4 space-y-3">
                                    <div>
                                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                            Subject
                                        </p>
                                        <p className="text-sm font-semibold">{previewSubject}</p>
                                    </div>
                                    <div className="h-px bg-border/60" />
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                        {previewBody}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
