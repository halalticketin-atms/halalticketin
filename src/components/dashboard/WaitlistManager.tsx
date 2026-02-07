'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, Send } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useOrganizerFromParams } from '@/hooks/useOrganizerFromParams';
import { fetchEventDetails, listOrganizerEvents, type EventRecord, type TicketRecord } from '@/lib/events-api';
import { toast } from '@/lib/notifications';
import {
    createWaitlistOfferRound,
    fetchEventWaitlist,
    fetchWaitlistAvailability,
    type EventWaitlistResponse,
    type WaitlistAvailabilityResponse,
    type WaitlistEntryStatus,
    type EventWaitlistSettings,
    updateEventWaitlistSettings,
} from '@/lib/waitlist-api';

const STATUS_LABELS: Record<WaitlistEntryStatus, string> = {
    active: 'Active',
    offered: 'Offered',
    converted: 'Converted',
    withdrawn: 'Withdrawn',
};

const formatDateTime = (value?: string | null) => {
    if (!value) return 'Never';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Invalid date';
    return parsed.toLocaleString();
};

interface WaitlistManagerProps {
    showHeader?: boolean;
}

export function WaitlistManager({ showHeader = true }: WaitlistManagerProps) {
    const organizerId = useOrganizerFromParams();

    const [events, setEvents] = useState<EventRecord[]>([]);
    const [eventsLoading, setEventsLoading] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState<string>('');

    const [tickets, setTickets] = useState<TicketRecord[]>([]);
    const [ticketsLoading, setTicketsLoading] = useState(false);

    const [queueData, setQueueData] = useState<EventWaitlistResponse | null>(null);
    const [queueLoading, setQueueLoading] = useState(false);

    const [ticketFilter, setTicketFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | WaitlistEntryStatus>('all');
    const [search, setSearch] = useState('');

    const [settingsDraft, setSettingsDraft] = useState<EventWaitlistSettings | null>(null);
    const [savingSettings, setSavingSettings] = useState(false);

    const [offerTicketTypeId, setOfferTicketTypeId] = useState('');
    const [seatsToRelease, setSeatsToRelease] = useState('1');
    const [offerClaimWindowMinutes, setOfferClaimWindowMinutes] = useState('');
    const [creatingOfferRound, setCreatingOfferRound] = useState(false);

    const [availability, setAvailability] = useState<WaitlistAvailabilityResponse | null>(null);
    const [availabilityLoading, setAvailabilityLoading] = useState(false);

    const ticketNameMap = useMemo(
        () => new Map(tickets.map((ticket) => [ticket.id, ticket.name])),
        [tickets]
    );

    const selectedEvent = useMemo(
        () => events.find((event) => event.id === selectedEventId) ?? null,
        [events, selectedEventId]
    );

    const availableOfferTickets = useMemo(
        () => tickets.filter((ticket) => ticket.type !== 'donation'),
        [tickets]
    );

    const loadEvents = useCallback(async () => {
        if (!organizerId) return;

        setEventsLoading(true);
        try {
            const response = await listOrganizerEvents(organizerId, { status: 'published' });
            setEvents(response.events);

            if (response.events.length === 0) {
                setSelectedEventId('');
                return;
            }

            setSelectedEventId((current) => {
                if (current && response.events.some((event) => event.id === current)) return current;
                return response.events[0].id;
            });
        } catch (error) {
            toast.error(error, 'Unable to load your events');
        } finally {
            setEventsLoading(false);
        }
    }, [organizerId]);

    const loadEventTickets = useCallback(async () => {
        if (!selectedEventId) {
            setTickets([]);
            setOfferTicketTypeId('');
            return;
        }

        setTicketsLoading(true);
        try {
            const response = await fetchEventDetails(selectedEventId);
            setTickets(response.tickets);

            const firstUsable = response.tickets.find((ticket) => ticket.type !== 'donation');
            setOfferTicketTypeId(firstUsable?.id ?? '');
            setTicketFilter('all');
            setStatusFilter('all');
            setSearch('');
        } catch (error) {
            toast.error(error, 'Unable to load event ticket types');
            setTickets([]);
            setOfferTicketTypeId('');
        } finally {
            setTicketsLoading(false);
        }
    }, [selectedEventId]);

    const loadQueue = useCallback(async () => {
        if (!selectedEventId) {
            setQueueData(null);
            setSettingsDraft(null);
            return;
        }

        setQueueLoading(true);
        try {
            const data = await fetchEventWaitlist(selectedEventId, {
                ticketTypeId: ticketFilter === 'all' ? undefined : ticketFilter,
                status: statusFilter === 'all' ? undefined : statusFilter,
                search: search.trim() || undefined
            });
            setQueueData(data);
            setSettingsDraft(data.settings);
        } catch (error) {
            toast.error(error, 'Unable to load waitlist queue');
            setQueueData(null);
        } finally {
            setQueueLoading(false);
        }
    }, [search, selectedEventId, statusFilter, ticketFilter]);

    const loadAvailability = useCallback(async () => {
        if (!selectedEventId || !offerTicketTypeId) {
            setAvailability(null);
            return;
        }

        setAvailabilityLoading(true);
        try {
            const result = await fetchWaitlistAvailability(selectedEventId, offerTicketTypeId);
            setAvailability(result);
        } catch (error) {
            toast.error(error, 'Unable to load ticket availability');
            setAvailability(null);
        } finally {
            setAvailabilityLoading(false);
        }
    }, [offerTicketTypeId, selectedEventId]);

    useEffect(() => {
        void loadEvents();
    }, [loadEvents]);

    useEffect(() => {
        void loadEventTickets();
    }, [loadEventTickets]);

    useEffect(() => {
        void loadQueue();
    }, [loadQueue]);

    useEffect(() => {
        void loadAvailability();
    }, [loadAvailability]);

    const handleSaveSettings = async () => {
        if (!selectedEventId || !settingsDraft) return;

        setSavingSettings(true);
        try {
            const response = await updateEventWaitlistSettings(selectedEventId, settingsDraft);
            setSettingsDraft(response.settings);
            setQueueData((current) => current ? { ...current, settings: response.settings } : current);
            toast.success('Waitlist settings updated');
        } catch (error) {
            toast.error(error, 'Unable to save waitlist settings');
        } finally {
            setSavingSettings(false);
        }
    };

    const handleCreateOfferRound = async () => {
        if (!selectedEventId || !offerTicketTypeId) {
            toast.error('Select an event and ticket type first');
            return;
        }

        const seats = Number.parseInt(seatsToRelease, 10);
        if (!Number.isFinite(seats) || seats <= 0) {
            toast.error('Seats to release must be greater than 0');
            return;
        }

        let claimWindowMinutes: number | undefined;
        if (offerClaimWindowMinutes.trim()) {
            const parsed = Number.parseInt(offerClaimWindowMinutes, 10);
            if (!Number.isFinite(parsed) || parsed < 5 || parsed > 120) {
                toast.error('Claim window must be between 5 and 120 minutes');
                return;
            }
            claimWindowMinutes = parsed;
        }

        setCreatingOfferRound(true);
        try {
            const result = await createWaitlistOfferRound(selectedEventId, {
                ticketTypeId: offerTicketTypeId,
                seatsToRelease: seats,
                ...(claimWindowMinutes ? { claimWindowMinutes } : {})
            });
            toast.success(`Round sent: ${result.offersCreated} offer(s), ${result.seatsLocked} seat(s) locked`);
            await Promise.all([loadQueue(), loadAvailability()]);
        } catch (error) {
            toast.error(error, 'Unable to send offer round');
        } finally {
            setCreatingOfferRound(false);
        }
    };

    return (
        <div className="space-y-6">
            {showHeader && (
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight">Waitlist Manager</h1>
                    <p className="text-sm text-muted-foreground max-w-3xl">
                        Recover sold-out demand by queuing interested buyers, issuing time-boxed claim links, and controlling
                        whether expired offers move forward automatically or only when your team decides.
                    </p>
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Event</CardTitle>
                    <CardDescription>Select which published event you want to manage.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="grid gap-2 flex-1">
                        <Label htmlFor="waitlist-event">Published event</Label>
                        <Select
                            value={selectedEventId || undefined}
                            onValueChange={(value) => setSelectedEventId(value)}
                            disabled={eventsLoading || events.length === 0}
                        >
                            <SelectTrigger id="waitlist-event" className="w-full">
                                <SelectValue placeholder={eventsLoading ? 'Loading events…' : 'Select event'} />
                            </SelectTrigger>
                            <SelectContent>
                                {events.map((event) => (
                                    <SelectItem key={event.id} value={event.id}>
                                        {event.title || 'Untitled event'}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button variant="outline" onClick={() => void loadEvents()} disabled={eventsLoading}>
                        {eventsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        <span className="ml-2">Refresh events</span>
                    </Button>
                </CardContent>
            </Card>

            {!selectedEventId ? (
                <Card>
                    <CardContent className="py-10 text-center text-sm text-muted-foreground">
                        {eventsLoading ? 'Loading events…' : 'No published events found. Publish an event first to use waitlist management.'}
                    </CardContent>
                </Card>
            ) : (
                <>
                    <div className="grid gap-6 xl:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Waitlist Settings</CardTitle>
                                <CardDescription>
                                    Configure how offers are handed off when they expire for <strong>{selectedEvent?.title || 'this event'}</strong>.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                {!settingsDraft ? (
                                    <div className="text-sm text-muted-foreground">Loading settings…</div>
                                ) : (
                                    <>
                                        <div className="flex items-center justify-between rounded-lg border p-3">
                                            <div>
                                                <p className="font-medium">Enable waitlist</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Allow sold-out ticket buyers to join the queue.
                                                </p>
                                            </div>
                                            <Switch
                                                checked={settingsDraft.waitlistEnabled}
                                                onCheckedChange={(checked) =>
                                                    setSettingsDraft((current) =>
                                                        current ? { ...current, waitlistEnabled: checked } : current
                                                    )
                                                }
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label>Handoff mode</Label>
                                            <Select
                                                value={settingsDraft.waitlistHandoffMode}
                                                onValueChange={(value: 'manual' | 'automatic') =>
                                                    setSettingsDraft((current) =>
                                                        current ? { ...current, waitlistHandoffMode: value } : current
                                                    )
                                                }
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="manual">Manual (organizer sends next round)</SelectItem>
                                                    <SelectItem value="automatic">Automatic (auto-pass after expiry)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="claim-window">Default claim window (minutes)</Label>
                                            <Input
                                                id="claim-window"
                                                type="number"
                                                min={5}
                                                max={120}
                                                value={settingsDraft.waitlistClaimWindowMinutes}
                                                onChange={(event) => {
                                                    const value = Number.parseInt(event.target.value, 10);
                                                    if (!Number.isFinite(value)) return;
                                                    setSettingsDraft((current) =>
                                                        current
                                                            ? { ...current, waitlistClaimWindowMinutes: Math.max(5, Math.min(120, value)) }
                                                            : current
                                                    );
                                                }}
                                            />
                                        </div>

                                        <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                                            {settingsDraft.waitlistHandoffMode === 'automatic'
                                                ? 'Automatic mode: when an offer expires, it can be auto-released to the next person in the queue.'
                                                : 'Manual mode: expired offers stop there until an organizer sends another offer round.'}
                                        </div>

                                        <Button onClick={handleSaveSettings} disabled={savingSettings}>
                                            {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                            <span className={savingSettings ? 'ml-2' : ''}>Save settings</span>
                                        </Button>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Offer Round</CardTitle>
                                <CardDescription>
                                    Send claim links for newly available seats in one click.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-2">
                                    <Label>Ticket tier</Label>
                                    <Select
                                        value={offerTicketTypeId || undefined}
                                        onValueChange={(value) => setOfferTicketTypeId(value)}
                                        disabled={ticketsLoading || availableOfferTickets.length === 0}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder={ticketsLoading ? 'Loading ticket tiers…' : 'Select ticket tier'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableOfferTickets.map((ticket) => (
                                                <SelectItem key={ticket.id} value={ticket.id}>
                                                    {ticket.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="seats-release">Seats to release</Label>
                                    <Input
                                        id="seats-release"
                                        type="number"
                                        min={1}
                                        max={500}
                                        value={seatsToRelease}
                                        onChange={(event) => setSeatsToRelease(event.target.value)}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="claim-window-override">Claim window override (optional)</Label>
                                    <Input
                                        id="claim-window-override"
                                        type="number"
                                        min={5}
                                        max={120}
                                        placeholder="Use default setting"
                                        value={offerClaimWindowMinutes}
                                        onChange={(event) => setOfferClaimWindowMinutes(event.target.value)}
                                    />
                                </div>

                                <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                                    {availabilityLoading ? (
                                        <span className="inline-flex items-center text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span className="ml-2">Checking availability…</span>
                                        </span>
                                    ) : availability ? (
                                        <div className="space-y-1 text-muted-foreground">
                                            <p><strong>Available now:</strong> {availability.available}</p>
                                            <p><strong>Already locked:</strong> {availability.lockedForTicket}</p>
                                            <p><strong>Event seats remaining:</strong> {availability.eventRemaining}</p>
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground">Select a ticket tier to see live availability.</p>
                                    )}
                                </div>

                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => void loadAvailability()}
                                        disabled={availabilityLoading || !offerTicketTypeId}
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                        <span className="ml-2">Refresh availability</span>
                                    </Button>
                                    <Button
                                        onClick={handleCreateOfferRound}
                                        disabled={creatingOfferRound || !offerTicketTypeId}
                                    >
                                        {creatingOfferRound ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                        <span className="ml-2">Send offer round</span>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Queue</CardTitle>
                            <CardDescription>
                                Monitor waitlist entries, active claim links, and conversion activity.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-3 md:grid-cols-4">
                                <div className="grid gap-2">
                                    <Label>Ticket filter</Label>
                                    <Select value={ticketFilter} onValueChange={setTicketFilter}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All tickets</SelectItem>
                                            {availableOfferTickets.map((ticket) => (
                                                <SelectItem key={ticket.id} value={ticket.id}>
                                                    {ticket.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Status filter</Label>
                                    <Select value={statusFilter} onValueChange={(value: 'all' | WaitlistEntryStatus) => setStatusFilter(value)}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All statuses</SelectItem>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="offered">Offered</SelectItem>
                                            <SelectItem value="converted">Converted</SelectItem>
                                            <SelectItem value="withdrawn">Withdrawn</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                    <Label htmlFor="waitlist-search">Search</Label>
                                    <Input
                                        id="waitlist-search"
                                        placeholder="Search by email or name"
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <Badge variant="secondary">Total: {queueData?.summary.total ?? 0}</Badge>
                                <Badge variant="secondary">Active: {queueData?.summary.activeCount ?? 0}</Badge>
                                <Badge variant="secondary">Offered: {queueData?.summary.offeredCount ?? 0}</Badge>
                                <Badge variant="secondary">Converted: {queueData?.summary.convertedCount ?? 0}</Badge>
                                <Badge variant="secondary">Withdrawn: {queueData?.summary.withdrawnCount ?? 0}</Badge>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => void loadQueue()}
                                    disabled={queueLoading}
                                >
                                    {queueLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                    <span className="ml-2">Refresh queue</span>
                                </Button>
                            </div>

                            {(queueData?.sweep.expiredCount ?? 0) > 0 && (
                                <div className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                                    Sweep processed {queueData?.sweep.expiredCount} expired offer(s), auto-issued {queueData?.sweep.autoIssued} new offer(s).
                                </div>
                            )}

                            {queueLoading ? (
                                <div className="flex items-center text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="ml-2">Loading waitlist queue…</span>
                                </div>
                            ) : (queueData?.entries.length ?? 0) === 0 ? (
                                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                                    No waitlist entries match your filters yet.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {queueData?.entries.map((entry) => (
                                        <div key={entry.id} className="rounded-lg border p-4">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-medium">{entry.name || 'Unnamed attendee'}</p>
                                                    <p className="text-sm text-muted-foreground">{entry.email}</p>
                                                </div>
                                                <Badge variant="outline">{STATUS_LABELS[entry.status]}</Badge>
                                            </div>
                                            <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
                                                <p><strong>Ticket:</strong> {ticketNameMap.get(entry.ticketTypeId) || entry.ticketTypeId}</p>
                                                <p><strong>Requested:</strong> {entry.requestedQuantity}</p>
                                                <p><strong>Joined:</strong> {formatDateTime(entry.joinedAt)}</p>
                                                <p><strong>Priority:</strong> {entry.manualPriority}</p>
                                                <p><strong>Offer count:</strong> {entry.offerCount}</p>
                                                <p><strong>Last offered:</strong> {formatDateTime(entry.lastOfferedAt)}</p>
                                            </div>
                                            {entry.activeOffer && (
                                                <div className="mt-3 rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                                                    Active offer: {entry.activeOffer.quantity} seat(s), expires {formatDateTime(entry.activeOffer.expiresAt)}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}

export default WaitlistManager;
